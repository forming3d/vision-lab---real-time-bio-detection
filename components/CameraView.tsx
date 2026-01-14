
import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as vision from '@mediapipe/tasks-vision';
import { CaptureData, GlassesStyle } from '../types';
import { Timer, AlertCircle, EyeOff, Target, Sparkles, Cpu, Camera, Binary, Layers, Terminal, Gauge, Scissors, User } from 'lucide-react';

// Importar imágenes de gafas usando import.meta.url para Vite
const gafas1 = new URL('../assets/gafas/1Gafas.png', import.meta.url).href;
const gafas2 = new URL('../assets/gafas/2Gafas.png', import.meta.url).href;
const gafas3 = new URL('../assets/gafas/3Gafas.png', import.meta.url).href;
const gafas4 = new URL('../assets/gafas/4Gafas.png', import.meta.url).href;
const gafas5 = new URL('../assets/gafas/5Gafas.png', import.meta.url).href;
const gafas6 = new URL('../assets/gafas/6Gafas.png', import.meta.url).href;

interface CameraViewProps {
  onCapture: (data: CaptureData) => void;
  initialGlassesStyle?: GlassesStyle;
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

const CameraView: React.FC<CameraViewProps> = ({ onCapture, initialGlassesStyle }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const processingCanvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  const maskCanvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  
  const [loadingStage, setLoadingStage] = useState<LoadingStage>('INITIALIZING');
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedStyle] = useState<GlassesStyle>(initialGlassesStyle || GlassesStyle.CYBER);
  const [segmentationStatus, setSegmentationStatus] = useState<'LOADING' | 'ACTIVE' | 'OFFLINE'>('LOADING');
  const [timeLeft, setTimeLeft] = useState(15);
  
  const faceLandmarkerRef = useRef<vision.FaceLandmarker | null>(null);
  const segmenterRef = useRef<vision.ImageSegmenter | null>(null);
  const hairSegmenterRef = useRef<vision.ImageSegmenter | null>(null);
  const requestRef = useRef<number | null>(null);
  const glassesImagesRef = useRef<Map<GlassesStyle, HTMLImageElement>>(new Map());

  const addLog = (msg: string, type: 'info' | 'success' | 'warn' = 'info') => {
    setLogs(prev => [{ id: Math.random().toString(), msg, type }, ...prev].slice(0, 5));
  };

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
          loadGlassesImage(gafas6, GlassesStyle.CYBER), // Fallback o estilo adicional
        ]);

        glassesImagesRef.current.set(GlassesStyle.CYBER, images[0]);
        glassesImagesRef.current.set(GlassesStyle.CLASSIC, images[1]);
        glassesImagesRef.current.set(GlassesStyle.AVIATOR, images[2]);
        glassesImagesRef.current.set(GlassesStyle.RETRO, images[3]);
        glassesImagesRef.current.set(GlassesStyle.MONOCLE, images[4]);
        // Si hay un 6to estilo, puedes agregarlo aquí
        
        addLog('Gafas PNG cargadas', 'success');
      } catch (error) {
        addLog('Error cargando imágenes de gafas', 'warn');
      }
    };

    loadAllGlasses();
  }, []);

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
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task',
          delegate: 'GPU' 
        },
        runningMode: 'VIDEO',
        numFaces: 1
      });

      setLoadingStage('LOADING_SEGMENTER');
      try {
        segmenterRef.current = await vision.ImageSegmenter.createFromOptions(resolver, {
          baseOptions: { 
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.task',
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
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hair_segmenter/hair_segmenter/float32/latest/hair_segmenter.task',
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
        video: { facingMode: 'user', width: { ideal: 1920 }, height: { ideal: 1080 } } 
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
    
    const glassesImg = glassesImagesRef.current.get(style);
    if (!glassesImg || !glassesImg.complete) return; // Esperar a que la imagen esté cargada
    
    const leftEye = landmarks[263]; 
    const rightEye = landmarks[33]; 
    const bridge = landmarks[168]; 
    if (!leftEye || !rightEye || !bridge) return;
    
    const lx = leftEye.x * w; 
    const ly = leftEye.y * h;
    const rx = rightEye.x * w; 
    const ry = rightEye.y * h;
    const bx = bridge.x * w; 
    const by = bridge.y * h;
    
    // Calcular distancia entre ojos y ángulo
    const dist = Math.sqrt(Math.pow(rx - lx, 2) + Math.pow(ry - ly, 2));
    const angle = Math.atan2(ry - ly, rx - lx);
    
    // Calcular dimensiones de las gafas basadas en la distancia entre ojos
    // Ajustar el ancho de las gafas según la distancia entre ojos (con un factor de escala)
    const glassesWidth = dist * 2.2; // Ancho de las gafas (un poco más ancho que la distancia entre ojos)
    const glassesHeight = glassesWidth * (glassesImg.height / glassesImg.width); // Mantener proporción de la imagen
    
    // Calcular el punto medio vertical entre los ojos para mejor alineación
    const eyeCenterY = (ly + ry) / 2;
    // Calcular el offset vertical en el espacio rotado (perpendicular a la línea entre ojos)
    const verticalOffset = eyeCenterY - by;
    
    // Guardar el contexto
    ctx.save();
    
    // Mover al punto del puente y rotar
    ctx.translate(bx, by);
    ctx.rotate(angle);
    
    // Invertir verticalmente (arriba/abajo) para corregir la orientación
    ctx.scale(1, -1);
    
    // Calcular el offset en el espacio rotado
    // Necesitamos rotar el vector (0, verticalOffset) por el ángulo
    const rotatedOffsetX = -Math.sin(angle) * verticalOffset;
    const rotatedOffsetY = Math.cos(angle) * verticalOffset;
    
    // Dibujar la imagen de las gafas centrada en el puente con ajuste vertical
    // El anchor point está en el centro de la imagen
    // Nota: como aplicamos scale(1, -1), necesitamos invertir también la posición Y
    ctx.drawImage(
      glassesImg,
      -glassesWidth / 2 + rotatedOffsetX,  // x: centrar horizontalmente
      -glassesHeight / 2 - rotatedOffsetY, // y: centrar verticalmente (invertido por el scale)
      glassesWidth,
      glassesHeight
    );
    
    // Restaurar el contexto
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

    // El canvas siempre será 1080x1920 (9:16 responsive)
    const canvasW = 1080;
    const canvasH = 1920;
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

    // LIVE VIEW: Solo mostrar video + gafas AR (sin segmentación para mejor rendimiento)
    ctx.clearRect(0, 0, canvasW, canvasH);
    ctx.drawImage(video, sx, sy, sW, sH, 0, 0, canvasW, canvasH);

    if (landmarks && selectedStyle) {
      drawGlasses(ctx, landmarks, canvasW, canvasH, selectedStyle);
    }
    
    requestRef.current = requestAnimationFrame(process);
  }, [loadingStage, error, selectedStyle]);

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

  // Función para capturar con segmentación aplicada
  const captureWithSegmentation = async (): Promise<string> => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0) {
      return canvas.toDataURL('image/png');
    }

    // Calcular crop 9:16
    const targetRatio = 9 / 16;
    const vW = video.videoWidth;
    const vH = video.videoHeight;
    const videoRatio = vW / vH;

    let sx: number, sy: number, sW: number, sH: number;
    if (videoRatio > targetRatio) {
      sW = vH * targetRatio;
      sH = vH;
      sx = (vW - sW) / 2;
      sy = 0;
    } else {
      sW = vW;
      sH = vW / targetRatio;
      sx = 0;
      sy = (vH - sH) / 2;
    }

    const canvasW = 1080;
    const canvasH = 1920;

    // Obtener landmarks actuales
    const ts = performance.now();
    const faceRes = faceLandmarkerRef.current?.detectForVideo(video, ts);
    const rawLandmarks = faceRes?.faceLandmarks?.[0];
    const landmarks = rawLandmarks?.map(l => ({
      x: (l.x * vW - sx) / sW,
      y: (l.y * vH - sy) / sH
    }));

    // Crear canvas de salida
    const outCanvas = document.createElement('canvas');
    outCanvas.width = canvasW;
    outCanvas.height = canvasH;
    const outCtx = outCanvas.getContext('2d')!;

    // Si la segmentación está activa, aplicarla
    if (segmentationStatus === 'ACTIVE' && (segmenterRef.current || hairSegmenterRef.current)) {
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
        
        // Crear imagen de máscara
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
          mCtx.moveTo(0, 0);
          mCtx.lineTo(canvasW, 0);
          const startPt = landmarks[JAWLINE_INDICES[JAWLINE_INDICES.length-1]];
          mCtx.lineTo(canvasW, startPt.y * canvasH);
          for (let i = JAWLINE_INDICES.length - 1; i >= 0; i--) {
            const pt = landmarks[JAWLINE_INDICES[i]];
            mCtx.lineTo(pt.x * canvasW, pt.y * canvasH);
          }
          mCtx.lineTo(0, landmarks[JAWLINE_INDICES[0]].y * canvasH);
          mCtx.lineTo(0, 0);
          mCtx.closePath();
          mCtx.fill();
          mCtx.restore();
        }

        // Suavizado de bordes (Feathering)
        mCtx.save();
        mCtx.globalCompositeOperation = 'destination-out';
        mCtx.filter = 'blur(4px)';
        mCtx.drawImage(maskCanvasRef.current, 0, 0);
        mCtx.restore();

        // Renderizar video + gafas en canvas temporal
        const tempVideoCanvas = document.createElement('canvas');
        tempVideoCanvas.width = canvasW;
        tempVideoCanvas.height = canvasH;
        const tempVideoCtx = tempVideoCanvas.getContext('2d')!;
        tempVideoCtx.clearRect(0, 0, canvasW, canvasH);
        tempVideoCtx.drawImage(video, sx, sy, sW, sH, 0, 0, canvasW, canvasH);
        if (landmarks && selectedStyle) {
          drawGlasses(tempVideoCtx, landmarks, canvasW, canvasH, selectedStyle);
        }

        // Aplicar máscara al canvas de salida
        outCtx.clearRect(0, 0, canvasW, canvasH);
        outCtx.drawImage(maskCanvasRef.current, 0, 0, canvasW, canvasH);
        outCtx.globalCompositeOperation = 'source-in';
        outCtx.drawImage(tempVideoCanvas, 0, 0);
        outCtx.globalCompositeOperation = 'source-over';
      } else {
        // Fallback sin máscaras
        outCtx.clearRect(0, 0, canvasW, canvasH);
        outCtx.drawImage(video, sx, sy, sW, sH, 0, 0, canvasW, canvasH);
        if (landmarks && selectedStyle) {
          drawGlasses(outCtx, landmarks, canvasW, canvasH, selectedStyle);
        }
      }
    } else {
      // Sin segmentación: solo video + gafas
      outCtx.clearRect(0, 0, canvasW, canvasH);
      outCtx.drawImage(video, sx, sy, sW, sH, 0, 0, canvasW, canvasH);
      if (landmarks && selectedStyle) {
        drawGlasses(outCtx, landmarks, canvasW, canvasH, selectedStyle);
      }
    }

    return outCanvas.toDataURL('image/png');
  };

  // Timer para captura automática con segmentación
  useEffect(() => {
    if (loadingStage !== 'READY' || error) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { 
          clearInterval(timer); 
          // Capturar con segmentación aplicada
          captureWithSegmentation().then((imageData) => {
            onCapture({ 
              headImage: imageData, 
              timestamp: new Date().toLocaleTimeString(), 
              appliedStyle: selectedStyle 
            });
          }).catch((err) => {
            // Fallback al canvas actual si falla
            if (canvasRef.current && canvasRef.current.width > 0) {
              onCapture({ 
                headImage: canvasRef.current.toDataURL('image/png'), 
                timestamp: new Date().toLocaleTimeString(), 
                appliedStyle: selectedStyle 
              });
            }
          });
          return 0; 
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [loadingStage, error, selectedStyle, onCapture, segmentationStatus]);

  return (
    <div className="h-full flex flex-col bg-slate-950 overflow-hidden">
      <div className="p-4 md:p-6 flex items-center justify-between border-b border-white/5 bg-slate-900/60 backdrop-blur-xl z-30 shrink-0">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <Cpu className="w-4 h-4 md:w-6 md:h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xs md:text-sm font-black text-white uppercase tracking-widest">BioKiosk Pro v5.5</h2>
            <div className="flex items-center gap-2">
              <span className={`flex h-1.5 w-1.5 md:h-2 md:w-2 rounded-full ${segmentationStatus === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <p className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                {segmentationStatus === 'ACTIVE' ? 'IA Head Isolation' : 'Standard View'}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-3 bg-slate-950 px-3 md:px-4 py-1.5 md:py-2 rounded-xl md:rounded-2xl border border-white/10 shadow-inner">
          <Timer className="w-3 h-3 md:w-4 md:h-4 text-indigo-400" />
          <span className="text-lg md:text-xl font-black text-white tabular-nums">{timeLeft}s</span>
        </div>
      </div>

      <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden p-2 md:p-4 min-h-0">
        <video ref={videoRef} className="hidden" playsInline muted autoPlay />
        <div className="relative h-full w-full max-w-full aspect-[9/16] overflow-hidden rounded-2xl md:rounded-[2.5rem] border border-white/10 shadow-[0_0_100px_rgba(99,102,241,0.2)]">
          <canvas ref={canvasRef} className="w-full h-full mirror object-cover bg-slate-900" />
          
          <div className="absolute inset-0 z-10 pointer-events-none">
             <div className="scanner opacity-20" />
             {/* Guía Biométrica */}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4/5 aspect-[3/4] border-[2px] border-dashed border-indigo-500/20 rounded-full flex flex-col items-center justify-center">
                <div className="absolute -top-8 md:-top-10 text-[8px] md:text-[9px] font-black text-indigo-400 uppercase tracking-widest bg-slate-950 px-2 md:px-3 py-0.5 md:py-1 rounded-full border border-indigo-500/20">
                    Alineación Biométrica
                </div>
                <User className="w-8 h-8 md:w-12 md:h-12 text-white/5" />
             </div>
          </div>
        </div>

        {loadingStage !== 'READY' && !error && (
          <div className="absolute inset-0 z-40 bg-slate-950/98 flex flex-col items-center justify-center p-4 md:p-8 backdrop-blur-md">
            <div className="w-full max-w-md">
              <div className="mb-6 md:mb-10 flex items-center justify-between">
                <div>
                  <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tighter italic">SISTEMA <span className="text-indigo-500">BIO-OS</span></h3>
                  <span className="text-[9px] md:text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Neural Engine: Portrait Isolation</span>
                </div>
                <div className="text-right">
                  <span className="text-2xl md:text-3xl font-black text-white tabular-nums tracking-tighter">{Math.round(getProgress())}%</span>
                </div>
              </div>
              <div className="relative h-1 w-full bg-slate-900 rounded-full overflow-hidden mb-6 md:mb-8">
                <div className="h-full bg-indigo-500 transition-all duration-500 shadow-[0_0_10px_#6366f1]" style={{ width: `${getProgress()}%` }} />
              </div>
              <div className="bg-black/40 rounded-xl md:rounded-2xl border border-white/5 p-3 md:p-4 font-mono">
                <div className="space-y-1 h-20 md:h-24 overflow-hidden text-[8px] md:text-[9px]">
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

    </div>
  );
};

export default CameraView;
