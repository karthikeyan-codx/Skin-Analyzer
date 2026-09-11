"""
HAM10000 Skin Disease Classification & Grad-CAM Explainability API
==================================================================
Production-ready FastAPI backend for SKINtoscopic skin lesion inference:
1. Loads the trained CNN model (models/skin_disease_model.keras) at startup.
2. Evaluates uploaded images matching the existing preprocessing pipeline.
3. Produces high-confidence predictions across 7 disease classes.
4. Generates unique Grad-CAM visual attention heatmaps per upload (models/gradcam/).
5. Exposes CORS-enabled REST endpoints without leaking internal file paths.
6. Provides automatic Swagger documentation at /docs.
"""

import logging
import os
import sys
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import cv2
import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field

# Suppress noisy TensorFlow C++ logs
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"

import tensorflow as tf

# Reusable utilities from existing modules
from src.gradcam import (
    CLASS_NAMES,
    compute_gradcam_heatmap,
    create_gradcam_overlay,
    find_target_conv_layer,
    load_trained_model,
    save_visualization,
)

# ---------------------------------------------------------------------------
# Logging Configuration
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("skin_disease_api")

# ---------------------------------------------------------------------------
# Project Directories & Constants (pathlib used everywhere)
# ---------------------------------------------------------------------------
BASE_DIR: Path = Path(__file__).resolve().parent.parent
MODEL_PATH: Path = BASE_DIR / "models" / "skin_disease_model.keras"
GRADCAM_DIR: Path = BASE_DIR / "models" / "gradcam"
GRADCAM_DIR.mkdir(parents=True, exist_ok=True)

IMAGE_SIZE = (128, 128)  # Height, Width

# Human-readable disease names for clean ANALYZER presentation
DISEASE_NAMES: Dict[str, str] = {
    "akiec": "Actinic Keratoses",
    "bcc": "Basal Cell Carcinoma",
    "bkl": "Benign Keratosis",
    "df": "SKINtofibroma",
    "mel": "Melanoma",
    "nv": "Melanocytic Nevi",
    "vasc": "Vascular Lesion",
}

# ---------------------------------------------------------------------------
# Application State & Lifespan Context Manager
# ---------------------------------------------------------------------------
class ModelContainer:
    """Holds global in-memory model and pre-discovered layer references."""
    model: Optional[tf.keras.Model] = None
    target_conv_idx: Optional[int] = None
    target_conv_name: Optional[str] = None


model_container = ModelContainer()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manages startup and shutdown lifecycle:
    Loads the Keras model once into memory and verifies layer compatibility.
    """
    logger.info("Initializing HAM10000 Skin Disease Classification Backend...")
    try:
        model_container.model = load_trained_model(MODEL_PATH)
        conv_idx, conv_layer = find_target_conv_layer(model_container.model)
        model_container.target_conv_idx = conv_idx
        model_container.target_conv_name = conv_layer.name
        logger.info(
            f"Startup complete: Model loaded. Target Grad-CAM layer: "
            f"'{model_container.target_conv_name}' (Index: {model_container.target_conv_idx})"
        )
    except Exception as e:
        logger.error(f"Critical error loading model during startup: {e}")
        model_container.model = None

    yield

    logger.info("Shutting down API server...")


# ---------------------------------------------------------------------------
# FastAPI Application Declaration & CORS Setup
# ---------------------------------------------------------------------------
app = FastAPI(
    title="HAM10000 Skin Disease Classification & Grad-CAM API",
    description=(
        "REST API for automated SKINtoscopic image classification across 7 skin conditions "
        "with Grad-CAM visual explainability. Built for research and educational purposes."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware for cross-origin frontend requests (React, Vue, HTML/JS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Pydantic Response Schemas
# ---------------------------------------------------------------------------
class PredictionDetail(BaseModel):
    disease_class: str = Field(..., alias="class", description="Predicted HAM10000 class abbreviation")
    disease: str = Field(..., description="Full descriptive name of the skin disease")
    confidence: float = Field(..., description="Model confidence score in percent (0.00 - 100.00)")

    class Config:
        populate_by_name = True


class GradCAMDetail(BaseModel):
    file_id: str = Field(..., description="Unique identifier for the generated Grad-CAM artifact")
    filename: str = Field(..., description="Filename of the saved Grad-CAM PNG image")
    url: str = Field(..., description="Public relative endpoint URL to fetch the visualization")
    target_layer: str = Field(..., description="Convolutional layer utilized for gradient attribution")


class PredictResponse(BaseModel):
    success: bool = Field(True, description="Indicates if inference completed successfully")
    prediction: PredictionDetail
    gradcam: GradCAMDetail
    all_probabilities: Optional[Dict[str, float]] = Field(
        None, description="Softmax confidence distribution across all 7 diagnostic classes"
    )


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool


# ---------------------------------------------------------------------------
# Image Preprocessing Helper (Strictly Matching predict.py)
# ---------------------------------------------------------------------------
def preprocess_image_bytes(image_bytes: bytes) -> Tuple[np.ndarray, np.ndarray]:
    """
    Decodes raw image bytes and applies the identical preprocessing pipeline from predict.py:
    1. Decodes via OpenCV (BGR).
    2. Converts BGR to RGB.
    3. Resizes to (128, 128) using INTER_AREA interpolation.
    4. Normalizes pixel values to [0.0, 1.0] as float32.
    5. Expands batch dimension to (1, 128, 128, 3).

    Returns:
        Tuple[np.ndarray, np.ndarray]:
            - preprocessed: (1, 128, 128, 3) float32 batch tensor.
            - display_img: (H, W, 3) uint8 original RGB array for Grad-CAM overlay.

    Raises:
        ValueError: If bytes cannot be decoded as a valid image.
    """
    np_arr = np.frombuffer(image_bytes, np.uint8)
    img_bgr = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    if img_bgr is None or img_bgr.size == 0:
        raise ValueError("Provided file could not be decoded as a valid image.")

    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    img_resized = cv2.resize(img_rgb, (IMAGE_SIZE[1], IMAGE_SIZE[0]), interpolation=cv2.INTER_AREA)

    display_img = img_rgb.copy()
    img_norm = img_resized.astype(np.float32) / 255.0
    preprocessed = np.expand_dims(img_norm, axis=0)

    return preprocessed, display_img


# ---------------------------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------------------------
@app.get(
    "/",
    tags=["General"],
    summary="API Root Status",
    response_description="Returns basic operational status and documentation link",
)
async def root() -> Dict[str, str]:
    """Returns a welcome message and documentation path."""
    return {
        "message": "HAM10000 Skin Disease Classification & Grad-CAM Explainability API",
        "status": "online",
        "docs_url": "/docs",
    }


@app.get(
    "/health",
    response_model=HealthResponse,
    tags=["General"],
    summary="Health Check",
    response_description="Reports system health and model loading readiness",
)
async def health_check() -> HealthResponse:
    """Provides liveness and readiness status for the service."""
    is_loaded = model_container.model is not None
    return HealthResponse(
        status="healthy" if is_loaded else "unhealthy",
        model_loaded=is_loaded,
    )


@app.post(
    "/predict",
    response_model=PredictResponse,
    tags=["Inference"],
    summary="Classify Skin Lesion & Generate Grad-CAM",
    response_description="Predicted disease category, confidence, and Grad-CAM visual attention metadata",
)
async def predict_skin_disease(
    file: UploadFile = File(..., description="SKINtoscopic skin lesion image (JPEG, PNG, WEBP)"),
) -> PredictResponse:
    """
    Accepts an uploaded SKINtoscopic image, runs CNN model inference, and generates
    a Grad-CAM explainability visualization stored with a unique identifier.
    """
    if model_container.model is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model is not loaded. Please verify models/skin_disease_model.keras exists.",
        )

    # 1. Read uploaded file content
    try:
        contents = await file.read()
        if not contents or len(contents) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty.",
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error reading upload stream: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error reading uploaded file: {str(e)}",
        )

    # 2. Preprocess image strictly matching predict.py
    try:
        preprocessed_img, display_img = preprocess_image_bytes(contents)
    except ValueError as e:
        logger.warning(f"Invalid image received from client: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is not a valid or supported image format.",
        )

    # 3. Model Prediction
    try:
        raw_preds = model_container.model.predict(preprocessed_img, verbose=0)
    except Exception as e:
        logger.exception(f"Inference execution failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Model prediction failure.",
        )

    # 4. Parse Multiclass Softmax vs Binary Output
    if raw_preds.shape[-1] == 1:
        prob = float(raw_preds[0][0])
        pred_idx = 1 if prob >= 0.5 else 0
        confidence_val = prob if pred_idx == 1 else (1.0 - prob)
        all_probabilities = {"negative": round((1.0 - prob) * 100, 2), "positive": round(prob * 100, 2)}
    else:
        probs = raw_preds[0]
        pred_idx = int(np.argmax(probs))
        confidence_val = float(probs[pred_idx])
        all_probabilities = {
            CLASS_NAMES[i]: round(float(probs[i]) * 100, 2)
            for i in range(min(len(CLASS_NAMES), len(probs)))
        }

    predicted_class_code = CLASS_NAMES[pred_idx] if pred_idx < len(CLASS_NAMES) else f"class_{pred_idx}"
    disease_label = DISEASE_NAMES.get(predicted_class_code, predicted_class_code)
    confidence_pct = round(confidence_val * 100.0, 2)

    # 5. Generate Grad-CAM Visualization with Unique Identifier
    unique_id = uuid.uuid4().hex
    gradcam_filename = f"gradcam_{unique_id}.png"
    gradcam_file_path = GRADCAM_DIR / gradcam_filename

    try:
        # Compute activation heatmap
        heatmap = compute_gradcam_heatmap(
            model=model_container.model,
            preprocessed_img=preprocessed_img,
            target_conv_idx=model_container.target_conv_idx,
            class_idx=pred_idx,
        )

        # Create alpha-blended overlay
        heatmap_resized, overlay_rgb = create_gradcam_overlay(
            heatmap=heatmap,
            original_rgb=display_img,
            alpha=0.45,
        )

        # Save 3-panel figure to models/gradcam/
        save_visualization(
            original_rgb=display_img,
            heatmap_resized=heatmap_resized,
            overlay_rgb=overlay_rgb,
            disease_display=f"{disease_label} ({predicted_class_code})",
            confidence=confidence_pct,
            layer_name=model_container.target_conv_name,
            output_path=gradcam_file_path,
        )
    except Exception as e:
        logger.exception(f"Grad-CAM generation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Grad-CAM visualization computation failed.",
        )

    # 6. Construct Clean Public Response (Internal filesystem paths are NOT exposed)
    public_url = f"/gradcam/{gradcam_filename}"

    return PredictResponse(
        success=True,
        prediction=PredictionDetail(
            disease_class=predicted_class_code,
            disease=disease_label,
            confidence=confidence_pct,
        ),
        gradcam=GradCAMDetail(
            file_id=unique_id,
            filename=gradcam_filename,
            url=public_url,
            target_layer=model_container.target_conv_name,
        ),
        all_probabilities=all_probabilities,
    )


@app.get(
    "/gradcam/{filename}",
    tags=["Explainability"],
    summary="Retrieve Grad-CAM Visualization",
    response_description="Serves the generated Grad-CAM PNG image file",
)
async def get_gradcam_image(filename: str):
    """
    Retrieves and serves a previously generated Grad-CAM visualization image.
    Guards against path traversal attacks.
    """
    # Sanitize and ensure file resides strictly inside GRADCAM_DIR
    target_path = (GRADCAM_DIR / filename).resolve()
    if not target_path.is_relative_to(GRADCAM_DIR.resolve()) or not target_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Requested Grad-CAM visualization not found.",
        )

    return FileResponse(
        path=str(target_path),
        media_type="image/png",
        filename=filename,
    )


# ---------------------------------------------------------------------------
# Direct Execution Helper
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("src.api:app", host="127.0.0.1", port=8000, reload=True)
