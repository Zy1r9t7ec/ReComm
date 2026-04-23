import React, { useRef, useState, useEffect } from 'react';
import { Camera, StopCircle, RefreshCcw, AlertTriangle, Image as ImageIcon, Scan, CheckCircle2 } from 'lucide-react';

const INSPECTION_PROFILES = {
  electronics: [
    { id: "front", label: "Scan device front & screen", durationReq: 3000 },
    { id: "ports", label: "Scan charging ports & buttons", durationReq: 3000 },
    { id: "serial", label: "Hold steady on Serial Number", durationReq: 2500 },
    { id: "voice", label: "State exact issue out loud", durationReq: 2000 }
  ],
  default: [
    { id: "front", label: "Show full product framing", durationReq: 3000 },
    { id: "back", label: "Rotate 360 degrees to show back", durationReq: 3500 },
    { id: "damage", label: "Point closely at visible damage", durationReq: 2500 }
  ]
};

export default function CameraCapture({ onComplete, productData }) {
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const fileInputRef = useRef(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const [isStreamReady, setIsStreamReady] = useState(false);
  const [qualityWarning, setQualityWarning] = useState(null);

  // 90-second recording cap (requirements.md §2)
  const MAX_RECORDING_SECONDS = 90;
  const [recordingSecondsLeft, setRecordingSecondsLeft] = useState(MAX_RECORDING_SECONDS);
  const recordingTimerRef = useRef(null);

  // Simulated Vision States
  const category = productData?.category || 'default';
  const checklist = INSPECTION_PROFILES[category] || INSPECTION_PROFILES.default;
  const [currentStep, setCurrentStep] = useState(0);
  const [stepProgress, setStepProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState("Awaiting Start");
  
  const chunksRef = useRef([]);
  const qualityIntervalRef = useRef(null);
  
  // Track mutating states for the setInterval engine
  const engineRef = useRef({
    recording: false,
    step: 0,
    progress: 0,
    darknessCount: 0
  });

  useEffect(() => {
    engineRef.current.recording = isRecording;
    if (isRecording) {
      setScanStatus("Scanning Bounding Box...");
    }
  }, [isRecording]);

  useEffect(() => {
    let active = true;
    startCamera();
    return () => {
      active = false;
      stopCamera();
      if (qualityIntervalRef.current) clearInterval(qualityIntervalRef.current);
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
        videoRef.current.onloadedmetadata = () => setIsStreamReady(true);
      }
      startQualityDetector(stream);
    } catch (err) {
      console.error("Camera error:", err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop());
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      stopCamera();
      setIsRecording(false);
      onComplete(file);
    }
  };

  const startQualityDetector = (stream) => {
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');

    if (qualityIntervalRef.current) clearInterval(qualityIntervalRef.current);
    qualityIntervalRef.current = setInterval(() => {
      if (!videoRef.current) return;
      ctx.drawImage(videoRef.current, 0, 0, 100, 100);
      const imgData = ctx.getImageData(0, 0, 100, 100).data;
      
      let sum = 0;
      for (let i = 0; i < imgData.length; i += 4) {
        sum += (imgData[i] + imgData[i+1] + imgData[i+2]) / 3;
      }
      const brightness = sum / (imgData.length / 4);

      // Brightness Checks
      let isClear = true;
      if (brightness < 15) {
        engineRef.current.darknessCount++;
        isClear = false;
        if (engineRef.current.darknessCount > 3) setQualityWarning("The area is too dark. Bounding Box lost.");
      } else if (brightness > 252) {
        engineRef.current.darknessCount = 0;
        isClear = false;
        setQualityWarning("Overexposed. Bounding Box lost.");
      } else {
        engineRef.current.darknessCount = 0;
        setQualityWarning(null);
      }

      // Vision Progress Engine
      if (engineRef.current.recording && engineRef.current.step < checklist.length) {
        if (isClear) {
          const currentReq = checklist[engineRef.current.step].durationReq;
          engineRef.current.progress += (250 / currentReq) * 100; // 250ms interval
          setScanStatus("Scanning...");

          if (engineRef.current.progress >= 100) {
            engineRef.current.progress = 0;
            engineRef.current.step += 1;
            setCurrentStep(engineRef.current.step);
            
            if (engineRef.current.step >= checklist.length) {
              setScanStatus("All Checks Verified!");
            }
          }
          setStepProgress(engineRef.current.progress);
        } else {
          setScanStatus("Hold camera steady...");
        }
      }
    }, 250);
  };

  const stopRecordingAndSubmit = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const startRecording = () => {
    chunksRef.current = [];
    setRecordingSecondsLeft(MAX_RECORDING_SECONDS);
    const stream = videoRef.current.srcObject;
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

    // 90-second auto-stop timer
    recordingTimerRef.current = setInterval(() => {
      setRecordingSecondsLeft(prev => {
        if (prev <= 1) {
          stopRecordingAndSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopRecording = () => stopRecordingAndSubmit();

  const activeCheck = checklist[currentStep] || checklist[checklist.length - 1];

  return (
    <div className="glass-card animate-fade-in text-center" style={{ padding: '1rem' }}>
      <h3 style={{ margin: '0 0 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
        <Scan size={20} color="var(--primary)" /> Smart Verification
      </h3>

      {qualityWarning && (
        <div style={{ background: 'var(--danger)', color: 'white', padding: '0.5rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
          <AlertTriangle size={16} /> {qualityWarning}
        </div>
      )}

      {isRecording && (
         <div style={{background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: 8, marginBottom: '1rem', border: '1px solid var(--surface-border)'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem'}}>
               <strong style={{color: currentStep >= checklist.length ? 'var(--success)' : 'white'}}>
                 {currentStep >= checklist.length ? "Verification Flow Complete" : activeCheck.label}
               </strong>
               <span style={{fontSize: '0.8rem', color: recordingSecondsLeft <= 15 ? 'var(--danger)' : 'var(--text-muted)', fontWeight: recordingSecondsLeft <= 15 ? 700 : 400}}>
                 {String(Math.floor(recordingSecondsLeft / 60)).padStart(2,'0')}:{String(recordingSecondsLeft % 60).padStart(2,'0')} left
               </span>
            </div>
            
            <div style={{height: 6, background: '#222', borderRadius: 4, overflow: 'hidden', marginBottom: '0.5rem'}}>
               <div style={{
                 height: '100%', 
                 width: `${currentStep >= checklist.length ? 100 : stepProgress}%`, 
                 background: currentStep >= checklist.length ? 'var(--success)' : 'var(--primary)', 
                 transition: 'width 0.25s linear'
               }} />
            </div>
            <div style={{fontSize: '0.8rem', color: currentStep >= checklist.length ? 'var(--success)' : 'var(--text-muted)', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 4}}>
               {currentStep >= checklist.length ? <CheckCircle2 size={12}/> : <Scan size={12}/>}
               {scanStatus}
            </div>
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
        
        {isRecording && currentStep < checklist.length && (
           <div style={{
              position: 'absolute', top: '10%', left: '10%', width: '80%', height: '80%', 
              border: '2px dashed rgba(59, 130, 246, 0.5)', borderRadius: 16, pointerEvents: 'none'
           }}>
             <div style={{position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: 'var(--primary)', color: 'white', padding: '2px 8px', fontSize: '0.7rem', borderRadius: 4, fontWeight: 'bold'}}>
                AI TARGET
             </div>
           </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        {!isRecording ? (
          <>
            <button className="btn primary" onClick={startRecording} disabled={!isStreamReady}>
              <Camera size={18} /> {isStreamReady ? 'Start Smart Scan' : 'Waiting...'}
            </button>
            <button className="btn" onClick={() => fileInputRef.current.click()} style={{background: 'rgba(255,255,255,0.05)'}}>
              <ImageIcon size={18} /> From Gallery
            </button>
            <input type="file" accept="image/*,video/*" ref={fileInputRef} onChange={handleFileUpload} style={{display: 'none'}} />
          </>
        ) : (
          <button className="btn danger-outline" onClick={stopRecording} style={{ background: currentStep >= checklist.length ? 'var(--success)' : 'var(--danger)', color: 'white', borderColor: 'transparent' }}>
            <StopCircle size={18} /> {currentStep >= checklist.length ? 'Submit Final Recording' : 'Stop & Submit Match'}
          </button>
        )}
      </div>
    </div>
  );
}
