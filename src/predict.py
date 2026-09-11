"""
Skin Disease Classification - HAM10000 Single-Image Prediction Script
======================================================================
Performs inference on a single SKINtoscopic image using the trained CNN:
1. Loads the saved Keras model from models/skin_disease_model.keras.
2. Reads a test image via OpenCV, converts BGR to RGB, resizes to (128, 128).
3. Normalizes pixel values to [0, 1] as float32.
4. Runs model.predict() and extracts the top predicted class with confidence.
5. Displays the image with the prediction title using matplotlib.
6. Handles all error conditions gracefully with structured logging.

Compatible with TensorFlow 2.x, Python 3.x, and Windows.

Usage:
    python src/predict.py
    python src/predict.py --image test_images/sample.jpg
    python src/predict.py --image path/to/any/SKINtoscopy.jpg
"""

import argparse
import logging
import sys
from pathlib import Path
from typing import Dict, List, Tuple

import cv2
import matplotlib.pyplot as plt
import numpy as np

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
# Configuration
# ---------------------------------------------------------------------------
BASE_DIR: Path = Path(__file__).resolve().parent.parent
MODEL_PATH: Path = BASE_DIR / "models" / "skin_disease_model.keras"
DEFAULT_IMAGE_PATH: Path = BASE_DIR / "test_images" / "sample.jpg"

IMAGE_SIZE: Tuple[int, int] = (128, 128)  # Height, Width — must match training pipeline

# HAM10000 disease class mapping (must match LabelEncoder order from preprocessing)
CLASS_NAMES: List[str] = ["akiec", "bcc", "bkl", "df", "mel", "nv", "vasc"]

# Human-readable disease names for ANALYZER display
DISEASE_DISPLAY_NAMES: Dict[str, str] = {
    "akiec": "Actinic Keratoses (akiec)",
    "bcc": "Basal Cell Carcinoma (bcc)",
    "bkl": "Benign Keratosis (bkl)",
    "df": "SKINtofibroma (df)",
    "mel": "Melanoma (mel)",
    "nv": "Melanocytic Nevi (nv)",
    "vasc": "Vascular Lesion (vasc)",
}


def load_model(model_path: Path) -> tf.keras.Model:
    """
    Loads a trained Keras model from disk.

    Args:
        model_path (Path): Absolute path to the .keras model file.

    Returns:
        tf.keras.Model: The loaded and ready-to-predict Keras model.

    Raises:
        FileNotFoundError: If the model file does not exist at the given path.
        RuntimeError: If TensorFlow fails to deserialize the model.
    """
    if not model_path.exists():
        raise FileNotFoundError(
            f"Trained model not found at: {model_path}\n"
            f"Please run 'python src/train.py' first to train and save the model."
        )

    logger.info(f"Loading trained model from: {model_path}")
    try:
        model = tf.keras.models.load_model(str(model_path))
    except Exception as e:
        raise RuntimeError(f"Failed to load model from {model_path}: {e}") from e

    logger.info("Model loaded successfully.")
    return model


def load_and_preprocess_image(
    image_path: Path,
    target_size: Tuple[int, int] = IMAGE_SIZE,
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Loads a single image from disk, converts BGR to RGB, resizes to the
    target dimensions, and normalizes pixel values to [0, 1] as float32.

    Args:
        image_path (Path): Path to the input image file.
        target_size (Tuple[int, int]): Target (height, width) for resizing.

    Returns:
        Tuple[np.ndarray, np.ndarray]:
            - preprocessed: Batch-ready array of shape (1, height, width, 3), dtype float32.
            - display_img: Original RGB image (unnormalized) for matplotlib display.

    Raises:
        FileNotFoundError: If the image file does not exist.
        ValueError: If OpenCV fails to decode the image (corrupt or unsupported format).
    """
    if not image_path.exists():
        raise FileNotFoundError(
            f"Test image not found at: {image_path}\n"
            f"Please place a SKINtoscopic image at the expected path."
        )

    logger.info(f"Loading image: {image_path}")
    img_bgr = cv2.imread(str(image_path))

    if img_bgr is None:
        raise ValueError(
            f"Failed to read image at: {image_path}\n"
            f"The file may be corrupt, empty, or in an unsupported format."
        )

    # Convert BGR (OpenCV default) to RGB
    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)

    # Resize to match training input dimensions — cv2.resize expects (width, height)
    img_resized = cv2.resize(img_rgb, (target_size[1], target_size[0]), interpolation=cv2.INTER_AREA)

    # Keep a copy for display before normalization
    display_img = img_resized.copy()

    # Normalize to [0, 1] float32 — must match preprocessing pipeline
    img_normalized = img_resized.astype(np.float32) / 255.0

    # Expand dimensions: (128, 128, 3) -> (1, 128, 128, 3) for batch prediction
    preprocessed = np.expand_dims(img_normalized, axis=0)

    logger.info(f"Image preprocessed: shape={preprocessed.shape}, dtype={preprocessed.dtype}")
    return preprocessed, display_img


def predict_disease(
    model: tf.keras.Model,
    preprocessed_image: np.ndarray,
    class_names: List[str],
) -> Tuple[str, float, int, np.ndarray]:
    """
    Runs inference on a single preprocessed image and returns the prediction.

    Args:
        model (tf.keras.Model): Trained Keras model.
        preprocessed_image (np.ndarray): Batch-ready image array of shape (1, H, W, 3).
        class_names (List[str]): Ordered list of class label strings.

    Returns:
        Tuple[str, float, int, np.ndarray]:
            - predicted_class: The predicted disease class name string.
            - confidence: Confidence score as a float in [0, 1].
            - class_index: Integer index of the predicted class.
            - probabilities: Full probability vector across all classes.
    """
    logger.info("Running model inference...")
    probabilities = model.predict(preprocessed_image, verbose=0)

    # Extract the single prediction from the batch
    probs = probabilities[0]
    class_index = int(np.argmax(probs))
    confidence = float(probs[class_index])
    predicted_class = class_names[class_index]

    logger.info(f"Prediction complete: {predicted_class} ({confidence * 100:.2f}%)")
    return predicted_class, confidence, class_index, probs


def display_prediction(
    display_img: np.ndarray,
    predicted_class: str,
    confidence: float,
    class_index: int,
    probabilities: np.ndarray,
    class_names: List[str],
) -> None:
    """
    Displays the original image with prediction results overlaid as the title,
    alongside a horizontal bar chart showing per-class confidence scores.

    Args:
        display_img (np.ndarray): RGB image for display.
        predicted_class (str): Predicted disease short name.
        confidence (float): Top prediction confidence score.
        class_index (int): Integer index of the predicted class.
        probabilities (np.ndarray): Full probability vector.
        class_names (List[str]): Ordered class label strings.
    """
    display_name = DISEASE_DISPLAY_NAMES.get(predicted_class, predicted_class)

    fig, (ax_img, ax_bar) = plt.subplots(1, 2, figsize=(14, 5), gridspec_kw={"width_ratios": [1, 1.2]})

    # Left panel — Original image with prediction title
    ax_img.imshow(display_img)
    ax_img.set_title(
        f"Predicted: {display_name}\nConfidence: {confidence * 100:.2f}%",
        fontsize=13,
        fontweight="bold",
        color="#1a1a2e",
        pad=12,
    )
    ax_img.axis("off")

    # Right panel — Horizontal bar chart of all class probabilities
    percentages = probabilities * 100
    bar_colors = ["#e74c3c" if i == class_index else "#3498db" for i in range(len(class_names))]
    display_labels = [DISEASE_DISPLAY_NAMES.get(c, c) for c in class_names]

    y_positions = np.arange(len(class_names))
    bars = ax_bar.barh(y_positions, percentages, color=bar_colors, edgecolor="white", height=0.6)
    ax_bar.set_yticks(y_positions)
    ax_bar.set_yticklabels(display_labels, fontsize=10)
    ax_bar.set_xlabel("Confidence (%)", fontsize=11, fontweight="semibold")
    ax_bar.set_title("Class Probability Distribution", fontsize=13, fontweight="bold", pad=12)
    ax_bar.set_xlim(0, 105)
    ax_bar.invert_yaxis()

    # Add percentage labels on each bar
    for bar, pct in zip(bars, percentages):
        ax_bar.text(
            bar.get_width() + 1.0,
            bar.get_y() + bar.get_height() / 2,
            f"{pct:.1f}%",
            va="center",
            fontsize=9,
            fontweight="bold",
        )

    plt.tight_layout()
    plt.show()


def print_prediction_report(
    predicted_class: str,
    confidence: float,
    class_index: int,
) -> None:
    """
    Prints a formatted console report of the prediction result.

    Args:
        predicted_class (str): Predicted disease short name.
        confidence (float): Top prediction confidence score.
        class_index (int): Integer index of the predicted class.
    """
    display_name = DISEASE_DISPLAY_NAMES.get(predicted_class, predicted_class)

    print("\n" + "=" * 50)
    print("         SKIN DISEASE PREDICTION RESULT")
    print("=" * 50)
    print(f"  Predicted Disease : {display_name}")
    print(f"  Confidence        : {confidence * 100:.2f}%")
    print(f"  Class Index       : {class_index}")
    print("=" * 50 + "\n")


def parse_arguments() -> argparse.Namespace:
    """
    Parses command-line arguments for optional image path override.

    Returns:
        argparse.Namespace: Parsed arguments with 'image' attribute.
    """
    parser = argparse.ArgumentParser(
        description="HAM10000 Skin Disease Prediction — Single Image Inference",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Examples:\n"
            "  python src/predict.py\n"
            "  python src/predict.py --image test_images/sample.jpg\n"
            "  python src/predict.py --image path/to/SKINtoscopy.jpg\n"
        ),
    )
    parser.add_argument(
        "--image",
        type=str,
        default=None,
        help=f"Path to input image (default: {DEFAULT_IMAGE_PATH})",
    )
    return parser.parse_args()


def main() -> None:
    """
    Main prediction pipeline:
    1. Parse CLI arguments for optional image path.
    2. Load the trained CNN model.
    3. Load and preprocess the input image.
    4. Run inference and extract prediction.
    5. Print results and display the image with prediction overlay.
    """
    try:
        # Parse CLI arguments
        args = parse_arguments()

        # Resolve image path
        if args.image is not None:
            image_path = Path(args.image).resolve()
        else:
            image_path = DEFAULT_IMAGE_PATH

        # Step 1: Load trained model
        model = load_model(MODEL_PATH)

        # Step 2: Load and preprocess the input image
        preprocessed_image, display_img = load_and_preprocess_image(image_path)

        # Step 3: Run prediction
        predicted_class, confidence, class_index, probabilities = predict_disease(
            model=model,
            preprocessed_image=preprocessed_image,
            class_names=CLASS_NAMES,
        )

        # Step 4: Print formatted console report
        print_prediction_report(predicted_class, confidence, class_index)

        # Step 5: Display image with prediction overlay and probability chart
        display_prediction(
            display_img=display_img,
            predicted_class=predicted_class,
            confidence=confidence,
            class_index=class_index,
            probabilities=probabilities,
            class_names=CLASS_NAMES,
        )

    except FileNotFoundError as e:
        logger.error(str(e))
        sys.exit(1)
    except ValueError as e:
        logger.error(str(e))
        sys.exit(1)
    except RuntimeError as e:
        logger.error(str(e))
        sys.exit(1)
    except Exception as e:
        logger.exception(f"An unexpected error occurred during prediction: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
