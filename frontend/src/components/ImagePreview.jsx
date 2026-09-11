import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Trash2,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function ImagePreview({ file, previewUrl, onAnalyze, onRemove, isAnalyzing }) {
  const [dimensions, setDimensions] = useState({ width: null, height: null });

  // Read native image dimensions dynamically
  useEffect(() => {
    if (!previewUrl) return;
    const img = new Image();
    img.src = previewUrl;
    img.onload = () => {
      setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    };
  }, [previewUrl]);

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileExtension = (name) => {
    if (!name) return 'IMG';
    return name.slice(name.lastIndexOf('.') + 1).toUpperCase();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, filter: 'blur(8px)' }}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, scale: 0.97, filter: 'blur(8px)' }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="w-full fluent-glass-accent p-6 sm:p-8"
    >
      <div className="flex flex-col md:flex-row items-center gap-6 lg:gap-8">
        {/* Preview Frame with high-fidelity border and overlay */}
        <div className="relative group w-full md:w-64 h-64 rounded-2xl overflow-hidden bg-slate-950 border border-white/10 shadow-2xl flex-shrink-0">
          <img
            src={previewUrl}
            alt={file?.name || 'Selected skin lesion'}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-70" />

          {/* Dimension Tag on Image */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] font-mono text-blue-300">
            <span className="truncate max-w-[140px] text-white font-medium">{file?.name}</span>
            <span className="px-2 py-0.5 rounded bg-black/75 border border-blue-500/30 text-[10px] text-blue-300 font-bold">
              {dimensions.width && dimensions.height ? `${dimensions.width}×${dimensions.height}` : 'VALIDATED'}
            </span>
          </div>
        </div>

        {/* Image Information Metadata & Action Controls */}
        <div className="flex-1 w-full flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            {/* Status Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-mono">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
              <span>Dermatoscopy Validated & Ready</span>
            </div>

            {/* Filename Header */}
            <div>
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-mono block">
                Source Lesion File
              </span>
              <h4 className="text-xl font-bold text-white truncate max-w-lg">
                {file?.name}
              </h4>
            </div>

            {/* Detailed Image Information Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              {/* Resolution */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-[var(--border-subtle)] space-y-1">
                <span className="text-[10px] uppercase font-mono text-slate-500 block">Resolution</span>
                <span className="text-xs font-mono font-bold text-slate-200 block">
                  {dimensions.width && dimensions.height ? `${dimensions.width} × ${dimensions.height} px` : 'Reading...'}
                </span>
              </div>

              {/* File Size */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-[var(--border-subtle)] space-y-1">
                <span className="text-[10px] uppercase font-mono text-slate-500 block">File Size</span>
                <span className="text-xs font-mono font-bold text-slate-200 block">
                  {formatFileSize(file?.size)}
                </span>
              </div>

              {/* Format */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-[var(--border-subtle)] space-y-1">
                <span className="text-[10px] uppercase font-mono text-slate-500 block">Format</span>
                <span className="text-xs font-mono font-bold text-blue-400 block">
                  {getFileExtension(file?.name)}
                </span>
              </div>

              {/* Model Input Dimension */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-[var(--border-subtle)] space-y-1">
                <span className="text-[10px] uppercase font-mono text-slate-500 block">Model Input</span>
                <span className="text-xs font-mono font-bold text-emerald-400 block">
                  128 × 128 px
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons: Large Gradient Predict Button + Change Image */}
          <div className="pt-3 border-t border-[var(--border-subtle)] flex flex-wrap items-center gap-4">
            {/* Large Gradient Button with Animated Hover */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onAnalyze}
              disabled={isAnalyzing}
              className="btn-primary-gradient px-8 py-4 rounded-2xl font-bold text-base flex items-center gap-3 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_10px_25px_-5px_rgba(37,99,235,0.5)]"
            >
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
              <span>Run Deep Learning Prediction</span>
              <ArrowRight className="w-5 h-5 text-white" />
            </motion.button>

            {/* Change Image Button */}
            <button
              onClick={onRemove}
              disabled={isAnalyzing}
              className="px-5 py-3.5 rounded-2xl bg-slate-800/80 hover:bg-rose-950/40 border border-[var(--border-subtle)] hover:border-rose-500/30 text-slate-300 hover:text-rose-300 text-sm font-medium flex items-center gap-2 transition-all cursor-pointer disabled:opacity-40"
              title="Remove this image and choose another"
            >
              <Trash2 className="w-4 h-4" />
              <span>Change Image</span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
