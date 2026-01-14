
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { DetectionMode } from '../types';
import { Loader2, AlertCircle } from 'lucide-react';
import * as vision from '@mediapipe/tasks-vision';

interface VisionLabProps {
  mode: DetectionMode;
  cameraActive: boolean;
  onToggleCamera: () => void;
}

const VisionLab: React.FC<VisionLabProps> = ({ mode, cameraActive, onToggleCamera }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef<number | null>(null);

  const faceLandmarkerRef = useRef<vision.FaceLandmarker | null>(null);
  const imageSegmenterRef = useRef<vision.ImageSegmenter | null>(null);

  const cleanupModels = () => {
    if (faceLandmarkerRef.current) faceLandmarkerRef.current.close();
    if (imageSegmenterRef.current) imageSegmenterRef.current.close();
    faceLandmarkerRef.current = null;
    imageSegmenterRef.current = null;
  };

  const initModels = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    cleanupModels();

    try {
      const visionFiles = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.17/wasm';
      const filesetResolver = await vision.FilesetResolver.forVisionTasks(visionFiles);
      const baseOptions = { delegate: "GPU" as const };

      if (mode === DetectionMode.FACE_LANDMARKS) {
        try {
          faceLandmarkerRef.current = await vision.FaceLandmarker.createFromOptions(filesetResolver, {
            baseOptions: {
              ...baseOptions,
              modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task`,
            },
            runningMode: "VIDEO",
            numFaces: 1
          });
        } catch (e) {
          setError("Modelo facial no disponible actualmente.");
        }
      } else {
        let modelPath = mode === DetectionMode.HAIR_SEGMENTATION 
          ? 'https://storage.googleapis.com/mediapipe-models/hair_segmenter/hair_segmenter/float32/latest/hair_segmenter.task'
          : 'https://storage.googleapis.com/mediapipe-models/selfie_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.task';

        try {
          imageSegmenterRef.current = await vision.ImageSegmenter.createFromOptions(filesetResolver, {
            baseOptions: { ...baseOptions, modelAssetPath: modelPath },
            runningMode: "VIDEO",
            outputCategoryMask: true
          });
        } catch (e) {
          // Intento fallback si falla la ruta principal
          try {
            const fallbackPath = modelPath.includes('image_segmenter') ? modelPath : modelPath.replace('/mediapipe-models/', '/mediapipe-models/image_segmenter/');
            imageSegmenterRef.current = await vision.ImageSegmenter.createFromOptions(filesetResolver, {
              baseOptions: { ...baseOptions, modelAssetPath: fallbackPath },
              runningMode: "VIDEO",
              outputCategoryMask: true
            });
          } catch (e2) {
            setError(`Modelo de segmentación inaccesible.`);
          }
        }
      }
    } catch (err: any) {
      setError("Error de inicialización de IA.");
    } finally {
      setIsLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    initModels();
    return () => cleanupModels();
  }, [initModels]);

  const drawFaceLandmarks = (ctx: CanvasRenderingContext2D, landmarks: vision.NormalizedLandmark[], canvas: HTMLCanvasElement) => {
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.4)';
    landmarks.forEach((p, i) => {
      if (i % 8 === 0) {
        ctx.beginPath();
        ctx.arc(p.x * canvas.width, p.y * canvas.height, 1, 0, 2 * Math.PI);
        ctx.fillStyle = '#818cf8';
        ctx.fill();
      }
    });
  };

  const processVideo = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !cameraActive || error) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (ctx && video.readyState >= 2) {
      if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
      if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;
      const timestamp = performance.now();
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      if (mode === DetectionMode.FACE_LANDMARKS && faceLandmarkerRef.current) {
        const result = faceLandmarkerRef.current.detectForVideo(video, timestamp);
        if (result.faceLandmarks) {
          result.faceLandmarks.forEach(landmarks => drawFaceLandmarks(ctx, landmarks, canvas));
        }
      } else if (imageSegmenterRef.current) {
        imageSegmenterRef.current.segmentForVideo(video, timestamp, (result) => {
          if (result.categoryMask) {
            const mask = result.categoryMask.getAsUint8Array();
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            for (let i = 0; i < mask.length; i++) {
              if (mask[i] === 0) { 
                data[i*4] *= 0.15; data[i*4+1] *= 0.15; data[i*4+2] *= 0.25;
              }
            }
            ctx.putImageData(imageData, 0, 0);
          }
        });
      }
    }
    requestRef.current = requestAnimationFrame(processVideo);
  }, [cameraActive, mode, error]);

  useEffect(() => {
    if (cameraActive) {
      navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          requestRef.current = requestAnimationFrame(processVideo);
        }
      }).catch(() => setError("Cámara bloqueada o no encontrada."));
    }
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [cameraActive, processVideo]);

  return (
    <div className="w-full h-full bg-slate-950 flex items-center justify-center p-4">
      <div className="relative w-full aspect-video max-w-4xl bg-black rounded-3xl overflow-hidden shadow-2xl">
        <video ref={videoRef} className="hidden" playsInline muted />
        <canvas ref={canvasRef} className="w-full h-full object-cover" />
        
        {isLoading && (
          <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
            <p className="text-xs font-black text-indigo-300 uppercase">Sincronizando</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center gap-4 p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500" />
            <p className="text-sm font-bold text-red-400">{error}</p>
            <button onClick={initModels} className="px-6 py-2 bg-indigo-600 rounded-full text-xs font-bold uppercase">Reiniciar</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VisionLab;
