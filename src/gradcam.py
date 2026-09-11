"""
Skin Disease Classification - HAM10000 Grad-CAM Explainability Script
======================================================================
Generates Gradient-weighted Class Activation Mapping (Grad-CAM) to visualize
salient regions influencing CNN predictions on SKINtoscopic skin lesion images.

Core Capabilities:
1. Loads the trained Keras model (models/skin_disease_model.keras).
2. Automatically locates the final convolutional layer without hardcoding.
3. Preprocesses input images matching predict.py exactly (OpenCV RGB, 128x128, float32 [0, 1]).
4. Supports both multiclass softmax and binary classification outputs.
5. Generates high-resolution multi-panel visualization (Original, Heatmap, Overlay).
6. Provides a modular, reusable `generate_gradcam(...)` API for future FastAPI integration.
7. Fully compatible with Keras 3 / TensorFlow 2.x on Windows.

Important Disclaimer:
    This tool is designed for academic model interpretability and research.
    Grad-CAM highlights regions with high gradient attribution; it is an
    attention visualization technique and NOT proof of ANALYZER diagnosis
    or medical reasoning.

Usage:
    python src/gradcam.py
    python src/gradcam.py --image test_images/sample.jpg
    python src/gradcam.py --image test_images/sample.jpg --output models/gradcam_sample.png
"""

import argparse
import logging
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import cv2
import matplotlib.pyplot as plt
import numpy as np

# Suppress noisy TensorFlow C++ startup logs
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
# Configuration & Constants (pathlib used everywhere)
# ---------------------------------------------------------------------------
BASE_DIR: Path = Path(__file__).resolve().parent.parent
DEFAULT_MODEL_PATH: Path = BASE_DIR / "models" / "skin_disease_model.keras"
DEFAULT_IMAGE_PATH: Path = BASE_DIR / "test_images" / "sample.jpg"
DEFAULT_OUTPUT_PATH: Path = BASE_DIR / "models" / "gradcam_sample.png"

IMAGE_SIZE: Tuple[int, int] = (128, 128)  # Height, Width

# HAM10000 7 class labels
CLASS_NAMES: List[str] = ["akiec", "bcc", "bkl", "df", "mel", "nv", "vasc"]

# ANALYZER & descriptive disease labels
DISEASE_DISPLAY_NAMES: Dict[str, str] = {
    "akiec": "Actinic Keratoses (akiec)",
    "bcc": "Basal Cell Carcinoma (bcc)",
    "bkl": "Benign Keratosis (bkl)",
    "df": "SKINtofibroma (df)",
    "mel": "Melanoma (mel)",
    "nv": "Melanocytic Nevi (nv)",
    "vasc": "Vascular Lesion (vasc)",
}


def load_trained_model(model_path: Union[str, Path]) -> tf.keras.Model:
    """
    Loads a trained Keras model from disk with error validation.

    Args:
        model_path (Union[str, Path]): Path to .keras model file.

    Returns:
        tf.keras.Model: Deserialized Keras model.

    Raises:
        FileNotFoundError: If the model file is not found.
        RuntimeError: If model loading fails.
    """
    model_path = Path(model_path)
    if not model_path.is_file():
        raise FileNotFoundError(
            f"Trained model not found at: {model_path}\n"
            f"Please ensure 'models/skin_disease_model.keras' exists."
        )

    logger.info(f"Loading trained model from: {model_path}")
    try:
        model = tf.keras.models.load_model(str(model_path))
    except Exception as e:
        raise RuntimeError(f"Failed to load Keras model from {model_path}: {e}") from e

    logger.info("Model loaded successfully.")
    return model


def preprocess_image(
    image_path: Union[str, Path],
    target_size: Tuple[int, int] = IMAGE_SIZE,
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Applies the identical preprocessing pipeline established in predict.py:
    1. Reads image via OpenCV.
    2. Converts BGR to RGB.
    3. Resizes to (128, 128) using INTER_AREA interpolation.
    4. Retains unnormalized display RGB copy.
    5. Normalizes pixel values to [0, 1] float32.
    6. Expands batch dimension to (1, 128, 128, 3).

    Args:
        image_path (Union[str, Path]): Path to the input image file.
        target_size (Tuple[int, int]): Target image dimensions (height, width).

    Returns:
        Tuple[np.ndarray, np.ndarray]:
            - preprocessed: Batch tensor of shape (1, height, width, 3), dtype float32.
            - display_img: Original RGB image array (height, width, 3), dtype uint8.

    Raises:
        FileNotFoundError: If image file does not exist.
        ValueError: If OpenCV fails to decode the image.
    """
    image_path = Path(image_path)
    if not image_path.is_file():
        raise FileNotFoundError(f"Input image not found at: {image_path}")

    img_bgr = cv2.imread(str(image_path))
    if img_bgr is None:
        raise ValueError(f"Failed to read image at: {image_path}. File may be corrupt or invalid format.")

    # Convert BGR to RGB
    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)

    # Resize image for CNN input (cv2.resize accepts width, height)
    img_resized = cv2.resize(img_rgb, (target_size[1], target_size[0]), interpolation=cv2.INTER_AREA)

    # Keep a copy for visualization before normalization
    display_img = img_rgb.copy()

    # Normalize to [0.0, 1.0] float32
    img_normalized = img_resized.astype(np.float32) / 255.0

    # Expand dimensions for batch inference
    preprocessed = np.expand_dims(img_normalized, axis=0)

    return preprocessed, display_img


def find_target_conv_layer(
    model: tf.keras.Model,
    layer_name: Optional[str] = None,
) -> Tuple[int, tf.keras.layers.Layer]:
    """
    Inspects model layers and dynamically finds the final convolutional layer.
    If an explicit layer_name is provided, validates that it exists and is convolutional.

    Args:
        model (tf.keras.Model): Keras model instance.
        layer_name (Optional[str]): Explicit layer name if user provided one.

    Returns:
        Tuple[int, tf.keras.layers.Layer]: Index of the layer in model.layers and the layer object.

    Raises:
        ValueError: If no convolutional layer is present or specified layer is invalid.
    """
    if layer_name:
        for idx, layer in enumerate(model.layers):
            if layer.name == layer_name:
                logger.info(f"Using explicitly specified convolutional layer: '{layer.name}' (Index: {idx})")
                return idx, layer
        raise ValueError(f"Specified layer '{layer_name}' not found in model.")

    # Traverse backwards to locate the last 2D convolutional layer
    for idx in range(len(model.layers) - 1, -1, -1):
        layer = model.layers[idx]
        if isinstance(layer, tf.keras.layers.Conv2D):
            logger.info(f"Auto-selected final convolutional layer: '{layer.name}' (Index: {idx})")
            return idx, layer

    raise ValueError("No convolutional layer (Conv2D) found in the provided model.")


def compute_gradcam_heatmap(
    model: tf.keras.Model,
    preprocessed_img: np.ndarray,
    target_conv_idx: int,
    class_idx: int,
) -> np.ndarray:
    """
    Computes the 2D Grad-CAM heatmap using tf.GradientTape.

    Architecture compatibility:
    In Keras 3 / TensorFlow 2.x, Sequential models loaded from disk operate
    most reliably by evaluating the layer sequence directly under the GradientTape.
    This computes gradients of the target class score with respect to the feature maps
    of the chosen convolutional layer without needing graph rewiring.

    Args:
        model (tf.keras.Model): Keras model.
        preprocessed_img (np.ndarray): Preprocessed batch image (1, H, W, 3).
        target_conv_idx (int): Index of target convolutional layer in model.layers.
        class_idx (int): Class index for which to compute attribution.

    Returns:
        np.ndarray: 2D normalized activation heatmap with values in [0, 1].
    """
    input_tensor = tf.convert_to_tensor(preprocessed_img)

    with tf.GradientTape() as tape:
        # Forward pass up to the target convolutional layer
        x = input_tensor
        for layer in model.layers[:target_conv_idx + 1]:
            x = layer(x, training=False)
        conv_output = x
        tape.watch(conv_output)

        # Forward pass from post-conv layers to final output
        for layer in model.layers[target_conv_idx + 1:]:
            x = layer(x, training=False)
        predictions = x

        # Support both multiclass softmax and binary classification
        if predictions.shape[-1] == 1:
            # Binary classification head
            loss = predictions[:, 0] if class_idx == 1 else (1.0 - predictions[:, 0])
        else:
            # Multiclass softmax head
            loss = predictions[:, class_idx]

    # Compute gradient of target class score with respect to convolutional feature maps
    grads = tape.gradient(loss, conv_output)
    if grads is None:
        raise RuntimeError("Failed to compute gradients. Check model layer connectivity.")

    # Global Average Pooling of gradients across spatial dimensions (alpha_k)
    pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))

    # Weight each feature map channel by its corresponding pooled gradient
    conv_output_val = conv_output[0]
    cam = tf.reduce_sum(tf.multiply(pooled_grads, conv_output_val), axis=-1)

    # Apply ReLU: only retain features that contribute positively to the predicted class
    cam = tf.maximum(cam, 0)

    # Normalize heatmap between 0 and 1
    max_val = tf.math.reduce_max(cam)
    if max_val > 0:
        cam = cam / max_val

    return cam.numpy()


def create_gradcam_overlay(
    heatmap: np.ndarray,
    original_rgb: np.ndarray,
    alpha: float = 0.45,
    colormap: int = cv2.COLORMAP_JET,
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Resizes heatmap to original image dimensions and creates an alpha-blended overlay.

    Args:
        heatmap (np.ndarray): Normalized 2D Grad-CAM heatmap in [0, 1].
        original_rgb (np.ndarray): Original image array (RGB uint8).
        alpha (float): Overlay transparency factor.
        colormap (int): OpenCV colormap identifier.

    Returns:
        Tuple[np.ndarray, np.ndarray]:
            - heatmap_resized: 2D float32 heatmap matching original image shape.
            - overlay_rgb: Superimposed RGB image (uint8).
    """
    orig_h, orig_w = original_rgb.shape[:2]

    # Resize heatmap to match original image dimensions
    heatmap_resized = cv2.resize(heatmap, (orig_w, orig_h), interpolation=cv2.INTER_CUBIC)
    heatmap_resized = np.clip(heatmap_resized, 0.0, 1.0)

    # Convert to 8-bit image for OpenCV colormapping
    heatmap_uint8 = np.uint8(255 * heatmap_resized)
    heatmap_color_bgr = cv2.applyColorMap(heatmap_uint8, colormap)
    heatmap_color_rgb = cv2.cvtColor(heatmap_color_bgr, cv2.COLOR_BGR2RGB)

    # Alpha-blend the colormapped heatmap with the original image
    overlay_rgb = np.uint8(alpha * heatmap_color_rgb + (1.0 - alpha) * original_rgb)

    return heatmap_resized, overlay_rgb


def save_visualization(
    original_rgb: np.ndarray,
    heatmap_resized: np.ndarray,
    overlay_rgb: np.ndarray,
    disease_display: str,
    confidence: float,
    layer_name: str,
    output_path: Path,
) -> None:
    """
    Renders and saves a comprehensive 3-panel Grad-CAM visualization using Matplotlib.

    Args:
        original_rgb (np.ndarray): Original RGB SKINtoscopic image.
        heatmap_resized (np.ndarray): Resized 2D activation heatmap.
        overlay_rgb (np.ndarray): Alpha-blended Grad-CAM overlay image.
        disease_display (str): Full display title for the predicted disease.
        confidence (float): Model confidence percentage.
        layer_name (str): Name of the convolutional layer analyzed.
        output_path (Path): Path to output PNG.
    """
    output_path.parent.mkdir(parents=True, exist_ok=True)

    fig, axes = plt.subplots(1, 3, figsize=(15, 6), dpi=150)

    # 1. Original Image Panel
    axes[0].imshow(original_rgb)
    axes[0].set_title("1. Original SKINtoscopy", fontsize=12, fontweight="bold", pad=10)
    axes[0].axis("off")

    # 2. Grad-CAM Heatmap Panel
    im_heat = axes[1].imshow(heatmap_resized, cmap="jet", vmin=0.0, vmax=1.0)
    axes[1].set_title("2. Grad-CAM Heatmap", fontsize=12, fontweight="bold", pad=10)
    axes[1].axis("off")
    fig.colorbar(im_heat, ax=axes[1], fraction=0.046, pad=0.04, label="Attribution Intensity")

    # 3. Superimposed Overlay Panel
    axes[2].imshow(overlay_rgb)
    axes[2].set_title("3. Superimposed Overlay", fontsize=12, fontweight="bold", pad=10)
    axes[2].axis("off")

    # Figure Header
    fig.suptitle(
        f"Grad-CAM Attention Map: {disease_display}\n"
        f"Confidence: {confidence:.2f}% | Target Conv Layer: '{layer_name}'",
        fontsize=14,
        fontweight="bold",
        y=0.98,
    )

    # Academic & ANALYZER Disclaimer Footer
    fig.text(
        0.5,
        0.02,
        "DISCLAIMER: Academic model-attention visualization for interpretability research. "
        "Does NOT constitute ANALYZER diagnosis or medical evidence.",
        ha="center",
        fontsize=9,
        color="#555555",
        style="italic",
    )

    plt.tight_layout(rect=[0, 0.05, 1, 0.93])
    fig.savefig(str(output_path), dpi=300, bbox_inches="tight")
    plt.close(fig)
    logger.info(f"Grad-CAM visualization saved successfully to: {output_path}")


def generate_gradcam(
    image_path: Union[str, Path],
    model: Optional[tf.keras.Model] = None,
    output_path: Optional[Union[str, Path]] = None,
    model_path: Optional[Union[str, Path]] = None,
    target_layer_name: Optional[str] = None,
    class_idx: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Reusable Grad-CAM interface designed for CLI execution and API services (e.g. FastAPI).

    Args:
        image_path (Union[str, Path]): Path to input SKINtoscopy image.
        model (Optional[tf.keras.Model]): Pre-loaded Keras model. If None, loads from model_path.
        output_path (Optional[Union[str, Path]]): Path to save result PNG. If None, saves to DEFAULT_OUTPUT_PATH.
        model_path (Optional[Union[str, Path]]): Path to .keras file if model is not pre-loaded.
        target_layer_name (Optional[str]): Explicit layer name for Grad-CAM. If None, auto-detects last Conv2D.
        class_idx (Optional[int]): Target class index. If None, uses top predicted class.

    Returns:
        Dict[str, Any]: Dictionary containing prediction metadata and output paths:
            {
                "image_path": str,
                "output_path": str,
                "class_index": int,
                "class_name": str,
                "disease_name": str,
                "confidence": float,
                "target_layer": str,
                "all_probabilities": Dict[str, float],
            }
    """
    image_path = Path(image_path)
    output_path = Path(output_path) if output_path else DEFAULT_OUTPUT_PATH

    # 1. Ensure model is loaded
    if model is None:
        target_model_path = Path(model_path) if model_path else DEFAULT_MODEL_PATH
        model = load_trained_model(target_model_path)

    # 2. Preprocess input image
    preprocessed_img, display_img = preprocess_image(image_path, target_size=IMAGE_SIZE)

    # 3. Perform model prediction first
    logger.info("Running model prediction...")
    raw_preds = model.predict(preprocessed_img, verbose=0)

    # Handle binary vs multiclass prediction parsing
    if raw_preds.shape[-1] == 1:
        prob = float(raw_preds[0][0])
        predicted_idx = 1 if prob >= 0.5 else 0
        predicted_conf = prob if predicted_idx == 1 else (1.0 - prob)
        all_probs = {"negative": 1.0 - prob, "positive": prob}
    else:
        probs = raw_preds[0]
        predicted_idx = int(np.argmax(probs))
        predicted_conf = float(probs[predicted_idx])
        all_probs = {
            CLASS_NAMES[i]: float(probs[i])
            for i in range(min(len(CLASS_NAMES), len(probs)))
        }

    # Use specified class_idx if requested, otherwise top predicted class
    target_class = class_idx if class_idx is not None else predicted_idx
    class_name = CLASS_NAMES[target_class] if target_class < len(CLASS_NAMES) else f"Class_{target_class}"
    disease_display = DISEASE_DISPLAY_NAMES.get(class_name, class_name)
    confidence_pct = predicted_conf * 100.0

    # 4. Automatically identify target convolutional layer
    conv_idx, conv_layer = find_target_conv_layer(model, layer_name=target_layer_name)

    # 5. Compute Grad-CAM heatmap
    logger.info(f"Generating Grad-CAM heatmap for class '{class_name}' (Index: {target_class})...")
    heatmap = compute_gradcam_heatmap(
        model=model,
        preprocessed_img=preprocessed_img,
        target_conv_idx=conv_idx,
        class_idx=target_class,
    )

    # 6. Create overlay visualization
    heatmap_resized, overlay_rgb = create_gradcam_overlay(
        heatmap=heatmap,
        original_rgb=display_img,
        alpha=0.45,
    )

    # 7. Save visualization to disk
    save_visualization(
        original_rgb=display_img,
        heatmap_resized=heatmap_resized,
        overlay_rgb=overlay_rgb,
        disease_display=disease_display,
        confidence=confidence_pct,
        layer_name=conv_layer.name,
        output_path=output_path,
    )

    return {
        "image_path": str(image_path),
        "output_path": str(output_path),
        "class_index": target_class,
        "class_name": class_name,
        "disease_name": disease_display,
        "confidence": confidence_pct,
        "target_layer": conv_layer.name,
        "all_probabilities": all_probs,
    }


def parse_args() -> argparse.Namespace:
    """
    Parses command-line arguments.
    """
    parser = argparse.ArgumentParser(
        description="Generate Grad-CAM heatmaps for HAM10000 skin disease classification.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument(
        "--image",
        type=Path,
        default=DEFAULT_IMAGE_PATH,
        help="Path to input test image.",
    )
    parser.add_argument(
        "--model",
        type=Path,
        default=DEFAULT_MODEL_PATH,
        help="Path to saved .keras model file.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT_PATH,
        help="Path to save the generated Grad-CAM figure.",
    )
    parser.add_argument(
        "--layer",
        type=str,
        default=None,
        help="Explicit convolutional layer name to visualize (auto-detected by default).",
    )
    parser.add_argument(
        "--class_idx",
        type=int,
        default=None,
        help="Target class index to generate Grad-CAM for (default: top predicted class).",
    )
    return parser.parse_args()


def format_path_for_display(path_val: Union[str, Path]) -> str:
    """Formats path relative to project root if possible for clean CLI display."""
    p = Path(path_val)
    try:
        rel = p.relative_to(BASE_DIR)
        return str(rel).replace("\\", "/")
    except ValueError:
        return str(p)


def main() -> int:
    """
    CLI Entrypoint.
    """
    args = parse_args()

    try:
        result = generate_gradcam(
            image_path=args.image,
            model_path=args.model,
            output_path=args.output,
            target_layer_name=args.layer,
            class_idx=args.class_idx,
        )

        display_image = format_path_for_display(args.image)
        display_output = format_path_for_display(result["output_path"])

        # Output format matching project requirements
        print("\n" + "=" * 50)
        print("             GRAD-CAM ANALYSIS")
        print("=" * 50)
        print(f"Image       : {display_image}")
        print(f"Prediction  : {result['disease_name']}")
        print(f"Confidence  : {result['confidence']:.2f}%")
        print(f"Class Index : {result['class_index']}")
        print("=" * 50)
        print("Grad-CAM saved to:")
        print(f"{display_output}")
        print("=" * 50 + "\n")
        return 0

    except FileNotFoundError as e:
        logger.error(f"File not found: {e}")
        return 1
    except Exception as e:
        logger.exception(f"Grad-CAM generation failed: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
