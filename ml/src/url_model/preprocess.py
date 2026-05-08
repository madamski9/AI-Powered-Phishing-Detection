import pandas as pd
import numpy as np
from urllib.parse import urlparse, parse_qs
import os
import sys
import re
import math
import warnings
import requests
from pathlib import Path
from difflib import SequenceMatcher
from collections import Counter

warnings.filterwarnings('ignore', category=Warning)

KNOWN_BRANDS = {
    'paypal', 'ebay', 'amazon', 'apple', 'google', 'facebook', 'microsoft',
    'twitter', 'instagram', 'netflix', 'linkedin', 'youtube', 'adobe',
    'dropbox', 'onedrive', 'icloud', 'gmail', 'outlook', 'yahoo',
    'bank', 'visa', 'mastercard', 'hsbc', 'wells', 'citibank',
    'chase', 'barclays', 'santander', 'deutsche', 'bnp'
}

class URLPreprocessor:
    """Preprocess URLs and extract features for phishing detection"""

    def __init__(self, csv_path: str):
        """
        Initialize preprocessor with CSV file path

        Args:
            csv_path: Path to the CSV file with columns: URL, Label
        """
        self.csv_path = csv_path
        self.df = None

        # Counters for logging
        self.total_urls = 0
        self.successful_urls = 0
        self.failed_urls = 0
        self.empty_domain_urls = 0
        self.ip_address_urls = 0
        self.suspicious_urls = 0

    def load_data(self):
        """Load CSV data"""
        self.df = pd.read_csv(self.csv_path)
        print(f"Loaded {len(self.df)} URLs from CSV")
        return self.df

    def encode_labels(self):
        """Convert labels: bad -> 1, good -> 0"""
        label_mapping = {'bad': 1, 'good': 0}
        self.df['Label'] = self.df['Label'].str.lower().map(label_mapping)

        if self.df['Label'].isna().any():
            print("Warning: Found unmapped labels, replacing with 0")
            self.df['Label'].fillna(0, inplace=True)

        bad_count = (self.df['Label'] == 1).sum()
        good_count = (self.df['Label'] == 0).sum()
        print(f"Labels encoded: {bad_count} bad (1), {good_count} good (0)")
        return self.df

    def extract_features(self):
        """Extract features from URLs for ML model"""
        features = []

        print("\n" + "="*60)
        print("Starting feature extraction...")
        print("="*60)

        self.total_urls = len(self.df['URL'])
        self.successful_urls = 0
        self.failed_urls = 0
        self.empty_domain_urls = 0
        self.ip_address_urls = 0
        self.suspicious_urls = 0

        for idx, url in enumerate(self.df['URL'], 1):
            feature_vector = self._extract_url_features(url)
            features.append(feature_vector)

            # Progress indicator
            if idx % max(1, self.total_urls // 10) == 0:
                progress_pct = (idx / self.total_urls) * 100
                print(f"Progress: {progress_pct:.1f}% ({idx}/{self.total_urls})")

        features_df = pd.DataFrame(features)
        self.df = pd.concat([features_df, self.df[['Label']]], axis=1)

        print(f"\nExtracted {len(features_df.columns)} features from URLs")
        self._print_statistics()
        return self.df

    def _print_statistics(self):
        """Print processing statistics"""
        print("\n" + "="*60)
        print("PROCESSING STATISTICS")
        print("="*60)
        print(f"Total URLs processed:        {self.total_urls}")
        print(f"Successfully processed:      {self.successful_urls}")
        print(f"Failed to process:           {self.failed_urls}")
        print(f"Empty domain URLs:           {self.empty_domain_urls}")
        print(f"IP address URLs:             {self.ip_address_urls}")
        print(f"Suspicious URLs detected:    {self.suspicious_urls}")

        success_rate = (self.successful_urls / max(1, self.total_urls)) * 100
        print(f"\nSuccess rate: {success_rate:.1f}%")

        if self.failed_urls > 0:
            print(f"\nWARNING: {self.failed_urls} URLs failed processing!")
        if self.empty_domain_urls > 0:
            print(f"WARNING: {self.empty_domain_urls} URLs had empty domains!")
        if success_rate < 90:
            print(f"WARNING: Success rate below 90%! Check your data!")
        else:
            print(f"All systems nominal!")
        print("="*60 + "\n")

    @staticmethod
    def _is_ip_address(domain: str) -> int:
        """Check if domain is IP address"""
        ip_pattern = r'^(\d{1,3}\.){3}\d{1,3}$'
        return 1 if re.match(ip_pattern, domain) else 0

    @staticmethod
    def _extract_tld(domain: str) -> str:
        """Extract TLD from domain (e.g., 'ru', 'com', 'xyz')"""
        if not domain:
            return ''
        parts = domain.split('.')
        if len(parts) >= 2:
            return parts[-1]
        return ''

    @staticmethod
    def _is_suspicious_tld(tld: str) -> int:
        """Check if TLD is suspicious (rare, new, or phishing-prone)"""
        suspicious_tlds = {
            'tk', 'ml', 'ga', 'cf', 'xyz', 'top', 'download', 'review',
            'stream', 'racing', 'win', 'cricket', 'faith', 'date', 'men',
            'science', 'trade', 'accountant', 'bid', 'click', 'party',
            'space', 'tech', 'website', 'webcam', 'cz', 'ru', 'ua', 'ir'
        }
        return 1 if tld.lower() in suspicious_tlds else 0

    @staticmethod
    def _count_char_occurrences(text: str, char: str) -> int:
        """Count occurrences of specific character"""
        return sum(1 for c in text if c == char)

    @staticmethod
    def _extract_path(url: str) -> str:
        """Extract path from URL"""
        try:
            parsed = urlparse(url)
            return parsed.path if parsed.path else ''
        except:
            return ''

    @staticmethod
    def _sanitize_url(url: str) -> str:
        """Sanitize URL by removing or encoding invalid characters"""
        try:
            # Encode to ASCII, ignoring invalid characters
            url = url.encode('ascii', 'ignore').decode('ascii')
        except Exception:
            pass
        return url

    @staticmethod
    def _extract_domain_fallback(url: str) -> str:
        """
        Fallback domain extraction for malformed URLs
        Try to find domain pattern: something.something
        """
        # Remove protocol if present
        url = re.sub(r'^(https?://)', '', url, flags=re.IGNORECASE)

        # Extract first part that looks like domain (before /, ?, #, etc.)
        match = re.match(r'^([^/?#\s]+)', url)
        if match:
            potential_domain = match.group(1)
            # Try to find something.something pattern
            domain_match = re.search(r'([a-zA-Z0-9-]+\.[a-zA-Z0-9.-]+)', potential_domain)
            if domain_match:
                return domain_match.group(1)
            return potential_domain
        return ''

    @staticmethod
    def _parse_url_advanced(url: str) -> tuple:
        """
        Advanced URL parser that extracts domain and embedded URLs
        Handles malformed and corrupted URLs gracefully

        Args:
            url: URL string to parse

        Returns:
            tuple: (domain, embedded_urls_list)
        """
        url = url.strip()

        # Sanitize URL first
        url = URLPreprocessor._sanitize_url(url)

        # Add schema if missing
        if not url.startswith(("http://", "https://")):
            url = "http://" + url

        try:
            parsed = urlparse(url)

            # Extract domain from netloc (fallback)
            domain = parsed.netloc

            # If domain extraction failed, use fallback
            if not domain:
                domain = URLPreprocessor._extract_domain_fallback(url)

            # Extract query parameters
            embedded = []
            try:
                query = parse_qs(parsed.query)
                # Look for embedded URLs in query parameters
                for v in query.values():
                    for item in v:
                        if "http" in item.lower():
                            embedded.append(item)
            except Exception:
                # Silently fail on query parsing, we have domain anyway
                pass

            return domain, embedded
        except Exception:
            # Final fallback: try to extract domain from original URL
            domain = URLPreprocessor._extract_domain_fallback(url)
            return domain, []

    @staticmethod
    def _calculate_entropy(text: str) -> float:
        """Calculate Shannon entropy of text"""
        if not text:
            return 0.0

        char_counts = Counter(text)
        text_len = len(text)
        entropy = 0.0

        for count in char_counts.values():
            probability = count / text_len
            entropy -= probability * math.log2(probability + 1e-10)

        return entropy

    @staticmethod
    def _levenshtein_distance(s1: str, s2: str) -> int:
        """Calculate Levenshtein distance between two strings"""
        if len(s1) < len(s2):
            return URLPreprocessor._levenshtein_distance(s2, s1)

        if len(s2) == 0:
            return len(s1)

        previous_row = range(len(s2) + 1)
        for i, c1 in enumerate(s1):
            current_row = [i + 1]
            for j, c2 in enumerate(s2):
                insertions = previous_row[j + 1] + 1
                deletions = current_row[j] + 1
                substitutions = previous_row[j] + (c1 != c2)
                current_row.append(min(insertions, deletions, substitutions))
            previous_row = current_row

        return previous_row[-1]

    def _find_closest_brand(self, domain: str) -> tuple:
        """Find closest known brand using Levenshtein distance"""
        domain_lower = domain.lower()

        for brand in KNOWN_BRANDS:
            if brand in domain_lower:
                return brand, 0

        min_distance = float('inf')
        closest_brand = ''

        for brand in KNOWN_BRANDS:
            distance = self._levenshtein_distance(domain_lower, brand)
            if distance < min_distance:
                min_distance = distance
                closest_brand = brand

        return closest_brand, min_distance

    @staticmethod
    def _contains_known_brand(domain: str) -> int:
        """Check if domain contains any known brand name"""
        domain_lower = domain.lower()
        for brand in KNOWN_BRANDS:
            if brand in domain_lower:
                return 1
        return 0

    @staticmethod
    def _split_domain_tokens(domain: str) -> list:
        """
        Split domain into tokens
        Example: facebook-login-secure.com → [facebook, login, secure]
        """
        if not domain:
            return []

        # Remove TLD and www
        parts = domain.lower().split('.')
        if parts[0] == 'www':
            parts = parts[1:]

        # Remove the TLD itself
        domain_name = '.'.join(parts[:-1]) if len(parts) > 1 else parts[0]

        # Split by common delimiters
        tokens = re.split(r'[-_.]', domain_name)
        # Filter empty tokens
        tokens = [t for t in tokens if t and len(t) > 1]

        return tokens

    @staticmethod
    def _count_suspicious_tokens(tokens: list) -> int:
        """Count tokens that match suspicious keywords"""
        suspicious_keywords = [
            'login', 'verify', 'confirm', 'update', 'secure', 'account',
            'password', 'signin', 'auth', 'validate', 'activate',
            'paypal', 'ebay', 'amazon', 'apple', 'google', 'bank',
            'admin', 'panel', 'support', 'service', 'webmail', 'mail'
        ]

        count = 0
        for token in tokens:
            if token in suspicious_keywords:
                count += 1
        return count

    @staticmethod
    def _try_expand_url(url: str, timeout: int = 2) -> str:
        """
        Try to expand shortened URL (bit.ly, tinyurl, etc.)
        Returns final domain if successful, else original
        """
        try:
            # Check if it's a shortened URL
            shortened_domains = ['bit.ly', 'tinyurl.com', 'ow.ly', 't.co', 'goo.gl', 'short.link']

            if any(short in url for short in shortened_domains):
                # Try to follow redirects (without actually downloading the page)
                response = requests.head(url, allow_redirects=True, timeout=timeout, verify=False)
                return response.url
        except Exception:
            pass

        return url

    def _extract_url_features(self, url: str) -> dict:
        """
        Extract features from a single URL

        Features (20 total):
        - url_length: Total length of URL
        - domain_length: Length of domain
        - path_length: Length of path
        - subdomain_count: Number of subdomains
        - special_char_count: Number of special characters
        - digit_count: Number of digits
        - digit_ratio: Ratio of digits to URL length
        - dash_count: Number of dashes in URL
        - dot_count: Number of dots in URL
        - query_param_count: Number of query parameters
        - suspicious_words: Count of common phishing keywords
        - is_ip_address: Whether domain is IP address
        - has_https: Whether URL uses HTTPS
        - tld_entropy: Shannon entropy of TLD
        - domain_entropy: Shannon entropy of domain
        - path_entropy: Shannon entropy of path
        - url_entropy: Shannon entropy of entire URL
        - levenshtein_to_brand: Levenshtein distance to closest known brand
        - contains_brand: Whether domain contains known brand name
        - domain_tokens_count: Number of tokens in domain (facebook-login → 2)
        - suspicious_tokens: Tokens matching suspicious keywords
        - suspicious_tld: Whether TLD is suspicious
        """
        try:
            # Use advanced parser to extract domain and embedded URLs
            domain, embedded_urls = self._parse_url_advanced(url)

            # Standard parsing with fallback - suppress IPv6 warnings
            try:
                parsed = urlparse(url)
            except Exception:
                # If urlparse fails, create minimal parsed object
                parsed = type('obj', (object,), {
                    'scheme': '',
                    'netloc': domain,
                    'path': '',
                    'query': ''
                })()

            url_length = len(url)
            domain_length = len(domain)
            subdomain_count = domain.count('.') if domain else 0

            # Extract path features
            path = parsed.path if parsed.path else ''
            path_length = len(path)
            path_entropy = self._calculate_entropy(path)

            # Count special characters
            special_chars = sum(1 for c in url if c in ['@', ':', '#', '?', '&', '=', '-', '_', '.'])
            digit_count = sum(1 for c in url if c.isdigit())
            digit_ratio = digit_count / max(1, url_length)

            # Count dashes and dots
            dash_count = self._count_char_occurrences(url, '-')
            dot_count = self._count_char_occurrences(url, '.')

            # Count query parameters
            query_param_count = len(parsed.query.split('&')) if parsed.query else 0

            # Check HTTPS
            has_https = 1 if parsed.scheme.lower() == 'https' else 0

            # Calculate entropy of full URL
            url_entropy = self._calculate_entropy(url)

            suspicious_keywords = [
                'login', 'verify', 'confirm', 'update', 'secure', 'account',
                'password', 'signin', 'auth', 'validate', 'activate',
                'paypal', 'ebay', 'amazon', 'apple', 'google'
            ]
            suspicious_count = sum(1 for keyword in suspicious_keywords if keyword in url.lower())

            # Include embedded URLs in suspicious count
            if embedded_urls:
                suspicious_count += len(embedded_urls)

            # Extract domain tokens (facebook-login-secure → [facebook, login, secure])
            tokens = self._split_domain_tokens(domain)
            domain_tokens_count = len(tokens)
            suspicious_tokens = self._count_suspicious_tokens(tokens)

            is_ip = self._is_ip_address(domain)
            tld = self._extract_tld(domain)
            tld_entropy = self._calculate_entropy(tld)
            suspicious_tld = self._is_suspicious_tld(tld)
            domain_entropy = self._calculate_entropy(domain)
            closest_brand, lev_distance = self._find_closest_brand(domain)
            contains_brand = self._contains_known_brand(domain)

            # Update counters
            if not domain:
                self.empty_domain_urls += 1
            else:
                self.successful_urls += 1

            if is_ip:
                self.ip_address_urls += 1

            if suspicious_count > 2:
                self.suspicious_urls += 1

            return {
                'url_length': url_length,
                'domain_length': domain_length,
                'path_length': path_length,
                'subdomain_count': subdomain_count,
                'special_char_count': special_chars,
                'digit_count': digit_count,
                'digit_ratio': digit_ratio,
                'dash_count': dash_count,
                'dot_count': dot_count,
                'query_param_count': query_param_count,
                'suspicious_words': suspicious_count,
                'is_ip_address': is_ip,
                'has_https': has_https,
                'tld_entropy': tld_entropy,
                'domain_entropy': domain_entropy,
                'path_entropy': path_entropy,
                'url_entropy': url_entropy,
                'levenshtein_to_brand': lev_distance,
                'contains_brand': contains_brand,
                'domain_tokens_count': domain_tokens_count,
                'suspicious_tokens': suspicious_tokens,
                'suspicious_tld': suspicious_tld
            }
        except Exception:
            # Silently return default features for malformed URLs
            self.failed_urls += 1
            return {
                'url_length': 0,
                'domain_length': 0,
                'path_length': 0,
                'subdomain_count': 0,
                'special_char_count': 0,
                'digit_count': 0,
                'digit_ratio': 0.0,
                'dash_count': 0,
                'dot_count': 0,
                'query_param_count': 0,
                'suspicious_words': 0,
                'is_ip_address': 0,
                'has_https': 0,
                'tld_entropy': 0.0,
                'domain_entropy': 0.0,
                'path_entropy': 0.0,
                'url_entropy': 0.0,
                'levenshtein_to_brand': 999,
                'contains_brand': 0,
                'domain_tokens_count': 0,
                'suspicious_tokens': 0,
                'suspicious_tld': 0
            }

    def save_processed_data(self, output_path: str):
        """Save processed data to CSV"""
        self.df.to_csv(output_path, index=False)
        print(f"Saved processed data to {output_path}")
        print(f"Shape: {self.df.shape}")

    def get_statistics(self):
        """Print data statistics"""
        print("\n=== Data Statistics ===")
        print(f"Total samples: {len(self.df)}")
        print(f"\nLabel distribution:")
        print(self.df['Label'].value_counts())
        print(f"\nFeature statistics:")
        print(self.df.describe())

    def preprocess(self, output_path: str = None):
        """
        Run full preprocessing pipeline

        Args:
            output_path: Path to save processed data (optional)
        """
        print("\n" + "="*60)
        print("PHISHING URL PREPROCESSOR")
        print("="*60)
        print(f"Input file: {self.csv_path}")
        print("="*60 + "\n")

        self.load_data()
        self.encode_labels()
        self.extract_features()
        self.get_statistics()

        if output_path:
            self.save_processed_data(output_path)

        return self.df


def main():
    """Main function"""
    data_dir = str(Path(__file__).parent.parent.parent)
    raw_data_path = os.path.join(data_dir, 'data', 'urls', 'raw', 'phishing_site_urls.csv')
    processed_data_path = os.path.join(data_dir, 'data', 'urls', 'processed', 'phishing_urls_processed.csv')

    os.makedirs(os.path.dirname(processed_data_path), exist_ok=True)

    preprocessor = URLPreprocessor(raw_data_path)
    df = preprocessor.preprocess(processed_data_path)

    return df


if __name__ == "__main__":
    main()
