import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Footer from './components/Footer';
import { Keyboard, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function App() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('SKIN_theme_preference') || 'dark';
    } catch {
      return 'dark';
    }
  });

  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);

  // Sync theme changes with DOM and localStorage
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('SKIN_theme_preference', theme);
    } catch (e) {
      console.warn('Could not save theme to localStorage:', e);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Global key listener for shortcuts modal and theme toggle
  useEffect(() => {
    const handleGlobalKeys = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if (e.key === '?') {
        e.preventDefault();
        setShortcutsModalOpen((prev) => !prev);
      } else if (e.key.toLowerCase() === 't') {
        e.preventDefault();
        toggleTheme();
      }
    };

    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-main)] text-[var(--text-main)] selection:bg-blue-600/30 selection:text-blue-300 relative overflow-x-hidden transition-colors duration-200">
      {/* Background Radial Ambient Glows */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[450px] bg-gradient-to-b from-blue-600/10 via-indigo-600/5 to-transparent rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-blue-700/5 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Subtle Medical Grid Pattern */}
      <div className="fixed inset-0 bg-medical-grid opacity-60 pointer-events-none -z-10" />

      {/* Navigation Bar */}
      <Navbar
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenShortcuts={() => setShortcutsModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        <Home />
      </main>

      {/* Footer */}
      <Footer />

      {/* Keyboard Shortcuts Help Modal */}
      <AnimatePresence>
        {shortcutsModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShortcutsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md fluent-card p-6 sm:p-7 space-y-5 border border-blue-500/30 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <Keyboard className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Keyboard Shortcuts</h3>
                    <p className="text-xs text-slate-400">Workstation navigation controls</p>
                  </div>
                </div>
                <button
                  onClick={() => setShortcutsModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-[var(--border-subtle)]">
                  <span className="text-slate-300 font-sans">Run Prediction</span>
                  <kbd className="px-2.5 py-1 rounded bg-slate-800 border border-white/10 text-white font-bold">
                    Enter
                  </kbd>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-[var(--border-subtle)]">
                  <span className="text-slate-300 font-sans">Reset to Home</span>
                  <kbd className="px-2.5 py-1 rounded bg-slate-800 border border-white/10 text-white font-bold">
                    Esc
                  </kbd>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-[var(--border-subtle)]">
                  <span className="text-slate-300 font-sans">Toggle Dark / Light Theme</span>
                  <kbd className="px-2.5 py-1 rounded bg-slate-800 border border-white/10 text-white font-bold">
                    T
                  </kbd>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-[var(--border-subtle)]">
                  <span className="text-slate-300 font-sans">Toggle Shortcuts Modal</span>
                  <kbd className="px-2.5 py-1 rounded bg-slate-800 border border-white/10 text-white font-bold">
                    ?
                  </kbd>
                </div>
              </div>

              <div className="pt-2 text-center text-[11px] text-slate-500 font-sans">
                Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-white/10 text-slate-300">Esc</kbd> or click outside to dismiss.
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
