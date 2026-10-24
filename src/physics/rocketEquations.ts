import {
  EARTH_RADIUS_M,
  G0,
  GAS_CONSTANT,
  SCALE_HEIGHT_M,
  SEA_LEVEL_DENSITY_KG_M3,
  SEA_LEVEL_PRESSURE_PA,
  SEA_LEVEL_TEMP_K,
  TEMP_LAPSE_RATE
} from './constants';
import {
  CalculationInputs,
  EngineSpec,
  FairingResult,
  OptimizationResult,
  SafetyCheck,
  StageResult,
  TelemetryPoint,
  ThrottlingPoint
} from '../types/rocket';

/**
 * Atmospheric state calculated from the International Standard Atmosphere (ISA) barometric model.
 */
export function getAtmosphere(altitude_m: number): {
  pressure_Pa: number;
  density_kg_m3: number;
  temperature_K: number;
} {
  const h = Math.max(0, altitude_m);

  if (h <= 11000) {
    // Troposphere (0 to 11,000 m)
    const T = SEA_LEVEL_TEMP_K - TEMP_LAPSE_RATE * h;
    const exponent = (G0 * 0.0289644) / (8.3144598 * TEMP_LAPSE_RATE); // ~5.25588
    const P = SEA_LEVEL_PRESSURE_PA * Math.pow(T / SEA_LEVEL_TEMP_K, exponent);
    const rho = P / (GAS_CONSTANT * T);
    return { pressure_Pa: P, density_kg_m3: Math.max(0, rho), temperature_K: T };
  } else if (h <= 25000) {
    // Lower Stratosphere (Isothermal: 11,000 to 25,000 m)
    const T11 = SEA_LEVEL_TEMP_K - TEMP_LAPSE_RATE * 11000; // 216.65 K
    const P11 = SEA_LEVEL_PRESSURE_PA * Math.pow(T11 / SEA_LEVEL_TEMP_K, 5.25588); // ~22,632 Pa
    const P = P11 * Math.exp((-G0 * (h - 11000)) / (GAS_CONSTANT * T11));
    const rho = P / (GAS_CONSTANT * T11);
    return { pressure_Pa: P, density_kg_m3: Math.max(0, rho), temperature_K: T11 };
  } else if (h <= 85000) {
    // Upper Stratosphere / Mesosphere (25,000 to 85,000 m)
    const T = 216.65;
    const P = 2488 * Math.exp(-(h - 25000) / SCALE_HEIGHT_M);
    const rho = P / (GAS_CONSTANT * T);
    return { pressure_Pa: P, density_kg_m3: Math.max(0, rho), temperature_K: T };
  } else {
    // Karman line / Exosphere approach (>85,000 m) - vacuum limit
    return { pressure_Pa: 0, density_kg_m3: 0, temperature_K: 200 };
  }
}

/**
 * Calculate dynamic specific impulse and maximum available thrust as ambient pressure thins out.
 */
export function getEnginePerformanceAtAltitude(
  engine: EngineSpec,
  altitude_m: number
): { isp_s: number; thrust_per_engine_kN: number } {
  const { pressure_Pa } = getAtmosphere(altitude_m);
  const pressure_ratio = Math.max(0, Math.min(1, pressure_Pa / SEA_LEVEL_PRESSURE_PA));

  // Nozzle expansion: Isp increases as backpressure drops
  const isp_s = engine.isp_vac_s - (engine.isp_vac_s - engine.isp_sl_s) * pressure_ratio;

  // Thrust expands proportionally to exhaust velocity and ambient pressure difference
  const thrust_kN =
    engine.thrust_sl_kN + (engine.thrust_vac_kN - engine.thrust_sl_kN) * (1 - pressure_ratio);

  return { isp_s, thrust_per_engine_kN: thrust_kN };
}

/**
 * Aerodynamic Drag Force: F_drag = 0.5 * rho * v^2 * Cd * A
 * Dynamic Pressure: q = 0.5 * rho * v^2
 */
export function getAerodynamicDrag(
  altitude_m: number,
  velocity_m_s: number,
  drag_coefficient: number,
  diameter_m: number
): { drag_force_N: number; dynamic_pressure_kPa: number; air_density: number } {
  const { density_kg_m3 } = getAtmosphere(altitude_m);
  const frontal_area_m2 = (Math.PI * Math.pow(diameter_m, 2)) / 4;
  const q_Pa = 0.5 * density_kg_m3 * Math.pow(velocity_m_s, 2);
  const drag_force_N = q_Pa * drag_coefficient * frontal_area_m2;

  return {
    drag_force_N,
    dynamic_pressure_kPa: q_Pa / 1000,
    air_density: density_kg_m3
  };
}

/**
 * Gravity acceleration at altitude h: g(h) = g0 * (Re / (Re + h))^2
 */
export function getLocalGravity(altitude_m: number): number {
  return G0 * Math.pow(EARTH_RADIUS_M / (EARTH_RADIUS_M + altitude_m), 2);
}

/**
 * Main Rocket Staging & Propulsion Optimization Algorithm
 */
export function calculateRocketStaging(inputs: CalculationInputs): OptimizationResult {
  const {
    payload_mass_kg,
    target_delta_v,
    stage1_engine,
    stage2_engine,
    target_liftoff_twr,
    max_allowed_g,
    stage1_structural_factor,
    stage2_structural_factor,
    rocket_diameter_m,
    drag_coefficient
  } = inputs;

  // --- PAYLOAD FAIRING SIZING & AERODYNAMIC DRAG CONTRIBUTION ---
  const fairing_diameter_m = rocket_diameter_m * 1.12;
  const fairing_height_m = inputs.fairing_height_m || rocket_diameter_m * 3.2;
  const fairing_radius = fairing_diameter_m / 2;
  const fairing_barrel_h = fairing_height_m * 0.45;
  const fairing_cone_h = fairing_height_m * 0.55;
  const fairing_cone_slant = Math.sqrt(Math.pow(fairing_radius, 2) + Math.pow(fairing_cone_h, 2));

  // Total wetted surface area of both clamshell halves
  const fairing_surface_area_m2 =
    2 * Math.PI * fairing_radius * fairing_barrel_h + Math.PI * fairing_radius * fairing_cone_slant;

  // Carbon-composite honeycomb sandwich shell (~10.5 kg/m^2) + 250 kg separation pushers & acoustic blankets
  const areal_density = inputs.fairing_areal_density_kg_m2 || 10.5;
  const fairing_mass_kg = Math.round(fairing_surface_area_m2 * areal_density + 250);
  const fairing_jettison_altitude_km = inputs.fairing_jettison_altitude_km || 105;

  // Fairing wave/pressure drag coefficient accounts for ~70% of vehicle atmospheric aerodynamic drag
  const fairing_drag_cd = drag_coefficient * 0.70;

  // Staging Delta-V split (Stage 1 punches through lower atmosphere; Stage 2 injects into orbit)
  const split_ratio_stage1 = 0.42;
  const target_dv_stage1 = target_delta_v * split_ratio_stage1;
  const target_dv_stage2 = target_delta_v * (1 - split_ratio_stage1);

  // --- STAGE 2 SIZING (Vacuum / Upper Stage) ---
  // Note: Stage 2 carries payload + fairing during initial ascent, then jettisons fairing in vacuum
  // Effective average upper stage payload incorporates fairing jettison before final orbital insertion
  const effective_stage2_payload = payload_mass_kg + fairing_mass_kg * 0.25;

  const eps2 = stage2_structural_factor;
  const R2 = Math.exp(target_dv_stage2 / (stage2_engine.isp_vac_s * G0));
  
  // Guard against impossible mass ratios
  const denom2 = 1 - (eps2 / (1 - eps2)) * (R2 - 1);
  const validDenom2 = denom2 > 0.05 ? denom2 : 0.05;
  
  const stage2_burnout_mass = effective_stage2_payload / validDenom2;
  const stage2_prop_mass = stage2_burnout_mass * (R2 - 1);
  const stage2_dry_mass = Math.max(stage2_engine.mass_kg, stage2_burnout_mass - effective_stage2_payload);
  const stage2_initial_mass = payload_mass_kg + fairing_mass_kg + stage2_dry_mass + stage2_prop_mass;

  // Stage 2 engine count (target vacuum TWR ~0.85 to 1.1)
  const required_thrust_stage2_kN = (stage2_initial_mass * G0 * 0.90) / 1000;
  const stage2_engine_count = Math.max(
    1,
    Math.round(required_thrust_stage2_kN / stage2_engine.thrust_vac_kN)
  );

  // --- STAGE 1 SIZING (Booster) ---
  const eps1 = stage1_structural_factor;
  const avg_isp_stage1 = 0.65 * stage1_engine.isp_sl_s + 0.35 * stage1_engine.isp_vac_s;
  const R1 = Math.exp(target_dv_stage1 / (avg_isp_stage1 * G0));

  const denom1 = 1 - (eps1 / (1 - eps1)) * (R1 - 1);
  const validDenom1 = denom1 > 0.05 ? denom1 : 0.05;

  // Stage 1's payload is the entire wet mass of Stage 2 (including fairing and payload)
  const stage1_payload = stage2_initial_mass;
  const stage1_burnout_mass = stage1_payload / validDenom1;
  const stage1_prop_mass = stage1_burnout_mass * (R1 - 1);
  const stage1_dry_mass = Math.max(stage1_engine.mass_kg * 4, stage1_burnout_mass - stage1_payload);
  const total_liftoff_mass_kg = stage1_payload + stage1_dry_mass + stage1_prop_mass;

  // --- STAGE 1 ENGINE COUNT SIZING FOR TARGET LIFTOFF TWR ---
  // TWR_liftoff = (N * F_sl) / (m_0 * g0) => N = ceil( (TWR_target * m_0 * g0) / F_sl )
  const total_liftoff_weight_kN = (total_liftoff_mass_kg * G0) / 1000;
  const target_thrust_sl_kN = total_liftoff_weight_kN * target_liftoff_twr;
  const stage1_engine_count = Math.max(
    1,
    Math.ceil(target_thrust_sl_kN / stage1_engine.thrust_sl_kN)
  );

  const actual_liftoff_thrust_kN = stage1_engine_count * stage1_engine.thrust_sl_kN;
  const actual_liftoff_twr = actual_liftoff_thrust_kN / total_liftoff_weight_kN;

  // --- NUMERICAL TRAJECTORY INTEGRATION & DYNAMIC THROTTLING SIMULATION ---
  // We simulate ascent from t=0 to orbit injection to calculate:
  // - Dynamic throttling profile preventing a > max_allowed_g (4.5 G)
  // - Max-Q (maximum aerodynamic dynamic pressure)
  // - Telemetry states at 10km, 30km, 60km altitudes
  // - Drag & Gravity losses
  const dt = 0.5; // Integration step (seconds)
  const telemetry: TelemetryPoint[] = [];
  const throttling_profile: ThrottlingPoint[] = [];

  let time = 0;
  let altitude = 0; // m
  let velocity = 0; // m/s
  let current_stage: 1 | 2 = 1;
  let stage1_fuel_remaining = stage1_prop_mass;
  let stage2_fuel_remaining = stage2_prop_mass;

  let total_gravity_loss = 0;
  let total_drag_loss = 0;
  let peak_q_kPa = 0;
  let max_q_altitude_km = 0;
  let max_q_time_s = 0;
  let max_q_velocity_m_s = 0;
  let peak_g_force = 0;

  // Checkpoints tracking
  const landmark_altitudes = [
    { target_km: 0, label: '0 km (Liftoff)', recorded: false, desc: 'Tower clearance. Full sea-level thrust at optimal TWR (1.2–1.5).' },
    { target_km: 10, label: '10 km (Max-Q Corridor)', recorded: false, desc: 'High aerodynamic shear stress. Engines throttle back to reduce structural load.' },
    { target_km: 30, label: '30 km (Stratospheric Burn)', recorded: false, desc: 'Atmosphere thin. Heavy dynamic throttling to cap acceleration at structural G-limit.' },
    { target_km: 60, label: '60 km (Mesosphere / Staging)', recorded: false, desc: 'Near-vacuum environment. Booster cutoff, stage separation, vacuum engine ignition.' }
  ];

  // Stage 1 mass flow rate (kg/s) at 100% throttle
  const m_dot_s1_full =
    (stage1_engine_count * stage1_engine.thrust_sl_kN * 1000) / (stage1_engine.isp_sl_s * G0);
  const m_dot_s2_full =
    (stage2_engine_count * stage2_engine.thrust_vac_kN * 1000) / (stage2_engine.isp_vac_s * G0);

  let stage1_burn_time = 0;
  let stage2_burn_time = 0;
  let stage1_burnout_twr = 0;
  let stage2_ignition_twr = 0;
  let stage2_burnout_twr = 0;
  let stage1_max_g = 0;
  let stage2_max_g = 0;

  // Fairing dynamic flight state
  let fairing_attached = true;
  let fairing_jettison_time_s = 0;
  let peak_fairing_drag_kN = 0;

  // Pitch angle profile (90 deg = vertical, 0 deg = horizontal orbital insertion)
  // Standard gravity turn profile:
  // Starts vertical, tips at ~1.5 km, gradually pitches over to ~10 deg by 80km
  function getPitchAngleRad(h_m: number): number {
    if (h_m < 1500) return Math.PI / 2; // Vertical
    if (h_m > 120000) return 0.08; // Near horizontal
    const progress = Math.min(1, Math.max(0, (h_m - 1500) / 90000));
    // Smooth cosine pitch profile
    const deg = 90 - 80 * Math.sin((progress * Math.PI) / 2);
    return (deg * Math.PI) / 180;
  }

  // Record initial T=0 state
  const initial_g = getLocalGravity(0);
  const initial_atmo = getAtmosphere(0);
  const initial_thrust_kN = actual_liftoff_thrust_kN;
  const initial_twr = actual_liftoff_twr;
  const initial_accel_g = Math.max(0, initial_twr - 1);

  landmark_altitudes[0].recorded = true;
  throttling_profile.push({
    altitude_km: 0,
    altitude_label: landmark_altitudes[0].label,
    time_s: 0,
    velocity_m_s: 0,
    air_density_kg_m3: initial_atmo.density_kg_m3,
    ambient_pressure_kPa: initial_atmo.pressure_Pa / 1000,
    dynamic_pressure_kPa: 0,
    thrust_kN: initial_thrust_kN,
    throttle_pct: 100,
    twr: initial_twr,
    g_force: initial_accel_g,
    stage: 1,
    description: landmark_altitudes[0].desc
  });

  // Run simulation until Stage 2 runs out of fuel or orbital injection
  while (stage2_fuel_remaining > 0 && time < 800) {
    const active_fairing_mass = fairing_attached ? fairing_mass_kg : 0;
    const current_m =
      current_stage === 1
        ? stage1_dry_mass + stage1_fuel_remaining + stage2_dry_mass + stage2_fuel_remaining + payload_mass_kg + active_fairing_mass
        : stage2_dry_mass + stage2_fuel_remaining + payload_mass_kg + active_fairing_mass;

    const g_loc = getLocalGravity(altitude);
    const atmo = getAtmosphere(altitude);
    const { drag_force_N, dynamic_pressure_kPa } = getAerodynamicDrag(
      altitude,
      velocity,
      drag_coefficient,
      rocket_diameter_m
    );

    // Fairing contributes ~70% of vehicle aerodynamic drag
    const fairing_drag_N = fairing_attached ? drag_force_N * 0.70 : 0;
    if (fairing_drag_N / 1000 > peak_fairing_drag_kN) {
      peak_fairing_drag_kN = fairing_drag_N / 1000;
    }

    // Fairing Jettison Event: separates when vehicle reaches upper atmosphere in near-vacuum
    if (fairing_attached && altitude >= fairing_jettison_altitude_km * 1000) {
      fairing_attached = false;
      fairing_jettison_time_s = Math.round(time);

      throttling_profile.push({
        altitude_km: Math.round((altitude / 1000) * 10) / 10,
        altitude_label: `Fairing Jettison (T+${fairing_jettison_time_s}s)`,
        time_s: fairing_jettison_time_s,
        velocity_m_s: Math.round(velocity),
        air_density_kg_m3: atmo.density_kg_m3,
        ambient_pressure_kPa: atmo.pressure_Pa / 1000,
        dynamic_pressure_kPa: Math.round(dynamic_pressure_kPa * 10) / 10,
        thrust_kN: Math.round((stage2_engine_count * stage2_engine.thrust_vac_kN)),
        throttle_pct: 100,
        twr: Math.round(((stage2_engine_count * stage2_engine.thrust_vac_kN * 1000) / (current_m * g_loc)) * 100) / 100,
        g_force: Math.round(((stage2_engine_count * stage2_engine.thrust_vac_kN * 1000) / (current_m * G0)) * 100) / 100,
        stage: 2,
        description: `Payload fairing clamshells jettisoned (-${fairing_mass_kg.toLocaleString()} kg). Shedding dead weight increases Stage 2 acceleration in vacuum.`
      });
    }

    if (dynamic_pressure_kPa > peak_q_kPa) {
      peak_q_kPa = dynamic_pressure_kPa;
      max_q_altitude_km = altitude / 1000;
      max_q_time_s = time;
      max_q_velocity_m_s = velocity;
    }

    // Engine performance at current altitude
    const current_engine = current_stage === 1 ? stage1_engine : stage2_engine;
    const current_engine_count = current_stage === 1 ? stage1_engine_count : stage2_engine_count;
    const { isp_s, thrust_per_engine_kN } = getEnginePerformanceAtAltitude(
      current_engine,
      altitude
    );

    const full_thrust_N = current_engine_count * thrust_per_engine_kN * 1000;

    // Dynamic Throttling Controller to prevent G > max_allowed_g (4.5 G structural collapse)
    // Axial acceleration a_axial = (F_thrust - F_drag) / m
    // Maximum safe thrust = max_allowed_g * m * g0 + F_drag
    const max_safe_thrust_N = max_allowed_g * current_m * G0 + drag_force_N;
    let required_throttle = max_safe_thrust_N / full_thrust_N;

    // Special Max-Q throttle reduction: between 8 km and 14 km, if dynamic pressure is high,
    // modern rockets throttle to ~75% to alleviate shear loads
    if (current_stage === 1 && altitude >= 8500 && altitude <= 13500 && dynamic_pressure_kPa > 25) {
      required_throttle = Math.min(required_throttle, 0.78);
    }

    // Engine minimum throttle constraint
    const actual_throttle = Math.min(
      1.0,
      Math.max(current_engine.min_throttle, required_throttle)
    );

    const actual_thrust_N = full_thrust_N * actual_throttle;
    const pitch_rad = getPitchAngleRad(altitude);

    // Dynamic forces
    const F_net_tangent = actual_thrust_N - drag_force_N - current_m * g_loc * Math.sin(pitch_rad);
    const accel_m_s2 = F_net_tangent / current_m;
    const axial_g = (actual_thrust_N - drag_force_N) / (current_m * G0);
    const current_twr = actual_thrust_N / (current_m * g_loc);

    if (axial_g > peak_g_force) {
      peak_g_force = axial_g;
    }
    if (current_stage === 1 && axial_g > stage1_max_g) stage1_max_g = axial_g;
    if (current_stage === 2 && axial_g > stage2_max_g) stage2_max_g = axial_g;

    // Telemetry sampling (every ~2 seconds or at key milestones)
    if (telemetry.length === 0 || time - telemetry[telemetry.length - 1].time_s >= 2) {
      telemetry.push({
        time_s: Math.round(time * 10) / 10,
        altitude_km: Math.round((altitude / 1000) * 10) / 10,
        velocity_m_s: Math.round(velocity),
        acceleration_g: Math.round(axial_g * 100) / 100,
        twr: Math.round(current_twr * 100) / 100,
        dynamic_pressure_kPa: Math.round(dynamic_pressure_kPa * 10) / 10,
        thrust_kN: Math.round(actual_thrust_N / 1000),
        throttle_pct: Math.round(actual_throttle * 100),
        mass_kg: Math.round(current_m),
        stage: current_stage
      });
    }

    // Check landmark altitudes for the throttling table (10km, 30km, 60km)
    for (let i = 1; i < landmark_altitudes.length; i++) {
      const lm = landmark_altitudes[i];
      if (!lm.recorded && altitude >= lm.target_km * 1000) {
        lm.recorded = true;
        throttling_profile.push({
          altitude_km: lm.target_km,
          altitude_label: lm.label,
          time_s: Math.round(time),
          velocity_m_s: Math.round(velocity),
          air_density_kg_m3: atmo.density_kg_m3,
          ambient_pressure_kPa: atmo.pressure_Pa / 1000,
          dynamic_pressure_kPa: Math.round(dynamic_pressure_kPa * 10) / 10,
          thrust_kN: Math.round(actual_thrust_N / 1000),
          throttle_pct: Math.round(actual_throttle * 100),
          twr: Math.round(current_twr * 100) / 100,
          g_force: Math.round(axial_g * 100) / 100,
          stage: current_stage,
          description: lm.desc
        });
      }
    }

    // Propellant consumption: m_dot = F_thrust / (Isp * g0)
    const m_dot = actual_thrust_N / (isp_s * G0);
    const fuel_used = m_dot * dt;

    if (current_stage === 1) {
      stage1_burn_time += dt;
      if (stage1_fuel_remaining <= fuel_used) {
        // Stage 1 Burnout (MECO)
        stage1_fuel_remaining = 0;
        stage1_burnout_twr = current_twr;

        // Record MECO checkpoint
        throttling_profile.push({
          altitude_km: Math.round((altitude / 1000) * 10) / 10,
          altitude_label: `Stage 1 MECO (T+${Math.round(time)}s)`,
          time_s: Math.round(time),
          velocity_m_s: Math.round(velocity),
          air_density_kg_m3: atmo.density_kg_m3,
          ambient_pressure_kPa: atmo.pressure_Pa / 1000,
          dynamic_pressure_kPa: Math.round(dynamic_pressure_kPa * 10) / 10,
          thrust_kN: Math.round(actual_thrust_N / 1000),
          throttle_pct: Math.round(actual_throttle * 100),
          twr: Math.round(current_twr * 100) / 100,
          g_force: Math.round(axial_g * 100) / 100,
          stage: 1,
          description: 'Booster cutoff. Propellant fully depleted. Stage separation initiated.'
        });

        // Stage Separation: drop Stage 1 dry mass, transition to Stage 2
        current_stage = 2;
        stage2_ignition_twr =
          (stage2_engine_count * stage2_engine.thrust_vac_kN * 1000) /
          (stage2_initial_mass * g_loc);
      } else {
        stage1_fuel_remaining -= fuel_used;
      }
    } else {
      stage2_burn_time += dt;
      if (stage2_fuel_remaining <= fuel_used) {
        // Stage 2 Burnout (SECO)
        stage2_fuel_remaining = 0;
        stage2_burnout_twr = current_twr;

        throttling_profile.push({
          altitude_km: Math.round((altitude / 1000) * 10) / 10,
          altitude_label: `Stage 2 SECO (T+${Math.round(time)}s)`,
          time_s: Math.round(time),
          velocity_m_s: Math.round(velocity),
          air_density_kg_m3: atmo.density_kg_m3,
          ambient_pressure_kPa: atmo.pressure_Pa / 1000,
          dynamic_pressure_kPa: Math.round(dynamic_pressure_kPa * 10) / 10,
          thrust_kN: Math.round(actual_thrust_N / 1000),
          throttle_pct: Math.round(actual_throttle * 100),
          twr: Math.round(current_twr * 100) / 100,
          g_force: Math.round(axial_g * 100) / 100,
          stage: 2,
          description: 'Second-stage engine cutoff. Target orbit achieved.'
        });
        break;
      } else {
        stage2_fuel_remaining -= fuel_used;
      }
    }

    // Track ascent losses
    total_gravity_loss += g_loc * Math.sin(pitch_rad) * dt;
    total_drag_loss += (drag_force_N / current_m) * dt;

    // Kinematics update
    velocity += accel_m_s2 * dt;
    altitude += velocity * Math.sin(pitch_rad) * dt;
    time += dt;
  }

  // Tsiolkovsky Theoretical Delta-V calculations
  // Stage 1: Isp * g0 * ln(m0 / mf)
  const dv1_theoretical =
    avg_isp_stage1 *
    G0 *
    Math.log(total_liftoff_mass_kg / (stage1_dry_mass + stage2_initial_mass));
  // Stage 2: Isp * g0 * ln(m0 / mf)
  const dv2_theoretical =
    stage2_engine.isp_vac_s *
    G0 *
    Math.log(stage2_initial_mass / (stage2_dry_mass + payload_mass_kg));

  const total_theoretical_dv = dv1_theoretical + dv2_theoretical;
  const total_net_dv = total_theoretical_dv - total_gravity_loss - total_drag_loss;

  // --- SAFETY AUDIT & STRUCTURAL INTEGRITY CHECK ---
  const warnings: string[] = [];
  const liftoff_twr_ok = actual_liftoff_twr >= 1.20 && actual_liftoff_twr <= 1.50;
  const max_g_ok = peak_g_force <= max_allowed_g + 0.01;
  const max_q_ok = peak_q_kPa <= 45; // Standard orbital rocket structural limit ~45 kPa
  const staging_twr_ok = stage2_ignition_twr >= 0.65 && stage2_ignition_twr <= 2.0;

  if (actual_liftoff_twr < 1.20) {
    warnings.push(
      `Liftoff TWR (${actual_liftoff_twr.toFixed(2)}) is critically low (<1.20). Vehicle will struggle to clear pad, leading to extreme gravity drag loss or pad collision.`
    );
  } else if (actual_liftoff_twr > 1.50) {
    warnings.push(
      `Liftoff TWR (${actual_liftoff_twr.toFixed(2)}) exceeds recommended envelope (>1.50). Rapid atmospheric acceleration induces severe dynamic pressure (Max-Q) and premature aerodynamic shear.`
    );
  }

  if (peak_g_force > max_allowed_g + 0.01) {
    warnings.push(
      `CRITICAL STRUCTURAL OVERLOAD: Acceleration peaked at ${peak_g_force.toFixed(2)} G (limit: ${max_allowed_g.toFixed(2)} G). High probability of tank implosion or airframe explosion! Dynamic throttling or engine cutoff required.`
    );
  }

  if (peak_q_kPa > 45) {
    warnings.push(
      `Dynamic pressure peaked at ${peak_q_kPa.toFixed(1)} kPa (exceeding standard 45 kPa Max-Q tolerance). Airframe skin and payload fairing face extreme buffeting.`
    );
  }

  let safety_status: 'NOMINAL' | 'CAUTION' | 'CRITICAL_EXPLOSION_RISK' = 'NOMINAL';
  if (!max_g_ok || actual_liftoff_twr < 1.10) {
    safety_status = 'CRITICAL_EXPLOSION_RISK';
  } else if (!liftoff_twr_ok || !max_q_ok || !staging_twr_ok) {
    safety_status = 'CAUTION';
  }

  const safety: SafetyCheck = {
    is_valid: safety_status === 'NOMINAL',
    status: safety_status,
    liftoff_twr_ok,
    max_g_ok,
    max_q_ok,
    staging_twr_ok,
    peak_g: peak_g_force,
    peak_q_kPa,
    liftoff_twr: actual_liftoff_twr,
    warnings
  };

  const stage1Result: StageResult = {
    engine_count: stage1_engine_count,
    propellant_mass_kg: stage1_prop_mass,
    dry_mass_kg: stage1_dry_mass,
    initial_mass_kg: total_liftoff_mass_kg,
    burnout_mass_kg: stage1_dry_mass + stage2_initial_mass,
    burn_time_s: stage1_burn_time,
    liftoff_or_ignition_twr: actual_liftoff_twr,
    burnout_twr: stage1_burnout_twr,
    max_g_force: stage1_max_g,
    theoretical_delta_v: dv1_theoretical,
    net_delta_v: dv1_theoretical - total_gravity_loss * 0.7 - total_drag_loss,
    sea_level_total_thrust_kN: actual_liftoff_thrust_kN,
    vac_total_thrust_kN: stage1_engine_count * stage1_engine.thrust_vac_kN
  };

  const stage2Result: StageResult = {
    engine_count: stage2_engine_count,
    propellant_mass_kg: stage2_prop_mass,
    dry_mass_kg: stage2_dry_mass,
    initial_mass_kg: stage2_initial_mass,
    burnout_mass_kg: stage2_dry_mass + payload_mass_kg,
    burn_time_s: stage2_burn_time,
    liftoff_or_ignition_twr: stage2_ignition_twr,
    burnout_twr: stage2_burnout_twr,
    max_g_force: stage2_max_g,
    theoretical_delta_v: dv2_theoretical,
    net_delta_v: dv2_theoretical - total_gravity_loss * 0.3,
    sea_level_total_thrust_kN: stage2_engine_count * stage2_engine.thrust_sl_kN,
    vac_total_thrust_kN: stage2_engine_count * stage2_engine.thrust_vac_kN
  };

  const fairing_dv_saved =
    stage2_engine.isp_vac_s *
    G0 *
    Math.log(
      (stage2_dry_mass + payload_mass_kg + fairing_mass_kg) /
        (stage2_dry_mass + payload_mass_kg)
    );

  const fairingResult: FairingResult = {
    mass_kg: fairing_mass_kg,
    height_m: fairing_height_m,
    diameter_m: fairing_diameter_m,
    surface_area_m2: Math.round(fairing_surface_area_m2 * 10) / 10,
    drag_coefficient: Math.round(fairing_drag_cd * 100) / 100,
    peak_drag_force_kN: Math.round(peak_fairing_drag_kN * 10) / 10,
    jettison_altitude_km: fairing_jettison_altitude_km,
    jettison_time_s: fairing_jettison_time_s || 165,
    delta_v_gain_m_s: Math.round(fairing_dv_saved)
  };

  return {
    inputs,
    stage1: stage1Result,
    stage2: stage2Result,
    fairing: fairingResult,
    total_liftoff_mass_kg,
    total_propellant_mass_kg: stage1_prop_mass + stage2_prop_mass,
    total_dry_mass_kg: stage1_dry_mass + stage2_dry_mass + fairing_mass_kg,
    payload_fraction_pct: (payload_mass_kg / total_liftoff_mass_kg) * 100,
    total_theoretical_delta_v: total_theoretical_dv,
    total_net_delta_v: total_net_dv,
    target_delta_v,
    delta_v_margin: total_theoretical_dv - target_delta_v,
    gravity_loss_m_s: total_gravity_loss,
    drag_loss_m_s: total_drag_loss,
    throttling_profile,
    telemetry,
    safety,
    max_q_point: {
      altitude_km: max_q_altitude_km,
      time_s: max_q_time_s,
      dynamic_pressure_kPa: peak_q_kPa,
      velocity_m_s: max_q_velocity_m_s
    }
  };
}
