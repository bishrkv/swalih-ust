import React, { useState, useEffect } from 'react';
import { Lock, User, Eye, EyeOff, Building2 } from 'lucide-react';
import { motion } from 'motion/react';
import { getSettingsPassword } from '../firebase';

interface LoginProps {
  onLoginSuccess: () => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [savedPassword, setSavedPassword] = useState('6780');

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Mimic real auth with server checks
    setTimeout(() => {
      if (username.trim().toLowerCase() === 'swalih' && password === savedPassword) {
        onLoginSuccess();
      } else {
        setError('Invalid Username or Password');
      }
      setLoading(false);
    }, 600);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-900 via-emerald-800 to-zinc-950 px-4">
      {/* Decorative Islamic Background Pattern Elements */}
      <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]"></div>
      
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden border border-emerald-100 dark:border-zinc-800"
      >
        {/* Banner/Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-emerald-600 p-8 text-center text-white relative">
          <div className="absolute top-2 right-2 opacity-10">
            <Building2 className="w-24 h-24" />
          </div>
          <div className="mx-auto w-16 h-16 bg-white/10 rounded-full flex items-center justify-center border border-white/20 mb-3 shadow-inner">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold tracking-wide">USBA MARRIAGE FUND</h2>
          <p className="text-xs text-emerald-100/90 mt-1 font-mono uppercase tracking-widest">Management System</p>
        </div>

        {/* Form Body */}
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-3.5 bg-rose-50 border border-rose-200 dark:bg-rose-950/30 dark:border-rose-900 text-rose-700 dark:text-rose-200 rounded-xl text-sm font-medium text-center"
                id="login-error-message"
              >
                {error}
              </motion.div>
            )}

            {/* Username Input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-600/70 dark:text-emerald-400">
                  <User className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-sm font-medium"
                  placeholder="Enter username"
                  id="login-username-input"
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-600/70 dark:text-emerald-400">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-11 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-sm font-medium"
                  placeholder="Enter password"
                  id="login-password-input"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400"
                  id="toggle-login-password-visibility"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-emerald-700 hover:bg-emerald-600 disabled:bg-emerald-800/60 text-white font-semibold rounded-xl shadow-lg shadow-emerald-700/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wider cursor-pointer"
              id="login-submit-btn"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'Access System'
              )}
            </button>
          </form>

          {/* Footer note */}
          <div className="mt-8 text-center text-xs text-zinc-400 font-medium">
            Authorized Personnel Only
          </div>
        </div>
      </motion.div>
    </div>
  );
}
