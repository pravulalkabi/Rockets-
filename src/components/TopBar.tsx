import React from 'react';
import { Rocket, FileCode2, BookOpen, RotateCcw, Download } from 'lucide-react';

interface TopBarProps {
  activeTab: 'console' | '3d' | 'charts' | 'throttling' | 'python' | 'physics';
  setActiveTab: (tab: 'console' | '3d' | 'charts' | 'throttling' | 'python' | 'physics') => void;
  onResetDefaults: () => void;
  onDownloadPython: () => void;
  isExplosionRisk: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  setActiveTab,
  onResetDefaults,
  onDownloadPython,
  isExplosionRisk
}) => {
  return (
    <header className="h-14 border-b border-slate-800 bg-slate-950/90 backdrop-blur sticky top-0 z-40 px-4 lg:px-6 flex items-center justify-between gap-8">
      {/* Zone 1: Brand wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-sm shadow-cyan-500/20">
          <Rocket className="w-4 h-4 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold tracking-tight text-white whitespace-nowrap">
            AeroPropulsion Studio
          </span>
          <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase">
            Orbital Staging & Dynamics
          </span>
        </div>
      </div>

      {/* Zone 2: Navigation Links */}
      <nav className="hidden md:flex items-center gap-1 lg:gap-2 text-xs font-medium">
        <button
          onClick={() => setActiveTab('console')}
          className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'console'
              ? 'bg-slate-800 text-cyan-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          Flight Overview
        </button>
        <button
          onClick={() => setActiveTab('3d')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === '3d'
              ? 'bg-slate-800 text-cyan-400 font-semibold ring-1 ring-cyan-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <span>3D Vehicle Model</span>
        </button>
        <button
          onClick={() => setActiveTab('throttling')}
          className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'throttling'
              ? 'bg-slate-800 text-cyan-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          Throttling Schedule
        </button>
        <button
          onClick={() => setActiveTab('charts')}
          className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'charts'
              ? 'bg-slate-800 text-cyan-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          Telemetry Curves
        </button>
        <button
          onClick={() => setActiveTab('python')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'python'
              ? 'bg-slate-800 text-amber-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <FileCode2 className="w-3.5 h-3.5" />
          Python Script
        </button>
        <button
          onClick={() => setActiveTab('physics')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'physics'
              ? 'bg-slate-800 text-cyan-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          Equations Reference
        </button>
      </nav>

      {/* Zone 3: Primary Action / Reset */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          onClick={onResetDefaults}
          title="Reset to Falcon 9 baseline"
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors text-xs flex items-center gap-1"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Reset</span>
        </button>

        <button
          onClick={onDownloadPython}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-md transition-colors whitespace-nowrap shrink-0 shadow-sm shadow-cyan-500/20"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Python</span>
        </button>
      </div>
    </header>
  );
};
