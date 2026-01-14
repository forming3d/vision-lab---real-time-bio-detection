
import React from 'react';
import { CaptureData } from '../types';
import { Download, RefreshCw, CheckCircle2, ShieldCheck } from 'lucide-react';

interface ResultViewProps {
  data: CaptureData;
  onReset: () => void;
}

const ResultView: React.FC<ResultViewProps> = ({ data, onReset }) => {
  const download = () => {
    const link = document.createElement('a');
    link.download = `bio-pass-${Date.now()}.png`;
    link.href = data.headImage;
    link.click();
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 p-8 overflow-y-auto">
      <div className="mt-8 flex items-center gap-4 mb-6">
        <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/30">
          <ShieldCheck className="w-6 h-6 text-emerald-500" />
        </div>
        <div>
          <h2 className="text-xl font-black text-white uppercase tracking-tight italic">BIO-PASS <span className="text-indigo-500">GENERADO</span></h2>
          <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">
            ID: {data.timestamp} {data.appliedStyle ? `| FILTRO: ${data.appliedStyle}` : ''}
          </p>
        </div>
      </div>

      <div className="flex-1 relative mb-8 flex items-center justify-center">
        <div className="absolute inset-0 bg-indigo-600/10 rounded-[3rem] blur-3xl" />
        
        {/* Contenedor optimizado para 9:16 vertical */}
        <div className="relative h-full max-h-[70vh] aspect-[9/16] rounded-[2rem] border border-white/10 overflow-hidden bg-slate-900/50 shadow-2xl flex items-center justify-center">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
          
          <div className="relative z-10 w-full h-full mirror">
            <img 
              src={data.headImage} 
              alt="Bio Cutout" 
              className="w-full h-full object-contain"
            />
          </div>

          <div className="absolute bottom-4 right-4 z-20 bg-emerald-500 p-2 rounded-full shadow-lg">
            <CheckCircle2 className="w-5 h-5 text-white" />
          </div>
        </div>
      </div>

      <div className="space-y-3 shrink-0">
        <button 
          onClick={download}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-lg shadow-indigo-600/20"
        >
          <Download className="w-4 h-4" />
          Descargar Credencial PNG
        </button>

        <button 
          onClick={onReset}
          className="w-full bg-slate-800 hover:bg-slate-700 text-white py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3 border border-white/5"
        >
          <RefreshCw className="w-4 h-4" />
          Nueva Captura
        </button>
      </div>

      <div className="mt-6 text-center pb-4">
        <p className="text-[9px] text-slate-600 font-bold uppercase tracking-[0.2em]">
          AI Vision Lab • Portrait Segmentation v5.4
        </p>
      </div>
    </div>
  );
};

export default ResultView;
