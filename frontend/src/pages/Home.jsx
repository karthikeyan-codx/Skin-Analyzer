import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Sparkles,
  AlertCircle,
  RotateCcw,
  CheckCircle2,
  Database,
} from 'lucide-react';

import UploadCard from '../components/UploadCard';
import ImagePreview from '../components/ImagePreview';
import AnalysisLoader from '../components/AnalysisLoader';
import ResultCard from '../components/ResultCard';
import HistoryTable from '../components/HistoryTable';
import { predictSkinLesion } from '../services/api';

const HISTORY_KEY = 'skin_disease_recent_analyses_v2';

export default function Home() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [status, setStatus] = useState('idle'); // 'idle' | 'image-selected' | 'analyzing' | 'success' | 'error'
  const [resultData, setResultData] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [recentHistory, setRecentHistory] = useState(() => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.warn('Failed to parse local history:', e);
      return [];
    }
  });
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => setToast(null), 3800);
  };

  const handleImageSelected = (file) => {
    if (!file) return;

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    const url = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(url);
    setStatus('image-selected');
    setResultData(null);
    setErrorMessage(null);
    showToast(`Loaded: ${file.name}`, 'info');
  };

  const handleReset = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setStatus('idle');
    setResultData(null);
    setErrorMessage(null);
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setStatus('analyzing');
    setErrorMessage(null);

    // Minimum delay of 1.4s so the user experiences the diagnostic loader animation smoothly
    const minDelayPromise = new Promise((resolve) => setTimeout(resolve, 1400));
    const apiPromise = predictSkinLesion(selectedFile);

    try {
      const [apiResponse] = await Promise.all([apiPromise, minDelayPromise]);

      setResultData(apiResponse);
      setStatus('success');
      showToast(`Classified: ${apiResponse.prediction.disease}`, 'success');

      // Update session history
      try {
        const now = new Date();
        const entry = {
          id: Date.now(),
          date: now.toLocaleDateString(),
          time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          filename: selectedFile.name,
          disease: apiResponse.prediction.disease,
          classCode: apiResponse.prediction.class,
          confidence: apiResponse.prediction.confidence,
        };
        const updated = [entry, ...recentHistory.slice(0, 19)]; // Keep up to 20 queries
        setRecentHistory(updated);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to store history item:', e);
      }

      // Scroll smoothly to result area
      setTimeout(() => {
        document.getElementById('analysis-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 120);
    } catch (err) {
      console.error('Inference error:', err);
      setErrorMessage(err.message || 'Unable to communicate with the classification service.');
      setStatus('error');
      showToast('Classification encountered an issue', 'error');
    }
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger when user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if (e.key === 'Escape') {
        handleReset();
      } else if (e.key === 'Enter' && status === 'image-selected') {
        e.preventDefault();
        handleAnalyze();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, selectedFile]);

  return (
    <div className="w-full relative">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-20 right-4 sm:right-8 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl fluent-glass border border-blue-500/30 text-xs font-mono text-white shadow-2xl backdrop-blur-xl"
          >
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HOME SCREEN HERO SECTION */}
      <section id="home" className="pt-14 pb-10 sm:pt-20 sm:pb-14 max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-6">
        {/* Top Feature Pill */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-950/50 border border-blue-500/30 text-xs font-mono text-blue-300 shadow-[0_0_15px_rgba(37,99,235,0.2)]"
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          <span>7-Class Cutaneous Lesion Classification • HAM10000 Trained</span>
        </motion.div>

        {/* Large Header strictly adhering to requirements */}
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.15]"
        >
          🩺 Skin Disease Classification <br className="hidden sm:inline" />
          <span className="text-gradient-blue">using Deep Learning</span>
        </motion.h1>

        {/* Subtitle strictly adhering to requirements */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-base sm:text-xl font-medium text-blue-200/90 max-w-2xl mx-auto"
        >
          Deep Learning Dermatology Assistant
        </motion.p>

        {/* ANALYZER Overview Points */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 pt-2 text-xs font-mono text-slate-400"
        >
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
            Grad-CAM Spatial Attribution
          </span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
            128×128 Normalized Input
          </span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
            Instant Softmax Confidence
          </span>
        </motion.div>
      </section>

      {/* MAIN WORKSPACE SECTION */}
      <section id="analysis-section" className="max-w-4xl mx-auto px-4 sm:px-6 pb-20 space-y-8">
        {/* State Machine Transition */}
        <AnimatePresence mode="wait">
          {/* Stage 1: Upload Card */}
          {status === 'idle' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
            >
              <UploadCard onImageSelected={handleImageSelected} disabled={false} />
            </motion.div>
          )}

          {/* Stage 2: After Image Selected Preview */}
          {status === 'image-selected' && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
            >
              <ImagePreview
                file={selectedFile}
                previewUrl={previewUrl}
                onAnalyze={handleAnalyze}
                onRemove={handleReset}
                isAnalyzing={false}
              />
            </motion.div>
          )}

          {/* Stage 3: When Predict Button Clicked (Loading Screen) */}
          {status === 'analyzing' && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <AnalysisLoader />
            </motion.div>
          )}

          {/* Stage 4: Result Page */}
          {status === 'success' && resultData && (
            <motion.div
              key="success"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <ResultCard
                result={resultData}
                originalImageUrl={previewUrl}
                onReset={handleReset}
              />
            </motion.div>
          )}

          {/* Stage 5: Error Screen */}
          {status === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="w-full fluent-card p-8 sm:p-10 border border-rose-500/30 text-center space-y-5"
            >
              <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-950/60 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.2)]">
                <AlertCircle className="w-8 h-8" />
              </div>

              <div className="space-y-2 max-w-md mx-auto">
                <h3 className="text-xl font-bold text-white tracking-tight">
                  Unable to complete classification
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {errorMessage || 'Something went wrong while communicating with the classification service.'}
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleReset}
                  className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm inline-flex items-center gap-2 border border-[var(--border-subtle)] transition-all cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Try Again</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* RECENT SESSION HISTORY TABLE SECTION */}
        <section id="history">
          <HistoryTable
            history={recentHistory}
            onClear={() => {
              setRecentHistory([]);
              localStorage.removeItem(HISTORY_KEY);
              showToast('History cleared', 'info');
            }}
          />
        </section>

        {/* MODEL TECHNICAL SPECIFICATIONS SECTION */}
        <section id="ANALYZER-specs" className="pt-4">
          <div className="fluent-card p-6 sm:p-8 space-y-5">
            <div className="flex items-center gap-2.5 border-b border-[var(--border-subtle)] pb-4">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Technical Model & Dataset Architecture
                </h3>
                <p className="text-xs text-slate-400">
                  Engineering documentation for final-year project evaluation
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-[var(--border-subtle)] space-y-1">
                <span className="text-slate-500 block">Dataset</span>
                <span className="text-white font-bold block">HAM10000 Benchmark</span>
                <span className="text-[11px] text-slate-400 block">10,015 Dermatoscopic Images</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-[var(--border-subtle)] space-y-1">
                <span className="text-slate-500 block">Input Shape</span>
                <span className="text-blue-400 font-bold block">(128, 128, 3)</span>
                <span className="text-[11px] text-slate-400 block">Inter-area Resized & Normalized</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-[var(--border-subtle)] space-y-1">
                <span className="text-slate-500 block">Diagnostic Classes</span>
                <span className="text-emerald-400 font-bold block">7 Conditions</span>
                <span className="text-[11px] text-slate-400 block">Softmax Probability Vector</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-[var(--border-subtle)] space-y-1">
                <span className="text-slate-500 block">Explainability</span>
                <span className="text-indigo-400 font-bold block">Grad-CAM (conv3_2)</span>
                <span className="text-[11px] text-slate-400 block">Gradient-weighted Attributions</span>
              </div>
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}
