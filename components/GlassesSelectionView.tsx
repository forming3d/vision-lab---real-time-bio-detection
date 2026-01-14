import React, { useState, useEffect, useRef } from 'react';
import { GlassesStyle } from '../types';
import { Sparkles, ArrowRight } from 'lucide-react';

// Importar imágenes de gafas usando import.meta.url para Vite
const gafas1 = new URL('../assets/gafas/1Gafas.png', import.meta.url).href;
const gafas2 = new URL('../assets/gafas/2Gafas.png', import.meta.url).href;
const gafas3 = new URL('../assets/gafas/3Gafas.png', import.meta.url).href;
const gafas4 = new URL('../assets/gafas/4Gafas.png', import.meta.url).href;
const gafas5 = new URL('../assets/gafas/5Gafas.png', import.meta.url).href;
const gafas6 = new URL('../assets/gafas/6Gafas.png', import.meta.url).href;

interface GlassesSelectionViewProps {
  onSelect: (style: GlassesStyle) => void;
}

const GlassesSelectionView: React.FC<GlassesSelectionViewProps> = ({ onSelect }) => {
  const [selectedStyle, setSelectedStyle] = useState<GlassesStyle | null>(null);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const glassesImagesRef = useRef<Map<GlassesStyle, HTMLImageElement>>(new Map());

  // Pre-cargar imágenes de gafas
  useEffect(() => {
    const loadGlassesImage = (src: string, style: GlassesStyle): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
    };

    const loadAllGlasses = async () => {
      try {
        const images = await Promise.all([
          loadGlassesImage(gafas1, GlassesStyle.CYBER),
          loadGlassesImage(gafas2, GlassesStyle.CLASSIC),
          loadGlassesImage(gafas3, GlassesStyle.AVIATOR),
          loadGlassesImage(gafas4, GlassesStyle.RETRO),
          loadGlassesImage(gafas5, GlassesStyle.MONOCLE),
          loadGlassesImage(gafas6, GlassesStyle.CYBER),
        ]);

        glassesImagesRef.current.set(GlassesStyle.CYBER, images[0]);
        glassesImagesRef.current.set(GlassesStyle.CLASSIC, images[1]);
        glassesImagesRef.current.set(GlassesStyle.AVIATOR, images[2]);
        glassesImagesRef.current.set(GlassesStyle.RETRO, images[3]);
        glassesImagesRef.current.set(GlassesStyle.MONOCLE, images[4]);
        
        setImagesLoaded(true);
      } catch (error) {
        console.error('Error cargando imágenes de gafas', error);
        setImagesLoaded(true); // Continuar aunque falle
      }
    };

    loadAllGlasses();
  }, []);

  const handleContinue = () => {
    if (selectedStyle) {
      onSelect(selectedStyle);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 overflow-hidden">
      <div className="p-4 md:p-6 flex items-center justify-between border-b border-white/5 bg-slate-900/60 backdrop-blur-xl z-30 shrink-0">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <Sparkles className="w-4 h-4 md:w-6 md:h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xs md:text-sm font-black text-white uppercase tracking-widest">BioKiosk Pro v5.5</h2>
            <p className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Selección de Gafas
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 overflow-y-auto min-h-0">
        <div className="w-full max-w-5xl">
          <div className="mb-6 md:mb-12 text-center">
            <h3 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tighter italic mb-2 md:mb-3">
              SELECCIONA TUS <span className="text-indigo-500">GAFAS</span>
            </h3>
            <p className="text-sm md:text-base text-slate-400 font-medium">
              Elige el estilo que más te guste
            </p>
          </div>
          
          <div className="grid grid-cols-3 gap-3 md:gap-6 mb-6 md:mb-8">
            {(Object.values(GlassesStyle).filter(s => s !== GlassesStyle.NONE) as GlassesStyle[]).map((style) => {
              const glassesImg = glassesImagesRef.current.get(style);
              const isSelected = selectedStyle === style;
              
              return (
                <button
                  key={style}
                  onClick={() => setSelectedStyle(style)}
                  className={`relative aspect-square rounded-2xl md:rounded-3xl border-2 transition-all overflow-hidden group ${
                    isSelected
                      ? 'border-indigo-400 shadow-2xl shadow-indigo-600/50 scale-105 ring-2 md:ring-4 ring-indigo-500/50' 
                      : 'border-white/10 hover:border-white/30 hover:scale-102 active:scale-95'
                  }`}
                >
                  <div className={`absolute inset-0 flex items-center justify-center transition-colors ${
                    isSelected ? 'bg-indigo-600/30' : 'bg-slate-800/40 group-hover:bg-slate-800/60'
                  }`}>
                    {imagesLoaded && glassesImg && glassesImg.complete ? (
                      <img 
                        src={glassesImg.src} 
                        alt={style}
                        className="w-4/5 h-4/5 object-contain"
                      />
                    ) : (
                      <Sparkles className="w-12 h-12 md:w-16 md:h-16 text-slate-500 animate-pulse" />
                    )}
                  </div>
                  {isSelected && (
                    <div className="absolute top-2 right-2 md:top-3 md:right-3 w-8 h-8 md:w-10 md:h-10 bg-indigo-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                      <span className="text-white text-sm md:text-lg font-black">✓</span>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-2 md:p-4 text-center">
                    <span className="text-[9px] md:text-xs font-black text-white uppercase tracking-widest">{style}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleContinue}
              disabled={!selectedStyle}
              className={`px-8 md:px-12 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-xs md:text-sm uppercase tracking-widest transition-all flex items-center gap-2 md:gap-3 ${
                selectedStyle
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/40 hover:scale-105 active:scale-95'
                  : 'bg-slate-800/40 text-slate-500 cursor-not-allowed border border-white/5'
              }`}
            >
              <span>Continuar</span>
              <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlassesSelectionView;
