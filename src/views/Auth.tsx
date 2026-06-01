import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { BrainCircuit, Lock, Mail, ArrowLeft, KeyRound } from 'lucide-react';

export default function Auth() {
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot' | 'verify_otp' | 'update_password'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  React.useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash && hash.includes('type=recovery')) {
        setAuthMode('update_password');
        setSuccessMsg('Recovery link accepted! Please create your new password.');
        window.history.replaceState(null, '', window.location.pathname);
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const validatePasswordStrength = (pass: string) => {
    if (pass.length < 8) {
      return '⚠️ Password must be at least 8 characters long!';
    }
    const hasLetter = /[a-zA-Z]/.test(pass);
    const hasDigit = /[0-9]/.test(pass);
    const hasSymbol = /[^a-zA-Z0-9]/.test(pass);
    
    if (!hasLetter || !hasDigit || !hasSymbol) {
      return '⚠️ Password must include letters, digits, and at least one special character (e.g., @, #, $, !, %, *, etc.)!';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (authMode === 'signup') {
        const validationErr = validatePasswordStrength(password);
        if (validationErr) {
          throw new Error(validationErr);
        }
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        else setSuccessMsg('Success! Please check your email inbox for the confirmation link.');
      } else if (authMode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
        setAuthMode('verify_otp');
        setSuccessMsg('An 8-digit OTP code has been sent to your email. Please enter it below.');
      } else if (authMode === 'verify_otp') {
        if (!otp || otp.length !== 8) {
          throw new Error('Please enter a valid 8-digit OTP code.');
        }
        sessionStorage.setItem('suppress_auth_redirect', 'true');
        const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'recovery' });
        if (error) {
          sessionStorage.removeItem('suppress_auth_redirect');
          throw error;
        }
        setAuthMode('update_password');
        setSuccessMsg('OTP verified successfully! Please create your new password.');
        setPassword('');
      } else if (authMode === 'update_password') {
        const validationErr = validatePasswordStrength(password);
        if (validationErr) {
          throw new Error(validationErr);
        }
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match!');
        }
        try {
          const { error } = await supabase.auth.updateUser({ password });
          if (error) throw error;
          
          await supabase.auth.signOut();
          
          setAuthMode('login');
          setPassword('');
          setConfirmPassword('');
          setOtp('');
          setSuccessMsg('Password updated successfully! Please log in with your new credentials.');
        } finally {
          sessionStorage.removeItem('suppress_auth_redirect');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans text-slate-900">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <BrainCircuit className="w-12 h-12 text-indigo-600 animate-pulse" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-slate-900">
          {authMode === 'login' && 'Sign in to FinaSense'}
          {authMode === 'signup' && 'Create your FinaSense Account'}
          {authMode === 'forgot' && 'Reset Password'}
          {authMode === 'verify_otp' && 'Verify OTP'}
          {authMode === 'update_password' && 'Create New Password'}
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          {authMode === 'login' ? (
            <>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => { setAuthMode('signup'); setError(null); setSuccessMsg(null); }}
                className="font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
              >
                Create a new account
              </button>
            </>
          ) : authMode === 'signup' ? (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => { setAuthMode('login'); setError(null); setSuccessMsg(null); }}
                className="font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
              >
                Sign in
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={async () => {
                const wasRecovering = sessionStorage.getItem('suppress_auth_redirect') === 'true';
                sessionStorage.removeItem('suppress_auth_redirect');
                if (wasRecovering) {
                  await supabase.auth.signOut();
                }
                setAuthMode('login'); 
                setError(null); 
                setSuccessMsg(null);
                setOtp('');
                setPassword('');
                setConfirmPassword('');
              }}
              className="inline-flex items-center gap-1.5 font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Back to login page
            </button>
          )}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-slate-200 sm:rounded-xl sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-sm text-rose-600 font-semibold leading-relaxed">
                {error}
              </div>
            )}
            
            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-sm text-emerald-600 font-semibold leading-relaxed">
                {successMsg}
              </div>
            )}

            {(authMode === 'login' || authMode === 'signup' || authMode === 'forgot' || authMode === 'verify_otp' || authMode === 'update_password') && (
              <div>
                <label className="block text-sm font-medium text-slate-700">Email address</label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    required
                    disabled={authMode === 'verify_otp' || authMode === 'update_password'}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none sm:text-sm text-slate-800 font-medium disabled:bg-slate-100 disabled:text-slate-500"
                    placeholder="name@example.com"
                  />
                </div>
              </div>
            )}

            {authMode === 'verify_otp' && (
              <div>
                <label className="block text-sm font-medium text-slate-700">8-Digit OTP Code</label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <KeyRound className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={8}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="block w-full pl-10 p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none sm:text-sm text-slate-800 font-medium tracking-widest text-center"
                    placeholder="00000000"
                  />
                </div>
              </div>
            )}

            {(authMode === 'update_password' || authMode === 'signup' || authMode === 'login') && (
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  {authMode === 'update_password' ? 'New Password' : 'Password'}
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none sm:text-sm text-slate-800 font-medium"
                    placeholder="••••••••"
                  />
                </div>
                {authMode === 'login' && (
                  <div className="mt-2 text-right">
                    <button
                      type="button"
                      onClick={() => { setAuthMode('forgot'); setError(null); setSuccessMsg(null); }}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
                {(authMode === 'signup' || authMode === 'update_password') && (
                  <p className="mt-1.5 text-[11px] text-slate-500 leading-normal">
                    💡 Your password must be <strong>at least 8 characters</strong> long and include a mix of <strong>letters</strong>, <strong>digits</strong>, and <strong>special symbols</strong>.
                  </p>
                )}
              </div>
            )}

            {authMode === 'update_password' && (
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Confirm Password
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full pl-10 p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none sm:text-sm text-slate-800 font-medium"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {loading ? 'Please wait...' : (
                <>
                  {authMode === 'login' && 'Sign In'}
                  {authMode === 'signup' && 'Create Account'}
                  {authMode === 'forgot' && 'Send Reset OTP'}
                  {authMode === 'verify_otp' && 'Verify OTP'}
                  {authMode === 'update_password' && 'Update Password'}
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
