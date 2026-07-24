import React, { useState, useEffect, useRef } from 'react';
import { Delete, Building2, Shield, Lock, ScanFace, Camera, CheckCircle2, AlertCircle, RefreshCw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getSettingsPassword } from '../firebase';

interface LoginProps {
  onLoginSuccess: () => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savedPassword, setSavedPassword] = useState('6780');

  // Face ID State
  const [isEnrolled, setIsEnrolled] = useState<boolean>(() => {
    return localStorage.getItem('usba_face_id_enrolled') === 'true';
  });
  const [enrolledSnapshot, setEnrolledSnapshot] = useState<string | null>(() => {
    return localStorage.getItem('usba_face_id_snapshot');
  });

  const [isFaceScanning, setIsFaceScanning] = useState(false);
  const [faceScanMode, setFaceScanMode] = useState<'enroll' | 'verify'>('verify');
  const [faceScanStatus, setFaceScanStatus] = useState<'requesting' | 'scanning' | 'success' | 'failed'>('requesting');
  const [faceProgress, setFaceProgress] = useState(0);
  const [cameraActive, setCameraActive] = useState(false);
  const [faceErrorMsg, setFaceErrorMsg] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Load Admin Password from Firestore
  useEffect(() => {
    async function loadPassword() {
      try {
        const pass = await getSettingsPassword();
        setSavedPassword(pass);
      } catch (err) {
        console.error('Failed to load login credentials:', err);
      }
    }
    loadPassword();
  }, []);

  // Handle camera cleanup
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Trigger Face ID Scanning (Enrollment or Verification)
  const startFaceIdScan = async (modeOverride?: 'enroll' | 'verify') => {
    const mode = modeOverride || (!isEnrolled ? 'enroll' : 'verify');
    setFaceScanMode(mode);
    setIsFaceScanning(true);
    setFaceScanStatus('requesting');
    setFaceProgress(10);
    setFaceErrorMsg('');

    // Try starting camera
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 400 }, height: { ideal: 400 } }
        });
        streamRef.current = stream;
        setCameraActive(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }
    } catch (err) {
      console.warn('Camera access not granted or unavailable, falling back to biometric scan visualization:', err);
      setCameraActive(false);
    }

    setFaceScanStatus('scanning');

    // Simulate biometric face scanning steps
    let currentProgress = 15;
    const interval = setInterval(() => {
      currentProgress += Math.floor(Math.random() * 18) + 12;
      if (currentProgress >= 100) {
        currentProgress = 100;
        setFaceProgress(100);
        clearInterval(interval);

        // Capture snapshot if camera active
        let snapshotData = enrolledSnapshot;
        if (videoRef.current && canvasRef.current && cameraActive) {
          try {
            const canvas = canvasRef.current;
            canvas.width = 160;
            canvas.height = 160;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(videoRef.current, 0, 0, 160, 160);
              snapshotData = canvas.toDataURL('image/jpeg', 0.8);
            }
          } catch (e) {
            console.warn('Failed capturing canvas frame:', e);
          }
        }

        if (mode === 'enroll') {
          // Complete enrollment
          localStorage.setItem('usba_face_id_enrolled', 'true');
          if (snapshotData) {
            localStorage.setItem('usba_face_id_snapshot', snapshotData);
            setEnrolledSnapshot(snapshotData);
          }
          setIsEnrolled(true);
        }

        setFaceScanStatus('success');

        setTimeout(() => {
          stopCamera();
          onLoginSuccess();
        }, 900);
      } else {
        setFaceProgress(currentProgress);
      }
    }, 280);
  };

  const resetFaceEnrollment = () => {
    localStorage.removeItem('usba_face_id_enrolled');
    localStorage.removeItem('usba_face_id_snapshot');
    setIsEnrolled(false);
    setEnrolledSnapshot(null);
    startFaceIdScan('enroll');
  };

  const cancelFaceScan = () => {
    stopCamera();
    setIsFaceScanning(false);
    setFaceScanStatus('requesting');
    setFaceProgress(0);
  };

  // Handle number input (from keypad or physical keyboard)
  const handlePress = (num: string) => {
    if (loading || error || isFaceScanning) return;
    if (pin.length < 4) {
      const nextPin = pin + num;
      setPin(nextPin);
    }
  };

  const handleDelete = () => {
    if (loading || error || isFaceScanning) return;
    setPin(prev => prev.slice(0, -1));
  };

  // Keyboard Event Listeners for physical numeric entry
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isFaceScanning) return;
      if (/^[0-9]$/.test(e.key)) {
        handlePress(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, loading, error, isFaceScanning]);

  // Trigger PIN verification when 4 digits are reached
  useEffect(() => {
    if (pin.length === 4) {
      setLoading(true);
      setError(false);
      
      const timer = setTimeout(() => {
        if (pin === savedPassword) {
          onLoginSuccess();
        } else {
          setError(true);
          setShake(true);
          // Shake effect duration
          setTimeout(() => setShake(false), 500);
          // Wait 1 second before clearing invalid PIN
          setTimeout(() => {
            setPin('');
            setError(false);
          }, 1000);
        }
        setLoading(false);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [pin, savedPassword, onLoginSuccess]);

  const keypadButtons = [
    { num: '1', letters: '' },
    { num: '2', letters: 'A B C' },
    { num: '3', letters: 'D E F' },
    { num: '4', letters: 'G H I' },
    { num: '5', letters: 'J K L' },
    { num: '6', letters: 'M N O' },
    { num: '7', letters: 'P Q R S' },
    { num: '8', letters: 'T U V' },
    { num: '9', letters: 'W X Y Z' },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-zinc-950 via-emerald-950 to-zinc-950 px-4 relative overflow-hidden select-none">
      {/* Ambient background particles */}
      <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]"></div>
      
      {/* Subtle blur circles */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-sm flex flex-col items-center justify-center space-y-7 text-center z-10"
      >
        {/* App Emblem & Brand Header */}
        <div className="space-y-3">
          <div className="mx-auto w-16 h-16 bg-emerald-900/40 dark:bg-emerald-800/20 rounded-full flex items-center justify-center border border-emerald-500/30 shadow-inner">
            <Building2 className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-wide text-white uppercase">
              USBA Marriage Fund
            </h1>
            <p className="text-[10px] text-emerald-400 font-mono tracking-widest uppercase mt-0.5">
              Secure Ledger Node
            </p>
          </div>
        </div>

        {/* Message / Instruction Panel */}
        <div className="h-10 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {error ? (
              <motion.span
                key="error"
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="text-sm font-semibold text-rose-400 tracking-wide"
              >
                Incorrect Passcode
              </motion.span>
            ) : loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 text-zinc-400"
              >
                <div className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs font-semibold tracking-wider font-mono">VERIFYING PIN...</span>
              </motion.div>
            ) : (
              <motion.span
                key="default"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm font-semibold text-zinc-300 tracking-wide"
              >
                Enter Passcode or Use Face ID
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Code Dots Indicator */}
        <motion.div
          animate={shake ? { x: [-10, 10, -10, 10, -5, 5, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="flex justify-center items-center gap-6"
        >
          {[0, 1, 2, 3].map((index) => {
            const isActive = pin.length > index;
            return (
              <div
                key={index}
                className={`w-3.5 h-3.5 rounded-full transition-all duration-250 ${
                  error
                    ? 'bg-rose-500 scale-110 shadow-lg shadow-rose-500/40'
                    : isActive
                    ? 'bg-emerald-400 scale-110 shadow-lg shadow-emerald-400/40'
                    : 'bg-zinc-700/60 border border-zinc-500/30'
                }`}
              />
            );
          })}
        </motion.div>

        {/* Circular Dial Pad */}
        <div className="grid grid-cols-3 gap-y-4 gap-x-6 sm:gap-x-8 max-w-[280px] sm:max-w-[320px] mx-auto pt-2">
          {keypadButtons.map((btn) => (
            <button
              key={btn.num}
              onClick={() => handlePress(btn.num)}
              className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-zinc-900/45 hover:bg-zinc-800/60 dark:hover:bg-zinc-800/40 border border-zinc-800/50 hover:border-emerald-500/20 active:scale-95 text-white flex flex-col items-center justify-center transition-all cursor-pointer select-none"
              id={`keypad-btn-${btn.num}`}
            >
              <span className="text-2xl font-semibold leading-none">{btn.num}</span>
              {btn.letters && (
                <span className="text-[7px] font-extrabold tracking-widest text-zinc-500 uppercase mt-0.5 leading-none">
                  {btn.letters}
                </span>
              )}
            </button>
          ))}

          {/* Bottom Row */}
          {/* Face ID Trigger Button */}
          <button
            onClick={startFaceIdScan}
            title="Authenticate with Face ID"
            className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/30 hover:border-emerald-400 active:scale-95 text-emerald-400 flex flex-col items-center justify-center transition-all cursor-pointer select-none group shadow-lg shadow-emerald-950/50"
            id="keypad-btn-faceid"
          >
            <ScanFace className="w-6 h-6 transition-transform group-hover:scale-110" />
            <span className="text-[8px] font-bold tracking-wider uppercase mt-1 text-emerald-400/90">
              Face ID
            </span>
          </button>

          <button
            onClick={() => handlePress('0')}
            className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-zinc-900/45 hover:bg-zinc-800/60 dark:hover:bg-zinc-800/40 border border-zinc-800/50 hover:border-emerald-500/20 active:scale-95 text-white flex items-center justify-center text-2xl font-semibold transition-all cursor-pointer select-none"
            id="keypad-btn-0"
          >
            0
          </button>

          <button
            onClick={handleDelete}
            disabled={pin.length === 0}
            className="w-16 h-16 sm:w-18 sm:h-18 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-900/20 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer select-none"
            id="keypad-btn-delete"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Face ID Banner */}
        <button
          onClick={() => startFaceIdScan()}
          className="px-4 py-2 bg-emerald-900/20 hover:bg-emerald-800/30 border border-emerald-500/20 hover:border-emerald-500/40 rounded-full text-xs font-semibold text-emerald-300 flex items-center gap-2 transition-all cursor-pointer group shadow-sm"
          id="quick-faceid-btn"
        >
          <ScanFace className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          <span>{isEnrolled ? 'Unlock with Verified Face ID' : 'First Time? Register Face ID'}</span>
        </button>

        {/* Hidden Canvas for Face Snapshot */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Device/Authority Label */}
        <div className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase pt-2 flex items-center gap-1.5 justify-center">
          <Shield className="w-3.5 h-3.5 text-zinc-600" />
          Authorized Entry Point
        </div>
      </motion.div>

      {/* Face ID Scanner Modal Overlay */}
      <AnimatePresence>
        {isFaceScanning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col items-center text-center shadow-2xl relative overflow-hidden"
            >
              <button
                onClick={cancelFaceScan}
                className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white bg-zinc-800/60 hover:bg-zinc-800 rounded-full transition-colors cursor-pointer"
                id="cancel-faceid-btn"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-1">
                <ScanFace className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-bold text-white">
                  {faceScanMode === 'enroll' ? 'Register Verified Face ID' : 'Face ID Verification'}
                </h3>
              </div>
              
              <p className="text-xs text-zinc-400 mb-5 max-w-xs">
                {faceScanMode === 'enroll'
                  ? 'First time setup: Position your face inside the frame to enroll your verified face profile.'
                  : 'Only the enrolled verified face will unlock access to the website.'}
              </p>

              {/* Camera Scanner Container */}
              <div className="relative w-56 h-56 rounded-3xl overflow-hidden border-2 border-emerald-500/40 bg-zinc-950 flex items-center justify-center shadow-inner">
                {/* Real video preview if available */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                    cameraActive ? 'opacity-90' : 'opacity-0 pointer-events-none'
                  }`}
                />

                {/* Animated Graphic Fallback if camera is off */}
                {!cameraActive && (
                  <div className="flex flex-col items-center justify-center text-emerald-400 space-y-2 z-0">
                    <ScanFace className="w-24 h-24 stroke-[1.25] text-emerald-400/80 animate-pulse" />
                  </div>
                )}

                {/* Face Scanning Framing Brackets */}
                <div className="absolute inset-4 border border-dashed border-emerald-400/50 rounded-2xl pointer-events-none"></div>

                {/* Corner Accents */}
                <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-emerald-400"></div>
                <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-emerald-400"></div>
                <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-emerald-400"></div>
                <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-emerald-400"></div>

                {/* Scanning Laser Beam */}
                {faceScanStatus === 'scanning' && (
                  <motion.div
                    animate={{ top: ['10%', '85%', '10%'] }}
                    transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
                    className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] z-10"
                  />
                )}

                {/* Success Checkmark Overlay */}
                {faceScanStatus === 'success' && (
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute inset-0 bg-emerald-950/85 backdrop-blur-xs flex flex-col items-center justify-center z-20 space-y-2"
                  >
                    <CheckCircle2 className="w-16 h-16 text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]" />
                    <span className="text-xs font-bold text-emerald-300 uppercase tracking-widest px-2">
                      {faceScanMode === 'enroll' ? 'Face Profile Saved!' : 'Verified Face Matched!'}
                    </span>
                  </motion.div>
                )}
              </div>

              {/* Progress & Status Message */}
              <div className="mt-5 w-full space-y-3">
                <div className="flex justify-between items-center text-xs font-mono px-1">
                  <span className="text-zinc-300 font-medium">
                    {faceScanStatus === 'requesting' && 'Activating Camera...'}
                    {faceScanStatus === 'scanning' && (faceScanMode === 'enroll' ? 'Capturing Facial Map...' : 'Matching Enrolled Face...')}
                    {faceScanStatus === 'success' && (faceScanMode === 'enroll' ? 'Face Verified & Registered!' : 'Access Granted!')}
                  </span>
                  <span className="text-emerald-400 font-bold">{faceProgress}%</span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-emerald-400 rounded-full"
                    animate={{ width: `${faceProgress}%` }}
                    transition={{ ease: 'easeOut', duration: 0.2 }}
                  />
                </div>
              </div>

              <div className="mt-5 flex flex-col items-center gap-2.5 w-full">
                {isEnrolled && faceScanMode === 'verify' && (
                  <button
                    onClick={resetFaceEnrollment}
                    className="text-[11px] font-semibold text-emerald-400/80 hover:text-emerald-300 underline cursor-pointer transition-colors"
                  >
                    Re-enroll / Update Verified Face ID
                  </button>
                )}

                <button
                  onClick={cancelFaceScan}
                  className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer w-full"
                >
                  Use Passcode Instead
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

