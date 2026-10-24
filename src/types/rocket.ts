/**
 * Rocket Staging & Propulsion Calculator Types
 */

export interface EngineSpec {
  id: string;
  name: string;
  manufacturer: string;
  fuel: string;
  isp_sl_s: number;        // Sea-level Specific Impulse (seconds)
  isp_vac_s: number;       // Vacuum Specific Impulse (seconds)
  thrust_sl_kN: number;    // Sea-level Thrust (kN)
  thrust_vac_kN: number;   // Vacuum Thrust (kN)
  min_throttle: number;    // Minimum throttle fraction (e.g., 0.40 for 40%)
  mass_kg: number;         // Mass per engine (kg)
}

export interface DestinationPreset {
  id: string;
  name: string;
  target_delta_v: number;  // Required total delta-v (m/s)
  target_altitude_km: number;
  description: string;
}

export interface CalculationInputs {
  payload_mass_kg: number;
  destination_id: string;
  target_delta_v: number;      // m/s
  stage1_engine: EngineSpec;
  stage2_engine: EngineSpec;
  target_liftoff_twr: number;  // 1.20 - 1.50
  max_allowed_g: number;       // e.g. 4.50 G
  stage1_structural_factor: number; // dry / (dry + prop), default ~0.06
  stage2_structural_factor: number; // default ~0.08
  rocket_diameter_m: number;   // for aerodynamic drag area
  drag_coefficient: number;    // Cd ~0.30
  fairing_height_m?: number;   // Payload fairing height (m)
  fairing_areal_density_kg_m2?: number; // Carbon-composite honeycomb areal mass (kg/m^2)
  fairing_jettison_altitude_km?: number; // Jettison altitude (km)
}

export interface ThrottlingPoint {
  altitude_km: number;
  altitude_label: string;
  time_s: number;
  velocity_m_s: number;
  air_density_kg_m3: number;
  ambient_pressure_kPa: number;
  dynamic_pressure_kPa: number;
  thrust_kN: number;
  throttle_pct: number;
  twr: number;
  g_force: number;
  stage: 1 | 2;
  description: string;
}

export interface TelemetryPoint {
  time_s: number;
  altitude_km: number;
  velocity_m_s: number;
  acceleration_g: number;
  twr: number;
  dynamic_pressure_kPa: number;
  thrust_kN: number;
  throttle_pct: number;
  mass_kg: number;
  stage: 1 | 2;
}

export interface StageResult {
  engine_count: number;
  propellant_mass_kg: number;
  dry_mass_kg: number;
  initial_mass_kg: number;
  burnout_mass_kg: number;
  burn_time_s: number;
  liftoff_or_ignition_twr: number;
  burnout_twr: number;
  max_g_force: number;
  theoretical_delta_v: number;
  net_delta_v: number;
  sea_level_total_thrust_kN: number;
  vac_total_thrust_kN: number;
}

export interface SafetyCheck {
  is_valid: boolean;
  status: 'NOMINAL' | 'CAUTION' | 'CRITICAL_EXPLOSION_RISK';
  liftoff_twr_ok: boolean;
  max_g_ok: boolean;
  max_q_ok: boolean;
  staging_twr_ok: boolean;
  peak_g: number;
  peak_q_kPa: number;
  liftoff_twr: number;
  warnings: string[];
}

export interface FairingResult {
  mass_kg: number;
  height_m: number;
  diameter_m: number;
  surface_area_m2: number;
  drag_coefficient: number;
  peak_drag_force_kN: number;
  jettison_altitude_km: number;
  jettison_time_s: number;
  delta_v_gain_m_s: number;
}

export interface OptimizationResult {
  inputs: CalculationInputs;
  stage1: StageResult;
  stage2: StageResult;
  fairing: FairingResult;
  total_liftoff_mass_kg: number;
  total_propellant_mass_kg: number;
  total_dry_mass_kg: number;
  payload_fraction_pct: number;
  total_theoretical_delta_v: number;
  total_net_delta_v: number;
  target_delta_v: number;
  delta_v_margin: number;
  gravity_loss_m_s: number;
  drag_loss_m_s: number;
  throttling_profile: ThrottlingPoint[];
  telemetry: TelemetryPoint[];
  safety: SafetyCheck;
  max_q_point: {
    altitude_km: number;
    time_s: number;
    dynamic_pressure_kPa: number;
    velocity_m_s: number;
  };
}
