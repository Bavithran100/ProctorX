import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { animate } from "animejs";

/**
 * Three.js InstancedMesh Background with Anime.js Harmonic Wave Dynamics
 * Features:
 * - Full-viewport 3D instanced matrix with Anime.js harmonic wave driver
 * - Dynamic height-based color luminescence (deep slate -> glowing indigo/emerald)
 * - Interactive mouse cursor perturbation with dynamic point light tracking
 * - Scroll-reactive camera perspective sway
 * - Clamped DPR & single draw-call WebGL for buttery 60fps
 */
export default function InstancedMeshBackground({
  fullscreen = true,
  opacity = 0.88,
  className = ""
}) {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Viewport dimensions
    let width = fullscreen ? window.innerWidth : (container.clientWidth || window.innerWidth);
    let height = fullscreen ? window.innerHeight : (container.clientHeight || window.innerHeight);

    // Scene setup with soft cinematic fog
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x07090e, 0.016);

    const camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 120);
    camera.position.set(0, 16, 26);
    camera.lookAt(0, -1, 0);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // Dynamic Lighting
    const ambientLight = new THREE.AmbientLight(0x1e293b, 2.4);
    scene.add(ambientLight);

    const dirLightKey = new THREE.DirectionalLight(0x818cf8, 3.8); // High-visibility Indigo Key
    dirLightKey.position.set(15, 28, 18);
    scene.add(dirLightKey);

    const dirLightFill = new THREE.DirectionalLight(0x10b981, 2.2); // Vibrant Emerald Fill
    dirLightFill.position.set(-20, 18, -12);
    scene.add(dirLightFill);

    const mousePointLight = new THREE.PointLight(0xa78bfa, 6.0, 32); // Interactive mouse specular light
    mousePointLight.position.set(0, 6, 4);
    scene.add(mousePointLight);

    // InstancedMesh Grid: 34 x 34 = 1,156 pillars
    const gridX = 34;
    const gridZ = 34;
    const count = gridX * gridZ;
    const spacing = 1.15;
    const halfX = (gridX * spacing) / 2;
    const halfZ = (gridZ * spacing) / 2;

    const geometry = new THREE.BoxGeometry(0.62, 3.2, 0.62);
    // Base material MUST be white so instanced colors shine with full vibrance
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.22,
      metalness: 0.82,
    });

    const instancedMesh = new THREE.InstancedMesh(geometry, material, count);
    instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(instancedMesh);

    // Matrix and color helper objects
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    const instancesData = [];
    let idx = 0;
    for (let i = 0; i < gridX; i++) {
      for (let j = 0; j < gridZ; j++) {
        const posX = i * spacing - halfX;
        const posZ = j * spacing - halfZ;
        const distFromCenter = Math.sqrt(posX * posX + posZ * posZ);

        instancesData.push({
          idx,
          i,
          j,
          baseX: posX,
          baseZ: posZ,
          dist: distFromCenter,
        });

        dummy.position.set(posX, 0, posZ);
        dummy.updateMatrix();
        instancedMesh.setMatrixAt(idx, dummy.matrix);

        // Initial color distribution
        const t = Math.min(1, distFromCenter / 18);
        color.setHSL(0.68 - t * 0.12, 0.7, 0.32 + (1 - t) * 0.22);
        instancedMesh.setColorAt(idx, color);

        idx++;
      }
    }
    instancedMesh.instanceMatrix.needsUpdate = true;
    if (instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true;

    // Mouse Tracking
    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    const handleMouseMove = (e) => {
      mouse.targetX = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.targetY = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    // Scroll Tracking
    let scrollY = 0;
    let targetScrollY = 0;
    const handleScroll = () => {
      targetScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    // Anime.js Wave Driver
    const waveState = { progress: 0 };
    let animeWave;
    try {
      animeWave = animate(waveState, {
        progress: Math.PI * 4,
        duration: 10000,
        ease: "linear",
        loop: true,
      });
    } catch {
      // Fallback
    }

    // Animation Render Loop
    let animationFrameId;
    let clock = 0;

    const render = () => {
      animationFrameId = requestAnimationFrame(render);
      clock += 0.016;

      // Smooth mouse lerp
      mouse.x += (mouse.targetX - mouse.x) * 0.06;
      mouse.y += (mouse.targetY - mouse.y) * 0.06;

      // Smooth scroll lerp
      scrollY += (targetScrollY - scrollY) * 0.08;
      const scrollOffset = scrollY * 0.003;

      // Dynamic Camera Perspective
      camera.position.x = mouse.x * 3.5;
      camera.position.y = 16 + mouse.y * 2.0 - Math.min(3, scrollOffset * 0.5);
      camera.lookAt(0, -1 - Math.min(2, scrollOffset), 0);

      // Move specular point light to track mouse
      mousePointLight.position.x = mouse.x * 16;
      mousePointLight.position.z = -mouse.y * 16;
      mousePointLight.position.y = 5.5 + Math.sin(clock * 2) * 1.0;

      const waveProgress = waveState.progress;

      for (let k = 0; k < count; k++) {
        const item = instancesData[k];

        // Harmonic multi-frequency waves
        const wave1 = Math.sin(item.baseX * 0.32 + clock * 2.0);
        const wave2 = Math.cos(item.baseZ * 0.32 + clock * 1.6);
        const radial = Math.sin(item.dist * 0.38 - waveProgress * 0.9);

        // Distance from mouse projection in world space
        const mouseWorldX = mouse.x * 14;
        const mouseWorldZ = -mouse.y * 14;
        const distToMouse = Math.sqrt(
          (item.baseX - mouseWorldX) ** 2 + (item.baseZ - mouseWorldZ) ** 2
        );
        const mouseLift = Math.max(0, 3.2 - distToMouse * 0.55);

        // Combined vertical displacement
        const elevation = (wave1 + wave2 + radial * 1.35) * 0.55 + mouseLift;

        dummy.position.set(item.baseX, elevation, item.baseZ);

        // Dynamic scale height
        const heightScale = Math.max(0.35, 1 + elevation * 0.7);
        dummy.scale.set(1, heightScale, 1);

        // Subtle dynamic tilting
        dummy.rotation.x = Math.sin(clock + item.baseX * 0.5) * 0.06;
        dummy.rotation.z = Math.cos(clock + item.baseZ * 0.5) * 0.06;

        dummy.updateMatrix();
        instancedMesh.setMatrixAt(k, dummy.matrix);

        // Dynamic Color Luminescence based on wave height & mouse interaction
        const heightNorm = Math.min(1, Math.max(0, (elevation + 1.2) / 3.4));
        const hue = 0.68 - heightNorm * 0.22; // Transitions from Deep Indigo (0.68) to Emerald/Cyan (0.46)
        const sat = 0.75 + heightNorm * 0.2;
        const lightness = 0.26 + heightNorm * 0.42; // Crests light up brightly at ~0.68 lightness!

        color.setHSL(hue, sat, lightness);
        instancedMesh.setColorAt(k, color);
      }

      instancedMesh.instanceMatrix.needsUpdate = true;
      if (instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true;

      renderer.render(scene, camera);
    };

    render();

    // Window Resize Handler
    const handleResize = () => {
      const w = fullscreen ? window.innerWidth : (container.clientWidth || window.innerWidth);
      const h = fullscreen ? window.innerHeight : (container.clientHeight || window.innerHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
      if (animeWave && animeWave.pause) animeWave.pause();

      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [fullscreen]);

  return (
    <div
      ref={mountRef}
      className={`instanced-mesh-background ${className}`}
      style={{
        position: fullscreen ? "fixed" : "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 0,
        opacity: opacity,
        transition: "opacity 0.4s ease",
      }}
      aria-hidden="true"
    />
  );
}
