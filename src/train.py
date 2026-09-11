"""
Skin Disease Classification - HAM10000 CPU-Optimized Training Script
=====================================================================
Custom Convolutional Neural Network (From Scratch - No Transfer Learning)
Optimized for stable convergence and fast CPU execution on Windows:
1. Native 128x128 image input matching preprocessed dataset.
2. In-model data augmentation (RandomFlip, RandomRotation, RandomZoom).
3. 3-stage hierarchical Conv2D architecture with BatchNormalization and GlobalAveragePooling2D.
4. Harmonized Dropout placement in the classification head to eliminate BatchNorm variance shift.
5. Smoothed, variance-damped class weights to prevent gradient explosions on minority classes.
6. CPU multi-threading configuration (inter_op & intra_op parallelism).
7. Production callbacks: ModelCheckpoint, EarlyStopping, ReduceLROnPlateau.
8. Automated metric evaluation, confusion matrix heatmap, and classification report generation.
"""

import logging
import os
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import matplotlib.pyplot as plt
import numpy as np
import seaborn as sns
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.utils.class_weight import compute_class_weight

import tensorflow as tf
from tensorflow.keras import callbacks, layers, models, optimizers

# ---------------------------------------------------------------------------
# CPU Multi-Threading Performance Optimization
# ---------------------------------------------------------------------------
num_cpu_cores = os.cpu_count() or 4
tf.config.threading.set_intra_op_parallelism_threads(num_cpu_cores)
tf.config.threading.set_inter_op_parallelism_threads(2)

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
# Paths and Hyperparameters
# ---------------------------------------------------------------------------
BASE_DIR: Path = Path(__file__).resolve().parent.parent
DATASET_DIR: Path = BASE_DIR / "dataset"
MODELS_DIR: Path = BASE_DIR / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

MODEL_SAVE_PATH: Path = MODELS_DIR / "skin_disease_model.keras"
METRICS_PLOT_PATH: Path = MODELS_DIR / "training_curves.png"
CONFUSION_MATRIX_PATH: Path = MODELS_DIR / "confusion_matrix.png"

# Hyperparameters
IMAGE_SHAPE: Tuple[int, int, int] = (128, 128, 3)
NUM_CLASSES: int = 7
BATCH_SIZE: int = 32
EPOCHS: int = 35
INITIAL_LR: float = 3e-4  # Stable learning rate for Adam with gradient clipping

# Class label mappings for HAM10000
CLASS_NAMES: List[str] = ["akiec", "bcc", "bkl", "df", "mel", "nv", "vasc"]


def load_dataset(dataset_dir: Path) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """
    Loads preprocessed dataset arrays from disk.

    Args:
        dataset_dir (Path): Directory containing .npy files.

    Returns:
        Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]: (X_train, X_test, y_train, y_test)
    """
    x_train_path = dataset_dir / "X_train.npy"
    x_test_path = dataset_dir / "X_test.npy"
    y_train_path = dataset_dir / "y_train.npy"
    y_test_path = dataset_dir / "y_test.npy"

    for path in [x_train_path, x_test_path, y_train_path, y_test_path]:
        if not path.exists():
            raise FileNotFoundError(
                f"Missing required file: {path}\nPlease run 'python src/preprocess.py' first."
            )

    logger.info("Loading preprocessed dataset from .npy files...")
    X_train = np.load(x_train_path)
    X_test = np.load(x_test_path)
    y_train = np.load(y_train_path)
    y_test = np.load(y_test_path)

    logger.info("Dataset Loaded Successfully:")
    logger.info(f"  - X_train: {X_train.shape} ({X_train.dtype})")
    logger.info(f"  - y_train: {y_train.shape} ({y_train.dtype})")
    logger.info(f"  - X_test : {X_test.shape} ({X_test.dtype})")
    logger.info(f"  - y_test : {y_test.shape} ({y_test.dtype})")

    return X_train, X_test, y_train, y_test


def build_custom_cnn(
    input_shape: Tuple[int, int, int] = IMAGE_SHAPE,
    num_classes: int = NUM_CLASSES,
) -> tf.keras.Model:
    """
    Builds a high-performance from-scratch CNN optimized specifically for CPU:
    - Data Augmentation layers: runs on-the-fly during training with zero RAM overhead.
    - Double-Conv Feature Stages with BatchNormalization and MaxPooling.
    - Elimination of Conv-stage Dropout to prevent BatchNorm variance shift.
    - GlobalAveragePooling2D: parameter-efficient feature aggregation without Flatten explosion.
    - Regularized Dense classification head.

    Args:
        input_shape (Tuple[int, int, int]): Input image shape (128, 128, 3).
        num_classes (int): Number of disease target classes (7).

    Returns:
        tf.keras.Model: Compiled or uncompiled Keras Sequential model.
    """
    logger.info(f"Constructing CNN from scratch (Input Shape: {input_shape}, Classes: {num_classes})...")

    model = models.Sequential([
        # 1. Input Layer
        layers.Input(shape=input_shape, name="input_layer"),

        # 2. On-the-fly Data Augmentation (active only during model.fit training)
        layers.RandomFlip("horizontal_and_vertical", name="aug_flip"),
        layers.RandomRotation(0.15, name="aug_rotation"),
        layers.RandomZoom(0.10, name="aug_zoom"),

        # 3. Convolutional Stage 1 (128x128 -> 64x64)
        layers.Conv2D(32, (3, 3), padding="same", activation="relu", name="conv1_1"),
        layers.Conv2D(32, (3, 3), padding="same", activation="relu", name="conv1_2"),
        layers.BatchNormalization(name="bn1"),
        layers.MaxPooling2D((2, 2), name="pool1"),

        # 4. Convolutional Stage 2 (64x64 -> 32x32)
        layers.Conv2D(64, (3, 3), padding="same", activation="relu", name="conv2_1"),
        layers.Conv2D(64, (3, 3), padding="same", activation="relu", name="conv2_2"),
        layers.BatchNormalization(name="bn2"),
        layers.MaxPooling2D((2, 2), name="pool2"),

        # 5. Convolutional Stage 3 (32x32 -> 16x16)
        layers.Conv2D(128, (3, 3), padding="same", activation="relu", name="conv3_1"),
        layers.Conv2D(128, (3, 3), padding="same", activation="relu", name="conv3_2"),
        layers.BatchNormalization(name="bn3"),
        layers.MaxPooling2D((2, 2), name="pool3"),

        # 6. Global Average Pooling & Dense Head
        layers.GlobalAveragePooling2D(name="gap"),
        layers.Dense(128, activation="relu", name="dense_feat"),
        layers.BatchNormalization(name="bn_dense"),
        layers.Dropout(0.40, name="dropout_dense"),
        layers.Dense(num_classes, activation="softmax", name="output_layer"),
    ], name="HAM10000_Custom_CNN")

    return model


def compute_smoothed_class_weights(y_train: np.ndarray) -> Dict[int, float]:
    """
    Computes square-root smoothed class weights.
    Prevents massive gradient spikes on severe minority classes (e.g. df, vasc)
    while ensuring the model learns under-represented disease categories.

    Args:
        y_train (np.ndarray): Integer training labels.

    Returns:
        Dict[int, float]: Dictionary mapping class index to smoothed weight.
    """
    classes = np.unique(y_train)
    counts = np.bincount(y_train)
    total_samples = len(y_train)
    num_classes = len(classes)

    # Square-root damped balancing to prevent extreme gradients
    smoothed = np.sqrt(total_samples / (num_classes * counts))
    # Normalize weights so the mean weight equals 1.0
    normalized_weights = smoothed / np.mean(smoothed)

    class_weight_dict = {int(cls): float(normalized_weights[cls]) for cls in classes}
    logger.info(f"Computed Smoothed Class Weights: {class_weight_dict}")
    return class_weight_dict


def get_callbacks(model_save_path: Path) -> List[tf.keras.callbacks.Callback]:
    """
    Configures robust training callbacks:
    - ModelCheckpoint: Saves best model checkpoint based on validation accuracy.
    - EarlyStopping: Halts training if val_loss does not improve for 8 epochs.
    - ReduceLROnPlateau: Decays learning rate by 0.5 when val_loss plateaus for 3 epochs.

    Args:
        model_save_path (Path): Target file path for the .keras model artifact.

    Returns:
        List[tf.keras.callbacks.Callback]: List of configured callbacks.
    """
    checkpoint = callbacks.ModelCheckpoint(
        filepath=str(model_save_path),
        monitor="val_accuracy",
        mode="max",
        save_best_only=True,
        verbose=1,
    )

    early_stopping = callbacks.EarlyStopping(
        monitor="val_loss",
        mode="min",
        patience=8,
        min_delta=1e-3,
        restore_best_weights=True,
        verbose=1,
    )

    reduce_lr = callbacks.ReduceLROnPlateau(
        monitor="val_loss",
        mode="min",
        factor=0.5,
        patience=3,
        min_lr=1e-6,
        verbose=1,
    )

    return [checkpoint, early_stopping, reduce_lr]


def plot_and_save_metrics(history: tf.keras.callbacks.History, save_path: Path) -> None:
    """
    Plots training & validation learning curves and saves the figure to disk.

    Args:
        history (tf.keras.callbacks.History): History object returned by model.fit().
        save_path (Path): Path to output PNG image.
    """
    logger.info("Generating learning curve plots...")

    acc = history.history.get("accuracy", [])
    val_acc = history.history.get("val_accuracy", [])
    loss = history.history.get("loss", [])
    val_loss = history.history.get("val_loss", [])
    epochs_range = range(1, len(acc) + 1)

    plt.figure(figsize=(14, 5))

    # Accuracy subplot
    plt.subplot(1, 2, 1)
    plt.plot(epochs_range, acc, label="Train Accuracy", color="#1f77b4", linewidth=2)
    plt.plot(epochs_range, val_acc, label="Val Accuracy", color="#ff7f0e", linewidth=2, linestyle="--")
    plt.title("Model Accuracy vs. Epochs", fontsize=14, fontweight="bold")
    plt.xlabel("Epoch", fontsize=12)
    plt.ylabel("Accuracy", fontsize=12)
    plt.grid(True, linestyle=":", alpha=0.6)
    plt.legend(loc="lower right")

    # Loss subplot
    plt.subplot(1, 2, 2)
    plt.plot(epochs_range, loss, label="Train Loss", color="#1f77b4", linewidth=2)
    plt.plot(epochs_range, val_loss, label="Val Loss", color="#d62728", linewidth=2, linestyle="--")
    plt.title("Model Loss vs. Epochs", fontsize=14, fontweight="bold")
    plt.xlabel("Epoch", fontsize=12)
    plt.ylabel("Loss (Sparse Categorical Crossentropy)", fontsize=12)
    plt.grid(True, linestyle=":", alpha=0.6)
    plt.legend(loc="upper right")

    plt.tight_layout()
    plt.savefig(save_path, dpi=300)
    plt.close()
    logger.info(f"Training curves saved to: {save_path}")


def evaluate_and_generate_reports(
    model: tf.keras.Model,
    X_test: np.ndarray,
    y_test: np.ndarray,
    class_names: List[str],
    cm_save_path: Path,
) -> None:
    """
    Evaluates test performance, computes confusion matrix heatmap, and prints classification report.

    Args:
        model (tf.keras.Model): Trained Keras model.
        X_test (np.ndarray): Test images array.
        y_test (np.ndarray): Test labels array.
        class_names (List[str]): List of class name strings.
        cm_save_path (Path): Path to output confusion matrix heatmap PNG.
    """
    logger.info("Evaluating model on test set...")
    test_loss, test_acc = model.evaluate(X_test, y_test, batch_size=BATCH_SIZE, verbose=1)

    print("\n" + "=" * 60)
    print("                FINAL TEST EVALUATION")
    print("=" * 60)
    print(f"  Test Loss     : {test_loss:.4f}")
    print(f"  Test Accuracy : {test_acc * 100:.2f}%")
    print("=" * 60 + "\n")

    logger.info("Generating predictions for classification report and confusion matrix...")
    y_pred_probs = model.predict(X_test, batch_size=BATCH_SIZE, verbose=1)
    y_pred_classes = np.argmax(y_pred_probs, axis=1)

    # Classification Report
    print("-" * 60)
    print("             DETAILED CLASSIFICATION REPORT")
    print("-" * 60)
    report = classification_report(
        y_test,
        y_pred_classes,
        target_names=class_names,
        digits=4,
    )
    print(report)
    print("-" * 60)

    # Confusion Matrix Heatmap
    cm = confusion_matrix(y_test, y_pred_classes)

    plt.figure(figsize=(9, 7))
    sns.heatmap(
        cm,
        annot=True,
        fmt="d",
        cmap="Blues",
        xticklabels=class_names,
        yticklabels=class_names,
        cbar=True,
    )
    plt.title("HAM10000 Skin Disease Confusion Matrix", fontsize=14, fontweight="bold", pad=15)
    plt.xlabel("Predicted Label", fontsize=12, fontweight="semibold")
    plt.ylabel("True Label", fontsize=12, fontweight="semibold")
    plt.tight_layout()
    plt.savefig(cm_save_path, dpi=300)
    plt.close()
    logger.info(f"Confusion matrix saved to: {cm_save_path}")


def main() -> None:
    """
    Main training pipeline execution.
    """
    try:
        # Step 1: Load preprocessed dataset
        X_train, X_test, y_train, y_test = load_dataset(DATASET_DIR)

        # Step 2: Build CPU-optimized CNN
        model = build_custom_cnn(
            input_shape=IMAGE_SHAPE,
            num_classes=NUM_CLASSES,
        )
        model.summary(print_fn=logger.info)

        # Step 3: Compute smoothed class weights for dataset balance
        class_weights = compute_smoothed_class_weights(y_train)

        # Step 4: Compile model with Adam optimizer (gradient clipping enabled)
        logger.info(f"Compiling model with Adam optimizer (lr={INITIAL_LR}, clipnorm=1.0)...")
        model.compile(
            optimizer=optimizers.Adam(learning_rate=INITIAL_LR, clipnorm=1.0),
            loss=tf.keras.losses.SparseCategoricalCrossentropy(),
            metrics=["accuracy"],
        )

        # Step 5: Configure Callbacks
        callbacks_list = get_callbacks(MODEL_SAVE_PATH)

        # Step 6: Train Model
        logger.info(f"Starting training on CPU (Epochs: {EPOCHS}, Batch Size: {BATCH_SIZE})...")
        history = model.fit(
            X_train,
            y_train,
            batch_size=BATCH_SIZE,
            epochs=EPOCHS,
            validation_data=(X_test, y_test),
            class_weight=class_weights,
            callbacks=callbacks_list,
            verbose=1,
        )

        # Step 7: Plot learning curves
        plot_and_save_metrics(history, METRICS_PLOT_PATH)

        # Step 8: Load best saved checkpoint for final evaluation
        if MODEL_SAVE_PATH.exists():
            logger.info(f"Loading best saved checkpoint from {MODEL_SAVE_PATH}...")
            best_model = tf.keras.models.load_model(str(MODEL_SAVE_PATH))
        else:
            best_model = model

        # Step 9: Final Evaluation & Report Generation
        evaluate_and_generate_reports(
            model=best_model,
            X_test=X_test,
            y_test=y_test,
            class_names=CLASS_NAMES,
            cm_save_path=CONFUSION_MATRIX_PATH,
        )

        logger.info("Training pipeline finished successfully!")

    except Exception as e:
        logger.exception(f"An error occurred during training: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
