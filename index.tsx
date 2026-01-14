
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Interceptor global ultra-agresivo para silenciar logs de MediaPipe/TFLite
(function() {
  const suppressPatterns = [
    'XNNPACK',
    'delegate for CPU',
    'TensorFlow Lite',
    'Mediapipe',
    'wasm-core',
    'third_party/tensorflow',
    'INFO: Created'
  ];

  const originalInfo = console.info;
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  const shouldSuppress = (args: any[]) => {
    const msg = args[0];
    if (typeof msg === 'string') {
      return suppressPatterns.some(pattern => msg.includes(pattern));
    }
    return false;
  };

  console.info = (...args) => {
    if (shouldSuppress(args)) return;
    originalInfo.apply(console, args);
  };

  console.log = (...args) => {
    if (shouldSuppress(args)) return;
    originalLog.apply(console, args);
  };

  console.warn = (...args) => {
    if (shouldSuppress(args)) return;
    originalWarn.apply(console, args);
  };
  
  // No silenciamos errores críticos a menos que contengan patrones de info ruidosa
  console.error = (...args) => {
    if (shouldSuppress(args)) return;
    originalError.apply(console, args);
  };
})();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
