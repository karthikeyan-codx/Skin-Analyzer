import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, AlertTriangle, AlertOctagon, CheckCircle2 } from 'lucide-react';

export default function ConfidenceBar({ confidence }) {
  const safeConfidence = Math.min(Math.max(Number(confidence) || 0, 0), 100);

  // Strictly adherence to user-specified color ranges:
  // 95-100 Green | 75-95 Blue | 50-75 Orange | Below 50 Red
  const getColorTier = (val) => {
    if (val >= 95) {
      return {
        label: 'Very High Certainty',
        colorClass: 'from-emerald-500 to-green-500',
        glowClass: 'shadow-[0_0_15px_rgba(16,185,129,0.5)]',
        badgeClass: 'text-emerald-300 bg-emerald-950/50 border-emerald-500/30',
        textColor: 'text-emerald-400',
        icon: CheckCircle2,
      };
    }
    if (val >= 75) {
      return {
        label: 'High Confidence',
        colorClass: 'from-blue-600 to-blue-500',
        glowClass: 'shadow-[0_0_15px_rgba(37,99,235,0.5)]',
        badgeClass: 'text-blue-300 bg-blue-950/50 border-blue-500/30',
        textColor: 'text-blue-400',
        icon: ShieldCheck,
      };
    }
    if (val >= 50) {
      return {
        label: 'Moderate Certainty',
        colorClass: 'from-amber-500 to-orange-500',
        glowClass: 'shadow-[0_0_15px_rgba(245,158,11,0.5)]',
        badgeClass: 'text-amber-300 bg-amber-950/50 border-amber-500/30',
        textColor: 'text-amber-400',
        icon: AlertTriangle,
      };
    }
    return {
      label: 'Low / Inconclusive',
      colorClass: 'from-rose-600 to-red-500',
      glowClass: 'shadow-[0_0_15px_rgba(239,68,68,0.5)]',
      badgeClass: 'text-rose-300 bg-rose-950/50 border-rose-500/30',
      textColor: 'text-rose-400',
      icon: AlertOctagon,
    };
  };

  const tier = getColorTier(safeConfidence);
  const TierIcon = tier.icon;

  return (
    <div className="w-full space-y-3">
      {/* Header with numerical percentage and tier indicator */}
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider font-semibold text-slate-400 font-mono">
          Model Confidence
        </span>
        <div className="flex items-center gap-2">
          <span className="text-3xl sm:text-4xl font-extrabold text-white font-mono tracking-tight">
            {safeConfidence.toFixed(2)}%
          </span>
          <span
            className={`inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 rounded-full border ${tier.badgeClass}`}
          >
            <TierIcon className="w-3 h-3" />
            <span>{tier.label}</span>
          </span>
        </div>
      </div>

      {/* Horizontal Progress Bar */}
      <div className="w-full h-3 bg-slate-900/90 rounded-full overflow-hidden border border-white/10 p-[1.5px]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${safeConfidence}%` }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          className={`h-full rounded-full bg-gradient-to-r ${tier.colorClass} ${tier.glowClass}`}
        />
      </div>

      {/* Threshold indicator marks */}
      <div className="flex justify-between text-[10px] font-mono text-slate-500 pt-0.5">
        <span className="text-rose-400/80">&lt; 50% Red</span>
        <span className="text-amber-400/80">50-74% Orange</span>
        <span className="text-blue-400/80">75-94% Blue</span>
        <span className="text-emerald-400/80">95-100% Green</span>
      </div>
    </div>
  );
}
