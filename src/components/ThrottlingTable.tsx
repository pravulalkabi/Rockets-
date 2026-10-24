import React from 'react';
import { ThrottlingPoint } from '../types/rocket';
import { Activity, ShieldAlert, CheckCircle2, Info } from 'lucide-react';

interface ThrottlingTableProps {
  throttlingProfile: ThrottlingPoint[];
  maxAllowedG: number;
}

export const ThrottlingTable: React.FC<ThrottlingTableProps> = ({
  throttlingProfile,
  maxAllowedG
}) => {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white tracking-wide">
              Throttling Profile & Dynamic Force Balancing
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Dynamic throttle schedule calculated at 10 km, 30 km, and 60 km to cap axial G-loads below the structural collapse limit.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 shrink-0">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
          <span>Booster</span>
          <span className="w-2.5 h-2.5 rounded-full bg-purple-400 ml-2"></span>
          <span>Vacuum Upper</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
              <th className="py-2.5 px-3">Altitude Point</th>
              <th className="py-2.5 px-2">Time</th>
              <th className="py-2.5 px-2">Velocity</th>
              <th className="py-2.5 px-2">Dynamic Q</th>
              <th className="py-2.5 px-2">Req. Thrust</th>
              <th className="py-2.5 px-2">Throttle %</th>
              <th className="py-2.5 px-2">TWR</th>
              <th className="py-2.5 px-2">G-Force</th>
              <th className="py-2.5 px-3">Structural Safety & Mechanics</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono-tabular">
            {throttlingProfile.map((point, index) => {
              const isOverG = point.g_force > maxAllowedG;
              const isLiftoff = point.altitude_km === 0;
              const isTwrUnsafe = isLiftoff && (point.twr < 1.2 || point.twr > 1.5);

              return (
                <tr
                  key={index}
                  className={`hover:bg-slate-800/40 transition-colors ${
                    isOverG
                      ? 'bg-rose-950/20'
                      : isTwrUnsafe
                      ? 'bg-amber-950/20'
                      : ''
                  }`}
                >
                  <td className="py-3 px-3 font-semibold text-white whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          point.stage === 1 ? 'bg-cyan-400' : 'bg-purple-400'
                        }`}
                      />
                      <span>{point.altitude_label}</span>
                    </div>
                  </td>

                  <td className="py-3 px-2 text-slate-300">
                    T+{point.time_s}s
                  </td>

                  <td className="py-3 px-2 text-slate-200">
                    {point.velocity_m_s.toLocaleString()} m/s
                    <div className="text-[10px] text-slate-400 font-sans">
                      Mach {(point.velocity_m_s / 310).toFixed(1)}
                    </div>
                  </td>

                  <td className="py-3 px-2 text-slate-200">
                    {point.dynamic_pressure_kPa.toFixed(1)} kPa
                    <div className="text-[10px] text-slate-400 font-sans">
                      {point.air_density_kg_m3 > 0.001
                        ? `${point.air_density_kg_m3.toFixed(3)} kg/m³`
                        : '<0.001 kg/m³'}
                    </div>
                  </td>

                  <td className="py-3 px-2 font-semibold text-cyan-300">
                    {point.thrust_kN.toLocaleString()} kN
                  </td>

                  <td className="py-3 px-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-12 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full ${
                            point.throttle_pct < 60
                              ? 'bg-amber-400'
                              : 'bg-cyan-400'
                          }`}
                          style={{ width: `${Math.min(100, point.throttle_pct)}%` }}
                        />
                      </div>
                      <span className="font-semibold text-white">
                        {point.throttle_pct}%
                      </span>
                    </div>
                  </td>

                  <td className="py-3 px-2 font-semibold">
                    <span
                      className={
                        isLiftoff && isTwrUnsafe
                          ? 'text-rose-400'
                          : 'text-slate-200'
                      }
                    >
                      {point.twr.toFixed(2)}
                    </span>
                  </td>

                  <td className="py-3 px-2 font-semibold">
                    <span
                      className={
                        isOverG
                          ? 'text-rose-400 flex items-center gap-1'
                          : point.g_force > 3.8
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }
                    >
                      {isOverG && <ShieldAlert className="w-3 h-3 text-rose-400 inline" />}
                      {point.g_force.toFixed(2)} G
                    </span>
                  </td>

                  <td className="py-3 px-3 text-slate-300 font-sans text-xs max-w-xs">
                    <div className="flex items-start gap-1.5">
                      {isOverG ? (
                        <span className="text-rose-400 font-medium">
                          Explosion risk: Acceleration exceeds structural limit!
                        </span>
                      ) : (
                        <span>{point.description}</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Physics Context Note */}
      <div className="mt-4 p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg text-xs text-slate-400 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
        <div className="leading-relaxed">
          <strong className="text-slate-200">Force Balancing Principle:</strong> As propellant burns off, vehicle mass m(t) decreases by 70–85%. If full thrust were maintained, axial acceleration a = (F - F_drag) / m would rapidly surge past 6–9 Gs, destroying avionics and bursting propellant bulkheads. Dynamic throttling ensures F(t) &le; a_limit &middot; m(t) &middot; g₀ + F_drag, maintaining structural integrity.
        </div>
      </div>
    </div>
  );
};
