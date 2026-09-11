/**
 * API Service for communicating with FastAPI Backend
 * Endpoint: POST /predict (multipart/form-data, field name: "file")
 * Endpoint: GET /health
 */
import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 45000, // 45s timeout to allow CPU inference & Grad-CAM generation
});

/**
 * Checks backend health and whether the CNN model is loaded.
 */
export async function checkBackendHealth() {
  try {
    const response = await client.get('/health');
    return response.data;
  } catch (error) {
    console.warn('Backend health check failed:', error.message);
    return { status: 'offline', model_loaded: false };
  }
}

/**
 * Sends image file to FastAPI POST /predict endpoint.
 *
 * @param {File} file - Selected image file object.
 * @returns {Promise<Object>} Formatted prediction and Grad-CAM metadata.
 */
export async function predictSkinLesion(file) {
  const formData = new FormData();
  // Field name strictly matches FastAPI's `file: UploadFile = File(...)`
  formData.append('file', file);

  try {
    const startTime = performance.now();
    const response = await client.post('/predict', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    const endTime = performance.now();
    const clientLatencyMs = Math.round(endTime - startTime);

    const data = response.data;

    // Resolve public Grad-CAM URL
    let gradcamUrl = null;
    if (data.gradcam && data.gradcam.url) {
      gradcamUrl = data.gradcam.url.startsWith('http')
        ? data.gradcam.url
        : `${API_BASE_URL}${data.gradcam.url}`;
    }

    return {
      success: data.success,
      prediction: {
        class: data.prediction.class,
        disease: data.prediction.disease,
        confidence: Number(data.prediction.confidence),
      },
      gradcam: {
        fileId: data.gradcam.file_id,
        filename: data.gradcam.filename,
        url: gradcamUrl,
        targetLayer: data.gradcam.target_layer,
      },
      allProbabilities: data.all_probabilities || {},
      latencyMs: clientLatencyMs,
    };
  } catch (error) {
    if (error.response) {
      // Backend returned 4xx or 5xx
      const detail = error.response.data?.detail || 'Analysis request was rejected by the server.';
      throw new Error(detail);
    } else if (error.request) {
      // No response received (server offline or CORS issue)
      throw new Error('Unable to connect to the analysis server at http://127.0.0.1:8000. Please ensure the backend is running.');
    } else {
      throw new Error(error.message || 'An unexpected error occurred while preparing the image.');
    }
  }
}
