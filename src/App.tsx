/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Rocket,
  Gauge,
  Flame,
  Layers,
  ArrowRight,
  TrendingUp,
  Activity,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { TopBar } from './components/TopBar';
import { InputConsole } from './components/InputConsole';
import { SafetyBanner } from './components/SafetyBanner';
import { ThrottlingTable } from './components/ThrottlingTable';
import { TelemetryCharts } from './components/TelemetryCharts';
import { RocketSchematic } from './components/RocketSchematic';
import { Rocket3DViewer } from './components/Rocket3DViewer';
import { PythonScriptView } from './components/PythonScriptView';
import { PhysicsReference } from './components/PhysicsReference';
import { CalculationInputs } from './types/rocket';
import {
  BOOSTER_ENGINES,
  DESTINATION_PRESETS,
  VACUUM_ENGINES
} from './physics/constants';
import { calculateRocketStaging } from './physics/rocketEquations';
import { generatePythonScript } from './physics/pythonScriptGenerator';

const DEFAULT_INPUTS: CalculationInputs = {
  payload_mass_kg: 22800,
  destination_id: 'leo',
  target_delta_v: 9300,
  stage1_engine: BOOSTER_ENGINES[0], // Merlin 1D
  stage2_engine: VACUUM_ENGINES[0], // Merlin 1D Vac
  target_liftoff_twr: 1.25,
  max_allowed_g: 4.5,
  stage1_structural_factor: 0.055,
  stage2_structural_factor: 0.075,
  rocket_diameter_m: 3.7,
  drag_coefficient: 0.3
};

export default function App() {
  const [inputs, setInputs] = useState<CalculationInputs>(DEFAULT_INPUTS);
  const [activeTab, setActiveTab] = useState<
    'console' | '3d' | 'charts' | 'throttling' | 'python' | 'physics'
  >('3d');

  // Compute optimization and trajectory simulation
  const result = useMemo(() => {
    return calculateRocketStaging(inputs);
  }, [inputs]);

  const handleApplyPreset = (presetKey: string) => {
    switch (presetKey) {
      case 'falcon9_leo':
        setInputs({
          payload_mass_kg: 22800,
          destination_id: 'leo',
          target_delta_v: 9300,
          stage1_engine: BOOSTER_ENGINES[0], // Merlin 1D
          stage2_engine: VACUUM_ENGINES[0], // Merlin 1D Vac
          target_liftoff_twr: 1.25,
          max_allowed_g: 4.5,
          stage1_structural_factor: 0.055,
          stage2_structural_factor: 0.075,
          rocket_diameter_m: 3.7,
          drag_coefficient: 0.3
        });
        break;
      case 'starship_mars':
        setInputs({
          payload_mass_kg: 100000,
          destination_id: 'tmi',
          target_delta_v: 13800,
          stage1_engine: BOOSTER_ENGINES[1], // Raptor 2
          stage2_engine: VACUUM_ENGINES[1], // Raptor 2 Vac
          target_liftoff_twr: 1.35,
          max_allowed_g: 4.5,
          stage1_structural_factor: 0.065,
          stage2_structural_factor: 0.085,
          rocket_diameter_m: 9.0,
          drag_coefficient: 0.32
        });
        break;
      case 'sls_moon':
        setInputs({
          payload_mass_kg: 27000,
          destination_id: 'tli',
          target_delta_v: 13100,
          stage1_engine: BOOSTER_ENGINES[2], // RS-25
          stage2_engine: VACUUM_ENGINES[2], // RL10-C
          target_liftoff_twr: 1.28,
          max_allowed_g: 4.2,
          stage1_structural_factor: 0.08,
          stage2_structural_factor: 0.1,
          rocket_diameter_m: 8.4,
          drag_coefficient: 0.34
        });
        break;
      case 'vulcan_gto':
        setInputs({
          payload_mass_kg: 14500,
          destination_id: 'gto',
          target_delta_v: 11800,
          stage1_engine: BOOSTER_ENGINES[3], // BE-4
          stage2_engine: VACUUM_ENGINES[2], // RL10-C
          target_liftoff_twr: 1.3,
          max_allowed_g: 4.5,
          stage1_structural_factor: 0.065,
          stage2_structural_factor: 0.09,
          rocket_diameter_m: 5.4,
          drag_coefficient: 0.31
        });
        break;
      default:
        break;
    }
  };

  const handleDownloadPython = () => {
    const script = generatePythonScript(inputs);
    const blob = new Blob([script], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rocket_staging_optimizer.py';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const isExplosionRisk = result.safety.status === 'CRITICAL_EXPLOSION_RISK';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* 1-Row 3-Zone Top Navigation Bar */}
      <TopBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onResetDefaults={() => setInputs(DEFAULT_INPUTS)}
        onDownloadPython={handleDownloadPython}
        isExplosionRisk={isExplosionRisk}
      />

      {/* Main Workspace Split Console */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Parameter Control Console (Fixed-feel sidebar) */}
        <aside className="lg:col-span-4 flex flex-col gap-5">
          <InputConsole
            inputs={inputs}
            onChange={setInputs}
            onApplyPreset={handleApplyPreset}
          />
        </aside>

        {/* Right Column: Viewport Stage & Telemetry Analysis */}
        <section className="lg:col-span-8 flex flex-col gap-6">
          {/* Safety & Structural Failure Warning Banner */}
          <SafetyBanner safety={result.safety} maxAllowedG={inputs.max_allowed_g} />

          {/* Primary Mission KPI Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Liftoff Gross Mass */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex flex-col">
              <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                Gross Liftoff Mass (GLOW)
              </span>
              <div className="flex items-baseline gap-1 mt-1 font-mono-tabular">
                <span className="text-xl font-bold text-white">
                  {Math.round(result.total_liftoff_mass_kg).toLocaleString()}
                </span>
                <span className="text-xs text-slate-400 font-mono">kg</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5">
                Propellant: {Math.round(result.total_propellant_mass_kg).toLocaleString()} kg
              </span>
            </div>

            {/* Total Delta-V vs Target */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex flex-col">
              <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                Total Achieved Δv
              </span>
              <div className="flex items-baseline gap-1 mt-1 font-mono-tabular">
                <span
                  className={`text-xl font-bold ${
                    result.delta_v_margin >= 0 ? 'text-cyan-400' : 'text-rose-400'
                  }`}
                >
                  {Math.round(result.total_theoretical_delta_v).toLocaleString()}
                </span>
                <span className="text-xs text-slate-400 font-mono">m/s</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5">
                Target: {inputs.target_delta_v.toLocaleString()} m/s (
                <span className={result.delta_v_margin >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {result.delta_v_margin >= 0 ? '+' : ''}
                  {Math.round(result.delta_v_margin)} m/s
                </span>
                )
              </span>
            </div>

            {/* Stage 1 Engines */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex flex-col">
              <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                Stage 1 Booster Engines
              </span>
              <div className="flex items-baseline gap-1.5 mt-1 font-mono-tabular">
                <span className="text-xl font-bold text-cyan-300">
                  {result.stage1.engine_count}x
                </span>
                <span className="text-xs text-slate-300 truncate">
                  {inputs.stage1_engine.name.split(' ')[0]}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5">
                Liftoff TWR: {result.stage1.liftoff_or_ignition_twr.toFixed(2)}
              </span>
            </div>

            {/* Stage 2 Engines */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex flex-col">
              <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                Stage 2 Vacuum Engines
              </span>
              <div className="flex items-baseline gap-1.5 mt-1 font-mono-tabular">
                <span className="text-xl font-bold text-purple-300">
                  {result.stage2.engine_count}x
                </span>
                <span className="text-xs text-slate-300 truncate">
                  {inputs.stage2_engine.name.split(' ')[0]}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5">
                Isp (Vac): {inputs.stage2_engine.isp_vac_s} s
              </span>
            </div>
          </div>

          {/* Conditional View by Active Tab */}
          {activeTab === 'console' && (
            <>
              {/* Interactive 3D Model Teaser / Quick View */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Rocket className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-semibold text-white tracking-wide">
                      3D Vehicle Architecture & Staging Model
                    </h3>
                  </div>
                  <button
                    onClick={() => setActiveTab('3d')}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 transition-colors"
                  >
                    <span>Full 3D Stage Inspector</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <Rocket3DViewer result={result} />
              </div>

              {/* Throttling Profile at Key Altitudes (10km, 30km, 60km) */}
              <ThrottlingTable
                throttlingProfile={result.throttling_profile}
                maxAllowedG={inputs.max_allowed_g}
              />

              {/* Rocket Staging Schematic */}
              <RocketSchematic result={result} />

              {/* Telemetry Curves Preview */}
              <TelemetryCharts
                telemetry={result.telemetry}
                maxAllowedG={inputs.max_allowed_g}
                maxQPoint={result.max_q_point}
              />
            </>
          )}

          {activeTab === '3d' && (
            <div className="space-y-6">
              <Rocket3DViewer result={result} />
              <RocketSchematic result={result} />
              <ThrottlingTable
                throttlingProfile={result.throttling_profile}
                maxAllowedG={inputs.max_allowed_g}
              />
            </div>
          )}

          {activeTab === 'throttling' && (
            <div className="space-y-6">
              <ThrottlingTable
                throttlingProfile={result.throttling_profile}
                maxAllowedG={inputs.max_allowed_g}
              />
              <TelemetryCharts
                telemetry={result.telemetry}
                maxAllowedG={inputs.max_allowed_g}
                maxQPoint={result.max_q_point}
              />
            </div>
          )}

          {activeTab === 'charts' && (
            <div className="space-y-6">
              <TelemetryCharts
                telemetry={result.telemetry}
                maxAllowedG={inputs.max_allowed_g}
                maxQPoint={result.max_q_point}
              />
              <RocketSchematic result={result} />
            </div>
          )}

          {activeTab === 'python' && (
            <PythonScriptView inputs={inputs} onDownload={handleDownloadPython} />
          )}

          {activeTab === 'physics' && <PhysicsReference />}
        </section>
      </main>

      {/* Clean Technical Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 px-6 text-center text-xs text-slate-500 font-mono">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 max-w-[1600px] mx-auto">
          <span>AeroPropulsion Calculator · Tsiolkovsky Staging & Barometric Atmosphere</span>
          <span>Earth ISA 1976 Model · g₀ = 9.80665 m/s² · Max-Q Dynamic Stress Relief</span>
        </div>
      </footer>
    </div>
  );
}
