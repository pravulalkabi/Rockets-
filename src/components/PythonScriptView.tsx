import React, { useState } from 'react';
import { Copy, Check, Download, Terminal, BookOpen } from 'lucide-react';
import { CalculationInputs } from '../types/rocket';
import { generatePythonScript } from '../physics/pythonScriptGenerator';

interface PythonScriptViewProps {
  inputs: CalculationInputs;
  onDownload: () => void;
}

export const PythonScriptView: React.FC<PythonScriptViewProps> = ({ inputs, onDownload }) => {
  const [copied, setCopied] = useState(false);
  const scriptContent = generatePythonScript(inputs);

  const handleCopy = () => {
    navigator.clipboard.writeText(scriptContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-white tracking-wide">
              Standalone Copy-Pasteable Python Optimizer Script
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Self-contained Python script implementing the exact Tsiolkovsky, Barometric, Drag, and Throttling models using the standard library (`math`).
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors border border-slate-700"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Python Script</span>
              </>
            )}
          </button>

          <button
            onClick={onDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-md transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .py</span>
          </button>
        </div>
      </div>

      {/* Execution Instructions Banner */}
      <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-cyan-400 font-bold">$</span>
          <span>python3 rocket_staging_optimizer.py</span>
        </div>
        <span className="text-[11px] text-slate-400">
          Pure Python 3 standard library (no external dependencies required)
        </span>
      </div>

      {/* Code Viewer Container */}
      <div className="relative rounded-lg bg-slate-950 border border-slate-800 p-4 font-mono text-xs leading-relaxed overflow-x-auto max-h-[600px] text-slate-200">
        <pre className="selection:bg-cyan-500/30 selection:text-cyan-200">
          <code>{scriptContent}</code>
        </pre>
      </div>
    </div>
  );
};
