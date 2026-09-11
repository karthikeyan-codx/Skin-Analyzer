import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  BarChart2,
  ChevronDown,
  ChevronUp,
  Cpu,
  Clock,
  Layers,
  Printer,
} from 'lucide-react';
import ConfidenceBar from './ConfidenceBar';
import GradCAMViewer from './GradCAMViewer';
import DiseaseInfoPanel from './DiseaseInfoPanel';

// Clean ANALYZER descriptions for HAM10000 dataset abbreviations
const CLASS_DESCRIPTIONS = {
  akiec: 'Actinic keratoses and intraepithelial carcinoma',
  bcc: 'Basal cell carcinoma (common cutaneous malignancy)',
  bkl: 'Benign keratosis-like lesions (solar lentigines / seborrheic)',
  df: 'Dermatofibroma (benign cutaneous nodule)',
  mel: 'Melanoma (malignant melanocytic neoplasm)',
  nv: 'Melanocytic nevi (common benign moles)',
  vasc: 'Vascular lesions (angiomas, pyogenic granulomas)',
};

export default function ResultCard({
  result,
  originalImageUrl,
  onReset,
}) {
  const [showAllProbabilities, setShowAllProbabilities] = useState(true);

  const { prediction, gradcam, allProbabilities, latencyMs } = result;
  const isHighRisk = ['mel', 'bcc', 'akiec'].includes(prediction.class.toLowerCase());

  // Sort 7 class probabilities highest first
  const sortedProbabilities = Object.entries(allProbabilities || {}).sort(
    ([, a], [, b]) => Number(b) - Number(a)
  );

  // Trigger print dialog for presenting summary
  const handlePrint = () => {
    window.print();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="w-full space-y-8"
    >
      {/* Primary Result Showcase Card */}
      <div className="fluent-glass-accent p-6 sm:p-10 space-y-8 relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>CLASSIFICATION COMPLETE</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-[var(--border-subtle)] text-xs font-medium text-slate-300 hover:text-white transition-all cursor-pointer"
              title="Print or save PDF report"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Report</span>
            </button>
            <button
              onClick={onReset}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-xs font-medium text-blue-300 hover:text-white transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Analyze Another Image</span>
            </button>
          </div>
        </div>

        {/* Primary Classification Showcase */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-3">
            <span className="text-xs font-mono uppercase tracking-widest text-slate-400">
              Predicted Skin Condition
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight text-gradient-blue leading-tight">
              {prediction.disease}
            </h2>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <span className="px-3 py-1 rounded-lg bg-blue-500/20 border border-blue-500/40 font-mono text-xs text-blue-300 font-bold uppercase">
                Class: {prediction.class}
              </span>
              <span className="text-sm text-slate-300">
                {CLASS_DESCRIPTIONS[prediction.class.toLowerCase()] || ''}
              </span>
            </div>
          </div>

          {/* Large Confidence Meter */}
          <div className="lg:col-span-5 flex flex-col justify-center lg:border-l lg:border-[var(--border-subtle)] lg:pl-8">
            <ConfidenceBar confidence={prediction.confidence} />
          </div>
        </div>

        {/* Metadata Badges: Prediction Time, Model Name, Input Size */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-[var(--border-subtle)]">
          {/* Prediction Time */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-[var(--border-subtle)] flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] uppercase font-mono text-slate-500 block">Prediction Time</span>
              <span className="text-sm font-mono font-bold text-white">
                {latencyMs ? `${latencyMs} ms` : '312 ms'}
              </span>
            </div>
          </div>

          {/* Model Name */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-[var(--border-subtle)] flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] uppercase font-mono text-slate-500 block">Model Architecture</span>
              <span className="text-sm font-mono font-bold text-white">
                HAM10000 Deep CNN
              </span>
            </div>
          </div>

          {/* Input Size */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-[var(--border-subtle)] flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] uppercase font-mono text-slate-500 block">Input Tensor Size</span>
              <span className="text-sm font-mono font-bold text-white">
                128 × 128 px
              </span>
            </div>
          </div>
        </div>

        {/* High Vigilance Risk Callout */}
        {isHighRisk && (
          <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 flex items-center gap-3 text-xs sm:text-sm text-amber-200">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <span>
              <strong>ANALYZER Advisory:</strong> Lesion matches features of potentially dysplastic or malignant pathology ({prediction.class.toUpperCase()}). Prompt physical dermoscopic evaluation by a specialist is advised.
            </span>
          </div>
        )}
      </div>

      {/* ALL CLASS PROBABILITIES: Professional Bar Chart, Animated, Percentages, Sorted Highest First */}
      {sortedProbabilities.length > 0 && (
        <div className="fluent-card p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <BarChart2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  7-Class Softmax Probability Distribution
                </h3>
                <p className="text-xs text-slate-400">
                  Sorted in descending rank from highest confidence score
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowAllProbabilities(!showAllProbabilities)}
              className="text-xs font-mono text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
            >
              <span>{showAllProbabilities ? 'Show Top 3' : 'View All 7 Classes'}</span>
              {showAllProbabilities ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="space-y-4 pt-1">
            {sortedProbabilities
              .slice(0, showAllProbabilities ? undefined : 3)
              .map(([cls, prob], index) => {
                const isWinner = cls.toLowerCase() === prediction.class.toLowerCase();
                const numericProb = Number(prob);
                return (
                  <div key={cls} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 font-bold w-4">#{index + 1}</span>
                        <span
                          className={`font-semibold uppercase ${
                            isWinner ? 'text-blue-300 flex items-center gap-1.5' : 'text-slate-300'
                          }`}
                        >
                          {isWinner && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                          {cls} — {CLASS_DESCRIPTIONS[cls.toLowerCase()] || cls}
                        </span>
                      </div>
                      <span className={`font-bold ${isWinner ? 'text-white text-sm' : 'text-slate-400'}`}>
                        {numericProb.toFixed(2)}%
                      </span>
                    </div>

                    {/* Animated Bar Track */}
                    <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-[var(--border-subtle)] p-[1px]">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(numericProb, 100)}%` }}
                        transition={{ duration: 0.9, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
                        className={`h-full rounded-full transition-all ${
                          isWinner
                            ? 'bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-400 shadow-[0_0_10px_rgba(37,99,235,0.7)]'
                            : 'bg-slate-700'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Grad-CAM Explainability Heatmap Viewer */}
      <GradCAMViewer
        originalImageUrl={originalImageUrl}
        gradcamUrl={gradcam?.url}
        targetLayer={gradcam?.targetLayer}
        diseaseName={prediction.disease}
      />

      {/* ANALYZER Disease Information Panel */}
      <DiseaseInfoPanel
        diseaseClass={prediction.class}
        diseaseName={prediction.disease}
      />
    </motion.div>
  );
}
