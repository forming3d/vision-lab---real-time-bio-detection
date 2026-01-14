
import React, { useState, useEffect, useCallback } from 'react';
import { KioskStep, CaptureData } from './types';
import HomeView from './components/HomeView';
import CameraView from './components/CameraView';
import ResultView from './components/ResultView';

const App: React.FC = () => {
  const [step, setStep] = useState<KioskStep>(KioskStep.HOME);
  const [capture, setCapture] = useState<CaptureData | null>(null);

  const handleStart = () => setStep(KioskStep.SCANNING);
  
  const handleCapture = (data: CaptureData) => {
    setCapture(data);
    setStep(KioskStep.RESULT);
  };

  const handleReset = useCallback(() => {
    setCapture(null);
    setStep(KioskStep.HOME);
  }, []);

  // Inactivity logic: reset to HOME after 30 seconds of no interaction
  useEffect(() => {
    let timeoutId: number;

    const resetInactivityTimer = () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      // Solo activamos el temporizador si no estamos ya en la HOME
      timeoutId = window.setTimeout(() => {
        handleReset();
      }, 30000); // 30 segundos
    };

    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    activityEvents.forEach(event => {
      document.addEventListener(event, resetInactivityTimer);
    });

    // Iniciar el temporizador al montar el componente
    resetInactivityTimer();

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      activityEvents.forEach(event => {
        document.removeEventListener(event, resetInactivityTimer);
      });
    };
  }, [handleReset]);

  return (
    <div className="kiosk-container overflow-hidden shadow-2xl">
      {step === KioskStep.HOME && <HomeView onStart={handleStart} />}
      
      {step === KioskStep.SCANNING && (
        <CameraView onCapture={handleCapture} />
      )}
      
      {step === KioskStep.RESULT && capture && (
        <ResultView data={capture} onReset={handleReset} />
      )}
    </div>
  );
};

export default App;
