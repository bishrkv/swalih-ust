import React, { useState, useEffect } from 'react';
import { Delete, Building2, Shield, Lock } from 'lucide-react';
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

  // Handle number input (from keypad or physical keyboard)
  const handlePress = (num: string) => {
    if (loading || error) return;
    if (pin.length < 4) {
      const nextPin = pin + num;
      setPin(nextPin);
    }
  };

  const handleDelete = () => {
    if (loading || error) return;
    setPin(prev => prev.slice(0, -1));
  };

  // Keyboard Event Listeners for physical numeric entry
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        handlePress(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, loading, error]);

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
                Enter Passcode
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
          <div className="flex items-center justify-center w-16 h-16 sm:w-18 sm:h-18 text-zinc-600">
            <Lock className="w-4 h-4 opacity-30" />
          </div>

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

        {/* Device/Authority Label */}
        <div className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase pt-2 flex items-center gap-1.5 justify-center">
          <Shield className="w-3.5 h-3.5 text-zinc-600" />
          Authorized Entry Point
        </div>
      </motion.div>
    </div>
  );
}

