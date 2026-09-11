# HAM10000 Skin Disease Classification & Grad-CAM Explainability System

An end-to-end deep learning web platform for dermatoscopic skin lesion classification and explainable AI using Grad-CAM heatmaps.

---

## 📋 Table of Contents

- [Prerequisites](#-prerequisites)
- [Quick Start Guide](#-quick-start-guide)
  - [1. Backend Setup & Run](#1-backend-setup--run)
  - [2. Frontend Setup & Run](#2-frontend-setup--run)
- [CLI Scripts & Tools](#-cli-scripts--tools)
  - [Single Image Prediction](#single-image-prediction)
  - [Grad-CAM Heatmap Generation](#grad-cam-heatmap-generation)
  - [Model Training](#model-training)
  - [Performance & Evaluation Reports](#performance--evaluation-reports)
- [API Documentation](#-api-documentation)
- [Project Structure](#-project-structure)

---

## 🛠️ Prerequisites

Ensure you have the following installed on your machine:
- **Python**: `3.10` or higher
- **Node.js**: `v18.x` or higher and **npm**
- **Git**

---

## 🚀 Quick Start Guide

To run the full application, you need to launch both the **FastAPI Backend** and the **Vite + React Frontend** in separate terminal windows.

### 1. Backend Setup & Run

Open a terminal at the project root (`SKIN`):

```powershell
# 1. Activate the virtual environment (Windows PowerShell)
.\venv\Scripts\Activate.ps1

# (If using Command Prompt cmd.exe instead):
# .\venv\Scripts\activate.bat

# 2. Install dependencies (if not already installed)
pip install -r requirements.txt

# 3. Start the FastAPI backend server
python -m uvicorn src.api:app --reload --host 127.0.0.1 --port 8000
```

> **Alternative**: You can also run the server directly with Python:
> ```powershell
> python src/api.py
> ```

- **Backend API URL**: [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **Interactive Swagger Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Health Check**: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

---

### 2. Frontend Setup & Run

Open a **second terminal** window at the project root (`SKIN`):

```powershell
# 1. Navigate to the frontend directory
cd frontend

# 2. Install dependencies (first time only)
npm install

# 3. Start the Vite development server
npm run dev
```

- **Frontend Web App URL**: [http://localhost:5173](http://localhost:5173) (or the port shown in terminal)

---

## 🧪 CLI Scripts & Tools

You can also use standalone command-line scripts for prediction, visualization, and retraining without opening the browser:

### Single Image Prediction

Runs inference on a test image and displays prediction confidence:

```powershell
python src/predict.py --image test_images/sample.jpg
```

### Grad-CAM Heatmap Generation

Computes and saves a 3-panel explainability visualization (Original image, Activation Heatmap, and Overlay):

```powershell
python src/gradcam.py --image test_images/sample.jpg
```

To specify an output path:

```powershell
python src/gradcam.py --image test_images/sample.jpg --output models/gradcam/sample_gradcam.png
```

### Model Training

To retrain or train the CNN model on the HAM10000 dataset:

```powershell
python src/train.py
```

### Performance & Evaluation Reports

Generate classification metrics, confusion matrices, and ROC curves:

```powershell
python src/generate_reports.py
```

---

## 📡 API Documentation

Once the backend is running, test and inspect API endpoints at `http://127.0.0.1:8000/docs`:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | API root status & welcome message |
| `GET` | `/health` | Service and model health status |
| `POST` | `/predict` | Upload an image for classification & Grad-CAM generation |
| `GET` | `/gradcam/{filename}` | Retrieve generated Grad-CAM heatmap visualization |

---

## 📁 Project Structure

```text
SKIN/
├── dataset/                     # HAM10000 image dataset & metadata
├── frontend/                    # React + Vite + Tailwind CSS web interface
│   ├── src/                     # React components & UI logic
│   ├── package.json             # Frontend dependencies & scripts
│   └── .env                     # Backend API target (http://127.0.0.1:8000)
├── models/                      # Saved models and generated heatmaps
│   ├── skin_disease_model.keras # Trained Keras CNN model
│   └── gradcam/                 # Generated Grad-CAM output images
├── src/                         # Python backend & core ML pipeline
│   ├── api.py                   # FastAPI REST API
│   ├── gradcam.py               # Grad-CAM heatmap generation module
│   ├── predict.py               # CLI inference script
│   ├── train.py                 # Model training pipeline
│   ├── preprocess.py            # Image preprocessing & data augmentation
│   └── generate_reports.py      # Metrics & evaluation plotting
├── test_images/                 # Sample images for testing
├── requirements.txt             # Python dependencies
└── README.md                    # Project documentation
```
