import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  QrCode, 
  Zap, 
  MousePointerClick
} from 'lucide-react';

export default function LandingSplash({ onEnter, isOpen = true }) {
  const navigate = useNavigate();
  const [animatingOut, setAnimatingOut] = useState(false);

  // Allow pressing ANY key or clicking ANYWHERE to enter portal
  useEffect(() => {
    if (!isOpen) return;
    const handleAnyKey = (e) => {
      // Don't intercept refresh (F5/Ctrl+R)
      if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) return;
      handleEnter();
    };
    window.addEventListener('keydown', handleAnyKey);
    return () => window.removeEventListener('keydown', handleAnyKey);
  }, [isOpen]);

  const handleEnter = (destinationPath = null, e = null) => {
    if (e) {
      e.stopPropagation();
    }
    if (animatingOut) return;
    setAnimatingOut(true);
    setTimeout(() => {
      if (onEnter) {
        onEnter();
      }
      if (destinationPath) {
        navigate(destinationPath);
      }
    }, 450);
  };

  if (!isOpen) return null;

  return (
    <div 
      onClick={() => handleEnter()}
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-between overflow-y-auto cursor-pointer select-none bg-[#030712] transition-all duration-500 ease-out px-4 py-6 sm:py-10 ${
        animatingOut ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
      }`}
      style={{
        backgroundColor: '#030712',
      }}
      title="Click anywhere to enter Khojbeen.ai"
    >
      {/* 100% Solid Dark Ambience Canvas - Prevents Any Background Bleed */}
      <div className="absolute inset-0 bg-[#030712] pointer-events-none" />
      
      {/* Decorative Glow Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-teal-500/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-amber-500/10 rounded-full blur-[100px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-25" />
      </div>

      {/* Top Section: Header Badge */}
      <div className="relative z-10 w-full flex justify-center shrink-0 pt-1">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-950/80 border border-teal-500/40 text-teal-300 text-xs sm:text-sm font-bold tracking-wider uppercase shadow-xl shadow-teal-950/50">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Campus Lost & Found Intelligent Matcher</span>
        </div>
      </div>

      {/* Center Hero Section: Logo, Brand & Slogan */}
      <div className="relative z-10 w-full max-w-2xl my-auto flex flex-col items-center text-center py-4 sm:py-6">
        
        {/* Central Logo with Glowing Ring & Pulse Effects */}
        <div className="relative my-2 sm:my-3 group">
          {/* Glowing Aura Ring */}
          <div className="absolute -inset-3 bg-gradient-to-tr from-teal-500 via-cyan-400 to-amber-400 rounded-full blur-xl opacity-75 group-hover:opacity-100 transition duration-700 animate-pulse" />
          
          <div className="relative w-44 h-44 sm:w-60 sm:h-60 rounded-full p-2 bg-[#081226] border-2 border-teal-400/60 shadow-2xl flex items-center justify-center transform transition duration-500 hover:scale-105 active:scale-95">
            <img 
              src="/khojbeen-logo.png" 
              alt="khojbeen.ai - Khoya hai? Khojbeen karega."
              className="w-full h-full object-contain rounded-full shadow-md"
              onError={(e) => {
                e.currentTarget.src = '/logo.png';
              }}
            />
          </div>
        </div>

        {/* Brand Headline & Motto */}
        <div className="mt-3 sm:mt-5 space-y-1.5 max-w-lg">
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white flex items-center justify-center gap-1.5 drop-shadow-lg">
            <span>khojbeen</span>
            <span className="text-amber-400">.ai</span>
            <span className="ml-2 px-2.5 py-0.5 text-xs sm:text-sm font-black uppercase tracking-wider bg-gradient-to-r from-teal-400 to-emerald-500 text-slate-950 rounded-lg shadow-md">2.0</span>
          </h1>
          <p className="text-lg sm:text-2xl font-black bg-gradient-to-r from-teal-300 via-cyan-200 to-amber-300 bg-clip-text text-transparent italic tracking-wide">
            “Khoya hai? Khojbeen karega.”
          </p>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto font-normal leading-relaxed pt-1">
            Intelligent AI matching, instant QR Smart Tags, and secure student alerts.
          </p>
        </div>

        {/* Feature Highlights Pills */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 max-w-md">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-teal-300 text-xs font-semibold shadow-sm">
            <Zap className="w-3.5 h-3.5 text-teal-400" />
            <span>AI Matcher</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-amber-300 text-xs font-semibold shadow-sm">
            <QrCode className="w-3.5 h-3.5 text-amber-400" />
            <span>QR Smart Tags</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-cyan-300 text-xs font-semibold shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Privacy Safe</span>
          </span>
        </div>

      </div>

      {/* Bottom Section: CTA & Click Prompt */}
      <div className="relative z-10 w-full max-w-md flex flex-col items-center gap-2.5 shrink-0 pb-2">
        <button
          onClick={(e) => handleEnter(null, e)}
          id="enter-portal-btn"
          className="w-full sm:w-auto min-h-[48px] px-8 py-3 rounded-2xl bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-600 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-black text-sm sm:text-base transition-all shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 hover:scale-[1.03] active:scale-[0.98] flex items-center justify-center gap-2.5 group cursor-pointer"
        >
          <span>Enter Website Portal</span>
          <ArrowRight className="w-4 h-4 text-slate-950 group-hover:translate-x-1.5 transition-transform rtl:rotate-180" />
        </button>

        {/* Anywhere Click Prompt */}
        <div className="inline-flex items-center gap-1.5 text-teal-300/80 text-xs font-medium animate-pulse">
          <MousePointerClick className="w-3.5 h-3.5 text-amber-400" />
          <span>Click anywhere on screen to enter</span>
        </div>
      </div>

    </div>
  );
}
