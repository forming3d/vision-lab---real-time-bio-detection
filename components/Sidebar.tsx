
import React from 'react';
import { DetectionMode, VisionModelInfo } from '../types';
import { ScanFace, Layers, CheckCircle, AlertCircle, Scissors } from 'lucide-react';

interface SidebarProps {
  selectedMode: DetectionMode;
  onModeChange: (mode: DetectionMode) => void;
}

const MODES: VisionModelInfo[] = [
  {
    id: DetectionMode.FACE_LANDMARKS,
    name: 'Face Landmarker',
    description: '478-point 3D landmarking. Real-time high-fidelity tracking for facial geometry and biometric analysis.',
    pros: ['Ultra-low latency', 'Full 3D mesh', 'Blendshape support'],
    cons: ['Limited to face area', 'Sensitive to occlusions']
  },
  {
    id: DetectionMode.SELFIE_SEGMENTATION,
    name: 'Selfie Segmenter',
    description: 'Neural background removal. Accurately separates the subject from the background using pixel-wise masks.',
    pros: ['Clean edge detection', 'Dynamic background support', 'WASM accelerated'],
    cons: ['High GPU utilization', 'Fixed category (person)']
  },
  {
    id: DetectionMode.HAIR_SEGMENTATION,
    name: 'Hair Segmenter',
    description: 'Specialized neural mask for hair structures. Detects hair boundaries for virtual try-on or style analysis.',
    pros: ['Precise hair bounds', 'Complex texture support', 'Isolated masking'],
    cons: ['Light sensitive', 'Model size']
  }
];

const Sidebar: React.FC<SidebarProps> = ({ selectedMode, onModeChange }) => {
  return (
    <aside className="w-80 border-r border-slate-800 bg-slate-950/40 overflow-y-auto hidden lg:flex flex-col p-8 space-y-8">
      <div>
        <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6">Vision Engines</h2>
        
        <div className="space-y-4">
          {MODES.map((mode) => (
            <button
              key={mode.id}
              onClick={() => onModeChange(mode.id)}
              className={`w-full text-left p-5 rounded-[1.5rem] transition-all border group relative overflow-hidden ${
                selectedMode === mode.id 
                  ? 'bg-indigo-600/10 border-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.1)]' 
                  : 'bg-slate-900/20 border-slate-800/50 hover:border-slate-700'
              }`}
            >
              {selectedMode === mode.id && (
                <div className="absolute top-0 right-0 p-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                </div>
              )}

              <div className="flex items-center gap-4 mb-4">
                <div className={`p-2.5 rounded-xl transition-colors ${selectedMode === mode.id ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-500 group-hover:text-slate-300'}`}>
                  {mode.id === DetectionMode.FACE_LANDMARKS ? <ScanFace className="w-5 h-5" /> : 
                   mode.id === DetectionMode.HAIR_SEGMENTATION ? <Scissors className="w-5 h-5" /> :
                   <Layers className="w-5 h-5" />}
                </div>
                <h3 className={`font-black text-sm tracking-tight ${selectedMode === mode.id ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
                  {mode.name}
                </h3>
              </div>
              
              <p className="text-xs text-slate-500 leading-relaxed mb-5 font-medium">
                {mode.description}
              </p>

              <div className="space-y-3">
                <div className="space-y-2">
                  {mode.pros.map(pro => (
                    <div key={pro} className="flex items-center gap-2 text-[10px] font-bold text-emerald-400/80">
                      <CheckCircle className="w-3 h-3 stroke-[3]" />
                      <span>{pro}</span>
                    </div>
                  ))}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-auto p-5 bg-indigo-600/5 border border-indigo-500/10 rounded-2xl">
        <p className="text-[10px] text-indigo-300/60 font-bold leading-relaxed italic text-center">
          On-device biometric processing.<br/>Privacy-first architecture.
        </p>
      </div>
    </aside>
  );
};

export default Sidebar;
