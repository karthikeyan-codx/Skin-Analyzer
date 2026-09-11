import React from 'react';
import { ShieldCheck, HeartPulse, Terminal, Award } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full border-t border-[var(--border-subtle)] bg-[#0F172A] py-12 text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Col */}
          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="font-extrabold tracking-wider text-base text-white">
                SKIN<span className="text-blue-500">ANALYZER</span>
              </span>
            </div>
            <p className="text-slate-400 max-w-md leading-relaxed text-xs">
              Clinical decision support system utilizing deep convolutional neural networks trained on the benchmark HAM10000 dermatoscopic dataset with Grad-CAM gradient explainability.
            </p>
          </div>

          {/* Model Specifications */}
          <div className="space-y-2">
            <h5 className="font-mono text-xs text-white uppercase tracking-wider font-semibold">
              Model Specs
            </h5>
            <ul className="space-y-1.5 font-mono text-[11px] text-slate-400">
              <li>Framework: TensorFlow / Keras</li>
              <li>Input Tensor: 128 × 128 × 3 RGB</li>
              <li>Attribution: Grad-CAM (conv3_2)</li>
              <li>Benchmark: HAM10000 (10,015 images)</li>
            </ul>
          </div>

          {/* Compliance & Standards */}
          <div className="space-y-2">
            <h5 className="font-mono text-xs text-white uppercase tracking-wider font-semibold">
              Standards
            </h5>
            <ul className="space-y-1.5 text-[11px] text-slate-400">
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                <span>Zero File System Leaks</span>
              </li>
              <li className="flex items-center gap-1.5">
                <HeartPulse className="w-3.5 h-3.5 text-emerald-400" />
                <span>Client-Side Data Privacy</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-indigo-400" />
                <span>Academic Engineering Project</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] font-mono text-slate-500">
          <div>
            &copy; {new Date().getFullYear()} Skin Disease Classification Deep Learning System.
          </div>
          <div>
            Designed for clinical research & dermatological education.
          </div>
        </div>
      </div>
    </footer>
  );
}
