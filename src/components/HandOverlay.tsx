import React, { useEffect, useRef, useState } from 'react';
import { Results, HAND_CONNECTIONS } from '@mediapipe/hands';
import { SensitivitySettings } from '@/App';
import { Trash2 } from 'lucide-react';

interface HandOverlayProps {
  results: Results | null;
  mode: 'connections' | 'writing' | 'planets' | 'lightsaber';
  color: string;
  settings: SensitivitySettings;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size?: number;
}

interface Point {
  x: number;
  y: number;
  color: string;
}

const drawLightning = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, isPinching: boolean, color: string) => {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  
  if (isPinching) {
    ctx.lineWidth = 4;
    ctx.shadowBlur = 20;
    // Bezier curve for smoother connections
    const cp1x = x1 + (x2 - x1) * 0.25 + (Math.random() - 0.5) * 40;
    const cp1y = y1 + (y2 - y1) * 0.25 + (Math.random() - 0.5) * 40;
    const cp2x = x1 + (x2 - x1) * 0.75 + (Math.random() - 0.5) * 40;
    const cp2y = y1 + (y2 - y1) * 0.75 + (Math.random() - 0.5) * 40;
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2);
  } else {
    ctx.lineWidth = 1;
    ctx.shadowBlur = 5;
    ctx.lineTo(x2, y2);
  }
  
  ctx.stroke();
};

export const HandOverlay: React.FC<HandOverlayProps> = ({ results, mode, color, settings }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const trailParticlesRef = useRef<Particle[]>([]);
  const writingPointsRef = useRef<Point[]>([]);
  const lastPinchRef = useRef<{ [key: number]: boolean }>({});
  const lastIndexPosRef = useRef<{ x: number, y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      // 1. Setup Canvas
      ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Mirror the context to match the mirrored video
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);

      if (results) {
        results.multiHandLandmarks.forEach((landmarks, handIndex) => {
          const thumb = landmarks[4];
          const index = landmarks[8];
          const dist = Math.sqrt(
            Math.pow(thumb.x - index.x, 2) +
            Math.pow(thumb.y - index.y, 2)
          );

          const isPinching = dist < settings.pinchThreshold;
          const tips = [4, 8, 12, 16, 20];

          // --- HIGHLIGHT FINGERTIPS ---
          tips.forEach(tipIdx => {
            // Only show all tips in connections mode
            // In other modes, only show index tip (8)
            if (mode !== 'connections' && tipIdx !== 8) return;
            
            const tip = landmarks[tipIdx];
            const tx = tip.x * canvas.width;
            const ty = tip.y * canvas.height;

            // Glowing marker
            ctx.fillStyle = color;
            ctx.shadowColor = color;
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.arc(tx, ty, 6, 0, Math.PI * 2);
            ctx.fill();
            
            // Inner white core
            ctx.fillStyle = 'white';
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.arc(tx, ty, 2, 0, Math.PI * 2);
            ctx.fill();

            // Particle trail
            if (Math.random() > 0.7) {
              trailParticlesRef.current.push({
                x: tx, y: ty,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                life: 1.0,
                color: color,
                size: 2
              });
            }
          });

          // --- MODE: CONNECTIONS ---
          if (mode === 'connections') {
            ctx.lineCap = 'round';

            // Draw connections within the hand
            for (let i = 0; i < tips.length; i++) {
              for (let j = i + 1; j < tips.length; j++) {
                const p1 = landmarks[tips[i]];
                const p2 = landmarks[tips[j]];
                
                // Proximity based glow
                const d = Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
                const intensity = Math.max(0, 1 - d * 3);
                const connectionColor = isPinching ? color : `rgba(${parseInt(color.slice(1,3), 16)}, ${parseInt(color.slice(3,5), 16)}, ${parseInt(color.slice(5,7), 16)}, ${intensity})`;
                
                drawLightning(ctx, p1.x * canvas.width, p1.y * canvas.height, p2.x * canvas.width, p2.y * canvas.height, isPinching, color);
              }
            }

            // Draw connections between hands
            if (results.multiHandLandmarks.length === 2 && handIndex === 0) {
              const otherHand = results.multiHandLandmarks[1];
              tips.forEach(tipIndex => {
                const p1 = landmarks[tipIndex];
                const p2 = otherHand[tipIndex];
                drawLightning(ctx, p1.x * canvas.width, p1.y * canvas.height, p2.x * canvas.width, p2.y * canvas.height, isPinching, color);
              });
            }
          }

          // --- PINCH EXPLOSION ---
          if (mode === 'connections' && isPinching && !lastPinchRef.current[handIndex]) {
            const x = (thumb.x + index.x) / 2 * canvas.width;
            const y = (thumb.y + index.y) / 2 * canvas.height;
            for (let i = 0; i < 20; i++) {
              particlesRef.current.push({
                x, y,
                vx: (Math.random() - 0.5) * 15,
                vy: (Math.random() - 0.5) * 15,
                life: 1.0,
                color: color,
                size: 4
              });
            }
          }
          lastPinchRef.current[handIndex] = isPinching;

          // --- MODE: WRITING ---
          if (mode === 'writing') {
            const ix = index.x * canvas.width;
            const iy = index.y * canvas.height;

            if (isPinching) {
              // Smooth interpolation
              if (lastIndexPosRef.current) {
                const prev = lastIndexPosRef.current;
                const steps = 3;
                for (let s = 1; s <= steps; s++) {
                  writingPointsRef.current.push({
                    x: prev.x + (ix - prev.x) * (s / steps),
                    y: prev.y + (iy - prev.y) * (s / steps),
                    color: color,
                  });
                }
              } else {
                writingPointsRef.current.push({ x: ix, y: iy, color: color });
              }
              lastIndexPosRef.current = { x: ix, y: iy };
            } else {
              if (lastIndexPosRef.current) {
                writingPointsRef.current.push({ x: -1, y: -1, color: '' });
              }
              lastIndexPosRef.current = null;
            }
          }
        });
      }

      // --- DRAW PARTICLES & TRAILS ---
      [particlesRef, trailParticlesRef].forEach(ref => {
        ref.current = ref.current.filter(p => p.life > 0);
        ref.current.forEach(p => {
          p.x += p.vx; p.y += p.vy; p.life -= 0.03;
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.life;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size || 4, 0, Math.PI * 2);
          ctx.fill();
        });
      });
      ctx.globalAlpha = 1.0;

      // --- DRAW WRITING ---
      if (mode === 'writing' && writingPointsRef.current.length > 0) {
        ctx.lineWidth = settings.strokeThickness;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowBlur = 10;
        
        for (let i = 1; i < writingPointsRef.current.length; i++) {
          const p1 = writingPointsRef.current[i - 1];
          const p2 = writingPointsRef.current[i];
          
          if (p1.x !== -1 && p2.x !== -1) {
            ctx.strokeStyle = p2.color;
            ctx.shadowColor = p2.color;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [results, mode, color]);

  const clearWriting = () => {
    writingPointsRef.current = [];
  };

  return (
    <>
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-30" />
      {mode === 'writing' && (
        <button
          onClick={clearWriting}
          className="absolute bottom-12 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-8 py-3 rounded-full border border-white/20 transition-all font-bold uppercase tracking-widest text-xs"
        >
          <Trash2 size={16} />
          Clear Canvas
        </button>
      )}
    </>
  );
};
