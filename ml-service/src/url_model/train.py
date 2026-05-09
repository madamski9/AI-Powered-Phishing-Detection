import pandas as pd
import numpy as np
import xgboost as xgb
import joblib
import os
import sys
import shutil
from pathlib import Path
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, roc_curve, auc, confusion_matrix,
    classification_report, ConfusionMatrixDisplay, precision_recall_curve
)
import matplotlib.pyplot as plt
import warnings

warnings.filterwarnings('ignore')


class URLPhishingModelTrainer:
    """Train and evaluate XGBoost model for phishing URL detection"""

    def __init__(self, data_path: str, model_dir: str = None):
        """
        Initialize trainer

        Args:
            data_path: Path to processed CSV file
            model_dir: Directory to save model (default: ./models)
        """
        self.data_path = data_path
        self.model_dir = model_dir or Path(__file__).parent / 'models'
        Path(self.model_dir).mkdir(exist_ok=True, parents=True)

        self.df = None
        self.X_train = None
        self.X_test = None
        self.y_train = None
        self.y_test = None
        self.model = None
        self.scaler = None
        self.metrics = {}

    def load_data(self):
        """Load processed data from CSV"""
        print("\n" + "="*60)
        print("LOADING DATA")
        print("="*60)

        try:
            self.df = pd.read_csv(self.data_path)
            print(f"Loaded {len(self.df)} samples")
            print(f"Shape: {self.df.shape}")
            print(f"\nFeatures: {len(self.df.columns) - 1}")
            print(f"Feature names:\n{list(self.df.columns[:-1])}")

            # Check for missing values
            missing = self.df.isnull().sum()
            if missing.sum() > 0:
                print(f"\nMissing values:\n{missing[missing > 0]}")
            else:
                print(f"\nNo missing values")

            return self.df
        except Exception as e:
            print(f"Error loading data: {e}")
            raise

    def split_data(self, test_size: float = 0.2, random_state: int = 42):
        """Split data into train/test sets"""
        print("\n" + "="*60)
        print("SPLITTING DATA")
        print("="*60)

        try:
            # Separate features and labels
            X = self.df.drop('Label', axis=1)
            y = self.df['Label']

            print(f"Total samples: {len(X)}")
            print(f"Phishing (1): {(y == 1).sum()}")
            print(f"Legitimate (0): {(y == 0).sum()}")

            # Train/test split with stratification
            self.X_train, self.X_test, self.y_train, self.y_test = train_test_split(
                X, y, test_size=test_size, random_state=random_state, stratify=y
            )

            print(f"\nTrain set: {len(self.X_train)} samples")
            print(f"  - Phishing: {(self.y_train == 1).sum()}")
            print(f"  - Legitimate: {(self.y_train == 0).sum()}")

            print(f"\nTest set: {len(self.X_test)} samples")
            print(f"  - Phishing: {(self.y_test == 1).sum()}")
            print(f"  - Legitimate: {(self.y_test == 0).sum()}")

            return self.X_train, self.X_test, self.y_train, self.y_test
        except Exception as e:
            print(f"Error splitting data: {e}")
            raise

    def train_model(self, n_estimators: int = 600, max_depth: int = 10,
                   learning_rate: float = 0.03, min_child_weight: int = 3,
                   gamma: float = 0.2, subsample: float = 0.9,
                   colsample_bytree: float = 0.9, reg_alpha: float = 0.5,
                   reg_lambda: float = 2):
        """
        Train XGBoost model with optimized hyperparameters

        Args:
            n_estimators: Number of boosting rounds (600 recommended)
            max_depth: Maximum depth of trees (10 recommended)
            learning_rate: Learning rate eta (0.03 recommended)
            min_child_weight: Minimum weight needed in child node (3 recommended)
            gamma: Minimum loss reduction for split (0.2 recommended)
            subsample: Subsample ratio of training instances (0.9 recommended)
            colsample_bytree: Subsample ratio of features (0.9 recommended)
            reg_alpha: L1 regularization term (0.5 recommended)
            reg_lambda: L2 regularization term (2 recommended)
        """
        print("\n" + "="*60)
        print("TRAINING XGBOOST MODEL")
        print("="*60)

        try:
            params = {
                'n_estimators': n_estimators,
                'max_depth': max_depth,
                'learning_rate': learning_rate,
                'min_child_weight': min_child_weight,
                'gamma': gamma,
                'subsample': subsample,
                'colsample_bytree': colsample_bytree,
                'reg_alpha': reg_alpha,
                'reg_lambda': reg_lambda,
                'objective': 'binary:logistic',
                'eval_metric': 'aucpr',
                'random_state': 42,
                'verbosity': 0,
                'tree_method': 'hist',
                'n_jobs': -1,
                'scale_pos_weight': (self.y_train == 0).sum() / (self.y_train == 1).sum()
            }

            print(f"Optimized Parameters:")
            for key, value in params.items():
                if key not in ['objective', 'eval_metric', 'tree_method']:
                    print(f"  {key}: {value}")

            # Train model with optimized hyperparameters
            self.model = xgb.XGBClassifier(**params)

            print(f"\nTraining (optimized hyperparameters: 600 estimators, depth=10, lr=0.03)...")

            self.model.fit(
                self.X_train, self.y_train,
                eval_set=[(self.X_test, self.y_test)],
                verbose=False
            )

            print(f"Model trained successfully!")
            return self.model
        except Exception as e:
            print(f"Error training model: {e}")
            raise

    def evaluate_model(self, threshold_mode: str = 'f1'):
        """
        Evaluate model on test set with threshold optimization

        Args:
            threshold_mode: How to optimize threshold
                - 'f1': Maximize F1 score (balanced)
                - 'security': Lower threshold (0.40-0.50) - catch more phishing
                - 'ux': Higher threshold (0.65-0.80) - fewer false positives
        """
        print("\n" + "="*60)
        print("EVALUATING MODEL")
        print("="*60)

        try:
            # Predictions
            y_pred_proba = self.model.predict_proba(self.X_test)[:, 1]

            # Optimize threshold based on F1 score
            precision_vals, recall_vals, thresholds = precision_recall_curve(
                self.y_test, y_pred_proba
            )

            # Calculate F1 for each threshold
            f1_scores = 2 * (precision_vals * recall_vals) / (precision_vals + recall_vals + 1e-10)
            best_idx = np.argmax(f1_scores)
            best_f1_threshold = thresholds[best_idx] if best_idx < len(thresholds) else 0.5

            # Select threshold based on mode
            if threshold_mode == 'f1':
                best_threshold = best_f1_threshold
                mode_desc = "F1-optimized (balanced)"
            elif threshold_mode == 'security':
                # Security-first: lower threshold to catch more phishing
                best_threshold = 0.45
                mode_desc = "Security-first (lower = catch more phishing)"
            elif threshold_mode == 'ux':
                # UX-first: higher threshold to reduce false positives
                best_threshold = 0.70
                mode_desc = "UX-first (higher = fewer false positives)"
            else:
                best_threshold = best_f1_threshold
                mode_desc = "F1-optimized (balanced)"

            print(f"\nTHRESHOLD OPTIMIZATION:")
            print(f"  Mode: {mode_desc}")
            print(f"  Best F1 threshold: {best_f1_threshold:.4f} (F1={f1_scores[best_idx]:.4f})")
            print(f"  Selected threshold: {best_threshold:.4f}")
            print(f"  Default threshold (0.5) F1: {f1_score(self.y_test, (y_pred_proba >= 0.5).astype(int)):.4f}")

            # Use optimized threshold
            y_pred = (y_pred_proba >= best_threshold).astype(int)

            # Calculate metrics with optimized threshold
            accuracy = accuracy_score(self.y_test, y_pred)
            precision = precision_score(self.y_test, y_pred)
            recall = recall_score(self.y_test, y_pred)
            f1 = f1_score(self.y_test, y_pred)
            roc_auc = roc_auc_score(self.y_test, y_pred_proba)

            # Store metrics (including optimal threshold)
            self.metrics = {
                'accuracy': accuracy,
                'precision': precision,
                'recall': recall,
                'f1': f1,
                'roc_auc': roc_auc,
                'optimal_threshold': best_threshold,
                'threshold_mode': threshold_mode
            }

            # Print metrics
            print(f"\nTEST SET METRICS (threshold={best_threshold:.4f}):")
            print(f"  Accuracy:  {accuracy:.4f}")
            print(f"  Precision: {precision:.4f} (fewer false positives)")
            print(f"  Recall:    {recall:.4f} (catch more phishing)")
            print(f"  F1-Score:  {f1:.4f}")
            print(f"  ROC-AUC:   {roc_auc:.4f}")

            # Classification report
            print(f"\nCLASSIFICATION REPORT:")
            print(classification_report(self.y_test, y_pred,
                                       target_names=['Legitimate', 'Phishing']))

            # Confusion matrix
            cm = confusion_matrix(self.y_test, y_pred)
            print(f"\nCONFUSION MATRIX:")
            print(f"  True Negatives:  {cm[0, 0]:>6} (correctly identified legitimate)")
            print(f"  False Positives: {cm[0, 1]:>6} (incorrectly flagged as phishing)")
            print(f"  False Negatives: {cm[1, 0]:>6} (missed phishing)")
            print(f"  True Positives:  {cm[1, 1]:>6} (correctly identified phishing)")

            return self.metrics
        except Exception as e:
            print(f"Error evaluating model: {e}")
            raise

    def cross_validate(self, cv: int = 5):
        """Perform cross-validation"""
        print(f"\n" + "="*60)
        print(f"CROSS-VALIDATION ({cv}-FOLD)")
        print("="*60)

        try:
            cv_scores = cross_val_score(
                self.model, self.X_train, self.y_train,
                cv=StratifiedKFold(n_splits=cv, shuffle=True, random_state=42),
                scoring='f1'
            )

            print(f"\nF1-Score per fold: {cv_scores}")
            print(f"Mean F1-Score: {cv_scores.mean():.4f} (+/- {cv_scores.std():.4f})")

            return cv_scores
        except Exception as e:
            print(f"Error during cross-validation: {e}")
            raise

    def feature_importance(self, top_n: int = 15):
        """
        Display feature importance and identify zero-importance features
        """
        print(f"\n" + "="*60)
        print(f"FEATURE IMPORTANCE ANALYSIS")
        print("="*60)

        try:
            importance_df = pd.DataFrame({
                'feature': self.X_train.columns,
                'importance': self.model.feature_importances_
            }).sort_values('importance', ascending=False)

            print(f"\n🏆 TOP {top_n} IMPORTANT FEATURES:")
            for idx, row in importance_df.head(top_n).iterrows():
                bar = '█' * int(row['importance'] * 50)
                print(f"{row['feature']:30s} {bar} {row['importance']:.4f}")

            # Find zero-importance features
            zero_importance = importance_df[importance_df['importance'] == 0]
            if len(zero_importance) > 0:
                print(f"\nZERO-IMPORTANCE FEATURES ({len(zero_importance)}):")
                print(f"These features provide NO signal and should be removed:")
                for idx, row in zero_importance.iterrows():
                    print(f"   - {row['feature']}")
                print(f"\nRecommendation: Remove these features in next iteration")

            # Check for over-reliance on single feature
            top_feature_importance = importance_df.iloc[0]['importance']
            if top_feature_importance > 0.30:
                print(f"\nWARNING: Model over-reliant on single feature!")
                print(f"   Top feature '{importance_df.iloc[0]['feature']}' has {top_feature_importance*100:.1f}% importance")
                print(f"   Consider adding more structural features or regularization")

            return importance_df
        except Exception as e:
            print(f"Error getting feature importance: {e}")
            raise

    def save_model(self, model_name: str = 'phishing_detector.joblib'):
        """Save trained model"""
        print(f"\n" + "="*60)
        print(f"SAVING MODEL")
        print("="*60)

        try:
            model_path = Path(self.model_dir) / model_name
            joblib.dump(self.model, model_path)
            print(f"Model saved to: {model_path}")

            # Also save feature names for inference
            features_path = Path(self.model_dir) / 'features.txt'
            with open(features_path, 'w') as f:
                f.write('\n'.join(self.X_train.columns))
            print(f"Feature names saved to: {features_path}")

            # Export to API
            self._export_to_api(model_path, features_path)

            return model_path
        except Exception as e:
            print(f"Error saving model: {e}")
            raise

    def _export_to_api(self, model_path: Path, features_path: Path):
        """Export model and features to API folder for production"""
        try:
            api_models_dir = Path(__file__).parent.parent.parent.parent / 'api' / 'app' / 'models'
            api_models_dir.mkdir(parents=True, exist_ok=True)

            # Copy model
            api_model_path = api_models_dir / 'phishing_detector.joblib'
            shutil.copy(model_path, api_model_path)
            print(f"\nExported model to API: {api_model_path}")

            # Copy features
            api_features_path = api_models_dir / 'features.txt'
            shutil.copy(features_path, api_features_path)
            print(f"Exported features to API: {api_features_path}")

            # Create metadata — convert numpy types to plain Python for JSON
            def _to_python(obj):
                import numpy as np
                if isinstance(obj, (np.floating, np.float32, np.float64)):
                    return float(obj)
                if isinstance(obj, (np.integer,)):
                    return int(obj)
                if isinstance(obj, dict):
                    return {k: _to_python(v) for k, v in obj.items()}
                return obj

            metadata = _to_python({
                'model_name': 'phishing_detector',
                'version': '1.0',
                'optimal_threshold': self.metrics.get('optimal_threshold', 0.5),
                'metrics': self.metrics,
            })

            import json
            metadata_path = api_models_dir / 'metadata.json'
            with open(metadata_path, 'w') as f:
                json.dump(metadata, f, indent=2)
            print(f"Exported metadata to API: {metadata_path}")

        except Exception as e:
            print(f"Warning: Could not export to API: {e}")
            # Don't fail training if API export fails

    def train_pipeline(self, threshold_mode: str = 'f1'):
        """
        Run full training pipeline

        Args:
            threshold_mode: 'f1' (balanced), 'security' (catch more), 'ux' (fewer false positives)
        """
        print("\n" + " "*30)
        print("  PHISHING URL XGBOOST MODEL TRAINING")
        print(" "*30)

        try:
            # Load and prepare data
            self.load_data()
            self.split_data()

            # Train model
            self.train_model()

            # Evaluate
            self.evaluate_model(threshold_mode=threshold_mode)
            self.cross_validate()

            # Feature importance
            self.feature_importance()

            # Save
            self.save_model()

            # Final summary
            self._print_summary()

            return self.model, self.metrics
        except Exception as e:
            print(f"\nPipeline failed: {e}")
            raise

    def _print_summary(self):
        """Print training summary"""
        print("\n" + "="*60)
        print("TRAINING COMPLETE")
        print("="*60)
        print(f"\nModel Performance Summary:")
        print(f"  Accuracy:          {self.metrics['accuracy']:.4f}")
        print(f"  Precision:         {self.metrics['precision']:.4f}")
        print(f"  Recall:            {self.metrics['recall']:.4f}")
        print(f"  F1-Score:          {self.metrics['f1']:.4f}")
        print(f"  ROC-AUC:           {self.metrics['roc_auc']:.4f}")
        print(f"  Optimal Threshold: {self.metrics.get('optimal_threshold', 0.5):.4f}")

        if self.metrics['f1'] > 0.9:
            print(f"\nExcellent model! Ready for production.")
        elif self.metrics['f1'] > 0.85:
            print(f"\nVery good model. Production-ready.")
        elif self.metrics['f1'] > 0.8:
            print(f"\nGood model. Consider tuning hyperparameters.")
        else:
            print(f"\nModel performance below expectations. Review features/data.")
        print("="*60 + "\n")


def main():
    """Main training function"""
    # Paths
    script_dir = Path(__file__).parent.parent.parent
    data_path = script_dir / 'data' / 'urls' / 'processed' / 'phishing_urls_processed.csv'
    model_dir = Path(__file__).parent / 'models'

    # Check if processed data exists
    if not data_path.exists():
        print(f"Error: Processed data not found at {data_path}")
        print(f"   Please run preprocessing first!")
        sys.exit(1)

    # Train model with threshold optimization
    # Options: 'f1' (balanced), 'security' (catch more phishing), 'ux' (fewer false positives)
    trainer = URLPhishingModelTrainer(str(data_path), str(model_dir))
    model, metrics = trainer.train_pipeline(threshold_mode='f1')

    print(f"\n" + "="*60)
    print(f"📌 THRESHOLD CONFIGURATION NOTES:")
    print("="*60)
    print(f"Current mode: 'security' (catch more phishing)")
    print(f"Current threshold: {metrics.get('optimal_threshold', 0.5):.4f}")
    print(f"\nTo change threshold strategy:")
    print(f"  - 'f1':       Balanced (maximize F1 score)")
    print(f"  - 'security': Lower threshold (0.45, catch more phishing)")
    print(f"  - 'ux':       Higher threshold (0.70, fewer false positives)")
    print(f"\nEdit: trainer.train_pipeline(threshold_mode='YOUR_MODE')")
    print("="*60)

    return model, metrics


if __name__ == "__main__":
    main()