
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Chat from '../components/Chat';
import { Factory, Laptop, Inbox, Briefcase, Wrench, LayoutDashboard, Zap, ChevronRight, Lock, ShieldCheck, Eye, Send, RefreshCw, AlertCircle } from 'lucide-react';
import { SectionType, AccessLevel, PermissionStatus } from '../types';

const Lavoro: React.FC = () => {
  const [userPermissions, setUserPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const subsections = [
    { id: 'LAVORO_PRODUZIONE' as SectionType, title: "PRODUZIONE", desc: "Production Feed", link: "/lavoro/produzione", icon: Factory, num: "01" },
    { id: 'LAVORO_MACCHINE' as SectionType, title: "MACCHINE", desc: "Maintenance", link: "/lavoro/macchine", icon: Wrench, num: "02" },
    { id: 'LAVORO_MAGAZZINO' as SectionType, title: "MAGAZZINO", desc: "Stock Control", link: "/lavoro/magazzino", icon: Inbox, num: "03" },
    { id: 'LAVORO_UFFICIO' as SectionType, title: "UFFICIO", desc: "Admin & Docs", link: "/lavoro/ufficio", icon: Briefcase, num: "04" },
    { id: 'LAVORO_UTILITA' as SectionType, title: "UTILITA'", desc: "Quick Tools", link: "/lavoro/utilita", icon: Laptop, num: "05" },
  ];

  const fetchPermissions = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Check if Admin
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
    if (profile?.role === 'ADMIN') {
      setIsAdmin(true);
      setLoading(false);
      return;
    }

    const { data } = await supabase.from('l_permessi').select('*').eq('user_id', session.user.id);
    setUserPermissions(data || []);
    
    // Se non ha alcun permesso autorizzato, mostriamo il form di richiesta
    const hasAnyAuthorized = (data || []).some(p => p.stato === 'AUTORIZZATO');
    if (!hasAnyAuthorized) setShowRequestForm(true);
    
    setLoading(false);
  }, []);

  useEffect(() => { fetchPermissions(); }, [fetchPermissions]);

  if (loading) return <div className="min-h-screen bg-slate-100 flex items-center justify-center font-black uppercase tracking-widest text-[10px] text-slate-400">Verifica Credenziali...</div>;

  if (showRequestForm && !isAdmin) {
    return <MultiRequestScreen onComplete={() => { setShowRequestForm(false); fetchPermissions(); }} subsections={subsections} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-20 overflow-x-hidden">
      <div className="bg-amber-600 pt-20 pb-28 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-slate-950/40"></div>
        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/10 text-white px-4 py-1.5 rounded-full border border-white/20 text-[10px] font-black uppercase tracking-[0.2em] mb-6">KME ITALY INDUSTRIAL HUB</div>
          <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter italic mb-4 leading-none text-white">LAVORO <span className="text-slate-950">TOOLS</span></h1>
          <p className="text-white/70 font-bold uppercase tracking-[0.3em] text-xs">Gestione Industriale & Produzione</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-16 relative z-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {subsections.map((sub, idx) => {
            const perm = userPermissions.find(p => p.sezione === sub.id);
            const isAuthorized = isAdmin || perm?.stato === 'AUTORIZZATO';
            
            return (
              <Link 
                key={idx} 
                to={isAuthorized ? sub.link : "#"} 
                onClick={(e) => !isAuthorized && e.preventDefault()}
                className={`bg-white border border-slate-200 rounded-[2.5rem] p-8 group transition-all duration-500 relative shadow-xl ${isAuthorized ? 'hover:bg-slate-900 hover:-translate-y-1' : 'opacity-60 grayscale cursor-not-allowed'}`}
              >
                {!isAuthorized && <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/40 backdrop-blur-[2px] rounded-[2.5rem]"><Lock size={40} className="text-slate-400" /></div>}
                <div className="absolute top-4 right-6 text-5xl font-black text-slate-900/[0.03] group-hover:text-white/10 italic">#{sub.num}</div>
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-inner border border-slate-100 transition-all ${isAuthorized ? 'bg-slate-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white' : 'bg-slate-100 text-slate-300'}`}>
                  <sub.icon size={30} />
                </div>
                <h3 className={`text-2xl font-black uppercase italic tracking-tighter leading-none ${isAuthorized ? 'text-slate-900 group-hover:text-white' : 'text-slate-400'}`}>{sub.title}</h3>
                <p className={`font-bold text-[10px] uppercase tracking-widest mt-2 ${isAuthorized ? 'text-slate-500 group-hover:text-white/70' : 'text-slate-300'}`}>{sub.desc}</p>
                {isAuthorized && (
                  <div className="mt-8 flex items-center gap-2 text-slate-400 group-hover:text-amber-500 transition-colors">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em]">Accedi Sezione</span>
                    <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </div>
      <Chat />
    </div>
  );
};

const MultiRequestScreen = ({ onComplete, subsections }: { onComplete: () => void, subsections: any[] }) => {
  const [selectedSections, setSelectedSections] = useState<SectionType[]>([]);
  const [level, setLevel] = useState<AccessLevel>('VISUALIZZATORE');
  const [formData, setFormData] = useState({ nome: '', cognome: '', motivo: '' });
  const [loading, setLoading] = useState(false);

  const toggleSection = (id: SectionType) => {
    setSelectedSections(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const submitRequests = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSections.length === 0 || !formData.nome || !formData.cognome) return alert("Compila i campi obbligatori");
    
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    try {
      const requests = selectedSections.map(section => ({
        user_id: session?.user.id,
        sezione: section,
        stato: 'RICHIESTO',
        livello_accesso: level,
        nome: formData.nome,
        cognome: formData.cognome,
        motivo: formData.motivo,
        chat_username: formData.nome
      }));

      await supabase.from('l_permessi').upsert(requests, { onConflict: 'user_id,sezione' });
      onComplete();
    } catch (e) { alert("Errore"); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
        <div className="bg-slate-950 p-10 text-white text-center">
          <ShieldCheck size={48} className="text-amber-500 mx-auto mb-4" />
          <h2 className="text-3xl font-black uppercase italic tracking-tighter">Attivazione Servizi Lavoro</h2>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-2">Seleziona le aree che desideri abilitare</p>
        </div>
        <form onSubmit={submitRequests} className="p-10 space-y-6">
          <div className="grid grid-cols-2 gap-3">
             <input type="text" placeholder="Nome" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs" />
             <input type="text" placeholder="Cognome" value={formData.cognome} onChange={e => setFormData({...formData, cognome: e.target.value})} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs" />
          </div>
          
          <div className="space-y-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Quali sezioni ti servono?</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {subsections.map(sub => (
                <button key={sub.id} type="button" onClick={() => toggleSection(sub.id)} className={`p-4 rounded-2xl border flex items-center gap-3 transition-all ${selectedSections.includes(sub.id) ? 'bg-amber-600 text-white border-amber-600 shadow-lg' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                   <sub.icon size={16} />
                   <span className="text-[10px] font-black uppercase">{sub.title}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Tipo di Accesso</p>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setLevel('VISUALIZZATORE')} className={`p-4 rounded-2xl border font-black text-[10px] uppercase transition-all ${level === 'VISUALIZZATORE' ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-slate-50 text-slate-500'}`}>Solo Lettura</button>
              <button type="button" onClick={() => setLevel('OPERATORE')} className={`p-4 rounded-2xl border font-black text-[10px] uppercase transition-all ${level === 'OPERATORE' ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg' : 'bg-slate-50 text-slate-500'}`}>Operatore</button>
            </div>
          </div>

          <textarea placeholder="Motivazione..." value={formData.motivo} onChange={e => setFormData({...formData, motivo: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs resize-none" rows={3} />

          <button type="submit" disabled={loading} className="w-full py-5 bg-slate-950 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
            {loading ? <RefreshCw className="animate-spin" size={18} /> : <Send size={18} />} Invia Richiesta Abilitazione
          </button>
        </form>
      </div>
    </div>
  );
};

export default Lavoro;
