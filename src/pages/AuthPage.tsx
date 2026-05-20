import { useState, useEffect } from 'react';
import { Mail, Lock, ArrowRight, Shield } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const AuthPage = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');

  // Đồng bộ tab khi người dùng nhấn nút từ Header
  useEffect(() => {
    const mode = (location.state as { mode?: 'login' | 'signup' })?.mode;
    
    // Chỉ đồng bộ khi có mode từ navigation và location.key thay đổi (nhấn nút mới)
    if (mode) {
      const timeoutId = setTimeout(() => {
        setActiveTab(mode);
      }, 0);
      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]); // QUAN TRỌNG: Chỉ chạy khi nhấn điều hướng mới (key thay đổi)

  return (
    <div className="flex min-h-screen bg-white">
      {/* Left Side: Hero Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-primary-container p-16 flex-col justify-between">
        {/* Background Overlay Pattern */}
        <div className="absolute inset-0 opacity-20" style={{ 
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }} />
        
        <div className="relative z-10">
          <Link to="/" className="text-2xl font-bold text-white tracking-tight mb-16 block">Horace</Link>
          <h1 className="text-white text-headline-xl font-bold max-w-md leading-tight mb-6">
            Precision Intelligence for the Sporting Elite
          </h1>
          <p className="text-on-primary-container text-body-lg max-w-sm">
            Access institutional-grade racing data and advanced performance analytics in one secure environment.
          </p>
        </div>

        <div className="relative z-10">
          <p className="text-white/60 text-label-sm uppercase tracking-widest mb-6">Trusted by industry leaders</p>
          <div className="flex items-center gap-8 opacity-50 grayscale brightness-200">
            <span className="font-bold text-xl">ASCOT</span>
            <span className="font-bold text-xl">CHURCHILL</span>
            <span className="font-bold text-xl">MEYDAN</span>
          </div>
        </div>

        {/* Decorative Image */}
        <div className="absolute bottom-0 right-0 w-full h-1/2 overflow-hidden opacity-30 pointer-events-none">
           <img 
            src="https://images.unsplash.com/photo-1599408162165-8b753ca992aa?auto=format&fit=crop&q=80&w=1000" 
            alt="Racing background"
            className="w-full h-full object-cover"
           />
        </div>
      </div>

      {/* Right Side: Auth Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 md:p-16">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="mb-10">
            <h2 className="text-headline-lg font-bold text-primary mb-2">
              {activeTab === 'login' ? 'Welcome Back' : 'Join the Elite'}
            </h2>
            <p className="text-body-sm text-on-surface-variant">
              {activeTab === 'login' ? 'Sign in to your racing dashboard' : 'Create your professional racing account'}
            </p>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-outline-variant mb-8">
            <button
              onClick={() => setActiveTab('login')}
              className={`pb-4 px-6 text-body-sm font-bold transition-all border-b-2 ${
                activeTab === 'login' ? 'border-primary text-primary' : 'border-transparent text-outline hover:text-primary'
              }`}
            >
              Log In
            </button>
            <button
              onClick={() => setActiveTab('signup')}
              className={`pb-4 px-6 text-body-sm font-bold transition-all border-b-2 ${
                activeTab === 'signup' ? 'border-primary text-primary' : 'border-transparent text-outline hover:text-primary'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Form */}
          <form className="space-y-6 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2">
            {activeTab === 'signup' && (
              <div className="space-y-2">
                <label className="text-label-sm text-outline uppercase tracking-wider font-bold">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
                  <input
                    type="text"
                    placeholder="Enter your full name"
                    className="w-full bg-surface-container-low border border-outline-variant rounded-md py-3 pl-10 pr-4 text-body-sm focus:outline-none focus:border-primary transition-all"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-label-sm text-outline uppercase tracking-wider font-bold">Corporate Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
                <input
                  type="email"
                  placeholder="name@company.com"
                  className="w-full bg-surface-container-low border border-outline-variant rounded-md py-3 pl-10 pr-4 text-body-sm focus:outline-none focus:border-primary transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-label-sm text-outline uppercase tracking-wider font-bold">Security Password</label>
                {activeTab === 'login' && (
                  <button type="button" className="text-label-sm text-secondary font-bold hover:underline">Forgot?</button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full bg-surface-container-low border border-outline-variant rounded-md py-3 pl-10 pr-4 text-body-sm focus:outline-none focus:border-primary transition-all"
                />
              </div>
            </div>

            <button className="w-full bg-secondary text-white py-4 rounded-md font-bold flex items-center justify-center gap-2 hover:bg-opacity-90 transition-all shadow-lg shadow-secondary/20">
              {activeTab === 'login' ? 'Secure Access' : 'Initialize Account'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Footer */}
          <div className="mt-12 pt-8 border-t border-outline-variant flex flex-col items-center gap-6">
            <div className="flex items-center gap-2 text-secondary text-label-sm font-bold">
              <Shield className="w-4 h-4" />
              <span className="uppercase tracking-widest">256-bit AES Encrypted Data</span>
            </div>
            <p className="text-[10px] text-outline text-center leading-relaxed">
              By accessing this terminal, you agree to our <a href="#" className="underline">Professional Terms of Service</a> and <a href="#" className="underline">Institutional Privacy Protocol</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const UserIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
);

export default AuthPage;
