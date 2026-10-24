import React from 'react';
import { OptimizationResult } from '../types/rocket';
import { Box, Layers, Flame, Weight, Gauge } from 'lucide-react';

interface RocketSchematicProps {
  result: OptimizationResult;
}

export const RocketSchematic: React.FC<RocketSchematicProps> = ({ result }) => {
  const { stage1, stage2, inputs, total_liftoff_mass_kg, safety } = result;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white tracking-wide">
            Vehicle Staging Architecture & Propellant Allocation
          </h3>
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          GLOW: {Math.round(total_liftoff_mass_kg).toLocaleString()} kg
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Visual Rocket Silhouette Graphic */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center p-4 bg-slate-950/80 rounded-xl border border-slate-800/80">
          <div className="w-28 flex flex-col items-center relative">
            {/* Payload Fairing Nosecone */}
            <div className="w-16 h-16 bg-gradient-to-b from-slate-700 to-slate-800 border-t border-x border-slate-600 rounded-t-full flex flex-col items-center justify-center relative shadow-sm">
              <span className="text-[9px] font-mono font-semibold text-cyan-300">FAIRING</span>
              <span className="text-[7.5px] text-amber-300 font-mono">
                {Math.round(result.fairing.mass_kg).toLocaleString()} kg fairing
              </span>
              <span className="text-[7.5px] text-slate-400 font-mono">
                +{Math.round(inputs.payload_mass_kg).toLocaleString()} kg sat
              </span>
            </div>

            {/* Stage 2 Tank */}
            <div className="w-16 h-24 bg-gradient-to-b from-purple-950/60 to-purple-900/40 border border-purple-500/40 flex flex-col items-center justify-center relative my-0.5 rounded-sm">
              <span className="text-[10px] font-mono font-bold text-purple-300">STAGE 2</span>
              <span className="text-[8px] text-slate-300 font-mono">
                {Math.round(stage2.propellant_mass_kg).toLocaleString()} kg
              </span>
              <span className="text-[7px] text-purple-400 font-mono uppercase">Propellant</span>

              {/* Stage 2 Engine bell */}
              <div className="absolute -bottom-2 w-6 h-3 bg-purple-700/80 border border-purple-400/60 rounded-b-md flex items-center justify-center">
                <span className="text-[6px] font-mono text-white">
                  {stage2.engine_count}x VAC
                </span>
              </div>
            </div>

            {/* Interstage Ring */}
            <div className="w-16 h-3 bg-slate-800 border-x border-slate-700 flex items-center justify-center text-[7px] font-mono text-slate-400 my-0.5">
              INTERSTAGE
            </div>

            {/* Stage 1 Booster Tank */}
            <div className="w-16 h-48 bg-gradient-to-b from-cyan-950/60 to-cyan-900/40 border border-cyan-500/40 flex flex-col items-center justify-center relative rounded-sm">
              <span className="text-[10px] font-mono font-bold text-cyan-300">STAGE 1</span>
              <span className="text-[9px] text-white font-mono font-semibold">
                {Math.round(stage1.propellant_mass_kg).toLocaleString()} kg
              </span>
              <span className="text-[7px] text-cyan-400 font-mono uppercase">Liquid Propellant</span>
              <div className="mt-2 text-[8px] text-slate-400 font-mono">
                Dry: {Math.round(stage1.dry_mass_kg).toLocaleString()} kg
              </div>
            </div>

            {/* Stage 1 Engine Cluster Base */}
            <div className="w-18 h-7 bg-slate-800 border-x border-b border-cyan-500/60 rounded-b-lg flex flex-col items-center justify-center px-1 shadow-md">
              <div className="flex items-center gap-0.5 text-cyan-400">
                <Flame className="w-2.5 h-2.5 animate-pulse text-amber-400" />
                <span className="text-[9px] font-mono font-bold text-cyan-300">
                  {stage1.engine_count}x ENGINES
                </span>
              </div>
              <span className="text-[7px] text-slate-400 font-mono">
                {Math.round(stage1.sea_level_total_thrust_kN).toLocaleString()} kN SL
              </span>
            </div>
          </div>
        </div>

        {/* Breakdown Specifications Cards */}
        <div className="lg:col-span-8 flex flex-col gap-3.5 text-xs">
          {/* Stage 1 Booster Card */}
          <div className="p-3.5 bg-slate-950/70 border border-cyan-500/30 rounded-xl space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <h4 className="font-semibold text-white">Stage 1 Booster Specifications</h4>
              </div>
              <span className="font-mono text-cyan-400 font-semibold text-xs">
                {stage1.engine_count}x {inputs.stage1_engine.name}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono-tabular">
              <div>
                <span className="text-[10px] text-slate-400 block font-mono">Liquid Propellant</span>
                <span className="text-white font-semibold">
                  {Math.round(stage1.propellant_mass_kg).toLocaleString()} kg
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-mono">Dry Structural Mass</span>
                <span className="text-white font-semibold">
                  {Math.round(stage1.dry_mass_kg).toLocaleString()} kg
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-mono">Total Liftoff Thrust</span>
                <span className="text-cyan-300 font-semibold">
                  {Math.round(stage1.sea_level_total_thrust_kN).toLocaleString()} kN
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-mono">Booster Delta-V</span>
                <span className="text-white font-semibold">
                  {Math.round(stage1.theoretical_delta_v).toLocaleString()} m/s
                </span>
              </div>
            </div>
          </div>

          {/* Stage 2 Upper Stage Card */}
          <div className="p-3.5 bg-slate-950/70 border border-purple-500/30 rounded-xl space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-400" />
                <h4 className="font-semibold text-white">Stage 2 Vacuum Upper Stage</h4>
              </div>
              <span className="font-mono text-purple-400 font-semibold text-xs">
                {stage2.engine_count}x {inputs.stage2_engine.name}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono-tabular">
              <div>
                <span className="text-[10px] text-slate-400 block font-mono">Liquid Propellant</span>
                <span className="text-white font-semibold">
                  {Math.round(stage2.propellant_mass_kg).toLocaleString()} kg
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-mono">Dry Structural Mass</span>
                <span className="text-white font-semibold">
                  {Math.round(stage2.dry_mass_kg).toLocaleString()} kg
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-mono">Total Vacuum Thrust</span>
                <span className="text-purple-300 font-semibold">
                  {Math.round(stage2.vac_total_thrust_kN).toLocaleString()} kN
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-mono">Upper Delta-V</span>
                <span className="text-white font-semibold">
                  {Math.round(stage2.theoretical_delta_v).toLocaleString()} m/s
                </span>
              </div>
            </div>
          </div>

          {/* Payload Fairing & Aerodynamics Card */}
          <div className="p-3.5 bg-slate-950/70 border border-amber-500/30 rounded-xl space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <h4 className="font-semibold text-white">Payload Fairing & Forebody Aerodynamics</h4>
              </div>
              <span className="font-mono text-amber-400 font-semibold text-xs">
                Bivalve Clamshell ({result.fairing.height_m.toFixed(1)}m × {result.fairing.diameter_m.toFixed(1)}m)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono-tabular">
              <div>
                <span className="text-[10px] text-slate-400 block font-mono">Fairing Structural Mass</span>
                <span className="text-amber-300 font-semibold">
                  {Math.round(result.fairing.mass_kg).toLocaleString()} kg
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-mono">Forebody Wave Drag</span>
                <span className="text-rose-400 font-semibold">
                  {result.fairing.peak_drag_force_kN.toFixed(1)} kN (~70% drag)
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-mono">Vacuum Jettison Alt</span>
                <span className="text-emerald-300 font-semibold">
                  {result.fairing.jettison_altitude_km} km (t={result.fairing.jettison_time_s}s)
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-mono">Upper Stage Δv Gain</span>
                <span className="text-emerald-400 font-semibold">
                  +{result.fairing.delta_v_gain_m_s.toLocaleString()} m/s
                </span>
              </div>
            </div>
          </div>

          {/* Mass Budget & Payload Ratio Bar */}
          <div className="p-3 bg-slate-950/50 border border-slate-800 rounded-xl">
            <div className="flex justify-between text-[11px] mb-1.5">
              <span className="text-slate-400">Total Vehicle Mass Composition:</span>
              <span className="font-mono text-white font-semibold">
                Payload Fraction: {result.payload_fraction_pct.toFixed(2)}%
              </span>
            </div>
            <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex">
              <div
                title="Stage 1 Propellant"
                className="bg-cyan-500 h-full"
                style={{
                  width: `${(stage1.propellant_mass_kg / total_liftoff_mass_kg) * 100}%`
                }}
              />
              <div
                title="Stage 2 Propellant"
                className="bg-purple-500 h-full"
                style={{
                  width: `${(stage2.propellant_mass_kg / total_liftoff_mass_kg) * 100}%`
                }}
              />
              <div
                title="Stage 1 & 2 Dry Structures"
                className="bg-slate-600 h-full"
                style={{
                  width: `${((stage1.dry_mass_kg + stage2.dry_mass_kg) / total_liftoff_mass_kg) * 100}%`
                }}
              />
              <div
                title="Payload Fairing Mass"
                className="bg-amber-500 h-full"
                style={{
                  width: `${(result.fairing.mass_kg / total_liftoff_mass_kg) * 100}%`
                }}
              />
              <div
                title="Payload Satellite"
                className="bg-emerald-400 h-full"
                style={{
                  width: `${(inputs.payload_mass_kg / total_liftoff_mass_kg) * 100}%`
                }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-1.5">
              <span className="text-cyan-400">
                S1 Prop ({((stage1.propellant_mass_kg / total_liftoff_mass_kg) * 100).toFixed(1)}%)
              </span>
              <span className="text-purple-400">
                S2 Prop ({((stage2.propellant_mass_kg / total_liftoff_mass_kg) * 100).toFixed(1)}%)
              </span>
              <span className="text-slate-400">
                Tanks Dry ({(((stage1.dry_mass_kg + stage2.dry_mass_kg) / total_liftoff_mass_kg) * 100).toFixed(1)}%)
              </span>
              <span className="text-amber-400">
                Fairing ({((result.fairing.mass_kg / total_liftoff_mass_kg) * 100).toFixed(1)}%)
              </span>
              <span className="text-emerald-400">
                Payload ({result.payload_fraction_pct.toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
