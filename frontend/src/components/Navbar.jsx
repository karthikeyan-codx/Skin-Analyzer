import React, { useState, useEffect } from 'react';
import {
  Activity,
  Sun,
  Moon,
  Keyboard,
  Menu,
  X,
} from 'lucide-react';
import { checkBackendHealth } from '../services/api';

export default function Navbar({ theme, onToggleTheme, onOpenShortcuts }) {
  const [isOnline, setIsOnline] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    const checkStatus = async () => {
      const res = await checkBackendHealth();
      if (mounted) {
        setIsOnline(res.status === 'healthy' && res.model_loaded);
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 15000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--border-subtle)] bg-[#0F172A]/85 dark:bg-[#0F172A]/85 backdrop-blur-xl transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <a href="#home" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.2)] group-hover:border-blue-400 group-hover:scale-105 transition-all">
            <Activity className="w-5 h-5 text-blue-500 group-hover:text-blue-400 transition-colors" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold tracking-wider text-base sm:text-lg text-white">
                SKIN<span className="text-blue-500">ANALYZER</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-950/70 border border-blue-500/30 text-blue-300 font-mono font-medium">
                v2.5
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium tracking-wide">
              Deep Learning Dermatology Workstation
            </span>
          </div>
        </a>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-300">
          <a href="#home" className="hover:text-blue-400 transition-colors">
            Classification
          </a>
          <a href="#history" className="hover:text-blue-400 transition-colors">
            Session History
          </a>
          <a href="#ANALYZER-specs" className="hover:text-blue-400 transition-colors">
            Model Specifications
          </a>
        </nav>

        {/* Right Utility Bar: Status, Keyboard Shortcuts, Theme Toggle */}
        <div className="hidden sm:flex items-center gap-3">
          {/* Live System Health Badge */}
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono border transition-all ${
              isOnline
                ? 'bg-emerald-950/50 border-emerald-500/30 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                : 'bg-amber-950/50 border-amber-500/30 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.15)]'
            }`}
            title={isOnline ? 'CNN Classification Model is ready in memory' : 'Checking backend server status'}
          >
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isOnline ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isOnline ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
            </span>
            <span className="tracking-wide font-semibold">
              {isOnline ? 'MODEL ONLINE' : 'CHECKING MODEL...'}
            </span>
          </div>

          {/* Keyboard Shortcuts Trigger */}
          <button
            onClick={onOpenShortcuts}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-[var(--border-subtle)] text-slate-300 hover:text-white transition-all cursor-pointer"
            title="View Keyboard Shortcuts (Press ?)"
          >
            <Keyboard className="w-4 h-4" />
          </button>

          {/* Dark / Light Theme Toggle */}
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-[var(--border-subtle)] text-slate-300 hover:text-white transition-all cursor-pointer"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode (Press T)`}
            aria-label="Toggle theme mode"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-blue-400" />
            )}
          </button>
        </div>

        {/* Mobile menu trigger */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-lg text-slate-300 hover:bg-slate-800"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-400" />}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 focus:outline-none"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6 text-slate-300" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[var(--border-subtle)] bg-[#0F172A] px-4 pt-3 pb-5 space-y-3">
          <a
            href="#home"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-slate-200 hover:text-blue-400 font-medium py-1.5"
          >
            Classification
          </a>
          <a
            href="#history"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-slate-200 hover:text-blue-400 font-medium py-1.5"
          >
            Session History
          </a>
          <a
            href="#ANALYZER-specs"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-slate-200 hover:text-blue-400 font-medium py-1.5"
          >
            Model Specifications
          </a>
          <div className="pt-2 flex items-center justify-between">
            <span
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono border ${
                isOnline
                  ? 'bg-emerald-950/50 border-emerald-500/30 text-emerald-400'
                  : 'bg-amber-950/50 border-amber-500/30 text-amber-300'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              {isOnline ? 'MODEL ONLINE' : 'CHECKING MODEL...'}
            </span>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenShortcuts();
              }}
              className="px-3 py-1 text-xs font-mono text-slate-300 bg-slate-800 rounded-lg"
            >
              Shortcuts (?)
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
