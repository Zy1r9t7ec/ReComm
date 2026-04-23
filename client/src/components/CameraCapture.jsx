import React, { useRef, useState, useEffect } from 'react';
import { Camera, StopCircle, RefreshCcw, AlertTriangle } from 'lucide-react';

export default function CameraCapture({ onComplete }) {
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isStreamReady, setIsStreamReady] = useState(false);
  const [timeLeft, setTimeLeft] = useState(90); // 90 seconds max
  const [qualityWarning, setQualityWarning] = useState(null);
  
  const chunksRef = useRef([]);
  let qualityInterval;
  let darknessCount = 0;

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
      clearInterval(qualityInterval);
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' }, 
        audio: true 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          setIsStreamReady(true);
        };
      }
      startQualityDetector(stream);
    } catch (err) {
      console.error("Camera error:", err);
      alert("Unable to access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop());
    }
  };

  const startQualityDetector = (stream) => {
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');

    qualityInterval = setInterval(() => {
      if (!videoRef.current) return;
      ctx.drawImage(videoRef.current, 0, 0, 100, 100);
      const imgData = ctx.getImageData(0, 0, 100, 100).data;
      
      let sum = 0;
      for (let i = 0; i < imgData.length; i += 4) {
        sum += (imgData[i] + imgData[i+1] + imgData[i+2]) / 3;
      }
      const brightness = sum / (imgData.length / 4);

      if (brightness < 20) {
        darknessCount++;
        if (darknessCount > 3) setQualityWarning("The area is too dark. Please move to a brighter place.");
      } else if (brightness > 250) {
        darknessCount = 0;
        setQualityWarning("The lighting is too harsh or overexposed. Adjust your position.");
      } else {
        darknessCount = 0;
        setQualityWarning(null);
      }
    }, 500);
  };

  const startRecording = () => {
    chunksRef.current = [];
    const stream = videoRef.current.srcObject;
    // We try to encode in MP4 or WebM depending on browser support
    const options = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus') 
                    ? { mimeType: 'video/webm;codecs=vp8,opus' } 
                    : { mimeType: 'video/mp4' };
                    
    try {
      mediaRecorderRef.current = new MediaRecorder(stream, options);
    } catch (e) {
      mediaRecorderRef.current = new MediaRecorder(stream);
    }
    
    mediaRecorderRef.current.ondataavailable = e => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mediaRecorderRef.current.mimeType });
      stopCamera();
      onComplete(blob);
    };

    mediaRecorderRef.current.start(1000);
    setIsRecording(true);
    
    // Start countdown
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          stopRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="glass-card animate-fade-in text-center" style={{ padding: '1rem' }}>
      <h3 style={{ margin: '0 0 1rem' }}>Product Inspection</h3>

      {qualityWarning && (
        <div style={{ background: 'var(--danger)', color: 'white', padding: '0.5rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
          <AlertTriangle size={16} /> {qualityWarning}
        </div>
      )}

      <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '8px', background: '#0a0a0a', marginBottom: '1rem', minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        
        {!isStreamReady && (
          <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Initializing Lens...</p>
          </div>
        )}
        
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          style={{ width: '100%', maxHeight: '400px', objectFit: 'cover', transform: 'scaleX(-1)', opacity: isStreamReady ? 1 : 0, transition: 'opacity 0.5s' }} 
        />
        
        {isRecording && (
          <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(239, 68, 68, 0.9)', color: 'white', padding: '0.25rem 0.75rem', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'white', animation: 'fadeIn 1s infinite alternate' }} />
            {timeLeft}s
          </div>
        )}
      </div>
      
      {isRecording && <p style={{ fontSize: '0.9rem', color: 'var(--primary)' }}>Please state your reason for returning aloud.</p>}

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        {!isRecording ? (
          <button className="btn primary" onClick={startRecording} disabled={!isStreamReady}>
            <Camera size={18} /> {isStreamReady ? 'Start Recording' : 'Waiting for Camera'}
          </button>
        ) : (
          <button className="btn danger-outline" onClick={stopRecording} style={{ background: 'var(--danger)', color: 'white' }}>
            <StopCircle size={18} /> Stop & Submit Match
          </button>
        )}
      </div>
    </div>
  );
}

// Add global spin animation logic implicitly relying on bundler
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
  document.head.appendChild(style);
}
