import json
import sys
import warnings
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.metrics import (
    accuracy_score, classification_report, confusion_matrix,
    f1_score, precision_recall_curve, precision_score,
    recall_score, roc_auc_score,
)
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split

warnings.filterwarnings('ignore')


class EmailPhishingModelTrainer:
    """Train and evaluate XGBoost model for phishing email detection."""

    def __init__(self, data_path: str, model_dir: str = None):
        self.data_path = data_path
        self.model_dir = Path(model_dir) if model_dir else Path(__file__).parent / 'models'
        self.model_dir.mkdir(parents=True, exist_ok=True)

        self.df = None
        self.X_train = self.X_test = self.y_train = self.y_test = None
        self.model = None
        self.metrics = {}

    def load_data(self):
        print("\n" + "=" * 60)
        print("LOADING DATA")
        print("=" * 60)

        self.df = pd.read_csv(self.data_path)
        print(f"Samples: {len(self.df)}  |  Features: {len(self.df.columns) - 1}")

        missing = self.df.isnull().sum().sum()
        if missing:
            print(f"Filling {missing} missing values with 0")
            self.df.fillna(0, inplace=True)

        print(f"Label distribution:\n{self.df['label'].value_counts().to_string()}")
        return self.df

    def split_data(self, test_size: float = 0.2, random_state: int = 42):
        print("\n" + "=" * 60)
        print("SPLITTING DATA")
        print("=" * 60)

        X = self.df.drop('label', axis=1)
        y = self.df['label']

        self.X_train, self.X_test, self.y_train, self.y_test = train_test_split(
            X, y, test_size=test_size, random_state=random_state, stratify=y
        )

        print(f"Train: {len(self.X_train)}  (phishing={int((self.y_train==1).sum())}, legit={int((self.y_train==0).sum())})")
        print(f"Test:  {len(self.X_test)}  (phishing={int((self.y_test==1).sum())}, legit={int((self.y_test==0).sum())})")
        return self.X_train, self.X_test, self.y_train, self.y_test

    def train_model(self):
        print("\n" + "=" * 60)
        print("TRAINING XGBOOST MODEL")
        print("=" * 60)

        scale_pos_weight = float((self.y_train == 0).sum() / max(1, (self.y_train == 1).sum()))

        params = {
            'n_estimators': 500,
            'max_depth': 8,
            'learning_rate': 0.05,
            'min_child_weight': 3,
            'gamma': 0.1,
            'subsample': 0.85,
            'colsample_bytree': 0.85,
            'reg_alpha': 0.3,
            'reg_lambda': 1.5,
            'objective': 'binary:logistic',
            'eval_metric': 'aucpr',
            'random_state': 42,
            'tree_method': 'hist',
            'n_jobs': -1,
            'scale_pos_weight': scale_pos_weight,
        }

        print(f"scale_pos_weight: {scale_pos_weight:.3f}")

        self.model = xgb.XGBClassifier(**params)
        self.model.fit(
            self.X_train, self.y_train,
            eval_set=[(self.X_test, self.y_test)],
            verbose=False,
        )
        print("Model trained successfully!")
        return self.model

    def evaluate_model(self):
        print("\n" + "=" * 60)
        print("EVALUATING MODEL")
        print("=" * 60)

        y_proba = self.model.predict_proba(self.X_test)[:, 1]

        precision_vals, recall_vals, thresholds = precision_recall_curve(self.y_test, y_proba)
        f1_scores = 2 * (precision_vals * recall_vals) / (precision_vals + recall_vals + 1e-10)
        best_idx = np.argmax(f1_scores)
        best_threshold = float(thresholds[best_idx]) if best_idx < len(thresholds) else 0.5

        y_pred = (y_proba >= best_threshold).astype(int)

        self.metrics = {
            'accuracy': float(accuracy_score(self.y_test, y_pred)),
            'precision': float(precision_score(self.y_test, y_pred)),
            'recall': float(recall_score(self.y_test, y_pred)),
            'f1': float(f1_score(self.y_test, y_pred)),
            'roc_auc': float(roc_auc_score(self.y_test, y_proba)),
            'optimal_threshold': best_threshold,
        }

        print(f"\nOptimal threshold: {best_threshold:.4f}")
        print(f"Accuracy:  {self.metrics['accuracy']:.4f}")
        print(f"Precision: {self.metrics['precision']:.4f}")
        print(f"Recall:    {self.metrics['recall']:.4f}")
        print(f"F1-Score:  {self.metrics['f1']:.4f}")
        print(f"ROC-AUC:   {self.metrics['roc_auc']:.4f}")

        print(f"\n{classification_report(self.y_test, y_pred, target_names=['Legitimate', 'Phishing'])}")

        cm = confusion_matrix(self.y_test, y_pred)
        print(f"Confusion matrix:")
        print(f"  TN={cm[0,0]:>5}  FP={cm[0,1]:>5}  (legitimate emails)")
        print(f"  FN={cm[1,0]:>5}  TP={cm[1,1]:>5}  (phishing emails)")

        return self.metrics

    def cross_validate(self, cv: int = 5):
        print(f"\n" + "=" * 60)
        print(f"CROSS-VALIDATION ({cv}-FOLD)")
        print("=" * 60)

        cv_scores = cross_val_score(
            self.model, self.X_train, self.y_train,
            cv=StratifiedKFold(n_splits=cv, shuffle=True, random_state=42),
            scoring='f1',
        )
        print(f"F1 per fold: {np.round(cv_scores, 4)}")
        print(f"Mean F1: {cv_scores.mean():.4f}  (+/- {cv_scores.std():.4f})")
        return cv_scores

    def feature_importance(self, top_n: int = 20):
        print(f"\n" + "=" * 60)
        print("TOP FEATURE IMPORTANCE")
        print("=" * 60)

        importance_df = pd.DataFrame({
            'feature': self.X_train.columns,
            'importance': self.model.feature_importances_,
        }).sort_values('importance', ascending=False)

        print(f"\nTop {top_n} features:")
        for _, row in importance_df.head(top_n).iterrows():
            bar = '█' * int(row['importance'] * 60)
            print(f"  {row['feature']:45s} {bar} {row['importance']:.4f}")

        return importance_df

    def save_model(self, model_name: str = 'email_phishing_detector.joblib'):
        print(f"\n" + "=" * 60)
        print("SAVING MODEL")
        print("=" * 60)

        model_path = self.model_dir / model_name
        joblib.dump(self.model, model_path)
        print(f"Model: {model_path}")

        features_path = self.model_dir / 'features.txt'
        features_path.write_text('\n'.join(self.X_train.columns))
        print(f"Features: {features_path}")

        metadata = {
            'model_name': 'email_phishing_detector',
            'version': '1.0',
            'n_features': len(self.X_train.columns),
            'optimal_threshold': self.metrics.get('optimal_threshold', 0.5),
            'metrics': self.metrics,
        }
        metadata_path = self.model_dir / 'metadata.json'
        metadata_path.write_text(json.dumps(metadata, indent=2))
        print(f"Metadata: {metadata_path}")

        return model_path

    def train_pipeline(self):
        print("\n" + "=" * 60)
        print("  EMAIL PHISHING XGBOOST MODEL TRAINING")
        print("=" * 60)

        self.load_data()
        self.split_data()
        self.train_model()
        self.evaluate_model()
        self.cross_validate()
        self.feature_importance()
        self.save_model()

        print("\n" + "=" * 60)
        print("TRAINING COMPLETE")
        print("=" * 60)
        print(f"F1: {self.metrics['f1']:.4f}  |  ROC-AUC: {self.metrics['roc_auc']:.4f}  |  Threshold: {self.metrics['optimal_threshold']:.4f}")

        if self.metrics['f1'] >= 0.95:
            print("Excellent model — ready for production.")
        elif self.metrics['f1'] >= 0.90:
            print("Very good model — production-ready.")
        elif self.metrics['f1'] >= 0.85:
            print("Good model — consider tuning hyperparameters.")
        else:
            print("Model below expectations — review features/data quality.")

        return self.model, self.metrics


def main():
    script_dir = Path(__file__).parent.parent.parent
    data_path = script_dir / 'data' / 'emails' / 'processed' / 'emails_processed.csv'
    model_dir = Path(__file__).parent / 'models'

    if not data_path.exists():
        print(f"Error: Processed data not found at {data_path}")
        print("Run preprocess.py first!")
        sys.exit(1)

    trainer = EmailPhishingModelTrainer(str(data_path), str(model_dir))
    model, metrics = trainer.train_pipeline()
    return model, metrics


if __name__ == "__main__":
    main()
