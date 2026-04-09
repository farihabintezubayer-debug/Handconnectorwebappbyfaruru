import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Results } from '@mediapipe/hands';
import { SensitivitySettings } from '@/App';
import { motion } from 'motion/react';

interface ThreeSceneProps {
  results: Results | null;
  mode: 'connections' | 'writing' | 'planets' | 'lightsaber';
  color: string;
  settings: SensitivitySettings;
}

export const ThreeScene: React.FC<ThreeSceneProps> = ({ results, mode, color, settings }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    planetGroup?: THREE.Group;
    lightsaber?: THREE.Group;
    saberBlade?: THREE.Mesh;
    saberGlow?: THREE.Mesh;
    saberEnergy?: THREE.Points;
    saberGrowth: number;
  } | null>(null);

  const [currentPlanetId, setCurrentPlanetId] = useState<string>('earth');

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    camera.position.z = 5;

    // --- PLANET SYSTEM ---
    const planetGroup = new THREE.Group();
    planetGroup.visible = false;
    scene.add(planetGroup);

    const createPlanet = (id: string) => {
      // Clear existing planet
      while(planetGroup.children.length > 0) {
        const child = planetGroup.children[0];
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          (child.material as THREE.Material).dispose();
        }
        planetGroup.remove(child);
      }

      const geo = new THREE.SphereGeometry(1, 32, 32);
      let mat: THREE.Material;

      switch(id) {
        case 'moon':
          mat = new THREE.MeshPhongMaterial({ color: 0xaaaaaa, flatShading: true });
          break;
        case 'mars':
          mat = new THREE.MeshPhongMaterial({ color: 0xa44a3f, flatShading: true });
          break;
        case 'saturn':
          mat = new THREE.MeshPhongMaterial({ color: 0xe3bb76, flatShading: true });
          const ringGeo = new THREE.RingGeometry(1.2, 2, 64);
          const ringMat = new THREE.MeshBasicMaterial({ color: 0xe3bb76, side: THREE.DoubleSide, transparent: true, opacity: 0.5 });
          const ring = new THREE.Mesh(ringGeo, ringMat);
          ring.rotation.x = Math.PI / 2;
          planetGroup.add(ring);
          break;
        case 'jupiter':
          mat = new THREE.MeshPhongMaterial({ color: 0xd39c7e, flatShading: true });
          break;
        case 'neon':
          mat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, wireframe: true });
          break;
        default: // earth
          mat = new THREE.MeshPhongMaterial({ color: 0x6b8f71, flatShading: true });
          const ocean = new THREE.Mesh(new THREE.SphereGeometry(0.98, 32, 32), new THREE.MeshPhongMaterial({ color: 0x4a6fa5, transparent: true, opacity: 0.6 }));
          planetGroup.add(ocean);
      }

      const planet = new THREE.Mesh(geo, mat);
      planetGroup.add(planet);
    };

    createPlanet('earth');

    // --- UPGRADED LIGHTSABER ---
    const saberGroup = new THREE.Group();
    const hiltGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.3, 16);
    const hiltMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
    const hilt = new THREE.Mesh(hiltGeo, hiltMat);
    saberGroup.add(hilt);

    const bladeGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.5, 16); // Longer blade
    const bladeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const saberBlade = new THREE.Mesh(bladeGeo, bladeMat);
    saberBlade.position.y = 1.4;
    saberBlade.scale.y = 0.001; // Start small for animation
    saberGroup.add(saberBlade);

    const glowGeo = new THREE.CylinderGeometry(0.1, 0.1, 2.6, 16);
    const glowMat = new THREE.MeshBasicMaterial({ 
      color: 0xbc13fe, 
      transparent: true, 
      opacity: 0.4 
    });
    const saberGlow = new THREE.Mesh(glowGeo, glowMat);
    saberGlow.position.y = 1.4;
    saberGlow.scale.y = 0.001;
    saberGroup.add(saberGlow);

    // Energy Particles around blade
    const energyCount = 500;
    const energyGeo = new THREE.BufferGeometry();
    const energyPos = new Float32Array(energyCount * 3);
    energyGeo.setAttribute('position', new THREE.BufferAttribute(energyPos, 3));
    const energyMat = new THREE.PointsMaterial({ size: 0.05, color: 0xbc13fe, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending });
    const saberEnergy = new THREE.Points(energyGeo, energyMat);
    saberGroup.add(saberEnergy);

    saberGroup.visible = false;
    scene.add(saberGroup);

    sceneRef.current = { 
      scene, camera, renderer, 
      planetGroup,
      lightsaber: saberGroup,
      saberBlade,
      saberGlow,
      saberEnergy,
      saberGrowth: 0
    };

    const animate = () => {
      requestAnimationFrame(animate);
      const state = sceneRef.current;
      if (!state) return;

      if (state.planetGroup?.visible) {
        if (settings.globeMode === 'auto') {
          state.planetGroup.rotation.y += 0.005;
        }
      }

      if (state.lightsaber?.visible) {
        // Growth animation
        if (state.saberGrowth < 1) {
          state.saberGrowth += 0.05;
          state.saberBlade!.scale.y = state.saberGrowth;
          state.saberGlow!.scale.y = state.saberGrowth;
          state.saberBlade!.position.y = 0.15 + (state.saberGrowth * 1.25);
          state.saberGlow!.position.y = 0.15 + (state.saberGrowth * 1.3);
        }

        // Energy animation
        const pos = state.saberEnergy!.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < energyCount; i++) {
          const h = Math.random() * 2.5 * state.saberGrowth;
          const r = 0.1 + Math.random() * 0.1;
          const a = Math.random() * Math.PI * 2;
          pos[i * 3] = Math.cos(a) * r;
          pos[i * 3 + 1] = 0.15 + h;
          pos[i * 3 + 2] = Math.sin(a) * r;
        }
        state.saberEnergy!.geometry.attributes.position.needsUpdate = true;
        
        state.saberGlow!.scale.x = 1 + Math.sin(Date.now() * 0.02) * 0.1;
        state.saberGlow!.scale.z = 1 + Math.sin(Date.now() * 0.02) * 0.1;
      } else {
        state.saberGrowth = 0;
      }

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    if (!sceneRef.current) return;
    const { planetGroup, lightsaber, saberGlow, saberEnergy } = sceneRef.current;

    planetGroup!.visible = mode === 'planets';
    lightsaber!.visible = mode === 'lightsaber';

    if (saberGlow && saberEnergy) {
      (saberGlow.material as THREE.MeshBasicMaterial).color.set(color);
      (saberEnergy.material as THREE.PointsMaterial).color.set(color);
    }
  }, [mode, color]);

  useEffect(() => {
    if (!sceneRef.current) return;
    // Re-create planet when planetId changes
    const state = sceneRef.current;
    
    const createPlanet = (id: string) => {
      const group = state.planetGroup!;
      while(group.children.length > 0) {
        const child = group.children[0];
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          (child.material as THREE.Material).dispose();
        }
        group.remove(child);
      }

      const geo = new THREE.SphereGeometry(1, 32, 32);
      let mat: THREE.Material;

      switch(id) {
        case 'moon':
          mat = new THREE.MeshPhongMaterial({ color: 0xaaaaaa, flatShading: true });
          break;
        case 'mars':
          mat = new THREE.MeshPhongMaterial({ color: 0xa44a3f, flatShading: true });
          break;
        case 'saturn':
          mat = new THREE.MeshPhongMaterial({ color: 0xe3bb76, flatShading: true });
          const ringGeo = new THREE.RingGeometry(1.2, 2.2, 64);
          const ringMat = new THREE.MeshBasicMaterial({ color: 0xe3bb76, side: THREE.DoubleSide, transparent: true, opacity: 0.4 });
          const ring = new THREE.Mesh(ringGeo, ringMat);
          ring.rotation.x = Math.PI / 2;
          group.add(ring);
          break;
        case 'jupiter':
          mat = new THREE.MeshPhongMaterial({ color: 0xd39c7e, flatShading: true });
          break;
        case 'neon':
          mat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, wireframe: true });
          break;
        default: // earth
          mat = new THREE.MeshPhongMaterial({ color: 0x6b8f71, flatShading: true });
          const ocean = new THREE.Mesh(new THREE.SphereGeometry(0.98, 32, 32), new THREE.MeshPhongMaterial({ color: 0x4a6fa5, transparent: true, opacity: 0.6 }));
          group.add(ocean);
      }

      const planet = new THREE.Mesh(geo, mat);
      group.add(planet);
    };

    createPlanet(settings.planetId);
  }, [settings.planetId]);

  const lastScaleRef = useRef(1);

  useEffect(() => {
    if (!results || !sceneRef.current) return;
    const { globe, portal, camera, creationSparks, lightsaber } = sceneRef.current;
    const globeGroup = globe.parent!;

    // --- LIGHTSABER LOGIC ---
    if (mode === 'lightsaber' && results.multiHandLandmarks.length > 0) {
      const hand = results.multiHandLandmarks[0];
      const wrist = hand[0];
      const middleMCP = hand[9];
      
      // Fist detection: distance from tips to palm center (9)
      const tips = [8, 12, 16, 20];
      const isFist = tips.every(idx => {
        const tip = hand[idx];
        const dist = Math.sqrt(Math.pow(tip.x - middleMCP.x, 2) + Math.pow(tip.y - middleMCP.y, 2));
        return dist < 0.08;
      });

      if (isFist) {
        lightsaber.visible = true;
        // Position at palm
        const posX = 1 - middleMCP.x;
        const posY = middleMCP.y;
        const vector = new THREE.Vector3((posX * 2) - 1, -(posY * 2) + 1, 0.5);
        vector.unproject(camera);
        const dir = vector.sub(camera.position).normalize();
        const distance = -camera.position.z / dir.z;
        lightsaber.position.copy(camera.position.clone().add(dir.multiplyScalar(distance)));

        // Orientation from wrist to middleMCP
        const up = new THREE.Vector3(1 - middleMCP.x - (1 - wrist.x), -(middleMCP.y - wrist.y), 0).normalize();
        lightsaber.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
      } else {
        lightsaber.visible = false;
      }
    }

    // --- GLOBE LOGIC ---
    if (mode === 'planets') {
      const planetGroup = sceneRef.current.planetGroup;
      if (!planetGroup) return;

      if (results.multiHandLandmarks.length >= 2) {
        const h1 = results.multiHandLandmarks[0][8];
        const h2 = results.multiHandLandmarks[1][8];
        const dist = Math.sqrt(Math.pow(h1.x - h2.x, 2) + Math.pow(h1.y - h2.y, 2));
        const targetScale = Math.max(0.2, dist * 5 * settings.zoomSensitivity);
        lastScaleRef.current += (targetScale - lastScaleRef.current) * 0.1;
        planetGroup.scale.set(lastScaleRef.current, lastScaleRef.current, lastScaleRef.current);

        const midX = 1 - (h1.x + h2.x) / 2;
        const midY = (h1.y + h2.y) / 2;
        const vector = new THREE.Vector3((midX * 2) - 1, -(midY * 2) + 1, 0.5);
        vector.unproject(camera);
        const dir = vector.sub(camera.position).normalize();
        const distance = -camera.position.z / dir.z;
        planetGroup.position.copy(camera.position.clone().add(dir.multiplyScalar(distance)));
      } else if (results.multiHandLandmarks.length === 1) {
        const hand = results.multiHandLandmarks[0];
        const thumb = hand[4];
        const index = hand[8];
        const wrist = hand[0];
        const dist = Math.sqrt(Math.pow(thumb.x - index.x, 2) + Math.pow(thumb.y - index.y, 2));
        const targetScale = Math.max(0.2, dist * 10 * settings.zoomSensitivity);
        lastScaleRef.current += (targetScale - lastScaleRef.current) * 0.1;
        planetGroup.scale.set(lastScaleRef.current, lastScaleRef.current, lastScaleRef.current);

        const posX = 1 - wrist.x;
        const posY = wrist.y;
        const vector = new THREE.Vector3((posX * 2) - 1, -(posY * 2) + 1, 0.5);
        vector.unproject(camera);
        const dir = vector.sub(camera.position).normalize();
        const distance = -camera.position.z / dir.z;
        planetGroup.position.copy(camera.position.clone().add(dir.multiplyScalar(distance)));
        
        // Rotate planet with hand movement
        if (settings.globeMode === 'hand') {
          planetGroup.rotation.y += (1 - index.x - 0.5) * 0.1;
          planetGroup.rotation.x += (index.y - 0.5) * 0.1;
        }
      }
    }
  }, [results, mode, settings]);

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none z-20" />
  );
};
