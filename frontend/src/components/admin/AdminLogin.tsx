
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db, functions } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { signInWithEmailAndPassword, signInWithCustomToken, sendPasswordResetEmail, updatePassword } from 'firebase/auth';
import { Mail, Lock, AlertCircle, CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import Logo from '../../components/Logo';

const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'password' | 'pin'>('password');
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const detectedLoginMethod = /^\d{4,6}$/.test(password.trim()) ? 'pin' : 'password';
      let loginEmail = email.trim();
      if (!loginEmail.includes('@')) {
        const resolveLoginIdentifier = httpsCallable(functions, 'resolveLoginIdentifier');
        const result = await resolveLoginIdentifier({ identifier: loginEmail });
        loginEmail = String((result.data as { email?: string }).email || '');
      }
      if (!loginEmail) throw new Error('Invalid credentials.');
      if (detectedLoginMethod === 'pin') {
        const result = await httpsCallable(functions, 'loginWithPin')({ identifier: loginEmail, pin: password });
        const token = String((result.data as { token?: string }).token || '');
        if (!token) throw new Error('Invalid credentials.');
        await signInWithCustomToken(auth, token);
      } else {
        await signInWithEmailAndPassword(auth, loginEmail, password);
      }
      const accessSnapshot = await getDoc(doc(db, 'adminUsers', auth.currentUser?.uid || ''));
      if (accessSnapshot.exists() && accessSnapshot.data().mustChangePassword === true) {
        setMustChangePassword(true);
        return;
      }
      navigate('/admin');
    } catch (err: any) {
      console.error("Login failed", err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError('Invalid credentials. Please check your email and password.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later.');
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForcedPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 12 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/\d/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) {
      setError('Use at least 12 characters with uppercase, lowercase, a number, and a special character.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }
    setIsLoading(true);
    try {
      if (!auth.currentUser) throw new Error('Your session has expired. Please sign in again.');
      await updatePassword(auth.currentUser, newPassword);
      await httpsCallable(functions, 'completeAdminPasswordChange')();
      navigate('/admin');
    } catch (err: any) {
      setError(err?.message || 'Unable to update the temporary password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your username or email address to reset password');
      return;
    }
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    try {
      let resetEmail = email.trim();
      if (!resetEmail.includes('@')) {
        const resolveLoginIdentifier = httpsCallable(functions, 'resolveLoginIdentifier');
        const result = await resolveLoginIdentifier({ identifier: resetEmail });
        resetEmail = String((result.data as { email?: string }).email || '');
      }
      if (!resetEmail) throw new Error('Invalid login identifier.');
      await sendPasswordResetEmail(auth, resetEmail);
      setSuccess('Password reset link sent to your email!');
      setTimeout(() => setIsForgotPassword(false), 3000);
    } catch (err: any) {
      console.error("Reset failed", err);
      setError('Failed to send reset email. Please check the identifier provided.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-brand-orange p-8 text-center relative overflow-hidden">
          <div className="relative z-10">
            <Logo size={160} className="mx-auto mb-4 drop-shadow-lg" />
            <h2 className="text-2xl font-bold text-white mb-1">Admin Portal</h2>
            <p className="text-brand-orange-100 text-sm">Secure Access Only</p>
          </div>
          {/* Decorative circles */}
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
        </div>

        {/* Form Body */}
        <div className="p-8">
          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3 text-sm text-red-600 animate-in slide-in-from-top-1">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-6 p-3 bg-green-50 border border-green-100 rounded-lg flex items-start gap-3 text-sm text-green-600 animate-in slide-in-from-top-1">
              <CheckCircle size={18} className="shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {mustChangePassword ? (
            <form onSubmit={handleForcedPasswordChange} className="space-y-5">
              <div className="text-center mb-6"><h3 className="text-lg font-semibold text-gray-900">Set a new password</h3><p className="text-sm text-gray-500 mt-1">Your temporary administrator password must be changed before continuing.</p></div>
              <input type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="New password" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" required />
              <input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Confirm new password" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" required />
              <p className="text-xs text-gray-500">Minimum 12 characters with uppercase, lowercase, number, and special character.</p>
              <button type="submit" disabled={isLoading} className="w-full bg-brand-orange text-white py-3 rounded-lg font-semibold disabled:opacity-70">{isLoading ? 'Updating…' : 'Set new password'}</button>
            </form>
          ) : !isForgotPassword ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Username or Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange focus:outline-none transition-all"
                    placeholder="admin@example.com"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-sm font-medium text-gray-700">Password or PIN</label>
                  <button
                    type="button"
                    onClick={() => {
                        setIsForgotPassword(true);
                        setError(null);
                        setSuccess(null);
                    }}
                    className="text-xs font-semibold text-brand-orange hover:text-brand-orange/80"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type={loginMethod === 'pin' ? 'tel' : 'password'}
                    inputMode={loginMethod === 'pin' ? 'numeric' : undefined}
                    pattern={loginMethod === 'pin' ? '[0-9]{4,6}' : undefined}
                    maxLength={loginMethod === 'pin' ? 6 : undefined}
                    autoComplete={loginMethod === 'pin' ? 'one-time-code' : 'current-password'}
                    placeholder="Password or PIN"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange focus:outline-none transition-all"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-brand-orange text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-brand-orange/90 transition-colors shadow-lg shadow-brand-orange/20 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    Sign In <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Reset Password</h3>
                <p className="text-sm text-gray-500 mt-1">Enter your email to receive recovery instructions.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Username or Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange focus:outline-none transition-all"
                    placeholder="admin@example.com"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-slate-800 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-slate-700 transition-colors shadow-lg shadow-slate-800/20 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  "Send Reset Link"
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                    setIsForgotPassword(false);
                    setError(null);
                    setSuccess(null);
                }}
                className="w-full text-sm text-gray-500 hover:text-gray-700 font-medium py-2"
              >
                Back to Login
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-4 text-center border-t border-gray-100">
           <p className="text-xs text-gray-400">© 2026 CMG Ltd. Authorized personnel only.</p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
