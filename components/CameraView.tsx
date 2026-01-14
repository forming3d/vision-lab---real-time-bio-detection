
import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as vision from '@mediapipe/tasks-vision';
import { CaptureData, GlassesStyle } from '../types';
import { Timer, AlertCircle, EyeOff, Target, Sparkles, Cpu, Camera, Binary, Layers, Terminal, Gauge, Scissors, User } from 'lucide-react';

interface CameraViewProps {
  onCapture: (data: CaptureData) => void;
}

type LoadingStage = 
  | 'INITIALIZING' 
  | 'RESOLVING_WASM' 
  | 'LOADING_FACEMESH' 
  | 'LOADING_SEGMENTER' 
  | 'LOADING_HAIR_SEGMENTER'
  | 'REQUESTING_CAMERA'
  | 'HARDWARE_SYNC'
  | 'CALIBRATING' 
  | 'READY';

interface SystemLog {
  id: string;
  msg: string;
  type: 'info' | 'success' | 'warn';
}

// Landmarks específicos para la mandíbula (jawline) de oreja a oreja por abajo
const JAWLINE_INDICES = [
  234, 93, 132, 58, 172, 136, 150, 149, 176, 148, 152, 377, 400, 378, 379, 365, 397, 288, 361, 323, 454
];

const CameraView: React.FC<CameraViewProps> = ({ onCapture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const processingCanvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  const maskCanvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  
  const [loadingStage, setLoadingStage] = useState<LoadingStage>('INITIALIZING');
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(15);
  const [selectedStyle, setSelectedStyle] = useState<GlassesStyle>(GlassesStyle.CYBER);
  const [segmentationStatus, setSegmentationStatus] = useState<'LOADING' | 'ACTIVE' | 'OFFLINE'>('LOADING');
  
  const faceLandmarkerRef = useRef<vision.FaceLandmarker | null>(null);
  const segmenterRef = useRef<vision.ImageSegmenter | null>(null);
  const hairSegmenterRef = useRef<vision.ImageSegmenter | null>(null);
  const requestRef = useRef<number | null>(null);

  const addLog = (msg: string, type: 'info' | 'success' | 'warn' = 'info') => {
    setLogs(prev => [{ id: Math.random().toString(), msg, type }, ...prev].slice(0, 5));
  };

  const getProgress = () => {
    const stages: LoadingStage[] = ['INITIALIZING', 'RESOLVING_WASM', 'LOADING_FACEMESH', 'LOADING_SEGMENTER', 'LOADING_HAIR_SEGMENTER', 'REQUESTING_CAMERA', 'HARDWARE_SYNC', 'CALIBRATING', 'READY'];
    const idx = stages.indexOf(loadingStage);
    return ((idx + 1) / stages.length) * 100;
  };

  const initModels = async () => {
    try {
      addLog('Iniciando Vision Lab v5.5');
      setLoadingStage('RESOLVING_WASM');
      const visionFiles = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.17/wasm';
      const resolver = await vision.FilesetResolver.forVisionTasks(visionFiles);

      setLoadingStage('LOADING_FACEMESH');
      faceLandmarkerRef.current = await vision.FaceLandmarker.createFromOptions(resolver, {
        baseOptions: { 
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU' 
        },
        runningMode: 'VIDEO',
        numFaces: 1
      });

      setLoadingStage('LOADING_SEGMENTER');
      try {
        segmenterRef.current = await vision.ImageSegmenter.createFromOptions(resolver, {
          baseOptions: { 
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite',
            delegate: 'GPU'
          },
          runningMode: 'VIDEO',
          outputCategoryMask: true
        });
      } catch (e) { addLog('Segmentador corporal fallido', 'warn'); }

      setLoadingStage('LOADING_HAIR_SEGMENTER');
      try {
        hairSegmenterRef.current = await vision.ImageSegmenter.createFromOptions(resolver, {
          baseOptions: { 
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/image_segmenter/hair_segmenter/float32/latest/hair_segmenter.tflite',
            delegate: 'GPU'
          },
          runningMode: 'VIDEO',
          outputCategoryMask: true
        });
      } catch (e) { addLog('Segmentador capilar fallido', 'warn'); }

      setSegmentationStatus((segmenterRef.current || hairSegmenterRef.current) ? 'ACTIVE' : 'OFFLINE');
      setLoadingStage('REQUESTING_CAMERA');
      await startVideo();
      setLoadingStage('READY');
      addLog('SISTEMA CALIBRADO AL 100%', 'success');
    } catch (err: any) {
      setError("Fallo crítico en sincronización de hardware.");
    }
  };

  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise((resolve) => { if (videoRef.current) videoRef.current.onloadedmetadata = resolve; });
        await videoRef.current.play();
      }
    } catch (e) { 
      setError("Acceso denegado a la cámara.");
      throw e;
    }
  };

  const drawGlasses = (ctx: CanvasRenderingContext2D, landmarks: vision.NormalizedLandmark[], w: number, h: number, style: GlassesStyle) => {
    if (style === GlassesStyle.NONE) return;
    const leftEye = landmarks[263]; const rightEye = landmarks[33]; const bridge = landmarks[168]; 
    if (!leftEye || !rightEye || !bridge) return;
    
    const lx = leftEye.x * w; const ly = leftEye.y * h;
    const rx = rightEye.x * w; const ry = rightEye.y * h;
    const bx = bridge.x * w; const by = bridge.y * h;
    const dist = Math.sqrt(Math.pow(rx - lx, 2) + Math.pow(ry - ly, 2));
    const angle = Math.atan2(ry - ly, rx - lx);

    ctx.save(); ctx.translate(bx, by); ctx.rotate(angle);
    if (style === GlassesStyle.CYBER) {
      ctx.shadowBlur = 15; ctx.shadowColor = '#6366f1';
      ctx.fillStyle = 'rgba(99, 102, 241, 0.3)'; ctx.strokeStyle = '#818cf8'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(-dist * 1.1, -dist * 0.25, dist * 2.2, dist * 0.5, 4);
      ctx.fill(); ctx.stroke();
    } else if (style === GlassesStyle.RETRO) {
      ctx.strokeStyle = '#e11d48'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(-dist * 0.6, 0, dist * 0.45, 0, Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.arc(dist * 0.6, 0, dist * 0.45, 0, Math.PI*2); ctx.stroke();
    } else if (style === GlassesStyle.AVIATOR) {
      ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(-dist * 0.6, 0, dist * 0.6, dist * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(dist * 0.6, 0, dist * 0.6, dist * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  };

  const process = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || loadingStage !== 'READY' || error) {
      requestRef.current = requestAnimationFrame(process);
      return;
    }
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    if (!ctx || video.readyState < 2 || video.videoWidth === 0) {
      requestRef.current = requestAnimationFrame(process);
      return;
    }

    // AJUSTE 9:16 (COVER) - Llenar todo el canvas sin barras negras
    const targetRatio = 9 / 16;
    const vW = video.videoWidth;
    const vH = video.videoHeight;
    const videoRatio = vW / vH;

    let drawW, drawH, sx, sy, sW, sH;

    if (videoRatio > targetRatio) {
      // El video es más ancho que 9:16, cortamos los lados del video para rellenar el canvas
      sW = vH * targetRatio;
      sH = vH;
      sx = (vW - sW) / 2;
      sy = 0;
    } else {
      // El video es más alto que 9:16, cortamos arriba/abajo
      sW = vW;
      sH = vW / targetRatio;
      sx = 0;
      sy = (vH - sH) / 2;
    }

    // El canvas siempre será 720x1280 (o similar 9:16)
    const canvasW = 720;
    const canvasH = 1280;
    if (canvas.width !== canvasW) {
      canvas.width = canvasW; canvas.height = canvasH;
      maskCanvasRef.current.width = canvasW; maskCanvasRef.current.height = canvasH;
    }

    const ts = performance.now();
    const faceRes = faceLandmarkerRef.current?.detectForVideo(video, ts);
    const rawLandmarks = faceRes?.faceLandmarks?.[0];

    // Ajustar landmarks al espacio de dibujo (el crop del video)
    const landmarks = rawLandmarks?.map(l => ({
      x: (l.x * vW - sx) / sW,
      y: (l.y * vH - sy) / sH
    }));

    if (segmentationStatus === 'ACTIVE') {
      const mCtx = maskCanvasRef.current.getContext('2d')!;
      mCtx.clearRect(0, 0, canvasW, canvasH);

      const masks: Uint8Array[] = [];
      if (segmenterRef.current) {
        const res = segmenterRef.current.segmentForVideo(video, ts);
        if (res.categoryMask) masks.push(res.categoryMask.getAsUint8Array());
      }
      if (hairSegmenterRef.current) {
        const res = hairSegmenterRef.current.segmentForVideo(video, ts);
        if (res.categoryMask) masks.push(res.categoryMask.getAsUint8Array());
      }

      if (masks.length > 0) {
        // Combinar máscaras
        const combined = new Uint8Array(masks[0].length);
        for (let i = 0; i < combined.length; i++) {
          for (const m of masks) { if (m[i] > 0) { combined[i] = 255; break; } }
        }
        
        // Crear imagen de máscara recortada 9:16
        const tempMaskCanvas = document.createElement('canvas');
        tempMaskCanvas.width = vW; tempMaskCanvas.height = vH;
        const tempCtx = tempMaskCanvas.getContext('2d')!;
        const tempImgData = tempCtx.createImageData(vW, vH);
        for (let i = 0; i < combined.length; i++) {
          const v = combined[i] > 0 ? 255 : 0;
          tempImgData.data[i*4] = v; tempImgData.data[i*4+1] = v; tempImgData.data[i*4+2] = v; tempImgData.data[i*4+3] = v;
        }
        tempCtx.putImageData(tempImgData, 0, 0);

        // Dibujar la máscara en maskCanvasRef respetando el recorte 9:16
        mCtx.drawImage(tempMaskCanvas, sx, sy, sW, sH, 0, 0, canvasW, canvasH);

        // APLICAR RECORTE DE CUELLO (Jawline)
        if (landmarks) {
          mCtx.save();
          mCtx.globalCompositeOperation = 'destination-in';
          mCtx.beginPath();
          // Crear un camino que cubra toda la parte superior y se cierre en la mandíbula
          // Empezamos arriba a la izquierda
          mCtx.moveTo(0, 0);
          mCtx.lineTo(canvasW, 0);
          // Bajamos por el lateral derecho hasta el primer punto de la mandíbula (oreja derecha)
          const startPt = landmarks[JAWLINE_INDICES[JAWLINE_INDICES.length-1]];
          mCtx.lineTo(canvasW, startPt.y * canvasH);
          // Seguimos la línea de la mandíbula de derecha a izquierda
          for (let i = JAWLINE_INDICES.length - 1; i >= 0; i--) {
            const pt = landmarks[JAWLINE_INDICES[i]];
            mCtx.lineTo(pt.x * canvasW, pt.y * canvasH);
          }
          // Subimos desde la oreja izquierda hasta arriba a la izquierda
          mCtx.lineTo(0, landmarks[JAWLINE_INDICES[0]].y * canvasH);
          mCtx.lineTo(0, 0);
          mCtx.closePath();
          mCtx.fill();
          mCtx.restore();
        }

        // Suavizado de bordes (Feathering)
        mCtx.save();
        mCtx.globalCompositeOperation = 'destination-out';
        mCtx.filter = 'blur(4px)'; // Un pequeño desenfoque para suavizar el borde del recorte
        mCtx.drawImage(maskCanvasRef.current, 0, 0);
        mCtx.restore();

        // Limpiar canvas principal para transparencia real
        ctx.clearRect(0, 0, canvasW, canvasH);
        ctx.save();
        ctx.drawImage(maskCanvasRef.current, 0, 0, canvasW, canvasH);
        ctx.globalCompositeOperation = 'source-in';
        ctx.drawImage(video, sx, sy, sW, sH, 0, 0, canvasW, canvasH);
        ctx.restore();
      }
    } else {
      ctx.clearRect(0, 0, canvasW, canvasH);
      ctx.drawImage(video, sx, sy, sW, sH, 0, 0, canvasW, canvasH);
    }

    if (landmarks) {
      drawGlasses(ctx, landmarks, canvasW, canvasH, selectedStyle);
    }
    
    requestRef.current = requestAnimationFrame(process);
  }, [loadingStage, error, selectedStyle, segmentationStatus]);

  useEffect(() => {
    initModels();
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (faceLandmarkerRef.current) faceLandmarkerRef.current.close();
      if (segmenterRef.current) segmenterRef.current.close();
      if (hairSegmenterRef.current) hairSegmenterRef.current.close();
    };
  }, []);

  useEffect(() => {
    if (loadingStage === 'READY') requestRef.current = requestAnimationFrame(process);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [loadingStage, process]);

  useEffect(() => {
    if (loadingStage !== 'READY' || error) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { 
          clearInterval(timer); 
          if (canvasRef.current && canvasRef.current.width > 0) {
            onCapture({ 
              headImage: canvasRef.current.toDataURL('image/png'), 
              timestamp: new Date().toLocaleTimeString(), 
              appliedStyle: selectedStyle 
            });
          }
          return 0; 
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [loadingStage, error, selectedStyle, onCapture]);

  return (
    <div className="h-full flex flex-col bg-slate-950 overflow-hidden">
      <div className="p-6 flex items-center justify-between border-b border-white/5 bg-slate-900/60 backdrop-blur-xl z-30">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <Cpu className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-black text-white uppercase tracking-widest">BioKiosk Pro v5.5</h2>
            <div className="flex items-center gap-2">
              <span className={`flex h-2 w-2 rounded-full ${segmentationStatus === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                {segmentationStatus === 'ACTIVE' ? 'IA Head Isolation' : 'Standard View'}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-slate-950 px-4 py-2 rounded-2xl border border-white/10 shadow-inner">
          <Timer className="w-4 h-4 text-indigo-400" />
          <span className="text-xl font-black text-white tabular-nums">{timeLeft}s</span>
        </div>
      </div>

      <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden p-4">
        <video ref={videoRef} className="hidden" playsInline muted autoPlay />
        <div className="relative h-full aspect-[9/16] overflow-hidden rounded-[2.5rem] border border-white/10 shadow-[0_0_100px_rgba(99,102,241,0.2)]">
          <canvas ref={canvasRef} className="w-full h-full mirror object-cover bg-slate-900" />
          
          <div className="absolute inset-0 z-10 pointer-events-none">
             <div className="scanner opacity-20" />
             {/* Guía Biométrica */}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4/5 aspect-[3/4] border-[2px] border-dashed border-indigo-500/20 rounded-full flex flex-col items-center justify-center">
                <div className="absolute -top-10 text-[9px] font-black text-indigo-400 uppercase tracking-widest bg-slate-950 px-3 py-1 rounded-full border border-indigo-500/20">
                    Alineación Biométrica
                </div>
                <User className="w-12 h-12 text-white/5" />
             </div>
          </div>
        </div>

        {loadingStage !== 'READY' && !error && (
          <div className="absolute inset-0 z-40 bg-slate-950/98 flex flex-col items-center justify-center p-8 backdrop-blur-md">
            <div className="max-w-md w-full">
              <div className="mb-10 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">SISTEMA <span className="text-indigo-500">BIO-OS</span></h3>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Neural Engine: Portrait Isolation</span>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-black text-white tabular-nums tracking-tighter">{Math.round(getProgress())}%</span>
                </div>
              </div>
              <div className="relative h-1 w-full bg-slate-900 rounded-full overflow-hidden mb-8">
                <div className="h-full bg-indigo-500 transition-all duration-500 shadow-[0_0_10px_#6366f1]" style={{ width: `${getProgress()}%` }} />
              </div>
              <div className="bg-black/40 rounded-2xl border border-white/5 p-4 font-mono">
                <div className="space-y-1 h-24 overflow-hidden text-[9px]">
                  {logs.map((log) => (
                    <div key={log.id} className="flex gap-2 text-slate-400">
                      <span>[{new Date().toLocaleTimeString()}]</span>
                      <span className={log.type === 'success' ? 'text-emerald-400' : 'text-slate-400'}>{log.msg}</span>
                    </div>
                  ))}
                  <div className="text-indigo-500 animate-pulse">_</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-8 bg-slate-900/90 backdrop-blur-2xl border-t border-white/5 z-30">
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
          {(Object.values(GlassesStyle) as GlassesStyle[]).map((style) => (
            <button
              key={style}
              onClick={() => setSelectedStyle(style)}
              className={`px-8 py-5 rounded-[1.5rem] flex-shrink-0 transition-all border font-black text-[10px] uppercase tracking-widest flex items-center gap-3 ${
                selectedStyle === style 
                  ? 'bg-indigo-600 border-indigo-400 text-white shadow-xl shadow-indigo-600/40' 
                  : 'bg-slate-800/40 border-white/5 text-slate-500 hover:border-white/10'
              }`}
            >
              {style === GlassesStyle.NONE ? <EyeOff className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              {style}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CameraView;
