import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { loginUser, registerUser, requestPasswordReset, verifyResetOtp, resetPassword, googleLoginApi } from '../lib/api';
import { GoogleLogin } from '@react-oauth/google';

const Login = () => {
    const navigate = useNavigate();
    const { setUser } = useAuth();
    const [form, setForm] = useState({ email: '', password: '', name: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isSignup, setIsSignup] = useState(false);
    
    // Toggle password visibility
    const [showPassword, setShowPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);

    // 0 = Off, 1 = Email Input, 2 = OTP Input, 3 = New Password
    const [forgotStep, setForgotStep] = useState(0); 
    const [resetForm, setResetForm] = useState({ email: '', otp: '', newPassword: '' });

    const handleGoogleSuccess = async (credentialResponse) => {
        try {
            const data = await googleLoginApi(credentialResponse.credential);
            setUser(data);
            navigate('/');
        } catch (err) {
            console.error('Google login failed:', err);
            alert('Google login failed. Please try again.');
        }
    };

    const handleChange = (e) => {
        setForm(f => ({ ...f, [e.target.id]: e.target.value }));
        setError('');
    };

    const handleResetChange = (e) => {
        setResetForm(f => ({ ...f, [e.target.id]: e.target.value }));
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
                setForm(f => ({ ...f, email: resetForm.email, password: '' }));
            }
        } catch (err) {
            setError(err.message || 'Verification failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="flex flex-col lg:flex-row h-screen w-full bg-[#F8F9FA] text-gray-800 antialiased font-sans overflow-hidden">
            {/* BEGIN: Left Column (Content & Form) */}
            <section className="flex-1 flex flex-col justify-center px-8 sm:px-16 lg:px-24 xl:px-32 bg-white/50 backdrop-blur-sm lg:bg-transparent relative z-10 h-full max-h-screen overflow-hidden">
                {/* Content Wrapper */}
                <div className="max-w-md mx-auto w-full flex flex-col justify-center my-auto py-4">
                    
                    {/* Heading & Subheading */}
                    <header className={isSignup ? 'mb-4' : 'mb-6'}>
                        <h1 className={`font-bold leading-tight tracking-tight text-[#1A1F2C] mb-2 ${
                            isSignup
                                ? 'text-3xl sm:text-4xl lg:text-[36px]'
                                : 'text-4xl sm:text-5xl lg:text-[50px]'
                        }`}>
                            {forgotStep > 0 
                                ? 'Password Reset' 
                                : (isSignup ? 'Take control of your subscriptions' : 'Welcome back')}
                        </h1>
                        <p className="text-sm sm:text-base text-[#5A6376] leading-relaxed max-w-[380px]">
                            {forgotStep > 0
                                ? 'Follow the steps to regain access to your dashboard.'
                                : (isSignup ? 'Join thousands managing their recurring payments in one place.' : 'Log in safely to curate your subscription dashboard.')}
                        </p>
                    </header>

                    {/* Form Area */}
                    <div className="w-full max-w-[400px]">
                        
                        {forgotStep === 0 && (
                            <>
                                {/* Google Auth Button */}
                                {/* Google Auth Button */}
                                <div className={`flex justify-center ${isSignup ? 'mb-4' : 'mb-5'}`}>
                                    <GoogleLogin
                                        onSuccess={handleGoogleSuccess}
                                        onError={() => alert('Google login failed')}
                                        text={isSignup ? "signup_with" : "signin_with"}
                                        shape="rectangular"
                                    />
                                </div>
                                
                                {/* Divider */}
                                <div className={`relative flex items-center ${isSignup ? 'mb-4' : 'mb-5'}`}>
                                    <div className="flex-grow border-t border-gray-200"></div>
                                    <span className="flex-shrink-0 mx-4 text-[#8E95A4] text-xs uppercase font-medium tracking-wider">OR</span>
                                    <div className="flex-grow border-t border-gray-200"></div>
                                </div>
                            </>
                        )}

                        {error && (
                            <div className="mb-6 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                                <span className="material-symbols-outlined text-red-600 text-[20px]">error</span>
                                {error}
                            </div>
                        )}

                        {forgotStep > 0 ? (
                            <form className="flex flex-col gap-3" onSubmit={handleForgotFlow}>
                                {forgotStep === 1 && (
                                    <div className="relative">
                                        <label className="sr-only" htmlFor="email">Email address</label>
                                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">mail</span>
                                        <input className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4A6BFF] focus:border-transparent outline-none text-[#1A1F2C] placeholder-gray-400 bg-white shadow-sm"
                                            id="email" type="email" placeholder="Email address" value={resetForm.email} onChange={handleResetChange} required />
                                    </div>
                                )}
                                {forgotStep === 2 && (
                                    <div className="relative">
                                        <label className="sr-only" htmlFor="otp">6-Digit Code</label>
                                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">pin</span>
                                        <input className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4A6BFF] focus:border-transparent outline-none font-mono text-center tracking-widest text-[#1A1F2C] placeholder-gray-400 bg-white shadow-sm"
                                            id="otp" type="text" maxLength="6" placeholder="000000" value={resetForm.otp} onChange={handleResetChange} required />
                                    </div>
                                )}
                                {forgotStep === 3 && (
                                    <div className="relative">
                                        <label className="sr-only" htmlFor="newPassword">New Password</label>
                                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">lock</span>
                                        <input className="w-full pl-12 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4A6BFF] focus:border-transparent outline-none text-[#1A1F2C] placeholder-gray-400 bg-white shadow-sm"
                                            id="newPassword" type={showNewPassword ? "text" : "password"} placeholder="New Password" value={resetForm.newPassword} onChange={handleResetChange} required />
                                        <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1 flex items-center justify-center focus:outline-none">
                                            <span className="material-symbols-outlined">{showNewPassword ? 'visibility_off' : 'visibility'}</span>
                                        </button>
                                    </div>
                                )}

                                <button type="submit" disabled={loading} className="w-full mt-2 bg-[#4A6BFF] hover:bg-[#3A5AE0] text-white font-medium py-3.5 px-8 rounded-xl transition-colors shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-[#4A6BFF] disabled:opacity-70 disabled:cursor-not-allowed">
                                    {loading ? 'Processing...' : (forgotStep === 1 ? 'Send OTP' : forgotStep === 2 ? 'Verify OTP' : 'Save New Password')}
                                </button>
                                <button type="button" onClick={() => { setForgotStep(0); setError(''); }} className="mt-3 text-sm text-[#5A6376] font-medium hover:text-[#1A1F2C] transition-colors w-full text-center">
                                    Return to Sign In
                                </button>
                            </form>
                        ) : (
                            <form className={`flex flex-col ${isSignup ? 'gap-2' : 'gap-3'}`} onSubmit={handleSubmit}>
                                {isSignup && (
                                    <div className="relative">
                                        <label className="sr-only" htmlFor="name">Display Name</label>
                                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">badge</span>
                                        <input className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4A6BFF] focus:border-transparent outline-none text-[#1A1F2C] placeholder-gray-400 bg-white shadow-sm"
                                            id="name" type="text" placeholder="Your name" value={form.name} onChange={handleChange} />
                                    </div>
                                )}
                                <div className="relative">
                                    <label className="sr-only" htmlFor="email">Email address</label>
                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">mail</span>
                                    <input className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4A6BFF] focus:border-transparent outline-none text-[#1A1F2C] placeholder-gray-400 bg-white shadow-sm"
                                        id="email" type="email" placeholder="Email address" value={form.email} onChange={handleChange} required autoComplete="email" />
                                </div>
                                <div className="space-y-2">
                                    <div className="relative">
                                        <label className="sr-only" htmlFor="password">Password</label>
                                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">lock</span>
                                        <input className="w-full pl-12 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4A6BFF] focus:border-transparent outline-none text-[#1A1F2C] placeholder-gray-400 bg-white shadow-sm"
                                            id="password" type={showPassword ? "text" : "password"} placeholder="Password" value={form.password} onChange={handleChange} required autoComplete="current-password" />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1 flex items-center justify-center focus:outline-none">
                                            <span className="material-symbols-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span>
                                        </button>
                                    </div>
                                    {!isSignup && (
                                        <div className="text-right">
                                            <button type="button" onClick={() => { setForgotStep(1); setError(''); }} className="text-xs font-medium text-[#4A6BFF] hover:underline">
                                                Forgot password?
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <button type="submit" disabled={loading} className={`w-full mt-1 bg-[#4A6BFF] hover:bg-[#3A5AE0] text-white font-medium ${isSignup ? 'py-3' : 'py-3.5'} px-8 rounded-xl transition-colors shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-[#4A6BFF] disabled:opacity-70 disabled:cursor-not-allowed`}>
                                    {loading ? 'Processing...' : (isSignup ? 'Sign up' : 'Sign in')}
                                </button>
                            </form>
                        )}

                        {forgotStep === 0 && (
                            <p className={`${isSignup ? 'mt-3' : 'mt-5'} text-center text-sm text-[#5A6376] font-medium`}>
                                {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
                                <button onClick={() => { setIsSignup(s => !s); setError(''); }} className="text-[#4A6BFF] hover:underline font-semibold">
                                    {isSignup ? 'Sign in' : 'Sign up'}
                                </button>
                            </p>
                        )}
                    </div>
                    
                    {/* Footer Links constrained at the bottom */}
                    <footer className={`${isSignup ? 'mt-4' : 'mt-6'} pt-2 flex justify-center sm:justify-start gap-6 text-xs text-[#5A6376] font-medium`}>
                        <a className="hover:text-[#1A1F2C] transition-colors" href="#">Privacy</a>
                        <a className="hover:text-[#1A1F2C] transition-colors" href="#">Terms</a>
                        <a className="hover:text-[#1A1F2C] transition-colors" href="#">Support</a>
                    </footer>
                </div>
            </section>
            {/* END: Left Column */}

            {/* BEGIN: Right Column (Illustration) */}
            <section
                className="flex-[1.2] hidden lg:block overflow-hidden relative"
                style={{
                    backgroundColor: '#e9ecf5',
                    backgroundImage: "url('/splash_illustration.png')",
                    backgroundSize: 'contain',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                }}
            />
            {/* END: Right Column */}
        </main>
    );
};

export default Login;
