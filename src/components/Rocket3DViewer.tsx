import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { OptimizationResult } from '../types/rocket';
import {
  RotateCcw,
  Eye,
  Maximize2,
  Flame,
  Layers,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Shield
} from 'lucide-react';

interface Rocket3DViewerProps {
  result: OptimizationResult;
}

export const Rocket3DViewer: React.FC<Rocket3DViewerProps> = ({ result }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [explodedRatio, setExplodedRatio] = useState<number>(0); // 0 (assembled) to 1 (fully separated)
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [showFlames, setShowFlames] = useState<boolean>(true);
  const [wireframeMode, setWireframeMode] = useState<boolean>(false);
  const [fairingJettisoned, setFairingJettisoned] = useState<boolean>(false);
  const [cameraView, setCameraView] = useState<'full' | 'engines' | 'stage2' | 'fairing'>('full');
  const [isControlsExpanded, setIsControlsExpanded] = useState<boolean>(true);
  const [showFairingDetails, setShowFairingDetails] = useState<boolean>(true);

  // References to animateable 3D groups
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  // Moving sub-groups for exploded view
  const fairingLeftRef = useRef<THREE.Group | null>(null);
  const fairingRightRef = useRef<THREE.Group | null>(null);
  const payloadGroupRef = useRef<THREE.Group | null>(null);
  const stage2GroupRef = useRef<THREE.Group | null>(null);
  const interstageGroupRef = useRef<THREE.Group | null>(null);
  const stage1GroupRef = useRef<THREE.Group | null>(null);
  const enginePlumesRef = useRef<THREE.Group | null>(null);

  // Material references to toggle wireframe
  const materialsRef = useRef<THREE.MeshStandardMaterial[]>([]);

  // Smooth target for exploded ratio and fairing jettison
  const targetExplodedRef = useRef<number>(0);
  const currentExplodedRef = useRef<number>(0);
  const targetFairingJettisonRef = useRef<number>(0);
  const currentFairingJettisonRef = useRef<number>(0);

  // Target camera position for view transitions
  const targetCameraPos = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 32));
  const targetCameraLookAt = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));

  targetExplodedRef.current = explodedRatio;
  targetFairingJettisonRef.current = fairingJettisoned ? 1.0 : 0.0;

  // Initialize Scene once
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Detect software WebGL
    const isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return false;
      }
    })();

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x060911); // Deep space slate
    scene.fog = new THREE.FogExp2(0x060911, 0.007);

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 4, 30);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    container.replaceChildren(renderer.domElement);

    // Setup procedural studio environment reflection
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 80;
    controls.minDistance = 4;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // Studio Lighting Rig
    const dirKeyLight = new THREE.DirectionalLight(0xfffaed, 2.8);
    dirKeyLight.position.set(15, 25, 20);
    dirKeyLight.castShadow = !isSoftwareGl;
    if (dirKeyLight.shadow) {
      dirKeyLight.shadow.mapSize.width = 1024;
      dirKeyLight.shadow.mapSize.height = 1024;
      dirKeyLight.shadow.bias = -0.0005;
    }
    scene.add(dirKeyLight);

    const blueRimLight = new THREE.DirectionalLight(0x38bdf8, 1.8);
    blueRimLight.position.set(-18, -10, -20);
    scene.add(blueRimLight);

    const hemiLight = new THREE.HemisphereLight(0x94a3b8, 0x0f172a, 0.7);
    scene.add(hemiLight);

    // Starfield particles in background
    const starCount = 350;
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      starPositions[i] = (Math.random() - 0.5) * 160;
      starPositions[i + 1] = (Math.random() - 0.5) * 160;
      starPositions[i + 2] = -30 - Math.random() * 80;
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({
      color: 0x94a3b8,
      size: 0.7,
      transparent: true,
      opacity: 0.6
    });
    const starField = new THREE.Points(starGeometry, starMaterial);
    scene.add(starField);

    // Ground Contact Shadow Floor
    const shadowGeo = new THREE.PlaneGeometry(30, 30);
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const ctx = shadowCanvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(0,0,0,0.4)');
    grad.addColorStop(0.5, 'rgba(0,0,0,0.15)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      depthWrite: false
    });
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -10.05;
    scene.add(shadowPlane);

    // Resize Handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop
    let animationFrameId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Smooth damping for exploded view separation
      currentExplodedRef.current = THREE.MathUtils.damp(
        currentExplodedRef.current,
        targetExplodedRef.current,
        5,
        delta
      );
      const ratio = currentExplodedRef.current;

      // Smooth damping for fairing jettison separation
      currentFairingJettisonRef.current = THREE.MathUtils.damp(
        currentFairingJettisonRef.current,
        targetFairingJettisonRef.current,
        4,
        delta
      );
      const jRatio = currentFairingJettisonRef.current;

      // Animate fairing clamshell positions (combining exploded separation + jettison)
      const fairingSpreadX = ratio * 4.5 + jRatio * 8.5;
      const fairingElevateY = 8.5 + ratio * 3.5 - jRatio * 2.0;
      const fairingRotZ = ratio * 0.25 + jRatio * 0.55;

      if (fairingLeftRef.current && fairingRightRef.current) {
        fairingLeftRef.current.position.x = -fairingSpreadX;
        fairingLeftRef.current.position.y = fairingElevateY;
        fairingLeftRef.current.rotation.z = -fairingRotZ;
        fairingLeftRef.current.rotation.y = -jRatio * 0.2;

        fairingRightRef.current.position.x = fairingSpreadX;
        fairingRightRef.current.position.y = fairingElevateY;
        fairingRightRef.current.rotation.z = fairingRotZ;
        fairingRightRef.current.rotation.y = jRatio * 0.2;
      }

      if (payloadGroupRef.current) {
        payloadGroupRef.current.position.y = 6.2 + ratio * 2.8;
      }

      if (stage2GroupRef.current) {
        stage2GroupRef.current.position.y = 2.5 + ratio * 1.5;
      }

      if (interstageGroupRef.current) {
        interstageGroupRef.current.position.y = 0;
      }

      if (stage1GroupRef.current) {
        stage1GroupRef.current.position.y = -ratio * 2.2;
      }

      // Animate engine plumes flicker
      if (enginePlumesRef.current) {
        const scalePulse = 1.0 + Math.sin(elapsed * 24) * 0.08;
        enginePlumesRef.current.scale.set(1.0, scalePulse, 1.0);
      }

      // Smooth camera interpolation towards selected preset
      if (camera && controls) {
        camera.position.lerp(targetCameraPos.current, 0.05);
        controls.target.lerp(targetCameraLookAt.current, 0.05);
        controls.autoRotate = autoRotate;
        controls.autoRotateSpeed = 1.2;
        controls.update();
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      starGeometry.dispose();
      starMaterial.dispose();
      shadowGeo.dispose();
      shadowMat.dispose();
      shadowTexture.dispose();
    };
  }, []);

  // Build / Rebuild Procedural Rocket 3D Model when parameters change
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Clean up previous rocket models
    const existingRocket = scene.getObjectByName('ROCKET_HIERARCHY');
    if (existingRocket) {
      scene.remove(existingRocket);
      existingRocket.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material?.dispose();
          }
        }
      });
    }

    materialsRef.current = [];

    // Master rocket group centered at origin
    const masterRocket = new THREE.Group();
    masterRocket.name = 'ROCKET_HIERARCHY';
    masterRocket.position.y = 0;
    scene.add(masterRocket);

    // Geometric proportions based on real vehicle calculation
    const d = Math.max(2.0, Math.min(6.5, result.inputs.rocket_diameter_m));
    const r = d / 2.5; // Visual scale radius (approx 0.8 - 2.2 Three.js units)

    // PBR Materials
    const whiteBodyMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      metalness: 0.25,
      roughness: 0.35,
      wireframe: wireframeMode
    });
    materialsRef.current.push(whiteBodyMat);

    const carbonDarkMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.5,
      roughness: 0.45,
      wireframe: wireframeMode
    });
    materialsRef.current.push(carbonDarkMat);

    const titaniumMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.85,
      roughness: 0.25,
      wireframe: wireframeMode
    });
    materialsRef.current.push(titaniumMat);

    const goldFoilMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.9,
      roughness: 0.2,
      wireframe: wireframeMode
    });
    materialsRef.current.push(goldFoilMat);

    const solarBlueMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      metalness: 0.6,
      roughness: 0.25,
      wireframe: wireframeMode
    });
    materialsRef.current.push(solarBlueMat);

    const copperNozzleMat = new THREE.MeshStandardMaterial({
      color: 0xb45309,
      metalness: 0.8,
      roughness: 0.3,
      wireframe: wireframeMode
    });
    materialsRef.current.push(copperNozzleMat);

    // -------------------------------------------------------------------------
    // 1. STAGE 1 (BOOSTER GROUP)
    // -------------------------------------------------------------------------
    const s1Group = new THREE.Group();
    stage1GroupRef.current = s1Group;
    masterRocket.add(s1Group);

    // Booster main tank cylinder (height ~12 units)
    const s1TankHeight = 11.5;
    const s1TankGeo = new THREE.CylinderGeometry(r, r, s1TankHeight, 48);
    const s1TankMesh = new THREE.Mesh(s1TankGeo, whiteBodyMat);
    s1TankMesh.position.y = -s1TankHeight / 2;
    s1TankMesh.castShadow = true;
    s1TankMesh.receiveShadow = true;
    s1Group.add(s1TankMesh);

    // Conduits / Raceways running down Stage 1
    const racewayGeo = new THREE.BoxGeometry(r * 0.1, s1TankHeight * 0.95, r * 0.12);
    const racewayMesh = new THREE.Mesh(racewayGeo, carbonDarkMat);
    racewayMesh.position.set(r * 0.98, -s1TankHeight / 2, 0);
    s1Group.add(racewayMesh);

    // Deployable Grid Fins (4 lattice fins at top of Stage 1)
    const finGroup = new THREE.Group();
    finGroup.position.set(0, -0.4, 0);
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const finArm = new THREE.Group();
      finArm.rotation.y = angle;

      const finLatticeGeo = new THREE.BoxGeometry(0.12, 0.7, 0.9);
      const finLattice = new THREE.Mesh(finLatticeGeo, titaniumMat);
      finLattice.position.set(r + 0.45, 0, 0);
      finArm.add(finLattice);
      finGroup.add(finArm);
    }
    s1Group.add(finGroup);

    // Landing Legs (4 folded along base of Stage 1)
    const legsGroup = new THREE.Group();
    legsGroup.position.set(0, -s1TankHeight, 0);
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2 + Math.PI / 4;
      const legArm = new THREE.Group();
      legArm.rotation.y = angle;

      const legGeo = new THREE.CylinderGeometry(r * 0.05, r * 0.08, 3.8, 16);
      const legMesh = new THREE.Mesh(legGeo, carbonDarkMat);
      legMesh.position.set(r + 0.15, 1.8, 0);
      legMesh.rotation.z = 0.08;
      legArm.add(legMesh);
      legsGroup.add(legArm);
    }
    s1Group.add(legsGroup);

    // Stage 1 Engine Cluster (Octaweb / Multi-Engine Ring)
    const s1EngineGroup = new THREE.Group();
    s1EngineGroup.position.set(0, -s1TankHeight, 0);
    s1Group.add(s1EngineGroup);

    // Engine plume group
    const plumesGroup = new THREE.Group();
    enginePlumesRef.current = plumesGroup;
    plumesGroup.visible = showFlames;
    s1EngineGroup.add(plumesGroup);

    const s1Count = Math.max(1, result.stage1.engine_count);
    const engineRingRadius = r * 0.65;

    // Helper to generate an engine nozzle bell
    const createEngineBell = (scale: number = 1.0) => {
      const bellGroup = new THREE.Group();
      const nozzleGeo = new THREE.ConeGeometry(0.24 * scale, 0.7 * scale, 24, 1, true);
      const nozzleMesh = new THREE.Mesh(nozzleGeo, copperNozzleMat);
      nozzleMesh.position.y = -0.35 * scale;
      bellGroup.add(nozzleMesh);

      // Inner chamber
      const chamberGeo = new THREE.CylinderGeometry(0.14 * scale, 0.16 * scale, 0.3 * scale, 16);
      const chamberMesh = new THREE.Mesh(chamberGeo, titaniumMat);
      chamberMesh.position.y = 0.1 * scale;
      bellGroup.add(chamberMesh);

      // Plume flame (cone glowing cyan/orange)
      const flameGeo = new THREE.ConeGeometry(0.22 * scale, 1.6 * scale, 16);
      const flameMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.75
      });
      const flameMesh = new THREE.Mesh(flameGeo, flameMat);
      flameMesh.rotation.x = Math.PI;
      flameMesh.position.y = -1.1 * scale;
      bellGroup.add(flameMesh);

      return bellGroup;
    };

    if (s1Count === 1) {
      s1EngineGroup.add(createEngineBell(1.5));
    } else {
      // 1 center engine
      s1EngineGroup.add(createEngineBell(0.9));
      // Outer ring of engines
      const outerCount = s1Count - 1;
      for (let i = 0; i < outerCount; i++) {
        const theta = (i * 2 * Math.PI) / outerCount;
        const eng = createEngineBell(0.85);
        eng.position.set(Math.cos(theta) * engineRingRadius, 0, Math.sin(theta) * engineRingRadius);
        s1EngineGroup.add(eng);
      }
    }

    // -------------------------------------------------------------------------
    // 2. INTERSTAGE ADAPTER
    // -------------------------------------------------------------------------
    const interstageGroup = new THREE.Group();
    interstageGroupRef.current = interstageGroup;
    masterRocket.add(interstageGroup);

    const interHeight = 1.4;
    const interGeo = new THREE.CylinderGeometry(r, r, interHeight, 48);
    const interMesh = new THREE.Mesh(interGeo, carbonDarkMat);
    interMesh.position.y = interHeight / 2;
    interMesh.castShadow = true;
    interstageGroup.add(interMesh);

    // -------------------------------------------------------------------------
    // 3. STAGE 2 (UPPER STAGE GROUP)
    // -------------------------------------------------------------------------
    const s2Group = new THREE.Group();
    stage2GroupRef.current = s2Group;
    s2Group.position.y = interHeight;
    masterRocket.add(s2Group);

    const s2TankHeight = 4.2;
    const s2TankGeo = new THREE.CylinderGeometry(r, r, s2TankHeight, 48);
    const s2TankMesh = new THREE.Mesh(s2TankGeo, whiteBodyMat);
    s2TankMesh.position.y = s2TankHeight / 2;
    s2TankMesh.castShadow = true;
    s2Group.add(s2TankMesh);

    // Vacuum Engine Bell inside interstage
    const s2Count = Math.max(1, result.stage2.engine_count);
    const s2EngineGroup = new THREE.Group();
    s2EngineGroup.position.set(0, 0.1, 0);
    s2Group.add(s2EngineGroup);

    for (let i = 0; i < s2Count; i++) {
      const vacNozzleGeo = new THREE.ConeGeometry(0.48, 1.2, 32, 1, true);
      const vacNozzleMesh = new THREE.Mesh(vacNozzleGeo, titaniumMat);
      vacNozzleMesh.position.set(
        s2Count > 1 ? (i - (s2Count - 1) / 2) * 0.7 : 0,
        -0.6,
        0
      );
      s2EngineGroup.add(vacNozzleMesh);
    }

    // -------------------------------------------------------------------------
    // 4. PAYLOAD SATELLITE GROUP
    // -------------------------------------------------------------------------
    const payloadGroup = new THREE.Group();
    payloadGroupRef.current = payloadGroup;
    payloadGroup.position.y = interHeight + s2TankHeight;
    masterRocket.add(payloadGroup);

    // Satellite Main Bus
    const satBusGeo = new THREE.BoxGeometry(r * 0.85, 1.4, r * 0.85);
    const satBusMesh = new THREE.Mesh(satBusGeo, goldFoilMat);
    satBusMesh.position.y = 1.0;
    payloadGroup.add(satBusMesh);

    // Satellite Solar Arrays (left and right wings)
    const solarWingGeo = new THREE.BoxGeometry(0.04, 1.1, 1.6);
    const leftWing = new THREE.Mesh(solarWingGeo, solarBlueMat);
    leftWing.position.set(-r * 0.65, 1.0, 0);
    payloadGroup.add(leftWing);

    const rightWing = new THREE.Mesh(solarWingGeo, solarBlueMat);
    rightWing.position.set(r * 0.65, 1.0, 0);
    payloadGroup.add(rightWing);

    // Dish Antenna
    const dishGeo = new THREE.SphereGeometry(0.35, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const dishMesh = new THREE.Mesh(dishGeo, titaniumMat);
    dishMesh.rotation.x = -Math.PI / 3;
    dishMesh.position.set(0, 1.9, 0);
    payloadGroup.add(dishMesh);

    // -------------------------------------------------------------------------
    // 5. SPLIT PAYLOAD FAIRING (BIVALVE NOSECONE & BARREL)
    // -------------------------------------------------------------------------
    const fairingHeight = 5.4;
    const fairingBarrelHeight = 2.0;
    const fairingOgiveHeight = fairingHeight - fairingBarrelHeight;
    const fairingBaseY = interHeight + s2TankHeight;
    const fairingRadius = r * 1.08; // Bulbous fairing slightly wider than core

    const fairingShellMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      metalness: 0.35,
      roughness: 0.3,
      wireframe: wireframeMode,
      side: THREE.DoubleSide
    });
    materialsRef.current.push(fairingShellMat);

    const acousticLiningMat = new THREE.MeshStandardMaterial({
      color: 0x334155, // Dark acoustic tile soundproofing
      metalness: 0.6,
      roughness: 0.8,
      wireframe: wireframeMode
    });
    materialsRef.current.push(acousticLiningMat);

    const noseCapMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b, // Amber aerodynamic ablation nose cap
      metalness: 0.85,
      roughness: 0.2,
      wireframe: wireframeMode
    });
    materialsRef.current.push(noseCapMat);

    // --- LEFT FAIRING CLAMSHELL HALF ---
    const fairingLeftGroup = new THREE.Group();
    fairingLeftRef.current = fairingLeftGroup;
    fairingLeftGroup.position.set(0, fairingBaseY, 0);
    masterRocket.add(fairingLeftGroup);

    // Left Barrel (Half Cylinder)
    const barrelGeoL = new THREE.CylinderGeometry(
      fairingRadius,
      fairingRadius,
      fairingBarrelHeight,
      32,
      1,
      true,
      Math.PI / 2,
      Math.PI
    );
    const barrelMeshL = new THREE.Mesh(barrelGeoL, fairingShellMat);
    barrelMeshL.position.y = fairingBarrelHeight / 2;
    fairingLeftGroup.add(barrelMeshL);

    // Left Ogive Nosecone (Half Cone)
    const coneGeoL = new THREE.ConeGeometry(
      fairingRadius,
      fairingOgiveHeight,
      32,
      1,
      true,
      Math.PI / 2,
      Math.PI
    );
    const coneMeshL = new THREE.Mesh(coneGeoL, fairingShellMat);
    coneMeshL.position.y = fairingBarrelHeight + fairingOgiveHeight / 2;
    fairingLeftGroup.add(coneMeshL);

    // Left Nosecap Tip
    const tipGeoL = new THREE.SphereGeometry(
      0.18,
      16,
      8,
      Math.PI / 2,
      Math.PI,
      0,
      Math.PI / 2
    );
    const tipMeshL = new THREE.Mesh(tipGeoL, noseCapMat);
    tipMeshL.position.y = fairingHeight;
    fairingLeftGroup.add(tipMeshL);

    // Left Acoustic Blanket Inner Layer
    const acousticGeoL = new THREE.CylinderGeometry(
      fairingRadius * 0.96,
      fairingRadius * 0.96,
      fairingBarrelHeight * 0.9,
      16,
      1,
      true,
      Math.PI / 2,
      Math.PI
    );
    const acousticMeshL = new THREE.Mesh(acousticGeoL, acousticLiningMat);
    acousticMeshL.position.y = fairingBarrelHeight / 2;
    fairingLeftGroup.add(acousticMeshL);

    // --- RIGHT FAIRING CLAMSHELL HALF ---
    const fairingRightGroup = new THREE.Group();
    fairingRightRef.current = fairingRightGroup;
    fairingRightGroup.position.set(0, fairingBaseY, 0);
    masterRocket.add(fairingRightGroup);

    // Right Barrel (Half Cylinder)
    const barrelGeoR = new THREE.CylinderGeometry(
      fairingRadius,
      fairingRadius,
      fairingBarrelHeight,
      32,
      1,
      true,
      -Math.PI / 2,
      Math.PI
    );
    const barrelMeshR = new THREE.Mesh(barrelGeoR, fairingShellMat);
    barrelMeshR.position.y = fairingBarrelHeight / 2;
    fairingRightGroup.add(barrelMeshR);

    // Right Ogive Nosecone (Half Cone)
    const coneGeoR = new THREE.ConeGeometry(
      fairingRadius,
      fairingOgiveHeight,
      32,
      1,
      true,
      -Math.PI / 2,
      Math.PI
    );
    const coneMeshR = new THREE.Mesh(coneGeoR, fairingShellMat);
    coneMeshR.position.y = fairingBarrelHeight + fairingOgiveHeight / 2;
    fairingRightGroup.add(coneMeshR);

    // Right Nosecap Tip
    const tipGeoR = new THREE.SphereGeometry(
      0.18,
      16,
      8,
      -Math.PI / 2,
      Math.PI,
      0,
      Math.PI / 2
    );
    const tipMeshR = new THREE.Mesh(tipGeoR, noseCapMat);
    tipMeshR.position.y = fairingHeight;
    fairingRightGroup.add(tipMeshR);

    // Right Acoustic Blanket Inner Layer
    const acousticGeoR = new THREE.CylinderGeometry(
      fairingRadius * 0.96,
      fairingRadius * 0.96,
      fairingBarrelHeight * 0.9,
      16,
      1,
      true,
      -Math.PI / 2,
      Math.PI
    );
    const acousticMeshR = new THREE.Mesh(acousticGeoR, acousticLiningMat);
    acousticMeshR.position.y = fairingBarrelHeight / 2;
    fairingRightGroup.add(acousticMeshR);
  }, [result, wireframeMode]);

  // Update wireframe mode
  useEffect(() => {
    materialsRef.current.forEach((mat) => {
      mat.wireframe = wireframeMode;
    });
  }, [wireframeMode]);

  // Update engine plumes visibility
  useEffect(() => {
    if (enginePlumesRef.current) {
      enginePlumesRef.current.visible = showFlames;
    }
  }, [showFlames]);

  // Handle Camera Presets
  const setCameraPreset = (preset: 'full' | 'engines' | 'stage2' | 'fairing') => {
    setCameraView(preset);
    switch (preset) {
      case 'full':
        targetCameraPos.current.set(0, 2, 28);
        targetCameraLookAt.current.set(0, 0, 0);
        break;
      case 'engines':
        targetCameraPos.current.set(0, -9.5, 9);
        targetCameraLookAt.current.set(0, -11, 0);
        break;
      case 'stage2':
        targetCameraPos.current.set(0, 4.5, 12);
        targetCameraLookAt.current.set(0, 3.5, 0);
        break;
      case 'fairing':
        targetCameraPos.current.set(0, 9.5, 10);
        targetCameraLookAt.current.set(0, 8.5, 0);
        break;
    }
  };

  return (
    <div className="relative w-full h-[620px] bg-slate-950 border border-slate-800 rounded-xl overflow-hidden select-none">
      {/* 3D WebGL Canvas Mounting Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top Telemetry Overlay Ribbon */}
      <div className="absolute top-3 left-4 right-4 flex items-center justify-between pointer-events-none">
        <div className="bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-2 pointer-events-auto">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-semibold text-white">Interactive 3D Rocket Model</span>
          <span className="text-slate-500 font-mono text-[10px]">·</span>
          <span className="text-[11px] font-mono text-cyan-300">
            {result.stage1.engine_count}x Booster Engines · {result.stage2.engine_count}x Vac
          </span>
        </div>

        <div className="flex items-center gap-1.5 pointer-events-auto">
          <button
            onClick={() => setShowFairingDetails(!showFairingDetails)}
            className={`px-2.5 py-1 text-xs font-mono rounded-md border transition-colors ${
              showFairingDetails
                ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Fairing HUD: {showFairingDetails ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`px-2.5 py-1 text-xs font-mono rounded-md border transition-colors ${
              autoRotate
                ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Auto-Rotate: {autoRotate ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => setWireframeMode(!wireframeMode)}
            className={`px-2.5 py-1 text-xs font-mono rounded-md border transition-colors ${
              wireframeMode
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            X-Ray Wireframe
          </button>
        </div>
      </div>

      {/* Floating Fairing Telemetry HUD */}
      {showFairingDetails && result.fairing && (
        <div className="absolute top-14 right-4 w-72 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-3.5 shadow-2xl pointer-events-auto z-10">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-semibold text-white">Payload Fairing Architecture</span>
            </div>
            <button
              onClick={() => setShowFairingDetails(false)}
              className="text-[10px] font-mono text-slate-400 hover:text-slate-200"
            >
              ✕
            </button>
          </div>
          <div className="space-y-1.5 text-[11px] font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">Structure:</span>
              <span className="text-slate-200">Carbon Sandwich Clamshell</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Dry Mass:</span>
              <span className="text-amber-300 font-semibold">{result.fairing.mass_kg.toLocaleString()} kg</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Dimensions (H × Ø):</span>
              <span className="text-slate-200">{result.fairing.height_m.toFixed(1)}m × {result.fairing.diameter_m.toFixed(1)}m</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Wetted Surface:</span>
              <span className="text-slate-200">{result.fairing.surface_area_m2.toFixed(1)} m²</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Forebody Wave Drag:</span>
              <span className="text-rose-400 font-semibold">{result.fairing.peak_drag_force_kN.toFixed(1)} kN</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Vehicle Drag Share:</span>
              <span className="text-cyan-300">~70% of Max-Q Drag</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Vacuum Jettison:</span>
              <span className="text-emerald-300 font-semibold">{result.fairing.jettison_altitude_km} km (t={result.fairing.jettison_time_s}s)</span>
            </div>
            <div className="flex justify-between border-t border-slate-800/80 pt-1.5 text-slate-300">
              <span className="text-slate-400">Stage 2 Δv Savings:</span>
              <span className="text-emerald-400 font-bold">+{result.fairing.delta_v_gain_m_s} m/s</span>
            </div>
          </div>
        </div>
      )}

      {/* Collapsible Unified Bottom Control Dock */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[92%] max-w-2xl bg-slate-900/95 border border-slate-800 rounded-xl p-3.5 shadow-2xl transition-all">
        {/* Toggle Collapse Edge */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-2.5">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            Exploded View & Camera Stage Inspector
          </span>
          <button
            onClick={() => setIsControlsExpanded(!isControlsExpanded)}
            className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
          >
            {isControlsExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </button>
        </div>

        {isControlsExpanded && (
          <div className="space-y-3">
            {/* Exploded View Separation Slider */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium">Stage Separation / Exploded View:</span>
                <span className="font-mono text-cyan-300 font-semibold">
                  {Math.round(explodedRatio * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={explodedRatio}
                onChange={(e) => setExplodedRatio(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1">
                <span>0% (Assembled Vehicle)</span>
                <span>50% (Stage Jettison)</span>
                <span>100% (Full Component Breakdown)</span>
              </div>
            </div>

            {/* Quick Camera Views & Toggles */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
              <div className="flex items-center gap-1 text-xs">
                <span className="text-[10px] text-slate-400 uppercase font-mono mr-1">Views:</span>
                {[
                  { id: 'full', label: 'Full Rocket' },
                  { id: 'engines', label: 'Booster Cluster' },
                  { id: 'stage2', label: 'Stage 2 & Bus' },
                  { id: 'fairing', label: 'Nose Fairing' }
                ].map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => setCameraPreset(preset.id as any)}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                      cameraView === preset.id
                        ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm'
                        : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFairingJettisoned(!fairingJettisoned)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${
                    fairingJettisoned
                      ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white'
                  }`}
                  title={fairingJettisoned ? "Click to Re-attach Clamshell Fairing" : "Click to Jettison Clamshell Fairing"}
                >
                  <Shield className="w-3 h-3 text-amber-400" />
                  <span>{fairingJettisoned ? 'Fairing Jettisoned' : 'Jettison Fairing'}</span>
                </button>

                <button
                  onClick={() => setShowFlames(!showFlames)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${
                    showFlames
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <Flame className="w-3 h-3" />
                  <span>Plumes</span>
                </button>

                <button
                  onClick={() => setCameraPreset('full')}
                  className="p-1 text-slate-400 hover:text-white rounded bg-slate-950 border border-slate-800"
                  title="Reset Camera"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
