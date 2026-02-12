
// @ts-nocheck
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { 
  LameStampo, LameStampoTipo, LameStampoSerie, Macchina, UserProfile, AccessLevel
} from '../types';
import { 
  ArrowLeft, Scissors, Plus, X, Pencil, Trash2, 
  RefreshCw, Search, Save, Settings2,
  ChevronRight, Copy, History, AlertCircle, Layers, Eye, Ruler, LayoutGrid, Calculator
} from 'lucide-react';

interface Props {
  profile: UserProfile | null;
}

const SlitterLame: React.FC<Props> = ({ profile }) => {
  const [accessLevel, setAccessLevel] = useState<AccessLevel>('VISUALIZZATORE');
  const [lame, setLame] = useState<LameStampo[]>([]);
  const [tipi, setTipi] = useState<LameStampoTipo[]>([]);
  const [serie, setSerie] = useState<LameStampoSerie[]>([]);
  const [macchine, setMacchine] = useState<Macchina[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSerieId, setActiveSerieId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingLama, setEditingLama] = useState<LameStampo | null>(null);
  
  // Identifichiamo la macchina corrente dal contesto del reparto
  const currentMachineId = useMemo(() => localStorage.getItem('kme_selected_macchina') || 'SLP', []);

  const isOperator = profile?.role === 'ADMIN' || accessLevel === 'OPERATORE';

  const [formData, setFormData] = useState<Partial<LameStampo>>({
    lama_stampo_tipo: 0,
    lama_stampo_serie: null,
    id_macchina: currentMachineId,
    lama_stampo_misura: 0,
    lama_stampo_misura_attuale: 0,
    lama_stampo_quantita: 1
  });

  const fetchAccess = useCallback(async () => {
    if (profile?.role === 'ADMIN') {
      setAccessLevel('OPERATORE');
      return;
    }
    const { data } = await supabase.from('l_permessi').select('livello').eq('user_id', profile?.id).eq('sezione', 'LAVORO').eq('sottosezione', 'SLITTER_LAME').maybeSingle();
    if (data) setAccessLevel(data.livello as AccessLevel);
  }, [profile]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [lRes, tRes, sRes, mRes] = await Promise.all([
        supabase.from('l_lame_stampi')
          .select('*, l_lame_stampi_tipi(*), l_lame_stampi_serie(*)')
          .eq('id_macchina', currentMachineId), // FILTRO RIGIDO PER MACCHINA
        supabase.from('l_lame_stampi_tipi').select('*'),
        supabase.from('l_lame_stampi_serie').select('*'),
        supabase.from('l_macchine').select('*')
      ]);

      if (tRes.data) setTipi(tRes.data as LameStampoTipo[]);
      if (sRes.data) {
        const sData = sRes.data as LameStampoSerie[];
        setSerie(sData);
        if (!activeSerieId && sData.length > 0) setActiveSerieId(sData[0].id_lama_stampo_serie);
      }
      if (mRes.data) setMacchine(mRes.data as Macchina[]);
      if (lRes.data) setLame(lRes.data as LameStampo[]);
    } catch (err) {
      console.error("Errore fetch:", err);
    } finally {
      setLoading(false);
    }
  }, [activeSerieId, currentMachineId]);

  useEffect(() => { fetchAccess(); fetchData(); }, [fetchAccess, fetchData]);

  const handleSave = async (e: React.FormEvent) => {
    if (!isOperator) return;
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        lama_stampo_tipo: formData.lama_stampo_tipo,
        lama_stampo_serie: formData.lama_stampo_serie,
        id_macchina: currentMachineId, // Assicuriamo che la registrazione sia sempre per questa macchina
        lama_stampo_misura: formData.lama_stampo_misura,
        lama_stampo_misura_attuale: formData.lama_stampo_misura_attuale || formData.lama_stampo_misura,
        lama_stampo_quantita: formData.lama_stampo_quantita
      };

      if (editingLama) {
        await supabase.from('l_lame_stampi').update(payload).eq('id_lama_stampo', editingLama.id_lama_stampo);
      } else {
        await supabase.from('l_lame_stampi').insert([payload]);
      }
      setShowModal(false);
      fetchData();
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  const handleDelete = async (id: number) => {
    if (!isOperator || !confirm("Eliminare definitivamente?")) return;
    setLoading(true);
    await supabase.from('l_lame_stampi').delete().eq('id_lama_stampo', id);
    fetchData();
  };

  const handleDuplicate = (l: LameStampo) => {
    setEditingLama(null);
    setFormData({ ...l, id_lama_stampo: undefined });
    setShowModal(true);
  };

  const dashboardData = useMemo(() => {
    const currentSerie = lame.filter(l => l.lama_stampo_serie === activeSerieId);
    
    const types: Record<string, { items: LameStampo[], totalQta: number, totalLen: number }> = {};
    
    ['LAME', 'GOMME'].forEach(t => {
      types[t] = { items: [], totalQta: 0, totalLen: 0 };
    });

    currentSerie.forEach(l => {
      let tName = l.l_lame_stampi_tipi?.tipo_lama_stampo?.toUpperCase() || 'ALTRO';
      if (!tName.includes('GOMMA')) tName = 'LAME'; else tName = 'GOMME';
      
      types[tName].items.push(l);
      types[tName].totalQta += (l.lama_stampo_quantita || 0);
      types[tName].totalLen += (l.lama_stampo_misura || 0) * (l.lama_stampo_quantita || 0);
    });

    // Ordiniamo gli item per diametro attuale (come in Excel)
    Object.keys(types).forEach(k => {
      types[k].items.sort((a,b) => (a.lama_stampo_misura_attuale || 0) - (b.lama_stampo_misura_attuale || 0));
    });

    return types;
  }, [lame, activeSerieId]);

  const activeSerieName = useMemo(() => serie.find(s => s.id_lama_stampo_serie === activeSerieId)?.lama_stampo_serie || 'SERIE NON DEFINITA', [serie, activeSerieId]);

  return (
    <div className="min-h-screen bg-[#cbd5e1] text-slate-900 pb-32 font-sans selection:bg-blue-200">
      
      {/* Top Banner Control */}
      <div className="bg-[#1e293b] p-4 flex justify-between items-center border-b-2 border-black/20">
         <div className="flex items-center gap-6">
            <Link to="/lavoro/slitter-piccolo" className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
               <ArrowLeft size={20} /> <span className="text-xs font-bold uppercase tracking-widest">Esci</span>
            </Link>
            <div className="h-6 w-[1px] bg-white/10"></div>
            <h2 className="text-white font-black italic uppercase tracking-tighter text-lg">
               Dashboard <span className="text-blue-400">{macchine.find(m => m.id_macchina === currentMachineId)?.macchina}</span>
            </h2>
         </div>
         <div className="flex gap-3">
            {isOperator && (
              <button 
                onClick={() => { setEditingLama(null); setFormData({ lama_stampo_tipo: tipi[0]?.id_tipo_lama_stampo, lama_stampo_serie: activeSerieId, id_macchina: currentMachineId, lama_stampo_misura: 0, lama_stampo_misura_attuale: 0, lama_stampo_quantita: 1 }); setShowModal(true); }}
                className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 border-b-4 border-emerald-800"
              >
                + Nuova Registrazione
              </button>
            )}
            <button onClick={fetchData} className="p-2 bg-white/10 text-white rounded-lg hover:bg-white/20"><RefreshCw size={18} className={loading ? 'animate-spin' : ''} /></button>
         </div>
      </div>

      <div className="max-w-[1900px] mx-auto p-4 sm:p-6">
        
        {/* Titolo Gigante Serie (Immagine Excel) */}
        <div className="bg-white/60 backdrop-blur-md rounded-xl border-b-[6px] border-black/10 p-8 mb-8 text-center shadow-xl">
           <h1 className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter text-slate-800 drop-shadow-sm">
             {activeSerieName}
           </h1>
           <div className="mt-2 flex justify-center gap-4">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Inventory System v4.0</span>
           </div>
        </div>

        <div className="space-y-12">
           {['LAME', 'GOMME'].map(typeKey => {
             const data = dashboardData[typeKey];
             const isGomme = typeKey === 'GOMME';
             const colorClass = isGomme ? 'bg-[#ff0000]' : 'bg-[#94a3b8]';
             const textClass = isGomme ? 'text-white' : 'text-slate-900';

             return (
               <div key={typeKey} className="flex flex-col lg:flex-row gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  
                  {/* Blocco Griglia Densa (Molte colonne) */}
                  <div className="flex-grow bg-white border-2 border-black/10 rounded-2xl overflow-hidden shadow-2xl">
                     <div className={`${colorClass} ${textClass} py-4 px-10 text-center border-b-2 border-black/20`}>
                        <h3 className="text-4xl font-black italic tracking-[0.3em] uppercase">{typeKey}</h3>
                     </div>
                     
                     <div className="p-4 bg-[#f1f5f9]">
                        {data.items.length === 0 ? (
                          <div className="py-20 text-center text-slate-400 font-black uppercase italic tracking-widest bg-white/50 rounded-xl border-2 border-dashed border-slate-200">
                             Nessun elemento registrato per questa serie
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
                             {data.items.map(l => (
                               <div 
                                 key={l.id_lama_stampo} 
                                 className="bg-white border-2 border-slate-300 rounded-xl overflow-hidden hover:border-blue-500 transition-all group relative cursor-default"
                               >
                                  {/* Testata Cella (Diametro Attuale) */}
                                  <div className="bg-[#e2e8f0] py-2 px-1 text-center border-b border-slate-200">
                                     <span className="text-lg font-black italic tabular-nums text-slate-800">
                                       {(l.lama_stampo_misura_attuale || 0).toString().replace('.', ',')}
                                     </span>
                                  </div>
                                  
                                  {/* Corpo Cella (Misura SOPRA e Quantità SOTTO) */}
                                  <div className="p-3 text-center flex flex-col items-center">
                                     {/* Misura Nominale - In grassetto sopra */}
                                     <p className="text-2xl font-black italic tabular-nums leading-none mb-1 text-slate-900">
                                       {l.lama_stampo_misura?.toString().replace('.', ',')}
                                     </p>
                                     <div className="w-full h-[1px] bg-slate-200 my-1"></div>
                                     {/* Quantità - Sotto */}
                                     <p className="text-sm font-bold text-slate-500 tabular-nums">
                                       {l.lama_stampo_quantita} <span className="text-[9px] opacity-40">PZ</span>
                                     </p>
                                  </div>

                                  {/* Azioni Rapide Hover */}
                                  {isOperator && (
                                    <div className="absolute inset-0 bg-blue-600/95 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                       <div className="flex gap-2">
                                          <button onClick={() => handleDuplicate(l)} className="p-2 bg-white text-blue-600 rounded-lg shadow-lg active:scale-90"><Copy size={14}/></button>
                                          <button onClick={() => { setEditingLama(l); setFormData(l); setShowModal(true); }} className="p-2 bg-white text-amber-600 rounded-lg shadow-lg active:scale-90"><Pencil size={14}/></button>
                                       </div>
                                       <button onClick={() => handleDelete(l.id_lama_stampo)} className="p-2 bg-white text-rose-600 rounded-lg shadow-lg active:scale-90"><Trash2 size={14}/></button>
                                    </div>
                                  )}
                               </div>
                             ))}
                          </div>
                        )}
                     </div>
                  </div>

                  {/* Sidebar Totali (Verticale come Excel) */}
                  <div className="lg:w-72 shrink-0 flex flex-col gap-4">
                     <div className="bg-[#1e293b] rounded-2xl p-6 border-l-[12px] border-blue-500 shadow-xl flex flex-col justify-center min-h-[140px]">
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">TOTALE {typeKey}</p>
                        <p className="text-6xl font-black text-white italic tabular-nums leading-none">
                          {data.totalQta}
                        </p>
                     </div>
                     <div className="bg-[#1e293b] rounded-2xl p-6 border-l-[12px] border-emerald-500 shadow-xl flex flex-col justify-center min-h-[140px]">
                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">SVILUPPO TOTALE (MT)</p>
                        <p className="text-4xl font-black text-white italic tabular-nums leading-none">
                          {(data.totalLen / 1000).toFixed(3).replace('.', ',')}
                        </p>
                        <p className="text-[8px] font-bold text-white/20 uppercase mt-3 leading-tight tracking-widest">Base Nominale</p>
                     </div>
                  </div>

               </div>
             );
           })}
        </div>
      </div>

      {/* Footer Navigation (Excel Tabs) */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-300 border-t-2 border-black/20 p-2 flex items-center overflow-x-auto gap-1 z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.1)]">
         <div className="flex items-center gap-2 px-6 border-r-2 border-black/10 mr-2 shrink-0">
            <LayoutGrid size={18} className="text-slate-600" />
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-700">Seleziona Serie:</span>
         </div>
         {serie.map(s => (
           <button 
             key={s.id_lama_stampo_serie}
             onClick={() => setActiveSerieId(s.id_lama_stampo_serie)}
             className={`px-8 py-3 font-black text-xs uppercase tracking-tighter italic transition-all whitespace-nowrap rounded-t-xl border-x-2 border-t-2 ${
               activeSerieId === s.id_lama_stampo_serie 
                 ? 'bg-white text-blue-600 border-black/20 shadow-[-4px_-4px_10px_rgba(0,0,0,0.05)] translate-y-[-4px]' 
                 : 'bg-slate-400/40 text-slate-600 border-transparent hover:bg-slate-200'
             }`}
           >
             {s.lama_stampo_serie}
           </button>
         ))}
         {isOperator && (
            <button className="px-6 py-3 text-slate-500 hover:text-blue-600 transition-colors" title="Aggiungi Serie"><Plus size={24}/></button>
         )}
      </div>

      {/* Modale Tecnico */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[2000] flex items-center justify-center p-4 animate-in zoom-in duration-200">
           <div className="bg-white rounded-[3rem] w-full max-w-lg shadow-2xl overflow-hidden border-2 border-white/20">
              <div className="bg-[#1e293b] p-8 text-white flex justify-between items-center">
                 <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                       <Calculator size={28} />
                    </div>
                    <div>
                       <h3 className="text-2xl font-black uppercase italic tracking-tighter leading-none">REGISTRO DATI</h3>
                       <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mt-1">{macchine.find(m => m.id_macchina === currentMachineId)?.macchina}</p>
                    </div>
                 </div>
                 <button onClick={() => setShowModal(false)} className="p-3 hover:bg-white/10 rounded-2xl transition-colors"><X size={24}/></button>
              </div>

              <form onSubmit={handleSave} className="p-10 space-y-8 bg-[#f8fafc]">
                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Categoria Componente</label>
                       <select 
                         value={formData.lama_stampo_tipo}
                         onChange={e => setFormData({...formData, lama_stampo_tipo: Number(e.target.value)})}
                         className="w-full p-4 bg-white border-2 border-slate-200 focus:border-blue-500 rounded-2xl font-bold outline-none transition-all shadow-sm"
                       >
                          <option value={0}>Scegli...</option>
                          {tipi.map(t => <option key={t.id_tipo_lama_stampo} value={t.id_tipo_lama_stampo}>{t.tipo_lama_stampo}</option>)}
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Appartenenza Serie</label>
                       <select 
                         value={formData.lama_stampo_serie || ''}
                         onChange={e => setFormData({...formData, lama_stampo_serie: e.target.value ? Number(e.target.value) : null})}
                         className="w-full p-4 bg-white border-2 border-slate-200 focus:border-blue-500 rounded-2xl font-bold outline-none transition-all shadow-sm"
                       >
                          <option value="">Generica...</option>
                          {serie.map(s => <option key={s.id_lama_stampo_serie} value={s.id_lama_stampo_serie}>{s.lama_stampo_serie}</option>)}
                       </select>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-blue-600 uppercase ml-1">Diametro (Attuale)</label>
                       <input 
                         type="number" step="0.01" required
                         value={formData.lama_stampo_misura_attuale || ''} 
                         onChange={e => setFormData({...formData, lama_stampo_misura_attuale: Number(e.target.value)})}
                         className="w-full p-5 bg-blue-50 border-2 border-blue-100 focus:border-blue-500 rounded-2xl font-black text-2xl italic outline-none transition-all shadow-inner text-blue-700" 
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Larghezza (Nominale)</label>
                       <input 
                         type="number" step="0.01" required
                         value={formData.lama_stampo_misura || ''} 
                         onChange={e => setFormData({...formData, lama_stampo_misura: Number(e.target.value)})}
                         className="w-full p-5 bg-white border-2 border-slate-200 focus:border-blue-500 rounded-2xl font-black text-2xl italic outline-none transition-all shadow-sm" 
                       />
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1 text-center block">Quantità in Stock</label>
                    <input 
                      type="number" required
                      value={formData.lama_stampo_quantita || ''} 
                      onChange={e => setFormData({...formData, lama_stampo_quantita: Number(e.target.value)})}
                      className="w-full p-6 bg-slate-900 border-2 border-black focus:border-blue-500 rounded-3xl font-black text-5xl text-center text-emerald-400 italic outline-none transition-all tabular-nums shadow-2xl" 
                    />
                 </div>

                 <button 
                   type="submit"
                   disabled={loading}
                   className="w-full py-7 bg-blue-600 text-white font-black rounded-3xl uppercase tracking-[0.3em] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-4 mt-6 text-sm border-b-8 border-blue-800"
                 >
                    {loading ? <RefreshCw size={24} className="animate-spin" /> : <Save size={24} />}
                    {editingLama ? 'AGGIORNA ELEMENTO' : 'REGISTRA COMPONENTE'}
                 </button>
              </form>
           </div>
        </div>
      )}

      {loading && !showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex flex-col items-center justify-center z-[1000]">
           <RefreshCw size={60} className="text-blue-500 animate-spin mb-6" />
           <p className="text-xs font-black uppercase tracking-[0.5em] text-white animate-pulse italic">Sincronizzazione Unità di Taglio...</p>
        </div>
      )}
    </div>
  );
};

export default SlitterLame;
