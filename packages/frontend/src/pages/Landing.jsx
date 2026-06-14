import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Zap, Bot, Users, BarChart3, Database } from 'lucide-react';
import api from '../services/api';

export default function Landing() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSuccess = async (credentialResponse) => {
    try {
      const res = await api.post('/auth/google', {
        credential: credentialResponse.credential,
      });
      // Login sets the token and user state, and configures Axios headers
      login(res.data.token, res.data.user);
      navigate('/dashboard');
    } catch (err) {
      console.error('Login failed:', err);
      alert('Failed to log in. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-text-primary flex flex-col font-sans selection:bg-accent-purple/30">
      
      {/* Navbar */}
      <nav className="w-full border-b border-white/5 bg-black/20 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-purple to-accent-blue flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">Xeno CRM</span>
          </div>
          <div>
            <GoogleLogin
              onSuccess={handleSuccess}
              onError={() => console.log('Login Failed')}
              theme="filled_black"
              shape="pill"
            />
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-purple/10 border border-accent-purple/20 text-accent-purple-light text-xs font-medium mb-8">
          <Bot className="w-3.5 h-3.5" />
          <span>The First AI-Native CRM for D2C Brands</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white to-white/60 mb-6 max-w-4xl leading-tight">
          Talk to your shoppers intelligently.
        </h1>
        
        <p className="text-lg md:text-xl text-text-secondary max-w-2xl mb-12 font-light">
          Say goodbye to complex SQL filters and manual data entry. Xeno CRM organizes your customers, analyzes their purchases, and uses AI to draft the perfect campaigns.
        </p>

        <div className="p-1 rounded-full bg-gradient-to-r from-accent-purple to-accent-blue hover:scale-105 transition-transform duration-300 cursor-pointer shadow-lg shadow-accent-purple/20">
          <div className="bg-bg-primary rounded-full px-2 py-2">
            <GoogleLogin
              onSuccess={handleSuccess}
              onError={() => console.log('Login Failed')}
              text="signup_with"
              theme="filled_black"
              shape="pill"
              size="large"
            />
          </div>
        </div>
      </main>

      {/* Features Grid */}
      <section className="border-t border-white/5 bg-black/40 py-24">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className="p-8 rounded-2xl bg-white/5 border border-white/5 hover:border-accent-purple/30 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-accent-purple/10 flex items-center justify-center mb-6">
              <Database className="w-6 h-6 text-accent-purple-light" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Multi-Tenant Data</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              Securely import and store your customers and order history. Each business gets complete data isolation in our unified CRM engine.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-white/5 border border-white/5 hover:border-accent-purple/30 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-accent-blue/10 flex items-center justify-center mb-6">
              <Users className="w-6 h-6 text-accent-blue-light" />
            </div>
            <h3 className="text-xl font-semibold mb-3">AI Segmenting</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              Just type "Find customers in Mumbai who spent over ₹5000". Our AI instantly converts your natural language into powerful audience segments.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-white/5 border border-white/5 hover:border-accent-purple/30 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-6">
              <BarChart3 className="w-6 h-6 text-amber-400" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Actionable Insights</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              Track open and click rates in real-time via SSE. Our AI reads your campaign stats and gives you immediate recommendations for your next move.
            </p>
          </div>

        </div>
      </section>

      <footer className="text-center py-8 text-xs text-text-muted border-t border-white/5">
        &copy; 2026 Xeno Mini CRM Take-Home Assignment
      </footer>
    </div>
  );
}
