"""
Generate evaluation plots for URL and Email phishing detection models.
Output: ml-service/plots/{url,email}/*.png
"""

import json
from pathlib import Path

import joblib
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
import numpy as np
import pandas as pd
import seaborn as sns
from sklearn.metrics import (
    confusion_matrix,
    precision_recall_curve,
    roc_curve,
    roc_auc_score,
    f1_score,
)
from sklearn.model_selection import train_test_split

ROOT = Path(__file__).parent.parent
PLOTS = ROOT / "plots"

PALETTE = {
    "phishing": "#E53935",
    "legit":    "#1E88E5",
    "accent":   "#43A047",
    "neutral":  "#757575",
    "bg":       "#FAFAFA",
}
sns.set_theme(style="whitegrid", font_scale=1.1)
plt.rcParams.update({"figure.dpi": 150, "savefig.bbox": "tight"})


# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────

def _save(fig: plt.Figure, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(path, facecolor=PALETTE["bg"])
    plt.close(fig)
    print(f"  Saved: {path.relative_to(ROOT)}")


def plot_confusion_matrix(y_true, y_pred, threshold: float, title: str, out: Path) -> None:
    cm = confusion_matrix(y_true, y_pred)
    tn, fp, fn, tp = cm.ravel()

    fig, ax = plt.subplots(figsize=(6, 5))
    fig.patch.set_facecolor(PALETTE["bg"])

    labels = np.array([[f"TN\n{tn}", f"FP\n{fp}"], [f"FN\n{fn}", f"TP\n{tp}"]])
    cmap = sns.diverging_palette(240, 10, as_cmap=True)
    sns.heatmap(
        cm, annot=labels, fmt="", cmap="Blues",
        linewidths=1, linecolor="white",
        xticklabels=["Legit (pred)", "Phishing (pred)"],
        yticklabels=["Legit (true)", "Phishing (true)"],
        ax=ax, cbar=False, annot_kws={"size": 15, "weight": "bold"},
    )
    acc = (tp + tn) / cm.sum()
    ax.set_title(f"{title}\nAccuracy {acc:.2%}  |  Threshold {threshold:.4f}", fontsize=13)
    _save(fig, out)


def plot_roc(y_true, y_proba, auc: float, title: str, out: Path) -> None:
    fpr, tpr, _ = roc_curve(y_true, y_proba)
    fig, ax = plt.subplots(figsize=(6, 5))
    fig.patch.set_facecolor(PALETTE["bg"])

    ax.plot(fpr, tpr, color=PALETTE["phishing"], lw=2, label=f"ROC  (AUC = {auc:.4f})")
    ax.plot([0, 1], [0, 1], "--", color=PALETTE["neutral"], lw=1, label="Random")
    ax.fill_between(fpr, tpr, alpha=0.08, color=PALETTE["phishing"])
    ax.set_xlabel("False Positive Rate")
    ax.set_ylabel("True Positive Rate")
    ax.set_title(f"{title} — ROC Curve", fontsize=13)
    ax.legend(loc="lower right")
    _save(fig, out)


def plot_precision_recall(y_true, y_proba, threshold: float, title: str, out: Path) -> None:
    prec, rec, threshs = precision_recall_curve(y_true, y_proba)
    f1s = 2 * prec * rec / (prec + rec + 1e-10)
    best_idx = np.argmax(f1s)

    fig, ax = plt.subplots(figsize=(6, 5))
    fig.patch.set_facecolor(PALETTE["bg"])

    ax.plot(rec, prec, color=PALETTE["legit"], lw=2, label="Precision-Recall")
    ax.fill_between(rec, prec, alpha=0.08, color=PALETTE["legit"])
    ax.scatter(rec[best_idx], prec[best_idx], s=120, zorder=5,
               color=PALETTE["phishing"],
               label=f"Best F1={f1s[best_idx]:.4f}  thr={threshold:.4f}")
    ax.set_xlabel("Recall")
    ax.set_ylabel("Precision")
    ax.set_title(f"{title} — Precision-Recall Curve", fontsize=13)
    ax.legend()
    _save(fig, out)


def plot_threshold_analysis(y_true, y_proba, threshold: float, title: str, out: Path) -> None:
    threshs = np.linspace(0.01, 0.99, 200)
    precs, recs, f1s = [], [], []
    for t in threshs:
        y_pred = (y_proba >= t).astype(int)
        tp = ((y_pred == 1) & (y_true == 1)).sum()
        fp = ((y_pred == 1) & (y_true == 0)).sum()
        fn = ((y_pred == 0) & (y_true == 1)).sum()
        p = tp / (tp + fp + 1e-10)
        r = tp / (tp + fn + 1e-10)
        precs.append(p)
        recs.append(r)
        f1s.append(2 * p * r / (p + r + 1e-10))

    fig, ax = plt.subplots(figsize=(7, 5))
    fig.patch.set_facecolor(PALETTE["bg"])

    ax.plot(threshs, precs, label="Precision", color=PALETTE["legit"], lw=2)
    ax.plot(threshs, recs,  label="Recall",    color=PALETTE["phishing"], lw=2)
    ax.plot(threshs, f1s,   label="F1",        color=PALETTE["accent"], lw=2)
    ax.axvline(threshold, color="black", lw=1.2, ls="--", label=f"Threshold = {threshold:.4f}")
    ax.set_xlabel("Threshold")
    ax.set_ylabel("Score")
    ax.set_title(f"{title} — Threshold Analysis", fontsize=13)
    ax.legend()
    _save(fig, out)


def plot_proba_distribution(y_true, y_proba, threshold: float, title: str, out: Path) -> None:
    fig, ax = plt.subplots(figsize=(7, 5))
    fig.patch.set_facecolor(PALETTE["bg"])

    ax.hist(y_proba[y_true == 0], bins=60, alpha=0.6,
            color=PALETTE["legit"], label="Legitimate", density=True)
    ax.hist(y_proba[y_true == 1], bins=60, alpha=0.6,
            color=PALETTE["phishing"], label="Phishing", density=True)
    ax.axvline(threshold, color="black", lw=1.5, ls="--", label=f"Threshold = {threshold:.4f}")
    ax.set_xlabel("Predicted Phishing Probability")
    ax.set_ylabel("Density")
    ax.set_title(f"{title} — Probability Distribution", fontsize=13)
    ax.legend()
    _save(fig, out)


def plot_feature_importance(model, feature_names: list[str], title: str, out: Path,
                             top_n: int = 25, skip_prefix: str = None) -> None:
    importances = model.feature_importances_
    df = pd.DataFrame({"feature": feature_names, "importance": importances})

    if skip_prefix:
        df = df[~df["feature"].str.startswith(skip_prefix)]

    df = df.nlargest(top_n, "importance").sort_values("importance")

    fig, ax = plt.subplots(figsize=(8, max(5, top_n * 0.35)))
    fig.patch.set_facecolor(PALETTE["bg"])

    colors = [PALETTE["phishing"] if v >= df["importance"].quantile(0.75) else PALETTE["legit"]
              for v in df["importance"]]
    ax.barh(df["feature"], df["importance"], color=colors, edgecolor="white")
    ax.set_xlabel("Feature Importance (gain)")
    ax.set_title(f"{title}\nTop {top_n} handcrafted features", fontsize=13)
    ax.tick_params(axis="y", labelsize=9)
    _save(fig, out)


def plot_tfidf_importance(model, feature_names: list[str], title: str, out: Path,
                           top_n: int = 20) -> None:
    importances = model.feature_importances_
    df = pd.DataFrame({"feature": feature_names, "importance": importances})
    df = df[df["feature"].str.startswith("tfidf_")]
    df["label"] = df["feature"].str.replace("tfidf_", "", n=1)
    df = df.nlargest(top_n, "importance").sort_values("importance")

    fig, ax = plt.subplots(figsize=(8, max(5, top_n * 0.38)))
    fig.patch.set_facecolor(PALETTE["bg"])

    ax.barh(df["label"], df["importance"], color=PALETTE["accent"], edgecolor="white")
    ax.set_xlabel("Feature Importance (gain)")
    ax.set_title(f"{title}\nTop {top_n} TF-IDF char n-gram features", fontsize=13)
    ax.tick_params(axis="y", labelsize=9)
    _save(fig, out)


def plot_metrics_bar(metrics: dict, title: str, out: Path) -> None:
    keys   = ["accuracy", "precision", "recall", "f1", "roc_auc"]
    labels = ["Accuracy", "Precision", "Recall", "F1", "ROC-AUC"]
    vals   = [metrics[k] for k in keys]

    fig, ax = plt.subplots(figsize=(7, 4))
    fig.patch.set_facecolor(PALETTE["bg"])

    bars = ax.bar(labels, vals,
                  color=[PALETTE["phishing"], PALETTE["legit"], PALETTE["accent"],
                         "#FB8C00", "#8E24AA"],
                  edgecolor="white", width=0.55)
    ax.set_ylim(min(vals) - 0.05, 1.02)
    ax.set_ylabel("Score")
    ax.set_title(f"{title} — Model Metrics", fontsize=13)
    for bar, val in zip(bars, vals):
        ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.003,
                f"{val:.4f}", ha="center", va="bottom", fontsize=10, fontweight="bold")
    _save(fig, out)


# ─────────────────────────────────────────────────────────────
# URL model
# ─────────────────────────────────────────────────────────────

def run_url():
    print("\n" + "=" * 60)
    print("URL MODEL PLOTS")
    print("=" * 60)

    model_dir = ROOT / "src" / "url_model" / "models"
    data_path = ROOT / "data" / "urls" / "processed" / "phishing_urls_processed.csv"
    out_dir   = PLOTS / "url"

    model    = joblib.load(model_dir / "phishing_detector.joblib")
    features = (model_dir / "features.txt").read_text().splitlines()
    metadata = json.loads((model_dir / "metadata.json").read_text())
    threshold = metadata["optimal_threshold"]
    metrics   = metadata["metrics"]

    print(f"  Loading dataset: {data_path.name}")
    df = pd.read_csv(data_path).fillna(0)
    # dataset uses capital "Label"
    label_col = "Label" if "Label" in df.columns else "label"
    X  = df[features]
    y  = df[label_col].values

    _, X_test, _, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    y_proba = model.predict_proba(X_test)[:, 1]
    y_pred  = (y_proba >= threshold).astype(int)

    print("  Generating plots...")
    plot_confusion_matrix(y_test, y_pred, threshold, "URL Model", out_dir / "confusion_matrix.png")
    plot_roc(y_test, y_proba, metrics["roc_auc"], "URL Model", out_dir / "roc_curve.png")
    plot_precision_recall(y_test, y_proba, threshold, "URL Model", out_dir / "precision_recall.png")
    plot_threshold_analysis(y_test, y_proba, threshold, "URL Model", out_dir / "threshold_analysis.png")
    plot_proba_distribution(y_test, y_proba, threshold, "URL Model", out_dir / "proba_distribution.png")
    plot_feature_importance(model, features, "URL Model", out_dir / "feature_importance.png")
    plot_metrics_bar(metrics, "URL Model", out_dir / "metrics_bar.png")


# ─────────────────────────────────────────────────────────────
# Email model
# ─────────────────────────────────────────────────────────────

def run_email():
    print("\n" + "=" * 60)
    print("EMAIL MODEL PLOTS")
    print("=" * 60)

    model_dir   = ROOT / "src" / "email_model" / "models"
    data_path   = ROOT / "data" / "emails" / "processed" / "emails_processed.csv"
    out_dir     = PLOTS / "email"

    model    = joblib.load(model_dir / "email_phishing_detector.joblib")
    features = (model_dir / "features.txt").read_text().splitlines()
    metadata = json.loads((model_dir / "metadata.json").read_text())
    threshold = metadata["optimal_threshold"]
    metrics   = metadata["metrics"]

    print(f"  Loading dataset: {data_path.name}")
    df = pd.read_csv(data_path).fillna(0)
    X  = df[features]
    y  = df["label"].values

    _, X_test, _, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    y_proba = model.predict_proba(X_test)[:, 1]
    y_pred  = (y_proba >= threshold).astype(int)

    print("  Generating plots...")
    plot_confusion_matrix(y_test, y_pred, threshold, "Email Model", out_dir / "confusion_matrix.png")
    plot_roc(y_test, y_proba, metrics["roc_auc"], "Email Model", out_dir / "roc_curve.png")
    plot_precision_recall(y_test, y_proba, threshold, "Email Model", out_dir / "precision_recall.png")
    plot_threshold_analysis(y_test, y_proba, threshold, "Email Model", out_dir / "threshold_analysis.png")
    plot_proba_distribution(y_test, y_proba, threshold, "Email Model", out_dir / "proba_distribution.png")
    plot_feature_importance(model, features, "Email Model", out_dir / "feature_importance.png",
                             skip_prefix="tfidf_")
    plot_tfidf_importance(model, features, "Email Model", out_dir / "tfidf_importance.png")
    plot_metrics_bar(metrics, "Email Model", out_dir / "metrics_bar.png")


if __name__ == "__main__":
    run_url()
    run_email()
    print(f"\nAll plots saved to: {PLOTS}")
