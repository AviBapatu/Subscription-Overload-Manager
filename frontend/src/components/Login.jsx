import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { loginUser, registerUser, requestPasswordReset, verifyResetOtp, resetPassword } from '../lib/api';

const Login = () => {
    const navigate = useNavigate();
    const { setUser } = useAuth();
    const [form, setForm] = useState({ email: '', password: '', name: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isSignup, setIsSignup] = useState(false);
    
    // 0 = Off, 1 = Email Input, 2 = OTP Input, 3 = New Password
    const [forgotStep, setForgotStep] = useState(0); 
    const [resetForm, setResetForm] = useState({ email: '', otp: '', newPassword: '' });

    const handleChange = (e) => {
        setForm(f => ({ ...f, [e.target.id]: e.target.value }));
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.email.trim() || !form.password) { setError('Email and password are required.'); return; }
        setLoading(true);
        setError('');
        try {
            let user;
            if (isSignup) {
                user = await registerUser(form.email.trim(), form.password, form.name.trim() || undefined);
            } else {
                user = await loginUser(form.email.trim(), form.password);
            }
            setUser(user);
            navigate('/', { replace: true });
        } catch (err) {
            setError(err.message || 'Something went wrong. Is the backend running?');
        } finally {
            setLoading(false);
        }
    };

    const handleResetChange = (e) => {
        setResetForm(f => ({ ...f, [e.target.id]: e.target.value }));
        setError('');
    };

    const handleForgotFlow = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            if (forgotStep === 1) {
                if (!resetForm.email.trim()) throw new Error('Email is required');
                await requestPasswordReset(resetForm.email.trim());
                setForgotStep(2);
            } else if (forgotStep === 2) {
                if (!resetForm.otp.trim()) throw new Error('OTP is required');
                await verifyResetOtp(resetForm.email.trim(), resetForm.otp.trim());
                setForgotStep(3);
            } else if (forgotStep === 3) {
                if (!resetForm.newPassword) throw new Error('New password is required');
                await resetPassword(resetForm.email.trim(), resetForm.otp.trim(), resetForm.newPassword);
                setForgotStep(0);
                setIsSignup(false);
                setForm(f => ({ ...f, email: resetForm.email, password: '' })); // Auto-fill their email for login
            }
        } catch (err) {
            setError(err.message || 'Verification failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6">
            {/* Background Glow */}
            <div className="fixed top-[-10%] right-[-5%] w-[40vw] h-[40vw] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
            <div className="fixed bottom-[-10%] left-[-5%] w-[40vw] h-[40vw] rounded-full bg-tertiary/5 blur-[120px] pointer-events-none" />

            <main className="w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-500">
                {/* Auth Card */}
                <div className="glass-card rounded-2xl shadow-[0_30px_60px_rgba(0,88,187,0.10)] p-10 flex flex-col items-center bg-white/70">

                    {/* Logo / Header */}
                    <div className="mb-10 text-center">
                        <h1 className="text-3xl font-black tracking-tighter text-on-surface">The Concierge</h1>
                        <p className="text-on-surface-variant font-medium tracking-tight mt-1">
                            {forgotStep > 0 
                                ? forgotStep === 1 ? 'Reset your password' 
                                  : forgotStep === 2 ? 'Enter your secure OTP'
                                  : 'Draft a new password'
                                : isSignup ? 'Create your curator profile' : 'Sign in to your workspace'}
                        </p>
                    </div>

                    {forgotStep > 0 ? (
                        <form className="w-full space-y-5" onSubmit={handleForgotFlow}>
                            {forgotStep === 1 && (
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-on-surface-variant ml-1" htmlFor="email">Email</label>
                                    <div className="relative">
                                       <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-outline">
                                           <span className="material-symbols-outlined text-lg">mail</span>
                                       </div>
                                       <input className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl py-4 pl-12 pr-4 focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all duration-300 outline-none text-on-background placeholder:text-outline-variant"
                                           id="email" type="email" placeholder="curator@concierge.com" value={resetForm.email} onChange={handleResetChange} />
                                    </div>
                                </div>
                            )}

                            {forgotStep === 2 && (
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-on-surface-variant ml-1" htmlFor="otp">6-Digit Code</label>
                                    <div className="relative">
                                       <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-outline">
                                           <span className="material-symbols-outlined text-lg">pin</span>
                                       </div>
                                       <input className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl py-4 pl-12 pr-4 focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all duration-300 outline-none font-mono text-center tracking-widest text-on-background placeholder:text-outline-variant"
                                           id="otp" type="text" maxLength="6" placeholder="000000" value={resetForm.otp} onChange={handleResetChange} />
                                    </div>
                                </div>
                            )}

                            {forgotStep === 3 && (
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-on-surface-variant ml-1" htmlFor="newPassword">New Password</label>
                                    <div className="relative">
                                       <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-outline">
                                           <span className="material-symbols-outlined text-lg">lock</span>
                                       </div>
                                       <input className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl py-4 pl-12 pr-4 focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all duration-300 outline-none text-on-background placeholder:text-outline-variant"
                                           id="newPassword" type="password" placeholder="••••••••" value={resetForm.newPassword} onChange={handleResetChange} />
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div className="flex items-center gap-2 text-sm text-error bg-error-container/10 border border-error-container/20 rounded-xl px-4 py-3">
                                    <span className="material-symbols-outlined text-sm">error</span>{error}
                                </div>
                            )}

                            <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-primary to-tertiary text-white font-bold py-4 rounded-full shadow-lg shadow-primary/20 hover:scale-[1.02] disabled:opacity-60 transition-all">
                                {loading ? 'Processing...' : forgotStep === 1 ? 'Send OTP' : forgotStep === 2 ? 'Verify OTP' : 'Save New Password'}
                            </button>

                            <div className="pt-3 w-full text-center">
                                <button type="button" onClick={() => { setForgotStep(0); setError(''); }} className="text-sm text-on-surface-variant font-medium hover:text-primary transition-colors">
                                    Return to Sign In
                                </button>
                            </div>
                        </form>
                    ) : (
                        <form className="w-full space-y-5" onSubmit={handleSubmit}>
                            {/* Name field (signup only) */}
                            {isSignup && (
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-on-surface-variant ml-1" htmlFor="name">Display Name</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-outline">
                                            <span className="material-symbols-outlined text-lg">badge</span>
                                        </div>
                                        <input className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl py-4 pl-12 pr-4 focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none text-on-background placeholder:text-outline-variant"
                                            id="name" placeholder="Your name" type="text" value={form.name} onChange={handleChange} />
                                    </div>
                                </div>
                            )}

                            {/* Email */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-on-surface-variant ml-1" htmlFor="email">Email Address</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-outline">
                                        <span className="material-symbols-outlined text-lg">mail</span>
                                    </div>
                                    <input className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl py-4 pl-12 pr-4 focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none text-on-background placeholder:text-outline-variant"
                                        id="email" placeholder="curator@concierge.com" type="email" value={form.email} onChange={handleChange} autoComplete="email" />
                                </div>
                            </div>

                            {/* Password */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-on-surface-variant ml-1" htmlFor="password">Password</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-outline">
                                        <span className="material-symbols-outlined text-lg">lock</span>
                                    </div>
                                    <input className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl py-4 pl-12 pr-4 focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none text-on-background placeholder:text-outline-variant"
                                        id="password" placeholder="••••••••" type="password" value={form.password} onChange={handleChange} autoComplete="current-password" />
                                </div>
                                {!isSignup && (
                                    <div className="w-full text-right pt-1">
                                        <button type="button" onClick={() => { setForgotStep(1); setError(''); }} className="text-xs text-primary font-bold hover:underline">
                                            Forgot your password?
                                        </button>
                                    </div>
                                )}
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 text-sm text-error bg-error-container/10 border border-error-container/20 rounded-xl px-4 py-3">
                                    <span className="material-symbols-outlined text-sm">error</span>{error}
                                </div>
                            )}

                            <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-primary to-tertiary text-white font-bold py-4 rounded-full shadow-lg shadow-primary/20 hover:scale-[1.02] disabled:opacity-60 transition-all flex items-center justify-center gap-2">
                                {loading ? (
                                    <>
                                        <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                        <span>Signing in…</span>
                                    </>
                                ) : (
                                    <>
                                        <span>{isSignup ? 'Create Profile' : 'Sign In'}</span>
                                        <span className="material-symbols-outlined text-xl">arrow_forward</span>
                                    </>
                                )}
                            </button>
                        </form>
                    )}

                    {/* Toggle signup/login */}
                    {forgotStep === 0 && (
                        <div className="mt-8 pt-8 border-t border-outline-variant/10 w-full text-center">
                            <p className="text-sm text-on-surface-variant">
                                {isSignup ? 'Already have an account?' : "Don't have an account?"}
                                <button onClick={() => { setIsSignup(v => !v); setError(''); }} className="text-primary font-bold hover:underline ml-1">
                                    {isSignup ? 'Sign In' : 'Create Curator Profile'}
                                </button>
                            </p>
                        </div>
                    )}
                </div>

                <footer className="mt-8 flex justify-center gap-6 text-on-surface-variant/60 text-xs font-medium">
                    <a className="hover:text-on-surface transition-colors" href="#">Privacy Policy</a>
                    <a className="hover:text-on-surface transition-colors" href="#">Terms of Service</a>
                    <a className="hover:text-on-surface transition-colors" href="#">Support</a>
                </footer>
            </main>
        </div>
    );
};

export default Login;
