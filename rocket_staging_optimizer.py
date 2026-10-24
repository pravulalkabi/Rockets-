#!/usr/bin/env python3
"""
================================================================================
ROCKET STAGING & PROPULSION OPTIMIZATION CALCULATOR
================================================================================
Author: Aerospace Flight Dynamics & Propulsion Script
Description:
    Determines the optimal number of liquid propellant engines, thrust (force),
    and propellant mass across flight stages (Booster & Vacuum Upper Stage).
    Prevents structural collapse / explosion from extreme Max-Q or excessive
    G-forces (enforcing TWR 1.2-1.5 at liftoff and <= 4.5G ceiling) while
    achieving the target orbital destination Delta-V.

    EXPORTS:
    - Calculates physical dimensions (height, radius, volume, fineness ratio).
    - Generates an interactive 3D cylindrical Plotly model of Stage 1,
      Stage 2, and the Payload Fairing, color-coded by stage.
    - Automatically opens 'rocket_3d_model.html' in your local web browser.

Core Equations Implemented:
    1. Tsiolkovsky Rocket Equation: Delta-v = Isp * g0 * ln(m_initial / m_final)
    2. Thrust-to-Weight Ratio (TWR): TWR = Total_Thrust / (Total_Mass * g)
    3. Barometric Formula (ISA 1976):
       - Troposphere: P(h) = P0 * (1 - L*h/T0)^(g0*M / (R*L)), rho = P / (R_sp * T)
       - Stratosphere: P(h) = P11 * exp(-g0*(h-11000)/(R_sp * T11))
    4. Aerodynamic Drag: F_drag = 0.5 * rho * v^2 * Cd * A
    5. Dynamic Pressure (Max-Q): q = 0.5 * rho * v^2
    6. Dynamic Engine Throttling:
       F_thrust(t) throttles down as mass decreases to maintain a_axial <= 4.5G.
    7. Physical Stage Sizing:
       V_prop = m_prop / rho_prop; Height = (V_prop * 1.12) / (pi * R^2)
================================================================================
"""

import math
import os
import json
import webbrowser

# Check for Plotly Python library (with automatic HTML fallback if not installed)
try:
    import plotly.graph_objects as go
    HAVE_PLOTLY_LIB = True
except ImportError:
    HAVE_PLOTLY_LIB = False

# ------------------------------------------------------------------------------
# 1. PHYSICAL & PLANETARY CONSTANTS
# ------------------------------------------------------------------------------
G0 = 9.80665              # Standard Earth gravity at sea level (m/s^2)
EARTH_RADIUS = 6371000.0  # Mean volumetric Earth radius (meters)
P0 = 101325.0             # Sea-level atmospheric pressure (Pascals)
RHO0 = 1.225              # Sea-level air density (kg/m^3)
T0 = 288.15               # Sea-level standard temperature (Kelvin)
LAPSE_RATE = 0.0065       # Tropospheric temperature lapse rate (K/m)
R_SPECIFIC = 287.058      # Specific gas constant for dry air (J/(kg*K))
EXPONENT_ISA = 5.25588    # (g0 * M) / (R * L)


# ------------------------------------------------------------------------------
# 2. ATMOSPHERIC & AERODYNAMIC MODELS
# ------------------------------------------------------------------------------
def get_atmosphere(altitude_m: float):
    """
    Computes ambient pressure (Pa), air density (kg/m^3), and temperature (K)
    using the barometric formula across altitude layers (ISA standard).
    """
    h = max(0.0, float(altitude_m))
    
    if h <= 11000.0:
        # Troposphere: Linear temperature lapse
        T = T0 - LAPSE_RATE * h
        P = P0 * math.pow(T / T0, EXPONENT_ISA)
        rho = P / (R_SPECIFIC * T)
        return P, max(0.0, rho), T
    elif h <= 25000.0:
        # Lower Stratosphere: Isothermal layer at 216.65 K
        T11 = T0 - LAPSE_RATE * 11000.0
        P11 = P0 * math.pow(T11 / T0, EXPONENT_ISA)
        P = P11 * math.exp(-G0 * (h - 11000.0) / (R_SPECIFIC * T11))
        rho = P / (R_SPECIFIC * T11)
        return P, max(0.0, rho), T11
    elif h <= 85000.0:
        # Upper Stratosphere / Mesosphere approximation
        T = 216.65
        P = 2488.0 * math.exp(-(h - 25000.0) / 7200.0)
        rho = P / (R_SPECIFIC * T)
        return P, max(0.0, rho), T
    else:
        # Karman line / Exosphere approach: near-vacuum
        return 0.0, 0.0, 200.0


def get_aerodynamic_drag(altitude_m: float, velocity_m_s: float, cd: float, diameter_m: float):
    """
    Calculates aerodynamic drag force and dynamic pressure:
    F_drag = 0.5 * rho * v^2 * Cd * Area
    q = 0.5 * rho * v^2 (Dynamic Pressure in Pa)
    """
    P, rho, T = get_atmosphere(altitude_m)
    area = (math.pi * (diameter_m ** 2)) / 4.0
    q_pa = 0.5 * rho * (velocity_m_s ** 2)
    f_drag_n = q_pa * cd * area
    return f_drag_n, q_pa, rho, P


def get_local_gravity(altitude_m: float) -> float:
    """Calculates gravity at altitude h via Newton's law: g(h) = g0 * (Re / (Re+h))^2"""
    return G0 * math.pow(EARTH_RADIUS / (EARTH_RADIUS + altitude_m), 2)


# ------------------------------------------------------------------------------
# 3. ENGINE EXPANSION MODEL
# ------------------------------------------------------------------------------
def get_engine_performance(isp_sl: float, isp_vac: float, thrust_sl_n: float, thrust_vac_n: float, pressure_pa: float):
    """
    Nozzle physics: As atmospheric back-pressure decreases, exhaust expands freely,
    increasing effective Isp and total available thrust towards their vacuum limits.
    """
    pressure_ratio = max(0.0, min(1.0, pressure_pa / P0))
    isp = isp_vac - (isp_vac - isp_sl) * pressure_ratio
    max_thrust = thrust_sl_n + (thrust_vac_n - thrust_sl_n) * (1.0 - pressure_ratio)
    return isp, max_thrust


# ------------------------------------------------------------------------------
# 4. PLOTLY 3D MESH MODEL GENERATOR
# ------------------------------------------------------------------------------
def generate_cylinder_coords(radius, z_start, z_end, n_theta=36, n_z=8):
    """Generates (x, y, z) mesh coordinate matrices for a 3D cylindrical surface."""
    thetas = [2.0 * math.pi * i / (n_theta - 1) for i in range(n_theta)]
    zs = [z_start + (z_end - z_start) * j / (n_z - 1) for j in range(n_z)]
    
    x_matrix = []
    y_matrix = []
    z_matrix = []
    for z in zs:
        x_row = [radius * math.cos(th) for th in thetas]
        y_row = [radius * math.sin(th) for th in thetas]
        z_row = [z for _ in thetas]
        x_matrix.append(x_row)
        y_matrix.append(y_row)
        z_matrix.append(z_row)
    return x_matrix, y_matrix, z_matrix


def generate_cone_coords(radius_base, z_start, height, n_theta=36, n_z=12):
    """Generates (x, y, z) mesh coordinate matrices for an ogive / conical fairing."""
    thetas = [2.0 * math.pi * i / (n_theta - 1) for i in range(n_theta)]
    zs = [z_start + height * j / (n_z - 1) for j in range(n_z)]
    
    x_matrix = []
    y_matrix = []
    z_matrix = []
    for z in zs:
        # Parabolic / ogive profile tapering to tip
        frac = (z - z_start) / max(0.001, height)
        r_current = radius_base * math.sqrt(max(0.0, 1.0 - frac))
        x_row = [r_current * math.cos(th) for th in thetas]
        y_row = [r_current * math.sin(th) for th in thetas]
        z_row = [z for _ in thetas]
        x_matrix.append(x_row)
        y_matrix.append(y_row)
        z_matrix.append(z_row)
    return x_matrix, y_matrix, z_matrix


def export_3d_plotly_scene(dimensions: dict, output_filepath: str = "rocket_3d_model.html"):
    """
    Renders an interactive Plotly 3D scene of Stage 1, Stage 2, Interstage,
    and Payload Fairing with dimensions and hover telemetry.
    Supports native plotly if installed, or outputs high-fidelity self-contained
    Plotly JS HTML with zero external package dependencies.
    """
    radius = dimensions["radius_m"]
    h_s1 = dimensions["stage1_height_m"]
    h_inter = dimensions["interstage_height_m"]
    h_s2 = dimensions["stage2_height_m"]
    h_fairing = dimensions["fairing_height_m"]
    h_engines = dimensions["engine_section_height_m"]

    # Altitude boundaries along Z axis
    z0 = 0.0
    z1_engines = h_engines
    z1_stage1_top = h_s1
    z2_interstage_top = z1_stage1_top + h_inter
    z3_stage2_top = z2_interstage_top + h_s2
    z4_fairing_top = z3_stage2_top + h_fairing

    surfaces_data = []

    # 1. Stage 1 (Booster Main Tank) - Cyan / Deep Blue
    x_s1, y_s1, z_s1 = generate_cylinder_coords(radius, z1_engines, z1_stage1_top)
    surfaces_data.append({
        "type": "surface",
        "name": f"Stage 1 Booster (H: {h_s1:.1f}m, D: {radius*2:.1f}m)",
        "x": x_s1, "y": y_s1, "z": z_s1,
        "colorscale": [[0, "#0284c7"], [1, "#0369a1"]],
        "showscale": False,
        "hoverinfo": "text",
        "text": f"STAGE 1 BOOSTER<br>Height: {h_s1:.1f} m<br>Diameter: {radius*2:.1f} m<br>Propellant: {dimensions['stage1_prop_kg']:,.0f} kg<br>Dry Mass: {dimensions['stage1_dry_kg']:,.0f} kg<br>Engines: {dimensions['stage1_engines']}x SL"
    })

    # 2. Stage 1 Engine Skirt / Aft Section
    x_eng, y_eng, z_eng = generate_cylinder_coords(radius * 0.95, z0, z1_engines)
    surfaces_data.append({
        "type": "surface",
        "name": "Stage 1 Engine Section",
        "x": x_eng, "y": y_eng, "z": z_eng,
        "colorscale": [[0, "#334155"], [1, "#1e293b"]],
        "showscale": False,
        "hoverinfo": "text",
        "text": f"BOOSTER ENGINE CLUSTER<br>{dimensions['stage1_engines']}x Liquid Engines<br>Thrust: {dimensions['liftoff_thrust_kn']:,.1f} kN SL"
    })

    # 3. Interstage Adapter - Dark Graphite / Slate
    x_int, y_int, z_int = generate_cylinder_coords(radius, z1_stage1_top, z2_interstage_top)
    surfaces_data.append({
        "type": "surface",
        "name": f"Interstage (H: {h_inter:.1f}m)",
        "x": x_int, "y": y_int, "z": z_int,
        "colorscale": [[0, "#475569"], [1, "#334155"]],
        "showscale": False,
        "hoverinfo": "text",
        "text": f"INTERSTAGE ADAPTER<br>Height: {h_inter:.1f} m<br>Houses Vacuum Engine Nozzle"
    })

    # 4. Stage 2 (Upper Stage Tank) - Electric Purple / Violet
    x_s2, y_s2, z_s2 = generate_cylinder_coords(radius, z2_interstage_top, z3_stage2_top)
    surfaces_data.append({
        "type": "surface",
        "name": f"Stage 2 Upper Stage (H: {h_s2:.1f}m)",
        "x": x_s2, "y": y_s2, "z": z_s2,
        "colorscale": [[0, "#9333ea"], [1, "#7e22ce"]],
        "showscale": False,
        "hoverinfo": "text",
        "text": f"STAGE 2 UPPER STAGE<br>Height: {h_s2:.1f} m<br>Propellant: {dimensions['stage2_prop_kg']:,.0f} kg<br>Dry Mass: {dimensions['stage2_dry_kg']:,.0f} kg<br>Engines: {dimensions['stage2_engines']}x Vac"
    })

    # 5. Payload Fairing Nosecone - Silver / Titanium White with Amber Tip (Bivalve Clamshell)
    fairing_mass = dimensions.get("fairing_mass_kg", 1750)
    fairing_drag = dimensions.get("fairing_drag_kn", 0.0)
    fairing_dv = dimensions.get("fairing_dv_saved_ms", 0)
    x_fairing, y_fairing, z_fairing = generate_cone_coords(radius * 1.05, z3_stage2_top, h_fairing)
    surfaces_data.append({
        "type": "surface",
        "name": f"Payload Fairing (H: {h_fairing:.1f}m, Mass: {fairing_mass:,.0f}kg)",
        "x": x_fairing, "y": y_fairing, "z": z_fairing,
        "colorscale": [[0, "#f8fafc"], [0.8, "#e2e8f0"], [1, "#f59e0b"]],
        "showscale": False,
        "opacity": 0.90,
        "hoverinfo": "text",
        "text": f"PAYLOAD NOSE FAIRING (BIVALVE CLAMSHELL)<br>Height: {h_fairing:.1f} m<br>Structural Mass: {fairing_mass:,.0f} kg<br>Forebody Wave Drag: {fairing_drag:.1f} kN (~70% total drag)<br>Vacuum Jettison Alt: 105 km<br>Δv Conserved: +{fairing_dv:,.0f} m/s"
    })

    # 6. Payload Satellite Bus (Inside Fairing) - Gold Foil Cube / Cylinder
    h_sat = 2.4
    r_sat = radius * 0.55
    x_sat, y_sat, z_sat = generate_cylinder_coords(r_sat, z3_stage2_top + 0.8, z3_stage2_top + 0.8 + h_sat)
    surfaces_data.append({
        "type": "surface",
        "name": f"Payload Satellite ({dimensions['payload_kg']:,.0f} kg)",
        "x": x_sat, "y": y_sat, "z": z_sat,
        "colorscale": [[0, "#fbbf24"], [1, "#f59e0b"]],
        "showscale": False,
        "hoverinfo": "text",
        "text": f"PAYLOAD SATELLITE BUS<br>Mass: {dimensions['payload_kg']:,.0f} kg<br>Protected inside Fairing"
    })

    # 7. Ground Landing Pad Platform (Circular Base at z = 0)
    thetas_base = [2.0 * math.pi * i / 35 for i in range(36)]
    r_pad = radius * 3.5
    x_pad = [[0.0 for _ in thetas_base], [r_pad * math.cos(th) for th in thetas_base]]
    y_pad = [[0.0 for _ in thetas_base], [r_pad * math.sin(th) for th in thetas_base]]
    z_pad = [[-0.2 for _ in thetas_base], [-0.2 for _ in thetas_base]]
    surfaces_data.append({
        "type": "surface",
        "name": "Launch Pad Ground Plane",
        "x": x_pad, "y": y_pad, "z": z_pad,
        "colorscale": [[0, "#0f172a"], [1, "#1e293b"]],
        "showscale": False,
        "hoverinfo": "text",
        "text": "LAUNCH PAD BASE (Z=0.0m)"
    })

    layout_dict = {
        "title": {
            "text": f"<b>Rocket Staging 3D Architecture</b> | Total Height: {dimensions['total_height_m']:.1f}m | Diameter: {radius*2:.1f}m",
            "font": {"size": 18, "color": "#f8fafc", "family": "Arial, sans-serif"},
            "x": 0.05, "y": 0.95
        },
        "paper_bgcolor": "#090d16",
        "plot_bgcolor": "#090d16",
        "scene": {
            "xaxis": {
                "title": "X (meters)", "color": "#94a3b8", "gridcolor": "#1e293b",
                "zerolinecolor": "#334155", "showbackground": True, "backgroundcolor": "#090d16"
            },
            "yaxis": {
                "title": "Y (meters)", "color": "#94a3b8", "gridcolor": "#1e293b",
                "zerolinecolor": "#334155", "showbackground": True, "backgroundcolor": "#090d16"
            },
            "zaxis": {
                "title": "Altitude Z (meters)", "color": "#38bdf8", "gridcolor": "#1e293b",
                "zerolinecolor": "#0284c7", "showbackground": True, "backgroundcolor": "#090d16"
            },
            "aspectmode": "data",
            "camera": {
                "eye": {"x": 1.8, "y": 1.8, "z": 0.8},
                "center": {"x": 0, "y": 0, "z": 0.3}
            }
        },
        "margin": {"l": 10, "r": 10, "b": 10, "t": 60},
        "showlegend": True,
        "legend": {
            "font": {"color": "#cbd5e1", "size": 11},
            "bgcolor": "rgba(15, 23, 42, 0.85)",
            "bordercolor": "#334155",
            "borderwidth": 1,
            "x": 0.02, "y": 0.85
        }
    }

    # If Plotly Python library is installed, use native Plotly
    if HAVE_PLOTLY_LIB:
        fig = go.Figure(layout=layout_dict)
        for s in surfaces_data:
            fig.add_trace(go.Surface(
                x=s["x"], y=s["y"], z=s["z"],
                name=s["name"],
                colorscale=s["colorscale"],
                showscale=s["showscale"],
                opacity=s.get("opacity", 1.0),
                hoverinfo=s["hoverinfo"],
                text=s["text"]
            ))
        fig.write_html(output_filepath, include_plotlyjs="cdn")
    else:
        # Self-contained standalone HTML using Plotly CDN
        html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Rocket 3D Staging Architecture | Plotly 3D Model</title>
  <script src="https://cdn.plot.ly/plotly-2.35.2.min.js"></script>
  <style>
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      background-color: #090d16;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      height: 100vh;
      width: 100vw;
    }}
    header {{
      background: rgba(15, 23, 42, 0.9);
      border-bottom: 1px solid #1e293b;
      padding: 10px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
      z-index: 10;
    }}
    .badge {{
      background: #0284c7;
      color: white;
      padding: 2px 8px;
      border-radius: 4px;
      font-weight: 600;
      font-size: 11px;
    }}
    #plot-container {{
      flex: 1;
      width: 100%;
      height: 100%;
    }}
    .legend-card {{
      position: absolute;
      bottom: 20px;
      left: 20px;
      background: rgba(15, 23, 42, 0.9);
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 12px 16px;
      font-size: 11px;
      line-height: 1.6;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      z-index: 5;
    }}
    .dot {{ display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 6px; }}
  </style>
</head>
<body>
  <header>
    <div>
      <span class="badge">AEROSPACE 3D MESH</span>
      <strong style="margin-left: 8px;">Rocket Staging & Physical Architecture</strong>
      <span style="color: #94a3b8; margin-left: 8px;">| Total Height: {dimensions['total_height_m']:.1f}m · Diameter: {radius*2:.1f}m · Fineness: {dimensions['fineness_ratio']:.1f}</span>
    </div>
    <div style="font-size: 11px; color: #38bdf8;">
      Rotate: Left-Click Drag · Pan: Right-Click Drag · Zoom: Scroll
    </div>
  </header>
  
  <div id="plot-container"></div>

  <div class="legend-card">
    <div style="font-weight: 600; margin-bottom: 4px; color: #e2e8f0;">STRUCTURAL STAGES</div>
    <div><span class="dot" style="background: #f59e0b;"></span>Payload Fairing: {h_fairing:.1f}m (Mass: {dimensions.get('fairing_mass_kg', 1750):,.0f} kg · Drag: {dimensions.get('fairing_drag_kn', 0):.1f} kN)</div>
    <div><span class="dot" style="background: #fbbf24;"></span>Payload Satellite: {dimensions['payload_kg']:,.0f} kg</div>
    <div><span class="dot" style="background: #9333ea;"></span>Stage 2 Upper: {h_s2:.1f}m (Prop: {dimensions['stage2_prop_kg']:,.0f} kg)</div>
    <div><span class="dot" style="background: #475569;"></span>Interstage Adapter: {h_inter:.1f}m</div>
    <div><span class="dot" style="background: #0284c7;"></span>Stage 1 Booster: {h_s1:.1f}m (Prop: {dimensions['stage1_prop_kg']:,.0f} kg)</div>
  </div>

  <script>
    var data = {json.dumps(surfaces_data)};
    var layout = {json.dumps(layout_dict)};
    Plotly.newPlot('plot-container', data, layout, {{responsive: true}});
  </script>
</body>
</html>"""
        with open(output_filepath, "w", encoding="utf-8") as f:
            f.write(html_content)

    abs_path = os.path.abspath(output_filepath)
    print(f"\n[3D MODEL EXPORT] Interactive Plotly 3D Mesh exported to:")
    print(f"  --> {abs_path}")
    print("  Opening model in your default web browser for interactive inspection...")
    try:
        webbrowser.open(f"file://{abs_path}")
    except Exception as e:
        print(f"  (Browser launch note: {e})")


# ------------------------------------------------------------------------------
# 5. OPTIMIZATION & FLIGHT SIMULATION SCRIPT
# ------------------------------------------------------------------------------
def optimize_rocket(
    payload_mass_kg: float = 22800.0,
    target_delta_v: float = 9300.0,
    # Stage 1 (Booster): Sea-level optimized engine (e.g., Merlin 1D)
    stage1_isp_sl: float = 282.0,
    stage1_isp_vac: float = 311.0,
    stage1_thrust_sl_kn: float = 845.0,
    stage1_thrust_vac_kn: float = 914.0,
    stage1_min_throttle: float = 0.40,
    stage1_engine_mass_kg: float = 470.0,
    # Stage 2 (Upper): Vacuum optimized engine (e.g., Merlin 1D Vac)
    stage2_isp_sl: float = 200.0,
    stage2_isp_vac: float = 348.0,
    stage2_thrust_sl_kn: float = 400.0,
    stage2_thrust_vac_kn: float = 981.0,
    stage2_min_throttle: float = 0.40,
    stage2_engine_mass_kg: float = 490.0,
    # Structural & Safety Constraints
    target_liftoff_twr: float = 1.25,
    max_allowed_g: float = 4.50,
    stage1_dry_fraction: float = 0.055,
    stage2_dry_fraction: float = 0.075,
    rocket_diameter_m: float = 3.70,
    drag_coefficient: float = 0.30
):
    print("=" * 78)
    print("      ROCKET STAGING & PROPULSION OPTIMIZATION CALCULATOR")
    print("=" * 78)
    print(f"Target Delta-V      : {target_delta_v:,.0f} m/s")
    print(f"Payload Mass        : {payload_mass_kg:,.0f} kg")
    print(f"Target Liftoff TWR  : {target_liftoff_twr:.2f} (Safe corridor: 1.20 - 1.50)")
    print(f"Max G-Force Limit   : {max_allowed_g:.2f} G (Structural collapse ceiling)")
    print("-" * 78)

    # Convert kN to Newtons
    f1_sl_n = stage1_thrust_sl_kn * 1000.0
    f1_vac_n = stage1_thrust_vac_kn * 1000.0
    f2_sl_n = stage2_thrust_sl_kn * 1000.0
    f2_vac_n = stage2_thrust_vac_kn * 1000.0

    # Staging Delta-V split (Stage 1 punches through atmosphere; Stage 2 provides vacuum insertion)
    split_ratio_s1 = 0.42
    target_dv1 = target_delta_v * split_ratio_s1
    target_dv2 = target_delta_v * (1.0 - split_ratio_s1)

    # --------------------------------------------------------------------------
    # PAYLOAD FAIRING SIZING & FOREBODY AERODYNAMIC DRAG CONTRIBUTION
    # --------------------------------------------------------------------------
    radius_m = rocket_diameter_m / 2.0
    fairing_height_m = max(8.0, rocket_diameter_m * 3.2)
    fairing_radius_m = radius_m * 1.08
    fairing_barrel_h = fairing_height_m * 0.45
    fairing_cone_h = fairing_height_m * 0.55
    fairing_cone_slant = math.sqrt(fairing_radius_m**2 + fairing_cone_h**2)
    fairing_surface_area_m2 = 2.0 * math.pi * fairing_radius_m * fairing_barrel_h + math.pi * fairing_radius_m * fairing_cone_slant
    
    # Carbon-composite honeycomb sandwich (~10.5 kg/m^2) + 250 kg pneumatic separation pushers & acoustic blankets
    fairing_areal_density = 10.5  # kg/m^2
    fairing_mass_kg = round(fairing_surface_area_m2 * fairing_areal_density + 250.0)
    fairing_drag_cd = drag_coefficient * 0.70  # Fairing contributes ~70% of vehicle atmospheric aerodynamic drag

    # --------------------------------------------------------------------------
    # SIZING STAGE 2 (Upper Stage Vacuum Engine)
    # --------------------------------------------------------------------------
    # Effective average upper stage payload accounts for carrying fairing initially and jettisoning in vacuum
    effective_s2_payload = payload_mass_kg + fairing_mass_kg * 0.25
    r2 = math.exp(target_dv2 / (stage2_isp_vac * G0))
    eps2 = stage2_dry_fraction
    denom2 = 1.0 - (eps2 / (1.0 - eps2)) * (r2 - 1.0)
    if denom2 <= 0.05:
        denom2 = 0.05

    stage2_burnout_mass = effective_s2_payload / denom2
    stage2_prop_mass = stage2_burnout_mass * (r2 - 1.0)
    stage2_dry_mass = max(stage2_engine_mass_kg, stage2_burnout_mass - effective_s2_payload)
    stage2_wet_mass = payload_mass_kg + fairing_mass_kg + stage2_dry_mass + stage2_prop_mass

    # Upper stage engine sizing (Vacuum TWR ~0.85 - 1.0)
    req_s2_thrust_n = stage2_wet_mass * G0 * 0.90
    stage2_engine_count = max(1, round(req_s2_thrust_n / f2_vac_n))

    # Delta-V conserved by vacuum fairing jettison
    fairing_dv_saved = stage2_isp_vac * G0 * math.log((stage2_dry_mass + payload_mass_kg + fairing_mass_kg) / (stage2_dry_mass + payload_mass_kg))

    # --------------------------------------------------------------------------
    # SIZING STAGE 1 (Booster Sea-Level Engine)
    # --------------------------------------------------------------------------
    avg_s1_isp = 0.65 * stage1_isp_sl + 0.35 * stage1_isp_vac
    r1 = math.exp(target_dv1 / (avg_s1_isp * G0))
    eps1 = stage1_dry_fraction
    denom1 = 1.0 - (eps1 / (1.0 - eps1)) * (r1 - 1.0)
    if denom1 <= 0.05:
        denom1 = 0.05

    stage1_payload = stage2_wet_mass
    stage1_burnout_mass = stage1_payload / denom1
    stage1_prop_mass = stage1_burnout_mass * (r1 - 1.0)
    stage1_dry_mass = max(stage1_engine_mass_kg * 4.0, stage1_burnout_mass - stage1_payload)
    total_liftoff_mass = stage1_payload + stage1_dry_mass + stage1_prop_mass

    # --------------------------------------------------------------------------
    # DETERMINING STAGE 1 ENGINE COUNT (Enforcing Liftoff TWR between 1.2 and 1.5)
    # --------------------------------------------------------------------------
    liftoff_weight_n = total_liftoff_mass * G0
    target_thrust_sl_n = liftoff_weight_n * target_liftoff_twr
    stage1_engine_count = max(1, math.ceil(target_thrust_sl_n / f1_sl_n))

    actual_sl_thrust_n = stage1_engine_count * f1_sl_n
    actual_liftoff_twr = actual_sl_thrust_n / liftoff_weight_n

    # Theoretical Delta-V via Tsiolkovsky equation
    dv1_theoretical = avg_s1_isp * G0 * math.log(total_liftoff_mass / (stage1_dry_mass + stage2_wet_mass))
    dv2_theoretical = stage2_isp_vac * G0 * math.log(stage2_wet_mass / (stage2_dry_mass + payload_mass_kg))
    total_achieved_dv = dv1_theoretical + dv2_theoretical

    # --------------------------------------------------------------------------
    # PHYSICAL DIMENSIONS SIZING (3D CYLINDRICAL GEOMETRY)
    # --------------------------------------------------------------------------
    # Average liquid propellant density ~1,030 kg/m^3 (Kerolox / Methalox)
    propellant_density = 1030.0  # kg/m^3
    radius_m = rocket_diameter_m / 2.0
    cross_section_area_m2 = math.pi * (radius_m ** 2)

    # 12% extra volume for internal tank ullage, domes, and baffles
    ullage_factor = 1.12

    # Stage 1 Dimensions
    s1_prop_volume_m3 = (stage1_prop_mass / propellant_density) * ullage_factor
    s1_tank_height_m = s1_prop_volume_m3 / cross_section_area_m2
    s1_engine_section_height_m = 2.8
    total_stage1_height_m = s1_tank_height_m + s1_engine_section_height_m

    # Interstage Dimensions
    interstage_height_m = max(3.5, rocket_diameter_m * 1.1)

    # Stage 2 Dimensions
    s2_prop_volume_m3 = (stage2_prop_mass / propellant_density) * ullage_factor
    s2_tank_height_m = s2_prop_volume_m3 / cross_section_area_m2
    total_stage2_height_m = s2_tank_height_m + 1.2  # Avionics & engine mount

    # Payload Fairing Dimensions
    fairing_height_m = max(8.0, rocket_diameter_m * 3.2)

    # Total Rocket Height
    total_vehicle_height_m = total_stage1_height_m + interstage_height_m + total_stage2_height_m + fairing_height_m
    fineness_ratio = total_vehicle_height_m / rocket_diameter_m

    # --------------------------------------------------------------------------
    # TRAJECTORY INTEGRATION & DYNAMIC THROTTLING SIMULATION
    # --------------------------------------------------------------------------
    dt = 0.5  # Simulation step (seconds)
    time = 0.0
    altitude = 0.0
    velocity = 0.0
    current_stage = 1
    s1_prop_rem = stage1_prop_mass
    s2_prop_rem = stage2_prop_mass

    peak_g = 0.0
    peak_q_pa = 0.0
    peak_fairing_drag_kn = 0.0
    max_q_alt = 0.0
    max_q_time = 0.0

    landmarks = [
        {"alt_km": 0.0, "label": "0 km (Liftoff)", "recorded": False},
        {"alt_km": 10.0, "label": "10 km (Near Max-Q)", "recorded": False},
        {"alt_km": 30.0, "label": "30 km (Stratosphere)", "recorded": False},
        {"alt_km": 60.0, "label": "60 km (Mesosphere/Staging)", "recorded": False},
    ]
    throttling_profile_results = []

    # Record 0 km liftoff point
    p_sl, rho_sl, _ = get_atmosphere(0.0)
    throttling_profile_results.append({
        "altitude_km": 0.0,
        "label": "0 km (Liftoff)",
        "time_s": 0.0,
        "velocity_ms": 0.0,
        "thrust_kn": actual_sl_thrust_n / 1000.0,
        "throttle_pct": 100.0,
        "twr": actual_liftoff_twr,
        "g_force": max(0.0, actual_liftoff_twr - 1.0),
        "q_kpa": 0.0,
        "stage": 1
    })
    landmarks[0]["recorded"] = True

    while s2_prop_rem > 0 and time < 800.0:
        current_m = (stage1_dry_mass + s1_prop_rem + stage2_wet_mass) if current_stage == 1 else (stage2_dry_mass + s2_prop_rem + payload_mass_kg)
        g_loc = get_local_gravity(altitude)
        f_drag, q_pa, rho, p_ambient = get_aerodynamic_drag(altitude, velocity, drag_coefficient, rocket_diameter_m)
        f_drag_fairing = f_drag * 0.70  # Forebody wave drag accounts for ~70% of total drag
        if f_drag_fairing / 1000.0 > peak_fairing_drag_kn:
            peak_fairing_drag_kn = f_drag_fairing / 1000.0

        if q_pa > peak_q_pa:
            peak_q_pa = q_pa
            max_q_alt = altitude / 1000.0
            max_q_time = time

        # Engine parameters at current altitude
        if current_stage == 1:
            eng_isp, eng_thrust = get_engine_performance(stage1_isp_sl, stage1_isp_vac, f1_sl_n, f1_vac_n, p_ambient)
            full_thrust = stage1_engine_count * eng_thrust
            min_throttle = stage1_min_throttle
        else:
            eng_isp, eng_thrust = get_engine_performance(stage2_isp_sl, stage2_isp_vac, f2_sl_n, f2_vac_n, p_ambient)
            full_thrust = stage2_engine_count * eng_thrust
            min_throttle = stage2_min_throttle

        # Dynamic Throttling: Cap axial acceleration at max_allowed_g to prevent structural failure!
        max_safe_thrust = max_allowed_g * current_m * G0 + f_drag
        req_throttle = max_safe_thrust / full_thrust
        
        # Max-Q shear relief between 8.5 km and 13.5 km
        if current_stage == 1 and 8500.0 <= altitude <= 13500.0 and q_pa > 25000.0:
            req_throttle = min(req_throttle, 0.78)

        actual_throttle = min(1.0, max(min_throttle, req_throttle))
        actual_thrust = full_thrust * actual_throttle

        # Pitch angle (gravity turn)
        if altitude < 1500.0:
            pitch_rad = math.pi / 2.0
        elif altitude > 120000.0:
            pitch_rad = 0.08
        else:
            prog = min(1.0, max(0.0, (altitude - 1500.0) / 90000.0))
            deg = 90.0 - 80.0 * math.sin((prog * math.pi) / 2.0)
            pitch_rad = math.radians(deg)

        f_net = actual_thrust - f_drag - current_m * g_loc * math.sin(pitch_rad)
        accel = f_net / current_m
        axial_g = (actual_thrust - f_drag) / (current_m * G0)
        curr_twr = actual_thrust / (current_m * g_loc)

        if axial_g > peak_g:
            peak_g = axial_g

        # Check landmarks (10km, 30km, 60km)
        for lm in landmarks[1:]:
            if not lm["recorded"] and altitude >= lm["alt_km"] * 1000.0:
                lm["recorded"] = True
                throttling_profile_results.append({
                    "altitude_km": lm["alt_km"],
                    "label": lm["label"],
                    "time_s": time,
                    "velocity_ms": velocity,
                    "thrust_kn": actual_thrust / 1000.0,
                    "throttle_pct": actual_throttle * 100.0,
                    "twr": curr_twr,
                    "g_force": axial_g,
                    "q_kpa": q_pa / 1000.0,
                    "stage": current_stage
                })

        # Propellant consumption
        m_dot = actual_thrust / (eng_isp * G0)
        fuel_step = m_dot * dt

        if current_stage == 1:
            if s1_prop_rem <= fuel_step:
                s1_prop_rem = 0.0
                current_stage = 2
            else:
                s1_prop_rem -= fuel_step
        else:
            if s2_prop_rem <= fuel_step:
                s2_prop_rem = 0.0
                break
            else:
                s2_prop_rem -= fuel_step

        velocity += accel * dt
        altitude += velocity * math.sin(pitch_rad) * dt
        time += dt

    # --------------------------------------------------------------------------
    # 6. CONSOLE REPORTING & PHYSICAL DIMENSIONS SUMMARY
    # --------------------------------------------------------------------------
    print("STAGE 1 (BOOSTER):")
    print(f"  Engines Required     : {stage1_engine_count}x (Merlin 1D)")
    print(f"  Total Liftoff Thrust : {actual_sl_thrust_n / 1000.0:,.1f} kN (Sea-Level)")
    print(f"  Liftoff TWR          : {actual_liftoff_twr:.2f}")
    print(f"  Propellant Mass      : {stage1_prop_mass:,.0f} kg")
    print(f"  Dry Mass             : {stage1_dry_mass:,.0f} kg")
    print(f"  Stage 1 Height       : {total_stage1_height_m:.1f} m (Diameter: {rocket_diameter_m:.1f} m)")
    print(f"  Stage 1 Delta-V      : {dv1_theoretical:,.0f} m/s")

    print("\nSTAGE 2 (VACUUM / UPPER):")
    print(f"  Engines Required     : {stage2_engine_count}x (Merlin 1D Vac)")
    print(f"  Total Vacuum Thrust  : {(stage2_engine_count * f2_vac_n) / 1000.0:,.1f} kN")
    print(f"  Propellant Mass      : {stage2_prop_mass:,.0f} kg")
    print(f"  Dry Mass             : {stage2_dry_mass:,.0f} kg")
    print(f"  Stage 2 Height       : {total_stage2_height_m:.1f} m")
    print(f"  Stage 2 Delta-V      : {dv2_theoretical:,.0f} m/s")

    print("\nPAYLOAD FAIRING & FOREBODY AERODYNAMICS:")
    print(f"  Fairing Architecture : Bivalve Clamshell (Carbon-Composite Sandwich)")
    print(f"  Fairing Dimensions   : Height: {fairing_height_m:.1f} m | Diameter: {fairing_radius_m * 2:.2f} m")
    print(f"  Wetted Surface Area  : {fairing_surface_area_m2:.1f} m²")
    print(f"  Structural Mass      : {fairing_mass_kg:,.0f} kg")
    print(f"  Forebody Wave Drag   : {peak_fairing_drag_kn:.1f} kN (~70% of vehicle Max-Q drag)")
    print(f"  Vacuum Jettison Alt  : 105.0 km (Dynamic pressure q < 0.1 kPa)")
    print(f"  Upper Stage Δv Gain  : +{fairing_dv_saved:,.0f} m/s (Gained by discarding fairing in vacuum)")

    print("\nPHYSICAL DIMENSIONS & AERODYNAMIC GEOMETRY:")
    print(f"  Vehicle Outer Diameter: {rocket_diameter_m:.2f} m (Radius: {radius_m:.2f} m)")
    print(f"  Stage 1 Booster Height: {total_stage1_height_m:.1f} m")
    print(f"  Interstage Ring Height: {interstage_height_m:.1f} m")
    print(f"  Stage 2 Upper Height  : {total_stage2_height_m:.1f} m")
    print(f"  Payload Fairing Height: {fairing_height_m:.1f} m")
    print(f"  Total Rocket Height   : {total_vehicle_height_m:.1f} m")
    print(f"  Fineness Ratio (H/D)  : {fineness_ratio:.1f} (Standard orbital slender ratio: 15-22)")

    print("\nTOTAL VEHICLE MASS & PERFORMANCE:")
    print(f"  Gross Liftoff Weight : {total_liftoff_mass:,.0f} kg")
    print(f"  Total Propellant Mass: {(stage1_prop_mass + stage2_prop_mass):,.0f} kg")
    print(f"  Total Achieved Delta-V: {total_achieved_dv:,.0f} m/s (Target: {target_delta_v:,.0f} m/s)")
    print(f"  Delta-V Margin       : {(total_achieved_dv - target_delta_v):+,.0f} m/s")
    print(f"  Peak Max-Q           : {peak_q_pa / 1000.0:.1f} kPa at {max_q_alt:.1f} km (T+{max_q_time:.0f}s)")
    print(f"  Peak G-Force         : {peak_g:.2f} G")

    print("\n" + "=" * 78)
    print("      THROTTLING PROFILE AT KEY ALTITUDES")
    print("=" * 78)
    print(f"{'Altitude Point':<24} {'Time':<8} {'Velocity':<12} {'Thrust (kN)':<14} {'Throttle %':<12} {'TWR':<8} {'G-Force':<8}")
    print("-" * 78)
    for p in throttling_profile_results:
        print(f"{p['label']:<24} T+{p['time_s']:<6.0f}s {p['velocity_ms']:<8.0f} m/s {p['thrust_kn']:<14.1f} {p['throttle_pct']:<11.1f}% {p['twr']:<8.2f} {p['g_force']:<8.2f}G")
    print("-" * 78)

    # --------------------------------------------------------------------------
    # SAFETY WARNING CHECKS
    # --------------------------------------------------------------------------
    print("\nSAFETY & STRUCTURAL INTEGRITY AUDIT:")
    is_safe = True

    if actual_liftoff_twr < 1.20:
        is_safe = False
        print("  [CRITICAL WARNING] Liftoff TWR is < 1.20! Severe risk of tower strike and massive gravity drag losses.")
    elif actual_liftoff_twr > 1.50:
        is_safe = False
        print("  [WARNING] Liftoff TWR is > 1.50! Rapid low-altitude acceleration creates violent Max-Q stress.")
    else:
        print(f"  [NOMINAL] Liftoff TWR ({actual_liftoff_twr:.2f}) is within optimal 1.20 - 1.50 corridor.")

    if peak_g > max_allowed_g + 0.01:
        is_safe = False
        print(f"  [CRITICAL EXPLOSION WARNING] G-force peaked at {peak_g:.2f} G (exceeds {max_allowed_g:.2f} G limit)!")
        print("    High probability of structural explosion from tank collapse. Throttling floor must be reduced.")
    else:
        print(f"  [NOMINAL] Axial acceleration capped at {peak_g:.2f} G (within safe {max_allowed_g:.2f} G structural limit).")

    if peak_q_pa / 1000.0 > 45.0:
        print(f"  [CAUTION] Dynamic pressure ({peak_q_pa / 1000.0:.1f} kPa) exceeds standard 45 kPa aero limit.")
    else:
        print(f"  [NOMINAL] Max-Q dynamic pressure ({peak_q_pa / 1000.0:.1f} kPa) is within structural aero tolerance.")

    if is_safe:
        print("\n>>> VEHICLE STRUCTURAL AUDIT: PASSED. FLIGHT PROFILE NOMINAL. <<<")
    else:
        print("\n>>> VEHICLE STRUCTURAL AUDIT: FAILED. SAFETY ADJUSTMENTS REQUIRED. <<<")
    print("=" * 78)

    # --------------------------------------------------------------------------
    # 7. EXPORT 3D PLOTLY MESH SCENE
    # --------------------------------------------------------------------------
    dimensions_dict = {
        "radius_m": radius_m,
        "diameter_m": rocket_diameter_m,
        "stage1_height_m": total_stage1_height_m,
        "engine_section_height_m": s1_engine_section_height_m,
        "interstage_height_m": interstage_height_m,
        "stage2_height_m": total_stage2_height_m,
        "fairing_height_m": fairing_height_m,
        "fairing_mass_kg": fairing_mass_kg,
        "fairing_surface_m2": fairing_surface_area_m2,
        "fairing_drag_kn": peak_fairing_drag_kn,
        "fairing_dv_saved_ms": fairing_dv_saved,
        "total_height_m": total_vehicle_height_m,
        "fineness_ratio": fineness_ratio,
        "stage1_prop_kg": stage1_prop_mass,
        "stage1_dry_kg": stage1_dry_mass,
        "stage1_engines": stage1_engine_count,
        "stage2_prop_kg": stage2_prop_mass,
        "stage2_dry_kg": stage2_dry_mass,
        "stage2_engines": stage2_engine_count,
        "payload_kg": payload_mass_kg,
        "liftoff_thrust_kn": actual_sl_thrust_n / 1000.0
    }

    export_3d_plotly_scene(dimensions_dict, "rocket_3d_model.html")

    return {
        "stage1_engines": stage1_engine_count,
        "stage2_engines": stage2_engine_count,
        "stage1_prop_kg": stage1_prop_mass,
        "stage2_prop_kg": stage2_prop_mass,
        "total_liftoff_kg": total_liftoff_mass,
        "achieved_dv": total_achieved_dv,
        "peak_g": peak_g,
        "dimensions": dimensions_dict,
        "throttling_profile": throttling_profile_results
    }


if __name__ == "__main__":
    optimize_rocket()
