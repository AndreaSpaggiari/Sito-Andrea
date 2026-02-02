
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { LogIn, UserPlus, ShieldCheck, Mail, Lock, AlertCircle } from 'lucide-react';

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
             setMessage({ text: 'Registrazione effettuata! Controlla la tua email (anche SPAM) per confermare.', type: 'warning' });
          }
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (error.message.includes('Email not confirmed')) {
            setMessage({ text: 'EMAIL NON CONFERMATA. Controlla la tua posta.', type: 'error' });
          } else {
            throw error;
          }
        }
      }
    } catch (err: any) {
      setMessage({ text: err.message.toUpperCase(), type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 border border-slate-200">
        <div className="bg-slate-900 p-10 text-center text-white relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl border-4 border-slate-950">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-3xl font-black tracking-tighter mt-4 uppercase italic">Area Riservata</h1>
          <p className="text-slate-400 text-[10px] font-black mt-2 uppercase tracking-[0.2em]">Sito Web Andrea Spaggiari</p>
        </div>

        <form onSubmit={handleAuth} className="p-8 space-y-5">
          {message && (
            <div className={`p-4 rounded-2xl text-[10px] font-black uppercase flex items-center gap-3 border ${
              message.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 
              message.type === 'warning' ? 'bg-yellow-50 text-yellow-800 border-yellow-200' :
              'bg-red-50 text-red-700 border-red-200'
            }`}>
              <AlertCircle size={16} className="shrink-0" />
              <span>{message.text}</span>
            </div>
          )}

          {isSignUp && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-600 uppercase ml-2 tracking-widest">Username</label>
              <div className="relative">
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full p-4 pl-12 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-400" placeholder="Il tuo nome..." required />
                <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-600 uppercase ml-2 tracking-widest">Email</label>
            <div className="relative">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-4 pl-12 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-400" placeholder="mail@esempio.com" required />
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-600 uppercase ml-2 tracking-widest">Password</label>
            <div className="relative">
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-4 pl-12 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-400" placeholder="••••••••" required />
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            </div>
          </div>

          <button disabled={loading} className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl hover:bg-black transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3 uppercase tracking-widest text-xs disabled:opacity-50">
            {isSignUp ? <UserPlus size={20} /> : <LogIn size={20} />}
            {loading ? 'ELABORAZIONE...' : isSignUp ? 'REGISTRATI ORA' : 'ACCEDI AL PORTALE'}
          </button>

          <div className="text-center pt-4">
            <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="text-[10px] font-black text-slate-500 hover:text-blue-600 transition uppercase tracking-[0.2em] underline underline-offset-4 decoration-slate-200">
              {isSignUp ? 'Hai già un account? Accedi' : 'Non hai un account? Registrati'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
