"""
Skin Disease Classification - HAM10000 Dataset Preprocessing Script
====================================================================
This script performs professional, production-grade preprocessing on the HAM10000 dataset:
1. Loads and validates HAM10000_metadata.csv.
2. Locates images across HAM10000_images_part_1 and HAM10000_images_part_2 using an O(1) path map.
3. Resizes images to (128, 128), converts BGR to RGB, and normalizes pixels to [0, 1] as float32.
4. Encodes categorical disease labels into integers using LabelEncoder.
5. Performs stratified 80/20 train-test split.
6. Gracefully handles missing images with warnings and tracks statistics.
7. Saves processed NumPy arrays (X_train.npy, X_test.npy, y_train.npy, y_test.npy).
8. Memory-optimized and CPU-accelerated for TensorFlow 2.x and Python 3.x.
"""

import gc
import logging
import os
from pathlib import Path
from typing import Dict, List, Tuple

import cv2
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

try:
    from tqdm import tqdm
except ImportError:
    # Graceful fallback if tqdm is not installed in the environment
    def tqdm(iterable, desc="", total=None, **kwargs):
        step_interval = max(1, (total // 10) if total else 1000)
        for i, item in enumerate(iterable):
            if total and (i % step_interval == 0 or i == total - 1):
                logger.info(f"{desc}: {i + 1}/{total} ({(i + 1) / total * 100:.1f}%)")
            yield item

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
# Configuration / Hyperparameters
# ---------------------------------------------------------------------------
# Resolve paths relative to project root dynamically
BASE_DIR: Path = Path(__file__).resolve().parent.parent
DATASET_DIR: Path = BASE_DIR / "dataset"
METADATA_FILE: Path = DATASET_DIR / "HAM10000_metadata.csv"
PART1_DIR: Path = DATASET_DIR / "HAM10000_images_part_1"
PART2_DIR: Path = DATASET_DIR / "HAM10000_images_part_2"
OUTPUT_DIR: Path = DATASET_DIR  # Directory where .npy files will be saved

IMAGE_SIZE: Tuple[int, int] = (128, 128)  # Height, Width for model input
TEST_SIZE: float = 0.20
RANDOM_STATE: int = 42


def build_image_path_map(image_dirs: List[Path]) -> Dict[str, str]:
    """
    Builds a fast O(1) hash map mapping image_id to its absolute file path.
    Uses single-pass directory scanning for maximum I/O performance.

    Args:
        image_dirs (List[Path]): List of directories containing image files.

    Returns:
        Dict[str, str]: Dictionary mapping image_id (without extension) to file path.
    """
    path_map: Dict[str, str] = {}
    valid_extensions = {".jpg", ".jpeg", ".png"}

    for directory in image_dirs:
        if not directory.exists():
            logger.warning(f"Image directory not found: {directory}")
            continue

        try:
            with os.scandir(directory) as entries:
                for entry in entries:
                    if entry.is_file():
                        name, ext = os.path.splitext(entry.name)
                        if ext.lower() in valid_extensions:
                            path_map[name] = entry.path
        except OSError as e:
            logger.error(f"Error scanning directory {directory}: {e}")

    logger.info(f"Indexed {len(path_map)} total image files across directories.")
    return path_map


def load_and_preprocess_dataset(
    metadata_path: Path,
    image_dirs: List[Path],
    target_size: Tuple[int, int] = IMAGE_SIZE,
) -> Tuple[np.ndarray, np.ndarray, LabelEncoder, pd.Series, int]:
    """
    Reads metadata, loads images from disk, handles missing files, converts BGR->RGB,
    resizes to target dimensions, normalizes pixels to [0, 1] as float32, and encodes labels.
    Pre-allocates NumPy arrays to optimize memory usage and avoid fragmentation.

    Args:
        metadata_path (Path): Path to HAM10000_metadata.csv.
        image_dirs (List[Path]): Folders containing image parts.
        target_size (Tuple[int, int]): Dimensions (height, width) to resize images.

    Returns:
        Tuple[np.ndarray, np.ndarray, LabelEncoder, pd.Series, int]:
            - X: Preprocessed image array (N, height, width, 3) in float32
            - y: Encoded integer label array (N,) in int64
            - label_encoder: Fitted LabelEncoder instance
            - label_counts: Value counts of the original disease labels loaded
            - total_records: Total number of records in metadata
    """
    if not metadata_path.exists():
        raise FileNotFoundError(f"Metadata file not found at: {metadata_path}")

    logger.info(f"Reading metadata from: {metadata_path}")
    df = pd.read_csv(metadata_path)

    required_columns = {"image_id", "dx"}
    if not required_columns.issubset(df.columns):
        raise ValueError(f"Metadata CSV must contain columns: {required_columns}")

    total_records = len(df)
    image_path_map = build_image_path_map(image_dirs)

    # Pre-allocate contiguous array to prevent memory spike from list appending & array cloning
    X_preallocated = np.empty((total_records, target_size[0], target_size[1], 3), dtype=np.float32)
    labels: List[str] = []
    skipped_count: int = 0
    loaded_idx: int = 0

    # OpenCV resize expects dsize=(width, height)
    dsize: Tuple[int, int] = (target_size[1], target_size[0])

    # Extract numpy arrays for ultra-fast loop iteration without pandas Series overhead
    image_ids = df["image_id"].astype(str).str.strip().to_numpy()
    disease_labels = df["dx"].astype(str).str.strip().to_numpy()

    logger.info(f"Loading, resizing to {target_size}, and normalizing images...")
    for idx in tqdm(range(total_records), total=total_records, desc="Preprocessing"):
        img_id = image_ids[idx]
        dx_label = disease_labels[idx]

        image_path = image_path_map.get(img_id)

        if image_path is None or not os.path.exists(image_path):
            skipped_count += 1
            logger.warning(f"Missing image skipped: {img_id}")
            continue

        # Load image via OpenCV (reads as BGR uint8)
        img = cv2.imread(image_path)

        if img is None:
            skipped_count += 1
            logger.warning(f"Corrupt or unreadable image skipped: {image_path}")
            continue

        # Convert BGR to RGB
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

        # Resize image directly to target IMAGE_SIZE (128, 128)
        img = cv2.resize(img, dsize, interpolation=cv2.INTER_AREA)

        # Normalize directly to float32 [0, 1] without float64 intermediate
        X_preallocated[loaded_idx] = img.astype(np.float32) / 255.0
        labels.append(dx_label)
        loaded_idx += 1

    logger.info(f"Preprocessing completed. Loaded: {loaded_idx}, Skipped: {skipped_count}")

    if loaded_idx == 0:
        raise RuntimeError("No valid images could be loaded. Check dataset paths and image IDs.")

    # Slice pre-allocated array to actual loaded count if any images were skipped
    if loaded_idx < total_records:
        X = np.ascontiguousarray(X_preallocated[:loaded_idx])
    else:
        X = X_preallocated

    del X_preallocated
    gc.collect()

    # Encode disease categories to integers
    label_encoder = LabelEncoder()
    y = label_encoder.fit_transform(labels)

    label_counts = pd.Series(labels).value_counts()

    return X, y, label_encoder, label_counts, total_records


def split_and_save_data(
    X: np.ndarray,
    y: np.ndarray,
    output_dir: Path,
    test_size: float = TEST_SIZE,
    random_state: int = RANDOM_STATE,
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """
    Performs stratified train/test split and saves NumPy arrays to disk.

    Args:
        X (np.ndarray): Image array of shape (N, height, width, 3).
        y (np.ndarray): Target label array of shape (N,).
        output_dir (Path): Directory where .npy files will be saved.
        test_size (float): Proportion of dataset to include in test split (default 0.20).
        random_state (int): Random seed for reproducibility.

    Returns:
        Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]: (X_train, X_test, y_train, y_test)
    """
    output_dir.mkdir(parents=True, exist_ok=True)

    train_pct = int((1.0 - test_size) * 100)
    test_pct = int(test_size * 100)
    logger.info(f"Splitting dataset (Train: {train_pct}%, Test: {test_pct}%)...")

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=test_size,
        random_state=random_state,
        stratify=y,  # Preserves identical class distribution in train and test splits
    )

    # File paths for output arrays
    x_train_path = output_dir / "X_train.npy"
    x_test_path = output_dir / "X_test.npy"
    y_train_path = output_dir / "y_train.npy"
    y_test_path = output_dir / "y_test.npy"

    logger.info("Saving processed arrays to disk...")
    np.save(x_train_path, X_train)
    np.save(x_test_path, X_test)
    np.save(y_train_path, y_train)
    np.save(y_test_path, y_test)

    logger.info(f"Saved: {x_train_path}")
    logger.info(f"Saved: {x_test_path}")
    logger.info(f"Saved: {y_train_path}")
    logger.info(f"Saved: {y_test_path}")

    return X_train, X_test, y_train, y_test


def display_summary(
    total_loaded: int,
    skipped_count: int,
    X_train: np.ndarray,
    X_test: np.ndarray,
    y_train: np.ndarray,
    y_test: np.ndarray,
    label_encoder: LabelEncoder,
    label_counts: pd.Series,
) -> None:
    """
    Prints a formatted summary of dataset preprocessing statistics.

    Args:
        total_loaded (int): Number of images successfully loaded.
        skipped_count (int): Number of missing or unreadable images.
        X_train (np.ndarray): Training image array.
        X_test (np.ndarray): Testing image array.
        y_train (np.ndarray): Training label array.
        y_test (np.ndarray): Testing label array.
        label_encoder (LabelEncoder): Label encoder with classes mapping.
        label_counts (pd.Series): Frequency count of each disease class.
    """
    print("\n" + "=" * 60)
    print("           HAM10000 PREPROCESSING SUMMARY")
    print("=" * 60)
    print(f"Total Images Loaded Successfully : {total_loaded}")
    print(f"Total Missing / Skipped Images   : {skipped_count}")
    print("-" * 60)
    print("DATASET SHAPES:")
    print(f"  - X_train Shape : {X_train.shape} (dtype: {X_train.dtype})")
    print(f"  - y_train Shape : {y_train.shape} (dtype: {y_train.dtype})")
    print(f"  - X_test Shape  : {X_test.shape} (dtype: {X_test.dtype})")
    print(f"  - y_test Shape  : {y_test.shape} (dtype: {y_test.dtype})")
    print("-" * 60)
    print("CLASS ENCODING MAPPING:")
    for idx, class_name in enumerate(label_encoder.classes_):
        print(f"  [{idx}] {class_name}")
    print("-" * 60)
    print("LABEL DISTRIBUTION (LOADED DATASET):")
    for class_name, count in label_counts.items():
        percentage = (count / total_loaded) * 100
        print(f"  - {class_name:<10}: {count:>5} images ({percentage:>6.2f}%)")
    print("=" * 60 + "\n")


def main() -> None:
    """
    Main execution pipeline for dataset preprocessing.
    """
    image_dirs = [PART1_DIR, PART2_DIR]

    # Step 1: Load and preprocess images & metadata
    X, y, label_encoder, label_counts, total_records = load_and_preprocess_dataset(
        metadata_path=METADATA_FILE,
        image_dirs=image_dirs,
        target_size=IMAGE_SIZE,
    )

    total_loaded = len(X)
    skipped_count = total_records - total_loaded

    # Step 2: Stratified Split and Save
    X_train, X_test, y_train, y_test = split_and_save_data(
        X=X,
        y=y,
        output_dir=OUTPUT_DIR,
        test_size=TEST_SIZE,
        random_state=RANDOM_STATE,
    )

    # Step 3: Display comprehensive summary
    display_summary(
        total_loaded=total_loaded,
        skipped_count=skipped_count,
        X_train=X_train,
        X_test=X_test,
        y_train=y_train,
        y_test=y_test,
        label_encoder=label_encoder,
        label_counts=label_counts,
    )


if __name__ == "__main__":
    main()