import React from 'react';
import { ShieldCheck, AlertTriangle, Flame, ShieldAlert } from 'lucide-react';
import { SafetyCheck } from '../types/rocket';

interface SafetyBannerProps {
  safety: SafetyCheck;
  maxAllowedG: number;
}

export const SafetyBanner: React.FC<SafetyBannerProps> = ({ safety, maxAllowedG }) => {
  const isExplosionRisk = safety.status === 'CRITICAL_EXPLOSION_RISK';
  const isCaution = safety.status === 'CAUTION';
  const isNominal = safety.status === 'NOMINAL';

  return (
    <div
      className={`rounded-xl border p-4 sm:p-5 transition-all ${
        isExplosionRisk
          ? 'bg-rose-950/40 border-rose-500/50 text-rose-100 shadow-lg shadow-rose-950/30'
          : isCaution
          ? 'bg-amber-950/30 border-amber-500/40 text-amber-100'
          : 'bg-emerald-950/30 border-emerald-500/30 text-emerald-100'
      }`}
    >
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div
            className={`p-2.5 rounded-lg shrink-0 ${
              isExplosionRisk
                ? 'bg-rose-500/20 text-rose-400'
                : isCaution
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-emerald-500/20 text-emerald-400'
            }`}
          >
            {isExplosionRisk ? (
              <Flame className="w-5 h-5 animate-pulse" />
            ) : isCaution ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <ShieldCheck className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold tracking-wide uppercase">
                {isExplosionRisk
                  ? 'CRITICAL STRUCTURAL FAILURE: HIGH PROBABILITY OF EXPLOSION'
                  : isCaution
                  ? 'SAFETY ADVISORY: PARAMETERS REQUIRE CALIBRATION'
                  : 'FLIGHT ENVELOPE NOMINAL: STRUCTURAL INTEGRITY VERIFIED'}
              </h3>
            </div>
            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
              {isExplosionRisk
                ? 'Axial aerodynamic or inertia loads have exceeded structural failure limits. Tank bulkheads and airframe skin will buckle under severe overload.'
                : isCaution
                ? 'TWR or aerodynamic dynamic pressure (Max-Q) is slightly outside recommended orbital flight corridors.'
                : 'Dynamic throttling profile successfully restricts maximum acceleration below 4.5 G and maintains liftoff TWR within the 1.20–1.50 safe envelope.'}
            </p>
          </div>
        </div>

        {/* Diagnostic KPI Badges */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-stretch md:self-auto justify-end">
          {/* Liftoff TWR */}
          <div className="px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 flex flex-col items-center min-w-[90px]">
            <span className="text-[10px] text-slate-400 uppercase font-mono">Liftoff TWR</span>
            <span
              className={`text-sm font-bold font-mono-tabular ${
                safety.liftoff_twr_ok ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {safety.liftoff_twr.toFixed(2)}
            </span>
            <span className="text-[9px] text-slate-400">Target: 1.20–1.50</span>
          </div>

          {/* Peak G-Force */}
          <div className="px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 flex flex-col items-center min-w-[90px]">
            <span className="text-[10px] text-slate-400 uppercase font-mono">Peak G-Force</span>
            <span
              className={`text-sm font-bold font-mono-tabular ${
                safety.max_g_ok ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {safety.peak_g.toFixed(2)} G
            </span>
            <span className="text-[9px] text-slate-400">Limit: {maxAllowedG.toFixed(1)} G</span>
          </div>

          {/* Peak Max-Q */}
          <div className="px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 flex flex-col items-center min-w-[90px]">
            <span className="text-[10px] text-slate-400 uppercase font-mono">Max-Q Press.</span>
            <span
              className={`text-sm font-bold font-mono-tabular ${
                safety.max_q_ok ? 'text-cyan-400' : 'text-amber-400'
              }`}
            >
              {safety.peak_q_kPa.toFixed(1)} kPa
            </span>
            <span className="text-[9px] text-slate-400">Limit: &lt;45 kPa</span>
          </div>
        </div>
      </div>

      {/* Warnings List */}
      {safety.warnings.length > 0 && (
        <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex flex-col gap-1.5">
          {safety.warnings.map((warn, index) => (
            <div key={index} className="flex items-start gap-2 text-xs">
              <ShieldAlert className="w-3.5 h-3.5 mt-0.5 shrink-0 text-rose-400" />
              <span className="text-slate-200">{warn}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
