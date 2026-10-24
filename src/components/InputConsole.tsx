import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Settings2,
  Gauge,
  Layers,
  Wind
} from 'lucide-react';
import { CalculationInputs, EngineSpec } from '../types/rocket';
import {
  BOOSTER_ENGINES,
  DESTINATION_PRESETS,
  VACUUM_ENGINES
} from '../physics/constants';

interface InputConsoleProps {
  inputs: CalculationInputs;
  onChange: (inputs: CalculationInputs) => void;
  onApplyPreset: (presetKey: string) => void;
}

export const InputConsole: React.FC<InputConsoleProps> = ({
  inputs,
  onChange,
  onApplyPreset
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>('falcon9_leo');

  const handleDestinationChange = (id: string) => {
    const dest = DESTINATION_PRESETS.find((d) => d.id === id);
    if (dest) {
      onChange({
        ...inputs,
        destination_id: id,
        target_delta_v: dest.target_delta_v
      });
    }
  };

  const handleBoosterEngineChange = (id: string) => {
    const eng = BOOSTER_ENGINES.find((e) => e.id === id);
    if (eng) {
      onChange({ ...inputs, stage1_engine: eng });
    }
  };

  const handleVacuumEngineChange = (id: string) => {
    const eng = VACUUM_ENGINES.find((e) => e.id === id);
    if (eng) {
      onChange({ ...inputs, stage2_engine: eng });
    }
  };

  const updateStage1EngineField = (field: keyof EngineSpec, value: number) => {
    onChange({
      ...inputs,
      stage1_engine: {
        ...inputs.stage1_engine,
        [field]: value
      }
    });
  };

  const updateStage2EngineField = (field: keyof EngineSpec, value: number) => {
    onChange({
      ...inputs,
      stage2_engine: {
        ...inputs.stage2_engine,
        [field]: value
      }
    });
  };

  const handlePresetSelect = (key: string) => {
    setSelectedPreset(key);
    onApplyPreset(key);
  };

  return (
    <div className="flex flex-col gap-5 text-xs text-slate-300">
      {/* Mission Archetype Preset Quick Selector */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
        <label className="text-slate-400 font-mono text-[11px] uppercase tracking-wider block mb-2">
          Vehicle & Mission Preset
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { id: 'falcon9_leo', label: 'Falcon 9 → LEO', sub: 'Kerolox · 9,300 m/s' },
            { id: 'starship_mars', label: 'Starship → Mars', sub: 'Methalox · 13,800 m/s' },
            { id: 'sls_moon', label: 'SLS Core → Moon', sub: 'Hydrolox · 13,100 m/s' },
            { id: 'vulcan_gto', label: 'Vulcan → GTO', sub: 'Methalox/LH2 · 11,800 m/s' }
          ].map((preset) => (
            <button
              key={preset.id}
              onClick={() => handlePresetSelect(preset.id)}
              className={`p-2 rounded-lg text-left transition-all border ${
                selectedPreset === preset.id
                  ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-300'
                  : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="font-semibold text-white truncate">{preset.label}</div>
              <div className="text-[10px] text-slate-400 truncate">{preset.sub}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Target Destination & Delta-V */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-3.5">
        <div className="flex items-center justify-between">
          <label className="text-slate-400 font-mono text-[11px] uppercase tracking-wider">
            Target Destination
          </label>
          <span className="text-cyan-400 font-mono font-semibold">
            {inputs.target_delta_v.toLocaleString()} m/s
          </span>
        </div>

        <select
          value={inputs.destination_id}
          onChange={(e) => handleDestinationChange(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
        >
          {DESTINATION_PRESETS.map((dest) => (
            <option key={dest.id} value={dest.id}>
              {dest.name} (~{dest.target_delta_v.toLocaleString()} m/s)
            </option>
          ))}
        </select>

        {/* Custom Delta-V Slider */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-slate-400">Total Required Δv:</span>
            <span className="font-mono text-white font-semibold">
              {inputs.target_delta_v.toLocaleString()} m/s
            </span>
          </div>
          <input
            type="range"
            min="6000"
            max="16000"
            step="100"
            value={inputs.target_delta_v}
            onChange={(e) =>
              onChange({
                ...inputs,
                target_delta_v: Number(e.target.value),
                destination_id: 'custom'
              })
            }
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-400">
            <span>6,000 m/s (Suborbital)</span>
            <span>9,300 (LEO)</span>
            <span>16,000 (Deep Space)</span>
          </div>
        </div>
      </div>

      {/* Payload Mass */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-slate-400 font-mono text-[11px] uppercase tracking-wider">
            Payload Mass
          </label>
          <div className="flex items-center gap-1 font-mono text-white font-semibold text-sm">
            <span>{inputs.payload_mass_kg.toLocaleString()}</span>
            <span className="text-xs text-slate-400">kg</span>
          </div>
        </div>

        <input
          type="range"
          min="500"
          max="120000"
          step="500"
          value={inputs.payload_mass_kg}
          onChange={(e) =>
            onChange({ ...inputs, payload_mass_kg: Number(e.target.value) })
          }
          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
        />

        <div className="grid grid-cols-4 gap-1 pt-1">
          {[
            { label: '500 kg', val: 500 },
            { label: '5,000 kg', val: 5000 },
            { label: '22,800 kg', val: 22800 },
            { label: '100,000 kg', val: 100000 }
          ].map((p) => (
            <button
              key={p.val}
              onClick={() => onChange({ ...inputs, payload_mass_kg: p.val })}
              className={`py-1 px-1.5 rounded text-[10px] font-mono transition-colors ${
                inputs.payload_mass_kg === p.val
                  ? 'bg-slate-800 text-cyan-300 font-semibold'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Safety & Flight Envelope Controls */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-amber-400" />
          <h4 className="font-semibold text-white text-xs">
            Structural & Flight Envelope Limits
          </h4>
        </div>

        {/* Target Liftoff TWR */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-slate-300">Target Liftoff TWR:</span>
            <span
              className={`font-mono font-bold ${
                inputs.target_liftoff_twr >= 1.2 && inputs.target_liftoff_twr <= 1.5
                  ? 'text-emerald-400'
                  : 'text-rose-400'
              }`}
            >
              {inputs.target_liftoff_twr.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min="1.10"
            max="1.70"
            step="0.01"
            value={inputs.target_liftoff_twr}
            onChange={(e) =>
              onChange({ ...inputs, target_liftoff_twr: Number(e.target.value) })
            }
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-400">
            <span>1.10 (Sluggish)</span>
            <span className="text-emerald-400 font-semibold">1.20 - 1.50 (Safe Zone)</span>
            <span>1.70 (Extreme)</span>
          </div>
        </div>

        {/* Max Acceleration Limit (G) */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-slate-300">Max Structural G-Force Limit:</span>
            <span
              className={`font-mono font-bold ${
                inputs.max_allowed_g <= 4.5 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {inputs.max_allowed_g.toFixed(1)} G
            </span>
          </div>
          <input
            type="range"
            min="3.0"
            max="6.0"
            step="0.1"
            value={inputs.max_allowed_g}
            onChange={(e) =>
              onChange({ ...inputs, max_allowed_g: Number(e.target.value) })
            }
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-400">
            <span>3.0 G</span>
            <span className="text-emerald-400 font-semibold">&le;4.5 G (Collapse Ceiling)</span>
            <span>6.0 G</span>
          </div>
        </div>
      </div>

      {/* Stage 1 Booster Propulsion */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-white text-xs">Stage 1 (Booster Engine)</span>
          </div>
          <span className="text-[10px] font-mono text-cyan-400">Sea-Level Optimized</span>
        </div>

        <select
          value={inputs.stage1_engine.id}
          onChange={(e) => handleBoosterEngineChange(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
        >
          {BOOSTER_ENGINES.map((eng) => (
            <option key={eng.id} value={eng.id}>
              {eng.name} ({eng.fuel})
            </option>
          ))}
        </select>

        {/* Engine Specs Quick Readout / Adjusters */}
        <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
          <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
            <div className="text-slate-400">Sea-Level Thrust</div>
            <div className="font-mono text-white font-semibold mt-0.5">
              {inputs.stage1_engine.thrust_sl_kN.toLocaleString()} kN
            </div>
          </div>
          <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
            <div className="text-slate-400">Vacuum Thrust</div>
            <div className="font-mono text-white font-semibold mt-0.5">
              {inputs.stage1_engine.thrust_vac_kN.toLocaleString()} kN
            </div>
          </div>
          <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
            <div className="text-slate-400">Sea-Level Isp</div>
            <div className="font-mono text-white font-semibold mt-0.5">
              {inputs.stage1_engine.isp_sl_s} s
            </div>
          </div>
          <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
            <div className="text-slate-400">Vacuum Isp</div>
            <div className="font-mono text-white font-semibold mt-0.5">
              {inputs.stage1_engine.isp_vac_s} s
            </div>
          </div>
        </div>
      </div>

      {/* Stage 2 Vacuum Propulsion */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-400" />
            <span className="font-semibold text-white text-xs">Stage 2 (Upper Engine)</span>
          </div>
          <span className="text-[10px] font-mono text-purple-400">Vacuum Optimized</span>
        </div>

        <select
          value={inputs.stage2_engine.id}
          onChange={(e) => handleVacuumEngineChange(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
        >
          {VACUUM_ENGINES.map((eng) => (
            <option key={eng.id} value={eng.id}>
              {eng.name} ({eng.fuel})
            </option>
          ))}
        </select>

        <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
          <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
            <div className="text-slate-400">Vacuum Thrust</div>
            <div className="font-mono text-white font-semibold mt-0.5">
              {inputs.stage2_engine.thrust_vac_kN.toLocaleString()} kN
            </div>
          </div>
          <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
            <div className="text-slate-400">Vacuum Isp</div>
            <div className="font-mono text-white font-semibold mt-0.5">
              {inputs.stage2_engine.isp_vac_s} s
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Aerodynamics & Structural Fractions Drawer */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full p-4 flex items-center justify-between text-left text-slate-300 hover:text-white transition-colors"
        >
          <div className="flex items-center gap-2">
            <Wind className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-xs">Aerodynamics & Structural Fractions</span>
          </div>
          {showAdvanced ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {showAdvanced && (
          <div className="p-4 pt-1 border-t border-slate-800 space-y-3.5">
            <div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Rocket Outer Diameter:</span>
                <span className="font-mono text-white font-semibold">
                  {inputs.rocket_diameter_m.toFixed(1)} m
                </span>
              </div>
              <input
                type="range"
                min="1.5"
                max="12.0"
                step="0.1"
                value={inputs.rocket_diameter_m}
                onChange={(e) =>
                  onChange({ ...inputs, rocket_diameter_m: Number(e.target.value) })
                }
                className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400 mt-1"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Drag Coefficient (Cd):</span>
                <span className="font-mono text-white font-semibold">
                  {inputs.drag_coefficient.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="0.15"
                max="0.60"
                step="0.01"
                value={inputs.drag_coefficient}
                onChange={(e) =>
                  onChange({ ...inputs, drag_coefficient: Number(e.target.value) })
                }
                className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400 mt-1"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Booster Dry Mass Fraction (ε1):</span>
                <span className="font-mono text-white font-semibold">
                  {(inputs.stage1_structural_factor * 100).toFixed(1)}%
                </span>
              </div>
              <input
                type="range"
                min="0.04"
                max="0.12"
                step="0.005"
                value={inputs.stage1_structural_factor}
                onChange={(e) =>
                  onChange({
                    ...inputs,
                    stage1_structural_factor: Number(e.target.value)
                  })
                }
                className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400 mt-1"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Upper Stage Dry Fraction (ε2):</span>
                <span className="font-mono text-white font-semibold">
                  {(inputs.stage2_structural_factor * 100).toFixed(1)}%
                </span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.16"
                step="0.005"
                value={inputs.stage2_structural_factor}
                onChange={(e) =>
                  onChange({
                    ...inputs,
                    stage2_structural_factor: Number(e.target.value)
                  })
                }
                className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400 mt-1"
              />
            </div>

            {/* Fairing Height */}
            <div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Fairing Height:</span>
                <span className="font-mono text-white font-semibold">
                  {(inputs.fairing_height_m ?? inputs.rocket_diameter_m * 3.2).toFixed(1)} m
                </span>
              </div>
              <input
                type="range"
                min="5.0"
                max="24.0"
                step="0.5"
                value={inputs.fairing_height_m ?? inputs.rocket_diameter_m * 3.2}
                onChange={(e) =>
                  onChange({
                    ...inputs,
                    fairing_height_m: Number(e.target.value)
                  })
                }
                className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400 mt-1"
              />
            </div>

            {/* Fairing Areal Density */}
            <div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Fairing Shell Areal Mass:</span>
                <span className="font-mono text-white font-semibold">
                  {(inputs.fairing_areal_density_kg_m2 ?? 10.5).toFixed(1)} kg/m²
                </span>
              </div>
              <input
                type="range"
                min="6.0"
                max="22.0"
                step="0.5"
                value={inputs.fairing_areal_density_kg_m2 ?? 10.5}
                onChange={(e) =>
                  onChange({
                    ...inputs,
                    fairing_areal_density_kg_m2: Number(e.target.value)
                  })
                }
                className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400 mt-1"
              />
              <span className="text-[9.5px] text-slate-400 font-mono block mt-0.5">
                Carbon-composite sandwich shell: ~10.5 kg/m²
              </span>
            </div>

            {/* Fairing Jettison Altitude */}
            <div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Fairing Jettison Altitude:</span>
                <span className="font-mono text-emerald-300 font-semibold">
                  {inputs.fairing_jettison_altitude_km ?? 105} km
                </span>
              </div>
              <input
                type="range"
                min="80"
                max="140"
                step="5"
                value={inputs.fairing_jettison_altitude_km ?? 105}
                onChange={(e) =>
                  onChange({
                    ...inputs,
                    fairing_jettison_altitude_km: Number(e.target.value)
                  })
                }
                className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400 mt-1"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
