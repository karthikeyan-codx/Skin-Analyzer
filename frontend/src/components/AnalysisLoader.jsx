import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Scan, Layers, Cpu, Eye, Loader2 } from 'lucide-react';

const DIAGNOSTIC_STAGES = [
  { icon: Scan, text: 'Preprocessing RGB color spectrum & normalizing pixels to 128×128' },
  { icon: Layers, text: 'Extracting deep hierarchical convolutional patterns (conv3_2)' },
  { icon: Cpu, text: 'Evaluating 7-class softmax probability distributions' },
  { icon: Eye, text: 'Computing Grad-CAM gradient visual attention heatmap' },
];

export default function AnalysisLoader() {
  const [currentStage, setCurrentStage] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStage((prev) => (prev < DIAGNOSTIC_STAGES.length - 1 ? prev + 1 : prev));
    }, 750);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full fluent-glass-accent p-8 sm:p-14 text-center relative overflow-hidden">
      {/* Background Subtle Pulsing Glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-600/10 via-transparent to-transparent pointer-events-none" />

      <div className="max-w-md mx-auto space-y-8 relative z-10">
        {/* Animated Medical Lesion Scanner & Spinner */}
        <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
          {/* Radial Pulse Glow */}
          <motion.div
            animate={{ scale: [1, 1.35, 1], opacity: [0.25, 0.65, 0.25] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            className="absolute inset-0 rounded-full bg-blue-600/30 blur-xl"
          />

          {/* Outer Dashed Rotating Spinner */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
            className="w-24 h-24 rounded-full border-2 border-dashed border-blue-400/40 border-t-blue-500 flex items-center justify-center"
          />

          {/* Inner Counter-Rotating Ring */}
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ repeat: Infinity, duration: 5, ease: 'linear' }}
            className="absolute w-18 h-18 rounded-full border border-blue-300/30 border-b-blue-400"
          />

          {/* Center Scanner Emblem */}
          <div className="absolute w-14 h-14 rounded-full bg-slate-900 border border-blue-500/50 flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)]">
            <Scan className="w-7 h-7 text-blue-400 animate-pulse" />
          </div>
        </div>

        {/* Text Headers Strictly Matching Requirements */}
        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-white tracking-tight flex items-center justify-center gap-2.5">
            <span>Analyzing Skin Lesion...</span>
            <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
          </h3>
          <p className="text-sm font-medium text-slate-300">
            Please wait...
          </p>
          <div className="h-6 flex items-center justify-center">
            <p className="text-xs font-mono text-blue-400 transition-all">
              {DIAGNOSTIC_STAGES[currentStage].text}
            </p>
          </div>
        </div>

        {/* Animated Progress Bar */}
        <div className="space-y-3 pt-2">
          <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-[var(--border-subtle)] p-[1px]">
            <motion.div
              initial={{ width: '20%' }}
              animate={{ width: `${((currentStage + 1) / DIAGNOSTIC_STAGES.length) * 100}%` }}
              transition={{ duration: 0.6, ease: 'easeInOut' }}
              className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-400 rounded-full shadow-[0_0_12px_rgba(37,99,235,0.8)]"
            />
          </div>

          <div className="grid grid-cols-4 gap-2 text-[11px] font-mono text-slate-500">
            {DIAGNOSTIC_STAGES.map((_, idx) => (
              <div
                key={idx}
                className={`text-center transition-colors ${
                  idx <= currentStage ? 'text-blue-400 font-semibold' : 'text-slate-600'
                }`}
              >
                0{idx + 1}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
