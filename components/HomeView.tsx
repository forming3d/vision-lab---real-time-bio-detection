
import React from 'react';
import { Cpu, Power, Fingerprint } from 'lucide-react';

interface HomeViewProps {
  onStart: () => void;
}

const HomeView: React.FC<HomeViewProps> = ({ onStart }) => {
  return (
    <div className="h-full flex flex-col items-center justify-between p-8 md:p-12 text-center relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-64 h-64 md:w-96 md:h-96 bg-indigo-600/20 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 md:w-96 md:h-96 bg-emerald-600/10 rounded-full blur-[100px]" />

      <div className="mt-8 md:mt-20 z-10">
        <div className="w-16 h-16 md:w-24 md:h-24 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 md:mb-8 shadow-[0_0_30px_rgba(79,70,229,0.5)]">
          <Fingerprint className="w-8 h-8 md:w-12 md:h-12 text-white" />
        </div>
        <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-white mb-2">
          BIO-SCAN <span className="text-indigo-500">LABS</span>
        </h1>
        <p className="text-slate-400 text-xs md:text-sm font-medium uppercase tracking-[0.3em]">
          Identidad Biométrica V2
        </p>
      </div>

      <div className="space-y-4 md:space-y-6 z-10 w-full px-4">
        <div className="glass-panel p-4 md:p-6 rounded-2xl md:rounded-3xl border-indigo-500/20">
          <p className="text-[10px] md:text-xs text-slate-300 leading-relaxed italic">
            "Sincronización de malla facial y segmentación capilar en tiempo real para validación de hardware externo."
          </p>
        </div>
        
        <button 
          onClick={onStart}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 md:py-6 rounded-2xl md:rounded-3xl font-black text-sm md:text-lg tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3 md:gap-4 shadow-2xl shadow-indigo-600/30 group"
        >
          <Power className="w-5 h-5 md:w-6 md:h-6 group-hover:rotate-12 transition-transform" />
          INICIAR PROCESO
        </button>
      </div>

      <div className="mb-6 md:mb-8 z-10">
        <p className="text-[9px] md:text-[10px] text-slate-600 font-bold uppercase tracking-widest">
          SISTEMA OPERATIVO : VISION_OS 4.0
        </p>
      </div>
    </div>
  );
};

export default HomeView;
