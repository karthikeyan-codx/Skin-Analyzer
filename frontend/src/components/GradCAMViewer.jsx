import React, { useState } from 'react';
import { Eye, Layers, Maximize2, ShieldCheck, Sparkles, ExternalLink, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function GradCAMViewer({ originalImageUrl, gradcamUrl, targetLayer, diseaseName }) {
  const [modalImage, setModalImage] = useState(null);

  return (
    <div className="w-full fluent-card p-6 sm:p-8 space-y-6">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Eye className="w-4 h-4" />
            </span>
            <h3 className="text-lg font-bold text-white tracking-tight">
              Grad-CAM Visual Attention Map
            </h3>
          </div>
          <p className="text-xs text-slate-400 max-w-xl">
            Gradient-weighted Class Activation Mapping computes spatial activation highlights across convolutional feature maps.
          </p>
        </div>

        {/* Target Layer Indicator */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/90 border border-[var(--border-subtle)] text-xs font-mono text-blue-400">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>Target Layer: {targetLayer || 'conv3_2'}</span>
          </span>
        </div>
      </div>

      {/* Side-by-Side Comparison Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Original Image Frame */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
            <span>1. Original Dermatoscopy</span>
            <span className="text-[10px] text-slate-500">Unfiltered RGB</span>
          </div>
          <div className="relative group rounded-2xl overflow-hidden bg-slate-950 border border-[var(--border-subtle)] aspect-square flex items-center justify-center">
            <img
              src={originalImageUrl}
              alt="Original dermatoscopic lesion"
              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md border border-white/10 text-[11px] font-mono text-white">
              Original
            </div>
            <button
              onClick={() => setModalImage(originalImageUrl)}
              className="absolute bottom-3 right-3 p-2 rounded-lg bg-black/75 hover:bg-slate-800 border border-white/10 text-white transition-opacity opacity-0 group-hover:opacity-100 cursor-pointer"
              title="Inspect full resolution"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. Grad-CAM Multi-panel Figure Frame */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
            <span className="text-blue-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              2. Convolutional Attention Heatmap
            </span>
            <span className="text-[10px] text-blue-400/80">Heatmap + Overlay</span>
          </div>
          <div className="relative group rounded-2xl overflow-hidden bg-slate-950 border border-blue-500/30 aspect-square flex items-center justify-center shadow-[0_0_30px_rgba(37,99,235,0.15)]">
            {gradcamUrl ? (
              <img
                src={gradcamUrl}
                alt={`Grad-CAM heatmap for ${diseaseName}`}
                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="text-slate-500 font-mono text-xs">Computing gradient attention map...</div>
            )}

            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-blue-950/80 backdrop-blur-md border border-blue-500/30 text-[11px] font-mono text-blue-300">
              Grad-CAM Map
            </div>

            {gradcamUrl && (
              <div className="absolute bottom-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setModalImage(gradcamUrl)}
                  className="p-2 rounded-lg bg-black/75 hover:bg-slate-800 border border-white/10 text-white transition-colors cursor-pointer"
                  title="Expand visualization"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
                <a
                  href={gradcamUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-lg bg-black/75 hover:bg-blue-950 border border-white/10 hover:border-blue-500/40 text-slate-300 hover:text-blue-300 transition-colors"
                  title="Open high-resolution Grad-CAM in new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Attribution Explanation Banner */}
      <div className="rounded-xl p-4 bg-blue-950/20 border border-blue-500/20 flex items-start gap-3 text-xs text-slate-300 leading-relaxed">
        <ShieldCheck className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-blue-300 mb-0.5">Deep Feature Interpretability</p>
          <p className="text-slate-400">
            Warmer colors (yellow, red) highlight spatial coordinates in the lesion that contributed positive gradient attribution toward predicting{' '}
            <strong className="text-white">{diseaseName}</strong>. This provides diagnostic transparency by showing exactly where the neural network focused.
          </p>
        </div>
      </div>

      {/* Full-Screen Zoom Modal */}
      <AnimatePresence>
        {modalImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setModalImage(null)}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-8"
          >
            <div className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center">
              <button
                onClick={() => setModalImage(null)}
                className="absolute -top-12 right-0 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-white cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
              <img
                src={modalImage}
                alt="Enlarged view"
                className="max-h-[85vh] w-auto object-contain rounded-xl border border-white/10 shadow-2xl"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
