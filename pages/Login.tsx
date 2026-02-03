
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { LogIn, UserPlus, Mail, Lock, AlertCircle } from 'lucide-react';

const Login: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'error' | 'success' | 'warning' } | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isSignUp) {
        const { data: authData, error: authError } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: {
              display_name: username
            }
          }
        });
        
        if (authError) throw authError;
        
        if (authData.user) {
          const { error: profileError } = await supabase.from('profiles').upsert({
            id: authData.user.id,
            email: email,
            username: username || email.split('@')[0],
            role: 'USER'
          });
          
          if (profileError) console.error("Errore creazione profilo:", profileError);
          
          if (authData.session) {
             setMessage({ text: 'Registrazione completata con successo!', type: 'success' });
          } else {
             setMessage({ text: 'Registrazione effettuata! Controlla la tua email.', type: 'warning' });
          }
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      setMessage({ text: err.message.toUpperCase(), type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-500 relative">
        
        {/* Header (Design dello screenshot) */}
        <div className="bg-[#1e293b] pt-14 pb-12 text-center text-white relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-8 bg-[#3b82f6] rounded-b-2xl flex items-center justify-center shadow-lg">
             <div className="w-5 h-5 border-2 border-white rounded-full flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
             </div>
          </div>
          <h1 className="text-4xl font-black tracking-tighter uppercase mb-1">Area Riservata</h1>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Sito Web Andrea Spaggiari</p>
        </div>

        <form onSubmit={handleAuth} className="p-8 space-y-7 bg-white">
          {message && (
            <div className={`p-4 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 border ${
              message.type === 'success' ? 'bg-green-50 text-green-600 border-green-100' : 
              message.type === 'warning' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
              'bg-red-50 text-red-600 border-red-100'
            }`}>
              <AlertCircle size={14} className="shrink-0" />
              <span>{message.text}</span>
            </div>
          )}

          {isSignUp && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Username</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  className="w-full p-5 pl-14 bg-[#f8fafc] border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-black text-slate-950 placeholder-slate-300" 
                  placeholder="Il tuo nome" 
                  required 
                />
                <LogIn className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={22} />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Email</label>
            <div className="relative">
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className="w-full p-5 pl-14 bg-[#f8fafc] border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-black text-slate-950 placeholder-slate-200" 
                placeholder="spaggiariandrea75@gmail.com" 
                required 
              />
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={22} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Password</label>
            <div className="relative">
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="w-full p-5 pl-14 bg-[#f8fafc] border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-black text-slate-950 placeholder-slate-200" 
                placeholder="••••••••••••" 
                required 
              />
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={22} />
            </div>
          </div>

          <button 
            disabled={loading} 
            className="w-full py-5 bg-[#0f172a] text-white font-black rounded-2xl hover:bg-black transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3 uppercase tracking-widest disabled:opacity-50 text-sm mt-4 shadow-blue-900/10"
          >
            <LogIn size={20} />
            {loading ? 'Sincronizzazione...' : isSignUp ? 'Crea Account' : 'Accedi al Portale'}
          </button>

          <div className="text-center pt-2">
            <button 
              type="button" 
              onClick={() => setIsSignUp(!isSignUp)} 
              className="text-[10px] font-black text-slate-400 hover:text-blue-600 transition uppercase tracking-widest"
            >
              {isSignUp ? 'Hai già un account? Accedi' : 'Non hai un account? Registrati'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
