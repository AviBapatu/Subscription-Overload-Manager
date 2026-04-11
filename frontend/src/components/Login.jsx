import React from 'react';

const Login = () => {
    return (
        <div className="min-h-screen flex items-center justify-center -mt-20">
            {/* Background Decorative Elements */}
            <div className="fixed top-[-10%] right-[-5%] w-[40vw] h-[40vw] rounded-full bg-primary/5 blur-[120px] pointer-events-none"></div>
            <div className="fixed bottom-[-10%] left-[-5%] w-[40vw] h-[40vw] rounded-full bg-tertiary/5 blur-[120px] pointer-events-none"></div>

            <main className="w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-500">
                {/* Auth Card */}
                <div className="glass-card rounded-lg shadow-[0_20px_40px_rgba(0,88,187,0.06)] p-10 flex flex-col items-center bg-white/40">
                    
                    {/* Logo Section */}
                    <div className="mb-10 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary to-tertiary shadow-lg mb-4">
                            <span className="material-symbols-outlined text-white text-3xl">inventory_2</span>
                        </div>
                        <h1 className="text-3xl font-black tracking-tighter text-on-surface">The Concierge</h1>
                        <p className="text-on-surface-variant font-medium tracking-tight mt-1">Digital Curator</p>
                    </div>

                    {/* Login Form */}
                    <form className="w-full space-y-6">
                        {/* Email Field */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-on-surface-variant ml-1" htmlFor="email">Email Address</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-outline">
                                    <span className="material-symbols-outlined text-lg">mail</span>
                                </div>
                                <input className="w-full bg-surface-container-lowest border-outline-variant/15 border rounded-xl py-4 pl-12 pr-4 focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all duration-400 outline-none text-on-background placeholder:text-outline-variant" id="email" placeholder="curator@concierge.com" type="email" />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center ml-1">
                                <label className="text-sm font-semibold text-on-surface-variant" htmlFor="password">Password</label>
                                <a className="text-xs font-bold text-primary hover:text-primary-dim transition-colors" href="#">Forgot?</a>
                            </div>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-outline">
                                    <span className="material-symbols-outlined text-lg">lock</span>
                                </div>
                                <input className="w-full bg-surface-container-lowest border-outline-variant/15 border rounded-xl py-4 pl-12 pr-4 focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all duration-400 outline-none text-on-background placeholder:text-outline-variant" id="password" placeholder="••••••••" type="password" />
                            </div>
                        </div>

                        {/* Action Button */}
                        <button className="w-full bg-gradient-to-r from-primary to-tertiary text-white font-bold py-4 rounded-full shadow-lg hover:scale-[1.02] transition-all duration-400 ease-out active:scale-95 flex items-center justify-center gap-2" type="button">
                            <span>Sign In</span>
                            <span className="material-symbols-outlined text-xl">arrow_forward</span>
                        </button>
                    </form>

                    {/* Secondary Actions */}
                    <div className="mt-8 pt-8 border-t border-outline-variant/10 w-full text-center">
                        <p className="text-sm text-on-surface-variant mb-6">
                            Don't have an account? 
                            <a className="text-primary font-bold hover:underline ml-1" href="#">Create Curator Profile</a>
                        </p>
                        
                        {/* Quick Setup Preview (Signup Features) */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col items-center p-4 bg-surface-container-low rounded-xl hover:bg-surface-container transition-colors cursor-pointer group">
                                <span className="material-symbols-outlined text-secondary mb-2 group-hover:scale-110 transition-transform">schedule</span>
                                <span className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">Timezone</span>
                            </div>
                            <div className="flex flex-col items-center p-4 bg-surface-container-low rounded-xl hover:bg-surface-container transition-colors cursor-pointer group">
                                <span className="material-symbols-outlined text-tertiary mb-2 group-hover:scale-110 transition-transform">notifications_active</span>
                                <span className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">Reminders</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Meta */}
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
