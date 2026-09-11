import React, { useState, useRef } from 'react';
import { UploadCloud, Image as ImageIcon, AlertCircle, FolderOpen } from 'lucide-react';
import { motion } from 'framer-motion';

export default function UploadCard({ onImageSelected, disabled }) {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const fileInputRef = useRef(null);

  const validateAndSelect = (file) => {
    setErrorMsg(null);
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const validExtensions = ['.jpg', '.jpeg', '.png'];
    const fileExt = file.name ? file.name.slice(file.name.lastIndexOf('.')).toLowerCase() : '';

    if (!validTypes.includes(file.type.toLowerCase()) && !validExtensions.includes(fileExt)) {
      setErrorMsg('Unsupported format. Please select a valid PNG, JPG, or JPEG image.');
      return;
    }

    // 25MB limit check
    if (file.size > 25 * 1024 * 1024) {
      setErrorMsg('Image size exceeds 25MB. Please choose a smaller lesion image.');
      return;
    }

    onImageSelected(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSelect(e.target.files[0]);
    }
  };

  return (
    <div className="w-full">
      <motion.div
        whileHover={{ scale: disabled ? 1 : 1.004 }}
        whileTap={{ scale: disabled ? 1 : 0.996 }}
        onClick={() => !disabled && fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative group cursor-pointer fluent-card p-8 sm:p-14 text-center transition-all duration-300 border-2 ${
          isDragging
            ? 'border-dashed border-blue-500 bg-blue-950/30 shadow-[0_0_40px_rgba(37,99,235,0.3)] scale-[1.01]'
            : 'border-dashed border-[var(--border-subtle)] hover:border-blue-500/60 hover:bg-slate-800/50 hover:shadow-[0_20px_40px_-15px_rgba(37,99,235,0.2)]'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,image/jpeg,image/png"
          onChange={handleFileInputChange}
          disabled={disabled}
          className="hidden"
          aria-label="Upload dermatoscopic lesion image"
        />

        {/* Ambient subtle glow background */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-600/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl pointer-events-none" />

        <div className="flex flex-col items-center justify-center space-y-5">
          {/* Pulsing Upload Icon Bubble */}
          <div
            className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300 ${
              isDragging
                ? 'bg-blue-600 text-white scale-110 shadow-[0_0_25px_rgba(37,99,235,0.5)]'
                : 'bg-blue-500/10 border border-blue-500/20 text-blue-400 group-hover:border-blue-500/50 group-hover:bg-blue-600 group-hover:text-white group-hover:scale-105 group-hover:shadow-[0_0_25px_rgba(37,99,235,0.3)]'
            }`}
          >
            <UploadCloud className="w-10 h-10" />
          </div>

          <div className="space-y-2 max-w-lg">
            <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {isDragging ? 'Release to upload skin image' : 'Drag & drop skin lesion image here'}
            </h3>
            <p className="text-sm text-slate-400">
              or click anywhere to browse from your device
            </p>
          </div>

          {/* Browse Image Action Button */}
          <div className="pt-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm inline-flex items-center gap-2 shadow-[0_4px_14px_rgba(37,99,235,0.4)] transition-all cursor-pointer"
            >
              <FolderOpen className="w-4 h-4" />
              <span>Browse Image</span>
            </button>
          </div>

          {/* Supported Formats Banner */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-slate-900/60 border border-[var(--border-subtle)] text-xs font-mono text-slate-400">
            <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
            <span>Supported Formats: PNG • JPG • JPEG (Up to 25MB)</span>
          </div>

          {/* Quick Demo Sample Loader */}
          <div className="pt-2">
            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  const res = await fetch('/sample.jpg');
                  const blob = await res.blob();
                  const demoFile = new File([blob], 'sample.jpg', { type: 'image/jpeg' });
                  onImageSelected(demoFile);
                } catch (err) {
                  console.error('Failed to load demo image:', err);
                }
              }}
              className="text-xs font-mono text-blue-400 hover:text-blue-300 underline underline-offset-4 hover:decoration-blue-400 transition-colors cursor-pointer"
            >
              ✦ Load sample dermatoscopy image (sample.jpg)
            </button>
          </div>
        </div>
      </motion.div>

      {/* Validation alert */}
      {errorMsg && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-center gap-2.5"
        >
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{errorMsg}</span>
        </motion.div>
      )}
    </div>
  );
}
