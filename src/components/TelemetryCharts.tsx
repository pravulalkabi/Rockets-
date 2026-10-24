import React, { useState } from 'react';
import { TelemetryPoint } from '../types/rocket';
import { TrendingUp, Activity, Gauge, Flame } from 'lucide-react';

interface TelemetryChartsProps {
  telemetry: TelemetryPoint[];
  maxAllowedG: number;
  maxQPoint: {
    altitude_km: number;
    time_s: number;
    dynamic_pressure_kPa: number;
    velocity_m_s: number;
  };
}

export const TelemetryCharts: React.FC<TelemetryChartsProps> = ({
  telemetry,
  maxAllowedG,
  maxQPoint
}) => {
  const [activeChart, setActiveChart] = useState<'acceleration' | 'dynamic_q' | 'throttle'>(
    'acceleration'
  );
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!telemetry || telemetry.length === 0) return null;

  const hoveredPoint = hoverIndex !== null ? telemetry[hoverIndex] : telemetry[telemetry.length - 1];

  // SVG dimensions
  const svgWidth = 800;
  const svgHeight = 260;
  const padding = { top: 20, right: 30, bottom: 35, left: 55 };
  const chartW = svgWidth - padding.left - padding.right;
  const chartH = svgHeight - padding.top - padding.bottom;

  const maxTime = telemetry[telemetry.length - 1].time_s || 1;

  // Chart 1: Acceleration & TWR vs Time
  const maxGInFlight = Math.max(5.5, maxAllowedG + 0.5, ...telemetry.map((p) => p.acceleration_g));
  const getYForG = (g: number) => {
    const clamped = Math.max(0, Math.min(maxGInFlight, g));
    return padding.top + chartH - (clamped / maxGInFlight) * chartH;
  };

  const getXForTime = (t: number) => {
    return padding.left + (t / maxTime) * chartW;
  };

  // Build points for paths
  const gForcePoints = telemetry
    .map((p) => `${getXForTime(p.time_s).toFixed(1)},${getYForG(p.acceleration_g).toFixed(1)}`)
    .join(' ');

  const twrPoints = telemetry
    .map((p) => `${getXForTime(p.time_s).toFixed(1)},${getYForG(p.twr).toFixed(1)}`)
    .join(' ');

  // Chart 2: Dynamic Pressure vs Time
  const maxQValue = Math.max(50, ...telemetry.map((p) => p.dynamic_pressure_kPa));
  const getYForQ = (q: number) => {
    return padding.top + chartH - (q / maxQValue) * chartH;
  };
  const qPoints = telemetry
    .map((p) => `${getXForTime(p.time_s).toFixed(1)},${getYForQ(p.dynamic_pressure_kPa).toFixed(1)}`)
    .join(' ');

  // Chart 3: Throttle & Thrust vs Time
  const getYForThrottle = (pct: number) => {
    return padding.top + chartH - (pct / 100) * chartH;
  };
  const throttlePoints = telemetry
    .map((p) => `${getXForTime(p.time_s).toFixed(1)},${getYForThrottle(p.throttle_pct).toFixed(1)}`)
    .join(' ');

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, (x - padding.left) / chartW));
    const targetTime = ratio * maxTime;

    // Find closest index
    let closestIdx = 0;
    let minDiff = Infinity;
    for (let i = 0; i < telemetry.length; i++) {
      const diff = Math.abs(telemetry[i].time_s - targetTime);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    }
    setHoverIndex(closestIdx);
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col gap-4">
      {/* Chart Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white tracking-wide">
              Flight Trajectory Telemetry & Structural Curves
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time numerical integration showing aerodynamic drag, dynamic throttling, and staging separation.
          </p>
        </div>

        {/* Chart Selector Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveChart('acceleration')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeChart === 'acceleration'
                ? 'bg-slate-800 text-cyan-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            G-Force & TWR
          </button>
          <button
            onClick={() => setActiveChart('dynamic_q')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeChart === 'dynamic_q'
                ? 'bg-slate-800 text-cyan-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Max-Q Dynamic Pressure
          </button>
          <button
            onClick={() => setActiveChart('throttle')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeChart === 'throttle'
                ? 'bg-slate-800 text-cyan-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Throttle Profile
          </button>
        </div>
      </div>

      {/* SVG Canvas Viewport */}
      <div className="relative w-full overflow-hidden bg-slate-950/70 border border-slate-800/80 rounded-xl p-2">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto cursor-crosshair select-none"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIndex(null)}
        >
          {/* Horizontal Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1.0].map((frac, idx) => {
            const y = padding.top + chartH * (1 - frac);
            let label = '';
            if (activeChart === 'acceleration') {
              label = `${(frac * maxGInFlight).toFixed(1)} G`;
            } else if (activeChart === 'dynamic_q') {
              label = `${(frac * maxQValue).toFixed(0)} kPa`;
            } else {
              label = `${Math.round(frac * 100)}%`;
            }

            return (
              <g key={idx}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={padding.left + chartW}
                  y2={y}
                  stroke="#334155"
                  strokeWidth="0.8"
                  strokeDasharray="3 3"
                />
                <text
                  x={padding.left - 8}
                  y={y + 3}
                  textAnchor="end"
                  fill="#94a3b8"
                  fontSize="10"
                  fontFamily="IBM Plex Mono"
                >
                  {label}
                </text>
              </g>
            );
          })}

          {/* Time axis grid */}
          {[0, 0.25, 0.5, 0.75, 1.0].map((frac, idx) => {
            const x = padding.left + chartW * frac;
            const t = Math.round(frac * maxTime);
            return (
              <g key={idx}>
                <line
                  x1={x}
                  y1={padding.top}
                  x2={x}
                  y2={padding.top + chartH}
                  stroke="#334155"
                  strokeWidth="0.8"
                  strokeDasharray="2 4"
                />
                <text
                  x={x}
                  y={padding.top + chartH + 18}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="10"
                  fontFamily="IBM Plex Mono"
                >
                  T+{t}s
                </text>
              </g>
            );
          })}

          {/* Redline Threshold for Acceleration Limit (4.5 G ceiling) */}
          {activeChart === 'acceleration' && (
            <g>
              <line
                x1={padding.left}
                y1={getYForG(maxAllowedG)}
                x2={padding.left + chartW}
                y2={getYForG(maxAllowedG)}
                stroke="#f43f5e"
                strokeWidth="1.5"
                strokeDasharray="6 3"
              />
              <text
                x={padding.left + chartW - 6}
                y={getYForG(maxAllowedG) - 5}
                textAnchor="end"
                fill="#f43f5e"
                fontSize="10"
                fontFamily="IBM Plex Mono"
                fontWeight="600"
              >
                STRUCTURAL LIMIT ({maxAllowedG.toFixed(1)} G REDLINE)
              </text>

              {/* Liftoff Safe Corridor Zone (1.2 - 1.5) at start */}
              <rect
                x={padding.left}
                y={getYForG(1.5)}
                width={chartW * 0.2}
                height={Math.max(2, getYForG(1.2) - getYForG(1.5))}
                fill="#10b981"
                fillOpacity="0.12"
              />
              <text
                x={padding.left + 8}
                y={getYForG(1.2) - 4}
                fill="#10b981"
                fontSize="9"
                fontFamily="IBM Plex Mono"
              >
                Safe Liftoff TWR (1.2–1.5)
              </text>
            </g>
          )}

          {/* Max-Q Tolerance Redline in Dynamic Pressure mode */}
          {activeChart === 'dynamic_q' && (
            <g>
              <line
                x1={padding.left}
                y1={getYForQ(45)}
                x2={padding.left + chartW}
                y2={getYForQ(45)}
                stroke="#f59e0b"
                strokeWidth="1.2"
                strokeDasharray="5 3"
              />
              <text
                x={padding.left + chartW - 6}
                y={getYForQ(45) - 5}
                textAnchor="end"
                fill="#f59e0b"
                fontSize="10"
                fontFamily="IBM Plex Mono"
              >
                Aero Limit (45 kPa Max-Q)
              </text>
            </g>
          )}

          {/* Render Curve Paths */}
          {activeChart === 'acceleration' && (
            <>
              {/* TWR line (cyan dashed) */}
              <polyline
                fill="none"
                stroke="#06b6d4"
                strokeWidth="1.5"
                strokeDasharray="4 2"
                points={twrPoints}
              />
              {/* Acceleration G-Force line (solid amber/rose) */}
              <polyline
                fill="none"
                stroke={hoveredPoint.acceleration_g > maxAllowedG ? '#f43f5e' : '#f59e0b'}
                strokeWidth="2.5"
                points={gForcePoints}
              />
            </>
          )}

          {activeChart === 'dynamic_q' && (
            <>
              {/* Filled area under Max-Q curve */}
              <polygon
                fill="url(#qGradient)"
                points={`${padding.left},${padding.top + chartH} ${qPoints} ${
                  padding.left + chartW
                },${padding.top + chartH}`}
              />
              <polyline
                fill="none"
                stroke="#06b6d4"
                strokeWidth="2.2"
                points={qPoints}
              />
              {/* Max-Q peak marker */}
              <circle
                cx={getXForTime(maxQPoint.time_s)}
                cy={getYForQ(maxQPoint.dynamic_pressure_kPa)}
                r="4.5"
                fill="#f59e0b"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
              <text
                x={getXForTime(maxQPoint.time_s) + 8}
                y={getYForQ(maxQPoint.dynamic_pressure_kPa) - 6}
                fill="#f59e0b"
                fontSize="10"
                fontFamily="IBM Plex Mono"
                fontWeight="600"
              >
                Max-Q: {maxQPoint.dynamic_pressure_kPa.toFixed(1)} kPa
              </text>
            </>
          )}

          {activeChart === 'throttle' && (
            <>
              <polygon
                fill="url(#throttleGradient)"
                points={`${padding.left},${padding.top + chartH} ${throttlePoints} ${
                  padding.left + chartW
                },${padding.top + chartH}`}
              />
              <polyline
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2.2"
                points={throttlePoints}
              />
            </>
          )}

          {/* Gradients */}
          <defs>
            <linearGradient id="qGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="throttleGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Hover Crosshair */}
          {hoverIndex !== null && (
            <g>
              <line
                x1={getXForTime(hoveredPoint.time_s)}
                y1={padding.top}
                x2={getXForTime(hoveredPoint.time_s)}
                y2={padding.top + chartH}
                stroke="#ffffff"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              <circle
                cx={getXForTime(hoveredPoint.time_s)}
                cy={
                  activeChart === 'acceleration'
                    ? getYForG(hoveredPoint.acceleration_g)
                    : activeChart === 'dynamic_q'
                    ? getYForQ(hoveredPoint.dynamic_pressure_kPa)
                    : getYForThrottle(hoveredPoint.throttle_pct)
                }
                r="4.5"
                fill="#ffffff"
                stroke="#06b6d4"
                strokeWidth="2"
              />
            </g>
          )}
        </svg>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400 px-3 pt-2">
          {activeChart === 'acceleration' ? (
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
                <span className="w-3 h-0.5 bg-amber-400 inline-block" />
                Axial Acceleration (G)
              </span>
              <span className="flex items-center gap-1.5 text-cyan-400">
                <span className="w-3 h-0.5 border-t border-dashed border-cyan-400 inline-block" />
                Vehicle TWR
              </span>
              <span className="flex items-center gap-1.5 text-rose-400">
                <span className="w-3 h-0.5 border-t border-rose-400 inline-block" />
                Structural Limit ({maxAllowedG.toFixed(1)}G)
              </span>
            </div>
          ) : activeChart === 'dynamic_q' ? (
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
                <span className="w-3 h-0.5 bg-cyan-400 inline-block" />
                Dynamic Pressure q = 0.5·ρ·v² (kPa)
              </span>
              <span className="flex items-center gap-1.5 text-amber-400">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                Max-Q Peak ({maxQPoint.dynamic_pressure_kPa.toFixed(1)} kPa at {maxQPoint.altitude_km.toFixed(1)} km)
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-sky-400 font-semibold">
                <span className="w-3 h-0.5 bg-sky-400 inline-block" />
                Engine Throttle Percentage (%)
              </span>
            </div>
          )}

          <span>Hover to probe telemetry point</span>
        </div>
      </div>

      {/* Scrubbed Telemetry HUD Card */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 p-3 bg-slate-950/90 border border-slate-800 rounded-lg text-xs font-mono-tabular">
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 uppercase font-mono">Mission Time</span>
          <span className="text-white font-semibold text-sm">
            T+{hoveredPoint.time_s.toFixed(1)}s
          </span>
        </div>

        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 uppercase font-mono">Altitude</span>
          <span className="text-white font-semibold text-sm">
            {hoveredPoint.altitude_km.toFixed(1)} km
          </span>
        </div>

        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 uppercase font-mono">Velocity</span>
          <span className="text-white font-semibold text-sm">
            {hoveredPoint.velocity_m_s.toLocaleString()} m/s
          </span>
        </div>

        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 uppercase font-mono">Acceleration</span>
          <span
            className={`font-semibold text-sm ${
              hoveredPoint.acceleration_g > maxAllowedG ? 'text-rose-400' : 'text-emerald-400'
            }`}
          >
            {hoveredPoint.acceleration_g.toFixed(2)} G
          </span>
        </div>

        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 uppercase font-mono">Vehicle TWR</span>
          <span className="text-cyan-300 font-semibold text-sm">
            {hoveredPoint.twr.toFixed(2)}
          </span>
        </div>

        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 uppercase font-mono">Throttle %</span>
          <span className="text-amber-300 font-semibold text-sm">
            {hoveredPoint.throttle_pct}%
          </span>
        </div>

        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 uppercase font-mono">Stage Active</span>
          <span className="text-white font-semibold text-sm">
            {hoveredPoint.stage === 1 ? 'Stage 1 (Booster)' : 'Stage 2 (Vacuum)'}
          </span>
        </div>
      </div>
    </div>
  );
};
