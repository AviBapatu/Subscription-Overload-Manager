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
        <main className="flex flex-col lg:flex-row min-h-screen w-full bg-[#F8F9FA] text-gray-800 antialiased font-sans">
            {/* BEGIN: Left Column (Content & Form) */}
            <section className="flex-1 flex flex-col justify-center px-8 py-12 sm:px-16 lg:px-24 xl:px-32 bg-white/50 backdrop-blur-sm lg:bg-transparent relative z-10">
                
                {/* Content Wrapper */}
                <div className="max-w-md mx-auto w-full flex-grow flex flex-col justify-center">
                    
                    {/* Heading & Subheading */}
                    <header className="mb-10">
                        <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-bold leading-tight tracking-tight text-[#1A1F2C] mb-6">
                            {forgotStep > 0 
                                ? 'Password Reset' 
                                : (isSignup ? 'Take control of your subscriptions' : 'Welcome back')}
                        </h1>
                        <p className="text-lg sm:text-xl text-[#5A6376] leading-relaxed max-w-[380px]">
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
                                <button className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 text-[#1A1F2C] font-medium py-3.5 px-4 rounded-xl hover:bg-gray-50 transition-colors shadow-sm mb-8">
                                    <img alt="Google Logo" className="w-5 h-5" src="https://placeholder.pics/svg/300" />
                                    {isSignup ? 'Sign up with Google' : 'Sign in with Google'}
                                </button>
                                
                                {/* Divider */}
                                <div className="relative flex items-center mb-8">
                                    <div className="flex-grow border-t border-gray-200"></div>
                                    <span className="flex-shrink-0 mx-4 text-[#8E95A4] text-sm uppercase font-medium tracking-wider">OR</span>
                                    <div className="flex-grow border-t border-gray-200"></div>
                                </div>
                            </>
                        )}

                        {error && (
                            <div className="mb-6 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                                {error}
                            </div>
                        )}

                        {forgotStep > 0 ? (
                            <form className="flex flex-col gap-4" onSubmit={handleForgotFlow}>
                                {forgotStep === 1 && (
                                    <div>
                                        <label className="sr-only" htmlFor="email">Email address</label>
                                        <input className="w-full px-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4A6BFF] focus:border-transparent outline-none text-[#1A1F2C] placeholder-gray-400 bg-white shadow-sm"
                                            id="email" type="email" placeholder="Email address" value={resetForm.email} onChange={handleResetChange} required />
                                    </div>
                                )}
                                {forgotStep === 2 && (
                                    <div>
                                        <label className="sr-only" htmlFor="otp">6-Digit Code</label>
                                        <input className="w-full px-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4A6BFF] focus:border-transparent outline-none font-mono text-center tracking-widest text-[#1A1F2C] placeholder-gray-400 bg-white shadow-sm"
                                            id="otp" type="text" maxLength="6" placeholder="000000" value={resetForm.otp} onChange={handleResetChange} required />
                                    </div>
                                )}
                                {forgotStep === 3 && (
                                    <div>
                                        <label className="sr-only" htmlFor="newPassword">New Password</label>
                                        <input className="w-full px-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4A6BFF] focus:border-transparent outline-none text-[#1A1F2C] placeholder-gray-400 bg-white shadow-sm"
                                            id="newPassword" type="password" placeholder="New Password" value={resetForm.newPassword} onChange={handleResetChange} required />
                                    </div>
                                )}

                                <button type="submit" disabled={loading} className="w-full mt-2 bg-[#4A6BFF] hover:bg-[#3A5AE0] text-white font-medium py-3.5 px-8 rounded-xl transition-colors shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-[#4A6BFF] disabled:opacity-70 disabled:cursor-not-allowed">
                                    {loading ? 'Processing...' : (forgotStep === 1 ? 'Send OTP' : forgotStep === 2 ? 'Verify OTP' : 'Save New Password')}
                                </button>
                                <button type="button" onClick={() => { setForgotStep(0); setError(''); }} className="mt-4 text-sm text-[#5A6376] font-medium hover:text-[#1A1F2C] transition-colors w-full text-center">
                                    Return to Sign In
                                </button>
                            </form>
                        ) : (
                            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                                {isSignup && (
                                    <div>
                                        <label className="sr-only" htmlFor="name">Display Name</label>
                                        <input className="w-full px-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4A6BFF] focus:border-transparent outline-none text-[#1A1F2C] placeholder-gray-400 bg-white shadow-sm"
                                            id="name" type="text" placeholder="Your name" value={form.name} onChange={handleChange} />
                                    </div>
                                )}
                                <div>
                                    <label className="sr-only" htmlFor="email">Email address</label>
                                    <input className="w-full px-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4A6BFF] focus:border-transparent outline-none text-[#1A1F2C] placeholder-gray-400 bg-white shadow-sm"
                                        id="email" type="email" placeholder="Email address" value={form.email} onChange={handleChange} required />
                                </div>
                                <div className="space-y-2">
                                    <input className="w-full px-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4A6BFF] focus:border-transparent outline-none text-[#1A1F2C] placeholder-gray-400 bg-white shadow-sm"
                                        id="password" type="password" placeholder="Password" value={form.password} onChange={handleChange} required />
                                    {!isSignup && (
                                        <div className="text-right">
                                            <button type="button" onClick={() => { setForgotStep(1); setError(''); }} className="text-sm font-medium text-[#4A6BFF] hover:underline">
                                                Forgot password?
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <button type="submit" disabled={loading} className="w-full mt-2 bg-[#4A6BFF] hover:bg-[#3A5AE0] text-white font-medium py-3.5 px-8 rounded-xl transition-colors shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-[#4A6BFF] disabled:opacity-70 disabled:cursor-not-allowed">
                                    {loading ? 'Processing...' : (isSignup ? 'Sign up' : 'Sign in')}
                                </button>
                            </form>
                        )}

                        {forgotStep === 0 && (
                            <p className="mt-8 text-center text-sm text-[#5A6376] font-medium">
                                {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
                                <button onClick={() => { setIsSignup(s => !s); setError(''); }} className="text-[#4A6BFF] hover:underline font-semibold">
                                    {isSignup ? 'Sign in' : 'Sign up'}
                                </button>
                            </p>
                        )}
                    </div>
                </div>

                {/* Footer Links */}
                <footer className="mt-auto pt-12 flex justify-center sm:justify-start gap-6 text-sm text-[#5A6376] font-medium">
                    <a className="hover:text-[#1A1F2C] transition-colors" href="#">Privacy Policy</a>
                    <a className="hover:text-[#1A1F2C] transition-colors" href="#">Terms of Service</a>
                    <a className="hover:text-[#1A1F2C] transition-colors" href="#">Support</a>
                </footer>
            </section>
            {/* END: Left Column */}

            {/* BEGIN: Right Column (Illustration) */}
            <section className="flex-1 hidden lg:block overflow-hidden relative" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida/ADBb0ujvMO8ypQ1F2KR8GM6yZXsXCQMcEF7ZYX_v2sIjD6S-X2cUS9yXnh5ZZrtbDj6oTbqq0QxukJvu2ldiqiC43TMpXMkobLnHRrl8mfyaowl0j0XBreLSmFsBj2EqGT_3hVwi1KSMRPpWCHSm0FvHcA9RY1FixZBu7K4tcLwnabqpW_ip06ldVu16G_yovG9ANcBZNqvw2YilRvo17aOJfoC-qdzj9gTXae3q6AxyYYlYuBxzqT6n7TK59N4')", backgroundSize: '100% 100%', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}>
            </section>
            {/* END: Right Column */}
        </main>
    );
};

export default Login;
