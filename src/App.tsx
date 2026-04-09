import React, { useState, useRef, useEffect } from 'react';
import { useHandTracking } from './hooks/useHandTracking';
import { HandOverlay } from './components/HandOverlay';
import { ThreeScene } from './components/ThreeScene';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, 
  MousePointer2, 
  Pencil, 
  Circle, 
  Globe, 
  ArrowLeft, 
  Trash2, 
  Loader2,
  ShieldCheck
} from 'lucide-react';

// --- APP TYPES ---
type AppMode = 'home' | 'connections' | 'writing' | 'planets' | 'lightsaber';

export interface SensitivitySettings {
  pinchThreshold: number;
  zoomSensitivity: number;
  trackingConfidence: number;
  strokeThickness: number;
  selectedColor: string;
  globeMode: 'hand' | 'auto';
  planetId: string;
}

export default function App() {
  // --- STATE ---
  const [mode, setMode] = useState<AppMode>('home');
  const [hasStarted, setHasStarted] = useState(false);
  const [settings, setSettings] = useState<SensitivitySettings>({
    pinchThreshold: 0.05,
    zoomSensitivity: 1.0,
    trackingConfidence: 0.5,
    strokeThickness: 8,
    selectedColor: '#bc13fe', // Neon Purple default
    globeMode: 'hand',
    planetId: 'earth'
  });
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Custom hook for AI Hand Tracking (MediaPipe)
  const { results, isLoading, error } = useHandTracking(hasStarted ? videoRef.current : null);

  // --- HANDLERS ---
  const startFeature = (newMode: AppMode) => {
    setMode(newMode);
    setHasStarted(true);
  };

  const goBack = () => {
    setMode('home');
  };

  const updateSetting = (key: keyof SensitivitySettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="relative w-full h-screen bg-[#f5f1e6] overflow-hidden font-sans text-[#2d1e17]">
      
      {/* 1. HOME SCREEN */}
      <AnimatePresence>
        {mode === 'home' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] flex flex-col items-center justify-center p-6 text-center bg-[#f5f1e6]"
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="max-w-5xl w-full"
            >
              <h1 className="text-7xl md:text-9xl font-black tracking-tighter mb-2 text-[#6b8f71]">
                HANDSCAPE
              </h1>
              <p className="text-[#8b5e3c] font-mono tracking-[0.4em] uppercase text-sm mb-16">
                AR Hand Studio
              </p>

              {/* Feature Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-8 max-w-3xl mx-auto">
                <FeatureButton 
                  title="Hand Connections" 
                  icon={<MousePointer2 />} 
                  onClick={() => startFeature('connections')}
                  color="bg-[#6b8f71]/10 border-[#6b8f71]/20"
                  textColor="text-[#6b8f71]"
                />
                <FeatureButton 
                  title="Air Writing" 
                  icon={<Pencil />} 
                  onClick={() => startFeature('writing')}
                  color="bg-[#8b5e3c]/10 border-[#8b5e3c]/20"
                  textColor="text-[#8b5e3c]"
                />
                <FeatureButton 
                  title="Planet System" 
                  icon={<Globe />} 
                  onClick={() => startFeature('planets')}
                  color="bg-[#2d1e17]/5 border-[#2d1e17]/10"
                  textColor="text-[#2d1e17]"
                />
                <FeatureButton 
                  title="Lightsaber" 
                  icon={<ShieldCheck />} 
                  onClick={() => startFeature('lightsaber')}
                  color="bg-[#a44a3f]/10 border-[#a44a3f]/20"
                  textColor="text-[#a44a3f]"
                />
              </div>

              <div className="mt-16 flex items-center justify-center gap-4 text-[#2d1e17]/20 text-xs uppercase tracking-widest">
                <ShieldCheck size={14} />
                Natural AR Interaction Studio
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. AR VIEWPORT (Video & Canvas) */}
      <div className={mode === 'home' ? 'hidden' : 'block'}>
        {/* Back Button */}
        <button
          onClick={goBack}
          className="absolute top-8 left-8 z-[110] flex items-center gap-2 bg-[#f5f1e6]/80 backdrop-blur-xl border border-[#2d1e17]/10 px-5 py-2.5 rounded-full hover:bg-white transition-all group shadow-sm"
        >
          <ArrowLeft size={18} className="text-[#2d1e17] group-hover:-translate-x-1 transition-transform" />
          <span className="font-bold text-sm uppercase tracking-wider text-[#2d1e17]">Back to Studio</span>
        </button>

        {/* Per-Mode Settings Panel */}
        {mode !== 'home' && (
          <div className="absolute top-8 right-8 z-[110]">
            <SettingsPanel mode={mode} settings={settings} updateSetting={updateSetting} />
          </div>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="absolute inset-0 z-[105] flex flex-col items-center justify-center bg-[#f5f1e6]/90 backdrop-blur-md">
            <Loader2 className="animate-spin text-[#6b8f71] mb-6" size={64} />
            <h2 className="text-2xl font-bold tracking-tighter mb-2 text-[#2d1e17]">Starting camera...</h2>
            <p className="text-[#8b5e3c] font-mono text-xs uppercase tracking-[0.3em]">Initializing Handscape AI</p>
          </div>
        )}

        {/* The Webcam Feed */}
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover scale-x-[-1] brightness-[0.9] contrast-[1.1]"
          playsInline
          muted
          autoPlay
        />

        {/* 3D Layer (Planets, Lightsabers) */}
        <ThreeScene 
          results={results} 
          mode={mode === 'home' ? 'connections' : (mode as any)} 
          color={settings.selectedColor} 
          settings={settings}
        />

        {/* 2D Layer (Connections & Writing) */}
        <HandOverlay 
          results={results} 
          mode={mode === 'home' ? 'connections' : (mode as any)} 
          color={settings.selectedColor}
          settings={settings}
        />
      </div>

      {/* Error Handling */}
      {error && (
        <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/90 p-8">
          <div className="bg-red-500/10 border border-red-500/50 p-8 rounded-3xl max-w-md text-center">
            <h2 className="text-2xl font-bold text-red-400 mb-4 tracking-tight">Camera Access Required</h2>
            <p className="text-white/50 text-sm mb-8 leading-relaxed">
              To use Handscape, please allow camera permissions in your browser. This app runs entirely in your local sandbox.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-red-500 text-white rounded-full font-bold hover:bg-red-600 transition-colors"
            >
              Retry Connection
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- SUB-COMPONENTS ---

function FeatureButton({ title, icon, onClick, color, textColor }: { title: string, icon: React.ReactNode, onClick: () => void, color: string, textColor: string }) {
  return (
    <button
      onClick={onClick}
      className={`group relative flex flex-col items-center justify-center p-12 rounded-[3rem] ${color} border transition-all duration-500 hover:scale-[1.02] active:scale-95 overflow-hidden shadow-sm hover:shadow-md`}
    >
      <div className={`mb-6 p-6 rounded-3xl bg-white/40 group-hover:bg-white/60 transition-colors ${textColor}`}>
        {React.cloneElement(icon as React.ReactElement, { size: 48 })}
      </div>
      <h3 className={`text-2xl font-bold tracking-tight ${textColor}`}>{title}</h3>
      
      {/* Decorative Glow */}
      <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all" />
    </button>
  );
}

function SettingsPanel({ mode, settings, updateSetting }: { mode: AppMode, settings: SensitivitySettings, updateSetting: (key: keyof SensitivitySettings, value: any) => void }) {
  const neonColors = ['#bc13fe', '#00f0ff', '#faff00', '#ff073a'];
  const planets = [
    { id: 'earth', name: 'Earth' },
    { id: 'moon', name: 'Moon' },
    { id: 'mars', name: 'Mars' },
    { id: 'saturn', name: 'Saturn' },
    { id: 'jupiter', name: 'Jupiter' },
    { id: 'neon', name: 'Neon X' }
  ];

  return (
    <motion.div 
      initial={{ x: 50, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="bg-[#f5f1e6]/90 backdrop-blur-xl border border-[#2d1e17]/10 p-6 rounded-[2rem] shadow-xl w-64 flex flex-col gap-6"
    >
      <h3 className="font-bold text-xs uppercase tracking-[0.2em] text-[#8b5e3c]">
        {mode.replace('_', ' ')} Settings
      </h3>

      {/* Color Picker (for most modes) */}
      {(mode === 'connections' || mode === 'writing' || mode === 'lightsaber') && (
        <div className="space-y-2">
          <label className="text-[10px] uppercase font-bold text-[#2d1e17]/40 block">Energy Color</label>
          <div className="flex flex-wrap gap-2">
            {[...neonColors, ...(mode === 'writing' ? ['#ffffff'] : [])].map(c => (
              <button 
                key={c}
                onClick={() => updateSetting('selectedColor', c)}
                className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${settings.selectedColor === c ? 'border-[#2d1e17]' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Thickness Slider (for writing) */}
      {mode === 'writing' && (
        <div className="space-y-2">
          <label className="text-[10px] uppercase font-bold text-[#2d1e17]/40 block">Stroke Width</label>
          <input 
            type="range" min="2" max="30" 
            value={settings.strokeThickness} 
            onChange={(e) => updateSetting('strokeThickness', parseInt(e.target.value))}
            className="w-full accent-[#6b8f71]"
          />
        </div>
      )}

      {/* Planet Selection (for planets mode) */}
      {mode === 'planets' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-[#2d1e17]/40 block">Select Planet</label>
            <div className="grid grid-cols-2 gap-2">
              {planets.map(p => (
                <button
                  key={p.id}
                  onClick={() => updateSetting('planetId', p.id)}
                  className={`py-2 px-3 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border ${settings.planetId === p.id ? 'bg-[#6b8f71] text-white border-[#6b8f71]' : 'bg-white/50 text-[#2d1e17]/60 border-transparent hover:border-[#2d1e17]/10'}`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-[10px] uppercase font-bold text-[#2d1e17]/40">Auto Rotate</label>
            <button
              onClick={() => updateSetting('globeMode', settings.globeMode === 'hand' ? 'auto' : 'hand')}
              className={`w-10 h-5 rounded-full relative transition-colors ${settings.globeMode === 'auto' ? 'bg-[#6b8f71]' : 'bg-[#2d1e17]/20'}`}
            >
              <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${settings.globeMode === 'auto' ? 'left-6' : 'left-1'}`} />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
