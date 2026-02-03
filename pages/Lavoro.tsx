
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Chat from '../components/Chat';
import { Factory, Laptop, Inbox, Briefcase, Wrench, ChevronRight, ShieldCheck, Eye, Send, RefreshCw, Lock, CheckCircle2 } from 'lucide-react';
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

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
    if (profile?.role === 'ADMIN') {
      setIsAdmin(true);
      setLoading(false);
      return;
    }

    const { data } = await supabase.from('l_permessi').select('*').eq('user_id', session.user.id);
    setUserPermissions(data || []);
    
    if (!data || data.length === 0) setShowRequestForm(true);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPermissions(); }, [fetchPermissions]);

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black uppercase text-slate-400">Loading Tools...</div>;

  if (showRequestForm && !isAdmin) {
    return <MultiRequestScreen onComplete={() => { setShowRequestForm(false); fetchPermissions(); }} subsections={subsections} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-20">
      <div className="bg-[#e67e22] pt-20 pb-28 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-slate-950/20"></div>
        <div className="relative z-10 max-w-4xl mx-auto">
          <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter italic mb-4 leading-none text-white">LAVORO <span className="text-slate-950">TOOLS</span></h1>
          <p className="text-white/70 font-bold uppercase tracking-[0.3em] text-xs">Gestione Industriale & Produzione</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-16 relative z-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {subsections.map((sub, idx) => {
            const perm = userPermissions.find(p => p.sezione === sub.id);
            const isAuthorized = isAdmin || perm?.stato === 'AUTORIZZATO';
            const isPending = perm?.stato === 'RICHIESTO';
            
            return (
              <Link 
                key={idx} 
                to={isAuthorized ? sub.link : "#"} 
                onClick={(e) => !isAuthorized && e.preventDefault()}
                className={`bg-white border border-slate-200 rounded-[2.5rem] p-8 group transition-all duration-500 relative shadow-xl ${isAuthorized ? 'hover:bg-slate-900 hover:-translate-y-1' : 'grayscale opacity-80 cursor-not-allowed'}`}
              >
                {!isAuthorized && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-white/40 backdrop-blur-[1px] rounded-[2.5rem]">
                    {isPending ? (
                      <div className="bg-[#e67e22] text-white p-4 rounded-2xl flex flex-col items-center gap-1 shadow-lg">
                        <RefreshCw size={24} className="animate-spin" />
                        <span className="text-[8px] font-black uppercase tracking-widest">In Attesa</span>
                      </div>
                    ) : <Lock size={32} className="text-slate-300" />}
                  </div>
                )}
                <div className="absolute top-4 right-6 text-5xl font-black text-slate-900/[0.03] group-hover:text-white/10 italic">#{sub.num}</div>
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-inner border border-slate-100 transition-all ${isAuthorized ? 'bg-slate-50 text-[#e67e22] group-hover:bg-[#e67e22] group-hover:text-white' : 'bg-slate-50 text-slate-300'}`}>
                  <sub.icon size={30} />
                </div>
                <div className="flex items-center gap-2">
                  <h3 className={`text-2xl font-black uppercase italic tracking-tighter leading-none ${isAuthorized ? 'text-slate-900 group-hover:text-white' : 'text-slate-400'}`}>{sub.title}</h3>
                  {isAuthorized && (perm?.livello_accesso === 'OPERATORE' || isAdmin) && <ShieldCheck size={14} className="text-emerald-500" />}
                  {/* Fixed 'SOLO LETTURA' to 'VISUALIZZATORE' to match AccessLevel type */}
                  {isAuthorized && perm?.livello_accesso === 'VISUALIZZATORE' && <Eye size={14} className="text-blue-500" />}
                </div>
                <p className={`font-bold text-[10px] uppercase tracking-widest mt-2 ${isAuthorized ? 'text-slate-500 group-hover:text-white/70' : 'text-slate-300'}`}>{sub.desc}</p>
                {isAuthorized && (
                  <div className="mt-8 flex items-center gap-2 text-slate-400 group-hover:text-[#e67e22] transition-colors">
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
  const [selections, setSelections] = useState<Record<string, { selected: boolean, level: AccessLevel }>>(() => 
    subsections.reduce((acc, sub) => ({ 
      ...acc, 
      // Fixed 'SOLO LETTURA' to 'VISUALIZZATORE'
      [sub.id]: { selected: sub.id === 'LAVORO_PRODUZIONE', level: 'VISUALIZZATORE' as AccessLevel } 
    }), {} as Record<string, { selected: boolean, level: AccessLevel }>)
  );
  const [formData, setFormData] = useState({ nome: '', cognome: '', motivo: '' });
  const [loading, setLoading] = useState(false);

  const toggleSelection = (id: string) => {
    setSelections(prev => ({
      ...prev,
      [id]: { ...prev[id], selected: !prev[id].selected }
    }));
  };

  const setLevel = (id: string, level: AccessLevel) => {
    setSelections(prev => ({
      ...prev,
      [id]: { ...prev[id], level }
    }));
  };

  const submitRequests = async (e: React.FormEvent) => {
    e.preventDefault();
    // Fixed type inference for Object.entries by adding explicit casting to the correct record shape
    const activeRequests = (Object.entries(selections) as [string, { selected: boolean; level: AccessLevel }][]).filter(([_, val]) => val.selected);
    if (activeRequests.length === 0 || !formData.nome || !formData.cognome) return alert("Compila tutti i campi");
    
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    try {
      const payload = activeRequests.map(([id, val]) => ({
        user_id: session?.user.id,
        sezione: id as SectionType,
        stato: 'RICHIESTO' as PermissionStatus,
        livello_accesso: val.level,
        nome: formData.nome,
        cognome: formData.cognome,
        motivo: formData.motivo,
        chat_username: formData.nome
      }));

      await supabase.from('l_permessi').upsert(payload, { onConflict: 'user_id,sezione' });
      onComplete();
    } catch (e) { alert("Errore di rete"); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-3xl w-full bg-white rounded-[3rem] shadow-2xl overflow-hidden">
        <div className="bg-[#e67e22] p-10 text-white text-center">
          <ShieldCheck size={48} className="mx-auto mb-4" />
          <h2 className="text-3xl font-black uppercase italic tracking-tighter">Abilitazione Strumenti Lavoro</h2>
          <p className="text-white/60 text-[10px] font-black uppercase tracking-widest mt-2 italic">Richiedi permessi specifici per ogni area</p>
        </div>
        <form onSubmit={submitRequests} className="p-10 space-y-10">
          <div className="grid grid-cols-2 gap-4">
             <input type="text" placeholder="Nome" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs outline-none focus:border-[#e67e22]" required />
             <input type="text" placeholder="Cognome" value={formData.cognome} onChange={e => setFormData({...formData, cognome: e.target.value})} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs outline-none focus:border-[#e67e22]" required />
          </div>
          
          <div className="space-y-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 italic">Configura Aree e Livelli di Accesso:</p>
            <div className="space-y-3">
              {subsections.map(sub => {
                const isSel = selections[sub.id].selected;
                const level = selections[sub.id].level;
                return (
                  <div key={sub.id} className={`p-4 rounded-[2rem] border-2 transition-all flex flex-col sm:flex-row items-center gap-4 ${isSel ? 'border-[#e67e22] bg-amber-50/30' : 'border-slate-100 bg-slate-50/50'}`}>
                    <button type="button" onClick={() => toggleSelection(sub.id)} className={`flex items-center gap-3 flex-1 text-left ${isSel ? 'text-[#e67e22]' : 'text-slate-400'}`}>
                       <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isSel ? 'bg-[#e67e22] text-white' : 'bg-slate-200 text-slate-400'}`}>
                          {isSel ? <CheckCircle2 size={20} /> : <sub.icon size={20} />}
                       </div>
                       <span className="font-black uppercase italic text-sm">{sub.title}</span>
                    </button>
                    
                    {isSel && (
                      <div className="flex bg-white p-1.5 rounded-2xl shadow-inner border border-amber-200">
                        {/* Fixed 'SOLO LETTURA' to 'VISUALIZZATORE' to match AccessLevel and fix assignment error */}
                        <button type="button" onClick={() => setLevel(sub.id, 'VISUALIZZATORE')} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${level === 'VISUALIZZATORE' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400'}`}>
                          SOLO LETTURA
                        </button>
                        <button type="button" onClick={() => setLevel(sub.id, 'OPERATORE')} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${level === 'OPERATORE' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400'}`}>
                          UTILIZZO COMPLETO
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <textarea placeholder="Note o Motivazione..." value={formData.motivo} onChange={e => setFormData({...formData, motivo: e.target.value})} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs resize-none outline-none focus:border-[#e67e22]" rows={3} />

          <button type="submit" disabled={loading} className="w-full py-6 bg-slate-950 text-white font-black rounded-3xl uppercase text-[11px] tracking-widest shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all">
            {loading ? <RefreshCw className="animate-spin" size={20} /> : <Send size={20} />} Invia Richiesta
          </button>
        </form>
      </div>
    </div>
  );
};

export default Lavoro;
