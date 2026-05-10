import csv
import math
import re
import warnings
from collections import Counter
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer

warnings.filterwarnings('ignore')

csv.field_size_limit(10 ** 7)

FREE_EMAIL_DOMAINS = {
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com',
    'aol.com', 'icloud.com', 'protonmail.com', 'mail.com', 'gmx.com',
    'yandex.ru', 'mail.ru', 'wp.pl', 'onet.pl', 'o2.pl', 'interia.pl',
    'yahoo.co.uk', 'hotmail.co.uk', 'msn.com',
}

SUSPICIOUS_TLDS = {
    'tk', 'ml', 'ga', 'cf', 'xyz', 'top', 'stream', 'racing', 'win',
    'cricket', 'faith', 'date', 'men', 'science', 'trade', 'accountant',
    'bid', 'click', 'party', 'space', 'website', 'webcam', 'ru', 'ua',
}

URGENCY_WORDS = {
    # English
    'urgent', 'immediately', 'asap', 'action required', 'verify',
    'suspended', 'expire', 'expiration', 'alert', 'warning', 'limited',
    'deadline', 'act now', 'important', 'confirm', 'validate', 'update',
    'secure', 'click here', 'log in', 'sign in', 'password', 'account',
    'unauthorized', 'suspicious', 'compromised', 'locked', 'blocked',
    # Polish
    'pilne', 'natychmiast', 'wymagane', 'zweryfikuj', 'zawieszone',
    'wygasa', 'wygaśnie', 'ostrzeżenie', 'uwaga', 'ograniczone',
    'termin', 'działaj', 'ważne', 'potwierdź', 'zaktualizuj',
    'bezpieczny', 'kliknij tutaj', 'zaloguj', 'hasło', 'konto',
    'nieautoryzowany', 'podejrzany', 'zablokowane', 'zablokowany',
    'weryfikacja', 'aktywacja', 'reaktywacja', 'przywróć', 'odblokuj',
}

PHISHING_KEYWORDS = {
    # English
    'prize', 'winner', 'congratulation', 'lottery', 'claim', 'reward',
    'free', 'gift', 'bonus', 'exclusive', 'selected', 'won',
    'bank', 'paypal', 'credit card', 'social security', 'ssn',
    'refund', 'invoice', 'payment', 'transaction', 'wire transfer',
    'bitcoin', 'crypto', 'invest', 'profit', 'earning',
    # Polish
    'nagroda', 'wygrałeś', 'wygrałaś', 'gratulacje', 'loteria',
    'odbierz', 'darmowy', 'darmowa', 'prezent', 'premia', 'ekskluzywny',
    'wybrany', 'wybrałeś', 'bank', 'karta kredytowa', 'pesel',
    'zwrot', 'faktura', 'płatność', 'przelew', 'bitcoin', 'kryptowaluta',
    'inwestycja', 'zysk', 'zarobek', 'pożyczka', 'kredyt',
}


class EmailPreprocessor:
    """
    Extract features from raw email CSV for phishing detection.
    Uses char n-gram TF-IDF (language-agnostic) + handcrafted structural features.
    """

    def __init__(self, data_path: str, tfidf_max_features: int = 300):
        self.data_path = data_path
        self.tfidf_max_features = tfidf_max_features
        self.df = None
        # char_wb n-grams: language-agnostic — works on Polish, English, mixed.
        # Captures spelling patterns and morphological fragments across languages.
        self.tfidf = TfidfVectorizer(
            analyzer='char_wb',
            ngram_range=(3, 5),
            max_features=tfidf_max_features,
            min_df=3,
            max_df=0.95,
            sublinear_tf=True,
        )

    # ------------------------------------------------------------------
    # Column normalisation — support multiple dataset formats
    # ------------------------------------------------------------------

    @staticmethod
    def _normalize_columns(df: pd.DataFrame, filename: str) -> pd.DataFrame:
        """Map any known dataset column layout to the canonical schema."""
        cols = set(df.columns)

        # Enron Kaggle format: Subject, Message, Spam/Ham, Date
        if 'Spam/Ham' in cols:
            df = df.rename(columns={
                'Subject': 'subject',
                'Message': 'body',
                'Date': 'date',
            })
            df['label'] = df['Spam/Ham'].str.lower().map({'ham': 0, 'spam': 1})
            df['sender'] = ''
            df['receiver'] = ''
            df['urls'] = ''
            df = df.drop(columns=[c for c in ['Spam/Ham', 'Message ID'] if c in df.columns])

        df.columns = [c.lower() for c in df.columns]

        for col in ('sender', 'receiver', 'date', 'subject', 'body', 'urls'):
            if col not in df.columns:
                df[col] = ''

        if 'label' not in df.columns:
            raise ValueError(f"{filename}: cannot find label column. "
                             f"Columns found: {list(df.columns)}")

        return df[['sender', 'receiver', 'date', 'subject', 'body', 'label', 'urls']]

    # ------------------------------------------------------------------
    # Data loading
    # ------------------------------------------------------------------

    def load_data(self):
        print("\n" + "=" * 60)
        print("LOADING EMAIL DATA")
        print("=" * 60)

        data_path = Path(self.data_path)

        if data_path.is_dir():
            csv_files = list(data_path.glob('*.csv'))
            print(f"Found {len(csv_files)} CSV files in directory")
            dfs = []
            for f in csv_files:
                df = pd.read_csv(f)
                df = self._normalize_columns(df, f.name)
                print(f"  {f.name}: {len(df)} rows")
                dfs.append(df)
            self.df = pd.concat(dfs, ignore_index=True)
        else:
            self.df = pd.read_csv(str(data_path))
            self.df = self._normalize_columns(self.df, Path(data_path).name)

        print(f"Total emails loaded: {len(self.df)}")

        # Strip Re:/Fwd: prefix — dataset artifact from CEAS_08 mailing lists
        self.df['subject'] = self.df['subject'].fillna('').astype(str)
        self.df['subject'] = self.df['subject'].str.replace(
            r'^(Re:|RE:|Fwd:|FWD:|Fw:|FW:)\s*', '', regex=True
        ).str.strip()

        print(f"Label distribution:\n{self.df['label'].value_counts().to_string()}")

        self.df['body'] = self.df['body'].fillna('').astype(str)
        self.df['sender'] = self.df['sender'].fillna('').astype(str)
        self.df['urls'] = self.df['urls'].fillna('').astype(str)

        return self.df

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _entropy(text: str) -> float:
        if not text:
            return 0.0
        counts = Counter(text)
        n = len(text)
        return -sum((c / n) * math.log2(c / n + 1e-10) for c in counts.values())

    @staticmethod
    def _parse_sender_domain(sender: str) -> str:
        match = re.search(r'<([^>]+)>', sender)
        email_addr = match.group(1) if match else sender.strip()
        if '@' in email_addr:
            return email_addr.split('@')[-1].lower().strip()
        return ''

    @staticmethod
    def _extract_tld(domain: str) -> str:
        parts = domain.split('.')
        return parts[-1] if parts else ''

    # ------------------------------------------------------------------
    # Handcrafted features
    # ------------------------------------------------------------------

    def _sender_features(self, sender: str) -> dict:
        domain = self._parse_sender_domain(sender)
        tld = self._extract_tld(domain)
        parts = domain.split('.')
        domain_name = parts[-2] if len(parts) >= 2 else domain
        return {
            'sender_is_free_email': int(domain in FREE_EMAIL_DOMAINS),
            'sender_domain_length': len(domain),
            'sender_domain_has_digits': int(any(c.isdigit() for c in domain_name)),
            'sender_suspicious_tld': int(tld in SUSPICIOUS_TLDS),
            'sender_subdomain_count': max(0, len(parts) - 2),
            'sender_domain_entropy': self._entropy(domain_name),
        }

    def _subject_features(self, subject: str) -> dict:
        s_lower = subject.lower()
        urgency_count = sum(1 for w in URGENCY_WORDS if w in s_lower)
        phishing_count = sum(1 for w in PHISHING_KEYWORDS if w in s_lower)
        uppercase_ratio = sum(c.isupper() for c in subject) / max(1, len(subject))
        return {
            'subject_length': len(subject),
            'subject_is_empty': int(len(subject.strip()) == 0),
            'subject_word_count': len(subject.split()),
            'subject_uppercase_ratio': uppercase_ratio,
            'subject_digit_count': sum(c.isdigit() for c in subject),
            'subject_exclamation_count': subject.count('!'),
            'subject_question_count': subject.count('?'),
            'subject_urgency_words': urgency_count,
            'subject_phishing_keywords': phishing_count,
            'subject_entropy': self._entropy(subject),
        }

    def _body_features(self, body: str) -> dict:
        b_lower = body.lower()
        html_tags = re.findall(r'<[^>]+>', body)
        clean = re.sub(r'<[^>]+>', ' ', body)
        words = clean.split()
        char_count = len(body)
        urgency_count = sum(1 for w in URGENCY_WORDS if w in b_lower)
        phishing_count = sum(1 for w in PHISHING_KEYWORDS if w in b_lower)
        url_count = len(re.findall(r'https?://', b_lower))
        ip_url_count = len(re.findall(r'https?://\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}', b_lower))
        avg_word_len = float(np.mean([len(w) for w in words])) if words else 0.0
        return {
            'body_length': char_count,
            'body_word_count': len(words),
            'body_is_html': int(len(html_tags) > 0),
            'body_html_tag_count': len(html_tags),
            'body_uppercase_ratio': sum(c.isupper() for c in body) / max(1, char_count),
            'body_digit_ratio': sum(c.isdigit() for c in body) / max(1, char_count),
            'body_url_count': url_count,
            'body_ip_url_count': ip_url_count,
            'body_urgency_count': urgency_count,
            'body_phishing_keyword_count': phishing_count,
            'body_avg_word_length': avg_word_len,
            'body_entropy': self._entropy(body[:500]),
        }

    @staticmethod
    def _url_column_features(urls_str: str) -> dict:
        url_list = [u.strip() for u in str(urls_str).split() if u.strip().startswith('http')]
        url_count = len(url_list)
        has_ip = int(any(re.search(r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}', u) for u in url_list))
        return {
            'has_urls': int(url_count > 0),
            'url_count': url_count,
            'url_has_ip': has_ip,
        }

    @staticmethod
    def clean_text(subject: str, body: str) -> str:
        """Clean email text for TF-IDF. Kept minimal — char n-grams handle noise well."""
        text = f"{subject} {body}"
        text = re.sub(r'<[^>]+>', ' ', text)
        text = re.sub(r'https?://\S+', ' ', text)
        text = re.sub(r'\s+', ' ', text).strip().lower()
        return text

    # ------------------------------------------------------------------
    # Feature extraction pipelines
    # ------------------------------------------------------------------

    def extract_handcrafted_features(self) -> pd.DataFrame:
        print("\n" + "=" * 60)
        print("EXTRACTING HANDCRAFTED FEATURES")
        print("=" * 60)

        rows = []
        total = len(self.df)
        for idx, (_, row) in enumerate(self.df.iterrows(), 1):
            features = {}
            features.update(self._sender_features(row['sender']))
            features.update(self._subject_features(row['subject']))
            features.update(self._body_features(row['body']))
            features.update(self._url_column_features(row['urls']))
            rows.append(features)
            if idx % max(1, total // 10) == 0:
                print(f"  {idx / total * 100:.0f}%  ({idx}/{total})")

        df_features = pd.DataFrame(rows)
        print(f"Handcrafted features: {df_features.shape[1]}")
        return df_features

    def extract_tfidf_features(self) -> pd.DataFrame:
        print("\n" + "=" * 60)
        print(f"EXTRACTING TF-IDF FEATURES  (char_wb, 3-5 grams, max={self.tfidf_max_features})")
        print("=" * 60)

        texts = [self.clean_text(row['subject'], row['body']) for _, row in self.df.iterrows()]

        print("Fitting TF-IDF vectorizer...")
        matrix = self.tfidf.fit_transform(texts)
        vocab = self.tfidf.get_feature_names_out()
        df_tfidf = pd.DataFrame(matrix.toarray(), columns=[f'tfidf_{v}' for v in vocab])
        print(f"TF-IDF features: {df_tfidf.shape[1]}")
        return df_tfidf

    # ------------------------------------------------------------------
    # Main pipeline
    # ------------------------------------------------------------------

    def preprocess(self, output_path: str = None, vectorizer_path: str = None) -> pd.DataFrame:
        print("\n" + "=" * 60)
        print("EMAIL PHISHING PREPROCESSOR  (char n-gram TF-IDF)")
        print("=" * 60)
        print(f"Input: {self.data_path}")

        self.load_data()

        df_hand = self.extract_handcrafted_features().reset_index(drop=True)
        df_tfidf = self.extract_tfidf_features().reset_index(drop=True)
        labels = self.df['label'].reset_index(drop=True)

        # handcrafted (31) + TF-IDF char n-grams (300) = 331 features
        final_df = pd.concat([df_hand, df_tfidf, labels.rename('label')], axis=1)

        print(f"\nFinal dataset shape: {final_df.shape}")
        print(f"Label distribution:\n{final_df['label'].value_counts().to_string()}")

        if output_path:
            Path(output_path).parent.mkdir(parents=True, exist_ok=True)
            final_df.to_csv(output_path, index=False)
            print(f"\nSaved processed data: {output_path}")

        if vectorizer_path:
            Path(vectorizer_path).parent.mkdir(parents=True, exist_ok=True)
            joblib.dump(self.tfidf, vectorizer_path)
            print(f"Saved TF-IDF vectorizer: {vectorizer_path}")

        return final_df


def main():
    data_dir = Path(__file__).parent.parent.parent
    raw_path = data_dir / 'data' / 'emails' / 'raw'
    processed_dir = data_dir / 'data' / 'emails' / 'processed'

    processed_path = processed_dir / 'emails_processed.csv'
    vectorizer_path = processed_dir / 'tfidf_vectorizer.joblib'

    preprocessor = EmailPreprocessor(str(raw_path))
    preprocessor.preprocess(str(processed_path), str(vectorizer_path))


if __name__ == "__main__":
    main()
