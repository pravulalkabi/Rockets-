import React from 'react';
import { BookOpen, ShieldAlert, Cpu, Wind, Layers } from 'lucide-react';

export const PhysicsReference: React.FC = () => {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 sm:p-6 space-y-6 text-slate-300">
      <div className="border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-cyan-400" />
          <h2 className="text-base font-semibold text-white tracking-wide">
            Aerospace Mechanics & Propulsion Physics Formulation
          </h2>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Mathematical constraints, atmospheric thinning models, and structural stability rules governing the optimization algorithm.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section 1: Tsiolkovsky & TWR */}
        <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2.5">
          <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs">
            <Cpu className="w-4 h-4" />
            <span>1. Tsiolkovsky Rocket Equation & TWR</span>
          </div>
          <div className="p-2.5 bg-slate-900 border border-slate-800 rounded font-mono text-cyan-300 text-xs">
            Δv = Isp · g₀ · ln(m_initial / m_final)
          </div>
          <p className="text-xs leading-relaxed text-slate-300">
            Governs the maximum achievable velocity change for each rocket stage. Total mission Δv is the summation of booster and upper stage contributions minus gravity and aerodynamic drag losses:
          </p>
          <div className="p-2.5 bg-slate-900 border border-slate-800 rounded font-mono text-xs text-slate-200">
            TWR = Total Thrust / (Total Mass · g)
          </div>
          <p className="text-xs text-slate-400">
            <strong>Liftoff Rule:</strong> TWR must stay strictly between <strong>1.20 and 1.50</strong> at liftoff. If TWR &lt; 1.20, the vehicle will linger near the pad, accumulating devastating gravity losses. If TWR &gt; 1.50, excessive low-altitude velocity causes severe Max-Q aerodynamic shearing.
          </p>
        </div>

        {/* Section 2: Barometric Atmospheric Thinning */}
        <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2.5">
          <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs">
            <Wind className="w-4 h-4" />
            <span>2. Barometric Formula & Dynamic Pressure</span>
          </div>
          <div className="p-2.5 bg-slate-900 border border-slate-800 rounded font-mono text-cyan-300 text-xs">
            P(h) = P₀ · (1 - L·h / T₀)^(g₀·M / (R·L))
          </div>
          <div className="p-2.5 bg-slate-900 border border-slate-800 rounded font-mono text-cyan-300 text-xs">
            F_drag = 0.5 · ρ(h) · v² · Cd · A
          </div>
          <p className="text-xs leading-relaxed text-slate-300">
            As altitude increases, air density $\rho$ and atmospheric pressure $P$ drop exponentially. The dynamic pressure $q = 0.5 \cdot \rho \cdot v^2$ peaks at <strong>Max-Q</strong> (typically 10–14 km altitude).
          </p>
          <p className="text-xs text-slate-400">
            Engines throttle back to ~75–80% near Max-Q to prevent aerodynamic forces from tearing off the payload fairing or crumpling tank walls.
          </p>
        </div>

        {/* Section 3: Force Balancing & G-Limit Explosion Prevention */}
        <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2.5">
          <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
            <ShieldAlert className="w-4 h-4" />
            <span>3. Force Balancing & Structural G-Limit (Explosion Prevention)</span>
          </div>
          <div className="p-2.5 bg-slate-900 border border-slate-800 rounded font-mono text-amber-300 text-xs">
            a_axial = (F_thrust - F_drag) / (m(t) · g₀) ≤ 4.50 G
          </div>
          <p className="text-xs leading-relaxed text-slate-300">
            During flight, fuel burns at hundreds of kilograms per second, reducing vehicle mass m(t) by up to 85%. If full thrust were maintained, axial acceleration would surge past 6–10 Gs.
          </p>
          <p className="text-xs text-rose-300">
            <strong>Catastrophic Failure Mode:</strong> Launch vehicle propellant tanks are thin-walled pressurized structures. Over-acceleration causes hydro-static column pressure spikes, buckling bulkheads and triggering a catastrophic explosion. The calculator dynamically throttles engines:
          </p>
          <div className="p-2 bg-slate-900 border border-slate-800 rounded font-mono text-[11px] text-amber-300">
            F_throttle(t) = min(1.0, (a_max · m(t) · g₀ + F_drag) / F_max)
          </div>
        </div>

        {/* Section 4: Staging Optimization Strategy */}
        <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2.5">
          <div className="flex items-center gap-2 text-purple-400 font-semibold text-xs">
            <Layers className="w-4 h-4" />
            <span>4. Staging Mechanics: Sea-Level vs Vacuum</span>
          </div>
          <p className="text-xs leading-relaxed text-slate-300">
            <strong>Stage 1 (Booster):</strong> Fitted with sea-level expansion ratio nozzles (e.g., expansion ratio ~16:1) to prevent flow separation at 1 atm. High thrust overcomes heavy pad weight and gravity losses.
          </p>
          <p className="text-xs leading-relaxed text-slate-300">
            <strong>Stage 2 (Upper Stage):</strong> Features massive vacuum expansion nozzles (e.g., expansion ratio &gt;100:1) with high specific impulse (Isp &gt; 340–450 s). Since the vehicle is outside the atmosphere and in horizontal flight, lower thrust is required to reach orbital velocity (~7,800 m/s).
          </p>
        </div>
      </div>
    </div>
  );
};
