import { DestinationPreset, EngineSpec } from '../types/rocket';

export const G0 = 9.80665; // Standard gravitational acceleration (m/s^2)
export const EARTH_RADIUS_M = 6371000; // Mean Earth radius (m)
export const SEA_LEVEL_PRESSURE_PA = 101325; // Standard atmospheric pressure at sea level (Pa)
export const SEA_LEVEL_DENSITY_KG_M3 = 1.225; // Air density at sea level (kg/m^3)
export const SCALE_HEIGHT_M = 7200; // Atmosphere scale height (m) for barometric density
export const GAS_CONSTANT = 287.058; // Specific gas constant for dry air (J/(kg·K))
export const TEMP_LAPSE_RATE = 0.0065; // Tropospheric lapse rate (K/m)
export const SEA_LEVEL_TEMP_K = 288.15; // Sea-level temperature (K)

export const DESTINATION_PRESETS: DestinationPreset[] = [
  {
    id: 'leo',
    name: 'Low Earth Orbit (LEO)',
    target_delta_v: 9300,
    target_altitude_km: 300,
    description: 'Circular orbit at 300 km altitude. Standard reference destination requiring ~9,300 m/s accounting for orbital velocity (7,726 m/s), gravity losses (~1,100 m/s), and aerodynamic drag (~150 m/s).'
  },
  {
    id: 'iss',
    name: 'ISS Rendezvous (51.6° Inclination)',
    target_delta_v: 9450,
    target_altitude_km: 415,
    description: 'High-inclination orbit insertion to rendezvous with the International Space Station at 415 km.'
  },
  {
    id: 'polar',
    name: 'Sun-Synchronous Polar Orbit (SSO)',
    target_delta_v: 9800,
    target_altitude_km: 600,
    description: 'Retrograde/polar orbital insertion requiring extra delta-v due to lack of Earth rotation boost.'
  },
  {
    id: 'gto',
    name: 'Geostationary Transfer Orbit (GTO)',
    target_delta_v: 11800,
    target_altitude_km: 35786,
    description: 'Highly elliptical transfer orbit (250 km × 35,786 km) for geostationary communications satellites.'
  },
  {
    id: 'tli',
    name: 'Trans-Lunar Injection (TLI)',
    target_delta_v: 13100,
    target_altitude_km: 384400,
    description: 'Direct lunar transfer trajectory escaping low Earth gravity well towards Moon insertion.'
  },
  {
    id: 'tmi',
    name: 'Trans-Mars Injection (TMI)',
    target_delta_v: 13800,
    target_altitude_km: 225000000,
    description: 'Hyperbolic escape trajectory into interplanetary Hohmann transfer orbit to Mars.'
  }
];

export const BOOSTER_ENGINES: EngineSpec[] = [
  {
    id: 'merlin-1d',
    name: 'Merlin 1D (SpaceX)',
    manufacturer: 'SpaceX',
    fuel: 'RP-1 / LOX (Kerolox)',
    isp_sl_s: 282,
    isp_vac_s: 311,
    thrust_sl_kN: 845,
    thrust_vac_kN: 914,
    min_throttle: 0.40,
    mass_kg: 470
  },
  {
    id: 'raptor-2',
    name: 'Raptor 2 (SpaceX)',
    manufacturer: 'SpaceX',
    fuel: 'CH4 / LOX (Methalox)',
    isp_sl_s: 327,
    isp_vac_s: 350,
    thrust_sl_kN: 2255,
    thrust_vac_kN: 2450,
    min_throttle: 0.40,
    mass_kg: 1600
  },
  {
    id: 'rs-25',
    name: 'RS-25 / SSME (Aerojet)',
    manufacturer: 'Aerojet Rocketdyne',
    fuel: 'LH2 / LOX (Hydrolox)',
    isp_sl_s: 366,
    isp_vac_s: 452,
    thrust_sl_kN: 1860,
    thrust_vac_kN: 2279,
    min_throttle: 0.67,
    mass_kg: 3527
  },
  {
    id: 'be-4',
    name: 'BE-4 (Blue Origin)',
    manufacturer: 'Blue Origin',
    fuel: 'CH4 / LOX (Methalox)',
    isp_sl_s: 305,
    isp_vac_s: 335,
    thrust_sl_kN: 2400,
    thrust_vac_kN: 2600,
    min_throttle: 0.45,
    mass_kg: 2100
  },
  {
    id: 'rd-180',
    name: 'RD-180 (NPO Energomash)',
    manufacturer: 'NPO Energomash',
    fuel: 'RP-1 / LOX (Kerolox)',
    isp_sl_s: 311,
    isp_vac_s: 338,
    thrust_sl_kN: 3827,
    thrust_vac_kN: 4152,
    min_throttle: 0.47,
    mass_kg: 5480
  }
];

export const VACUUM_ENGINES: EngineSpec[] = [
  {
    id: 'merlin-1d-vac',
    name: 'Merlin 1D Vacuum (SpaceX)',
    manufacturer: 'SpaceX',
    fuel: 'RP-1 / LOX (Kerolox)',
    isp_sl_s: 200,
    isp_vac_s: 348,
    thrust_sl_kN: 400,
    thrust_vac_kN: 981,
    min_throttle: 0.40,
    mass_kg: 490
  },
  {
    id: 'raptor-2-vac',
    name: 'Raptor 2 Vacuum (SpaceX)',
    manufacturer: 'SpaceX',
    fuel: 'CH4 / LOX (Methalox)',
    isp_sl_s: 280,
    isp_vac_s: 380,
    thrust_sl_kN: 1000,
    thrust_vac_kN: 2530,
    min_throttle: 0.40,
    mass_kg: 1750
  },
  {
    id: 'rl10-c',
    name: 'RL10-C (Aerojet)',
    manufacturer: 'Aerojet Rocketdyne',
    fuel: 'LH2 / LOX (Hydrolox)',
    isp_sl_s: 200,
    isp_vac_s: 453,
    thrust_sl_kN: 60,
    thrust_vac_kN: 110,
    min_throttle: 0.50,
    mass_kg: 300
  },
  {
    id: 'rd-0124',
    name: 'RD-0124 (KBKhA)',
    manufacturer: 'KBKhA',
    fuel: 'RP-1 / LOX (Kerolox)',
    isp_sl_s: 220,
    isp_vac_s: 359,
    thrust_sl_kN: 150,
    thrust_vac_kN: 294,
    min_throttle: 0.60,
    mass_kg: 450
  }
];
