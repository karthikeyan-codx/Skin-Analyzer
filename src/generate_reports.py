"""
HAM10000 Skin Disease Classification - Evaluation and Reporting Script
======================================================================
Standalone evaluation script that:
1. Loads trained model (models/skin_disease_model.keras)
2. Loads test dataset (dataset/X_test.npy, dataset/y_test.npy)
3. Evaluates model performance on the test split
4. Predicts all test samples
5. Prints the scikit-learn classification report
6. Generates and saves a confusion matrix using pure Matplotlib (no Seaborn)
7. Generates training curves if models/training_history.json exists
8. Handles missing files gracefully and works seamlessly across Windows & TF 2.x
"""

import json
import logging
import os
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union

import matplotlib.pyplot as plt
import numpy as np
from sklearn.metrics import classification_report, confusion_matrix

# Suppress noisy TensorFlow C++ logs before importing TF
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"

import tensorflow as tf

# ---------------------------------------------------------------------------
# Logging Configuration
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants & Paths (Using pathlib everywhere)
# ---------------------------------------------------------------------------
BASE_DIR: Path = Path(__file__).resolve().parent.parent
MODELS_DIR: Path = BASE_DIR / "models"
DATASET_DIR: Path = BASE_DIR / "dataset"

MODEL_PATH: Path = MODELS_DIR / "skin_disease_model.keras"
X_TEST_PATH: Path = DATASET_DIR / "X_test.npy"
Y_TEST_PATH: Path = DATASET_DIR / "y_test.npy"

CONFUSION_MATRIX_PATH: Path = MODELS_DIR / "confusion_matrix.png"
TRAINING_HISTORY_PATH: Path = MODELS_DIR / "training_history.json"
TRAINING_CURVES_PATH: Path = MODELS_DIR / "training_curves.png"

# Target class names for HAM10000
CLASS_NAMES: List[str] = ["akiec", "bcc", "bkl", "df", "mel", "nv", "vasc"]
BATCH_SIZE: int = 32


def setup_tf_runtime() -> None:
    """
    Configures TensorFlow runtime for optimal CPU execution on Windows.
    """
    num_cpu_cores = os.cpu_count() or 4
    try:
        tf.config.threading.set_intra_op_parallelism_threads(num_cpu_cores)
        tf.config.threading.set_inter_op_parallelism_threads(2)
        logger.info(f"TensorFlow configured for CPU execution ({num_cpu_cores} threads).")
    except RuntimeError:
        # Threading config cannot be changed after TF is initialized
        pass


def verify_required_files(required_paths: List[Path]) -> bool:
    """
    Checks that all required paths exist on disk.

    Args:
        required_paths (List[Path]): Paths to verify.

    Returns:
        bool: True if all files exist, False otherwise.
    """
    missing_files: List[Path] = [p for p in required_paths if not p.is_file()]
    if missing_files:
        logger.error("Required file(s) not found:")
        for path in missing_files:
            logger.error(f"  Missing: {path}")
        print("\n" + "=" * 60)
        print("                 MISSING REQUIRED FILES")
        print("=" * 60)
        for path in missing_files:
            print(f"  [-] Missing: {path}")
        print("\nPlease ensure preprocessing and training steps are completed first:")
        print("  1. python src/preprocess.py")
        print("  2. python src/train.py")
        print("=" * 60 + "\n")
        return False
    return True


def load_model_and_test_data(
    model_path: Path,
    x_test_path: Path,
    y_test_path: Path,
) -> Tuple[tf.keras.Model, np.ndarray, np.ndarray]:
    """
    Loads Keras model and test dataset numpy arrays.

    Args:
        model_path (Path): Path to saved .keras model.
        x_test_path (Path): Path to X_test.npy.
        y_test_path (Path): Path to y_test.npy.

    Returns:
        Tuple[tf.keras.Model, np.ndarray, np.ndarray]: (model, X_test, y_test)
    """
    logger.info(f"Loading trained model from: {model_path}")
    model = tf.keras.models.load_model(str(model_path))

    logger.info(f"Loading test inputs from: {x_test_path}")
    X_test = np.load(x_test_path)

    logger.info(f"Loading test labels from: {y_test_path}")
    y_test = np.load(y_test_path)

    # Normalize labels to 1D integer array if one-hot encoded or 2D
    if y_test.ndim > 1 and y_test.shape[-1] > 1:
        y_test = np.argmax(y_test, axis=1)
    else:
        y_test = y_test.ravel()

    logger.info(f"Test samples loaded: {len(X_test)} (Shape: {X_test.shape}, Labels: {y_test.shape})")
    return model, X_test, y_test


def plot_confusion_matrix_matplotlib(
    cm: np.ndarray,
    class_names: List[str],
    output_path: Path,
) -> None:
    """
    Generates and saves the confusion matrix using pure Matplotlib (no Seaborn).

    Args:
        cm (np.ndarray): Confusion matrix array.
        class_names (List[str]): List of class names.
        output_path (Path): File path to save output image.
    """
    logger.info("Generating confusion matrix plot with pure Matplotlib (no Seaborn)...")

    fig, ax = plt.subplots(figsize=(8, 7))
    im = ax.imshow(cm, interpolation="nearest", cmap=plt.cm.Blues)

    # Colorbar
    cbar = fig.colorbar(im, ax=ax, fraction=0.046, pad=0.04)
    cbar.ax.tick_params(labelsize=10)

    # Axis labels and title
    ax.set_title("HAM10000 Skin Disease Confusion Matrix", fontsize=14, fontweight="bold", pad=15)
    ax.set_xlabel("Predicted Label", fontsize=12, fontweight="semibold", labelpad=10)
    ax.set_ylabel("True Label", fontsize=12, fontweight="semibold", labelpad=10)

    # Tick marks
    tick_marks = np.arange(len(class_names))
    ax.set_xticks(tick_marks)
    ax.set_xticklabels(class_names, rotation=45, ha="right", fontsize=10)
    ax.set_yticks(tick_marks)
    ax.set_yticklabels(class_names, fontsize=10)

    # Annotate cell counts with dynamic text contrast
    thresh = cm.max() / 2.0 if cm.max() > 0 else 1.0
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            val = int(cm[i, j])
            text_color = "white" if val > thresh else "black"
            font_weight = "bold" if val > 0 else "normal"
            ax.text(
                j,
                i,
                f"{val}",
                ha="center",
                va="center",
                color=text_color,
                fontsize=10,
                fontweight=font_weight,
            )

    ax.set_ylim(len(class_names) - 0.5, -0.5)
    fig.tight_layout()

    output_path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(output_path, dpi=300, bbox_inches="tight")
    plt.close(fig)
    logger.info(f"Confusion matrix saved successfully to: {output_path}")


def generate_learning_curves_if_available(
    history_path: Path,
    curves_path: Path,
) -> None:
    """
    Plots and saves training curves if training_history.json exists inside models/.
    Otherwise prints: 'Training history not found. Skipping learning curve generation.'

    Args:
        history_path (Path): Path to training_history.json.
        curves_path (Path): Path to training_curves.png.
    """
    if not history_path.is_file():
        print("Training history not found. Skipping learning curve generation.")
        logger.info("Training history not found. Skipping learning curve generation.")
        return

    logger.info(f"Training history found at {history_path}. Generating learning curves...")
    try:
        with open(history_path, "r", encoding="utf-8") as f:
            history_data = json.load(f)

        # Handle nested {"history": {...}} if present
        if "history" in history_data and isinstance(history_data["history"], dict):
            history_data = history_data["history"]

        acc = history_data.get("accuracy", history_data.get("acc", []))
        val_acc = history_data.get("val_accuracy", history_data.get("val_acc", []))
        loss = history_data.get("loss", [])
        val_loss = history_data.get("val_loss", [])

        if not acc and not loss:
            logger.warning("History JSON does not contain recognized metric keys (accuracy/loss). Skipping plot.")
            return

        epochs_count = max(len(acc), len(loss))
        epochs_range = range(1, epochs_count + 1)

        fig, axes = plt.subplots(1, 2, figsize=(14, 5))

        # Accuracy Subplot
        if acc:
            axes[0].plot(epochs_range[:len(acc)], acc, label="Train Accuracy", color="#1f77b4", linewidth=2)
            if val_acc:
                axes[0].plot(epochs_range[:len(val_acc)], val_acc, label="Val Accuracy", color="#ff7f0e", linewidth=2, linestyle="--")
            axes[0].set_title("Model Accuracy vs. Epochs", fontsize=14, fontweight="bold")
            axes[0].set_xlabel("Epoch", fontsize=12)
            axes[0].set_ylabel("Accuracy", fontsize=12)
            axes[0].grid(True, linestyle=":", alpha=0.6)
            axes[0].legend(loc="lower right")

        # Loss Subplot
        if loss:
            axes[1].plot(epochs_range[:len(loss)], loss, label="Train Loss", color="#1f77b4", linewidth=2)
            if val_loss:
                axes[1].plot(epochs_range[:len(val_loss)], val_loss, label="Val Loss", color="#d62728", linewidth=2, linestyle="--")
            axes[1].set_title("Model Loss vs. Epochs", fontsize=14, fontweight="bold")
            axes[1].set_xlabel("Epoch", fontsize=12)
            axes[1].set_ylabel("Loss", fontsize=12)
            axes[1].grid(True, linestyle=":", alpha=0.6)
            axes[1].legend(loc="upper right")

        fig.tight_layout()
        curves_path.parent.mkdir(parents=True, exist_ok=True)
        fig.savefig(curves_path, dpi=300, bbox_inches="tight")
        plt.close(fig)
        logger.info(f"Training curves successfully saved to: {curves_path}")

    except Exception as e:
        logger.error(f"Failed to generate training curves from {history_path}: {e}")


def main() -> int:
    """
    Main evaluation routine.
    """
    setup_tf_runtime()

    # Verify presence of essential files
    required_files = [MODEL_PATH, X_TEST_PATH, Y_TEST_PATH]
    if not verify_required_files(required_files):
        return 1

    try:
        # 1. Load model and test dataset
        model, X_test, y_test = load_model_and_test_data(
            model_path=MODEL_PATH,
            x_test_path=X_TEST_PATH,
            y_test_path=Y_TEST_PATH,
        )

        # 2. Evaluate the model
        logger.info("Evaluating model on test dataset...")
        eval_results = model.evaluate(X_test, y_test, batch_size=BATCH_SIZE, verbose=1)

        # Handle different evaluate return formats
        if isinstance(eval_results, (list, tuple)):
            test_loss, test_acc = eval_results[0], eval_results[1]
        else:
            test_loss, test_acc = float(eval_results), 0.0

        print("\n" + "=" * 60)
        print("               MODEL TEST EVALUATION")
        print("=" * 60)
        print(f"  Test Samples  : {len(X_test)}")
        print(f"  Test Loss     : {test_loss:.4f}")
        print(f"  Test Accuracy : {test_acc * 100:.2f}%")
        print("=" * 60 + "\n")

        # 3. Predict all test samples
        logger.info("Predicting all test samples...")
        y_pred_probs = model.predict(X_test, batch_size=BATCH_SIZE, verbose=1)
        y_pred = np.argmax(y_pred_probs, axis=1)

        # 4. Print sklearn classification_report
        logger.info("Generating classification report...")
        report = classification_report(
            y_test,
            y_pred,
            target_names=CLASS_NAMES,
            digits=4,
            zero_division=0,
        )
        print("-" * 60)
        print("             DETAILED CLASSIFICATION REPORT")
        print("-" * 60)
        print(report)
        print("-" * 60 + "\n")

        # 5 & 6. Generate confusion matrix using matplotlib only and save
        cm = confusion_matrix(y_test, y_pred)
        plot_confusion_matrix_matplotlib(
            cm=cm,
            class_names=CLASS_NAMES,
            output_path=CONFUSION_MATRIX_PATH,
        )

        # 7. Check for training_history.json and generate training_curves.png if present
        generate_learning_curves_if_available(
            history_path=TRAINING_HISTORY_PATH,
            curves_path=TRAINING_CURVES_PATH,
        )

        logger.info("Report generation completed successfully.")
        return 0

    except Exception as e:
        logger.exception(f"An error occurred during report generation: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
