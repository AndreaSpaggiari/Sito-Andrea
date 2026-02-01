
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
          // Crea profilo utente nella tabella pubblica
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
             setMessage({ text: 'Registrazione effettuata! Controlla la tua email per confermare l\'account (guarda anche nello SPAM).', type: 'warning' });
          }
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (error.message.includes('Email not confirmed')) {
            setMessage({ text: 'EMAIL NON CONFERMATA. Controlla la tua posta o abilita l\'accesso senza conferma nelle impostazioni di Supabase.', type: 'error' });
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
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="bg-slate-800 p-10 text-center text-white relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl border-4 border-slate-900">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-3xl font-black tracking-tighter mt-4 uppercase">Area Riservata</h1>
          <p className="text-slate-400 text-sm font-medium mt-1 uppercase tracking-widest">Sito Web Andrea Spaggiari</p>
        </div>

        <form onSubmit={handleAuth} className="p-8 space-y-4">
          {message && (
            <div className={`p-4 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 border ${
              message.type === 'success' ? 'bg-green-50 text-green-600 border-green-100' : 
              message.type === 'warning' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
              'bg-red-50 text-red-600 border-red-100'
            }`}>
              <AlertCircle size={14} className="shrink-0" />
              <span>{message.text}</span>
            </div>
          )}

          {isSignUp && (
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Username</label>
              <div className="relative">
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full p-4 pl-12 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold" placeholder="Come ti chiami?" required />
                <LogIn className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Email</label>
            <div className="relative">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-4 pl-12 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold" placeholder="mail@esempio.com" required />
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Password</label>
            <div className="relative">
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-4 pl-12 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold" placeholder="••••••••" required />
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
            </div>
          </div>

          <button disabled={loading} className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl hover:bg-black transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3 uppercase tracking-widest disabled:opacity-50">
            {isSignUp ? <UserPlus size={20} /> : <LogIn size={20} />}
            {loading ? 'Elaborazione...' : isSignUp ? 'Registrati ora' : 'Accedi al portale'}
          </button>

          <div className="text-center pt-4">
            <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="text-[10px] font-black text-slate-400 hover:text-blue-600 transition uppercase tracking-widest">
              {isSignUp ? 'Hai già un account? Accedi' : 'Non hai un account? Registrati'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
