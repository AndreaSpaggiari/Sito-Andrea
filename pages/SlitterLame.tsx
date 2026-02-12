
// @ts-nocheck
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { 
  LameStampo, LameStampoTipo, LameStampoSerie, Macchina, UserProfile, AccessLevel
} from '../types';
import { 
  ArrowLeft, Plus, X, Pencil, Trash2, 
  RefreshCw, Save, Copy, LayoutGrid, Calculator, ChevronDown, FolderPlus
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
  
  // Modali
  const [showModal, setShowModal] = useState(false);
  const [showNewSerieModal, setShowNewSerieModal] = useState(false);
  
  const [editingLama, setEditingLama] = useState<LameStampo | null>(null);
  const [newSerieName, setNewSerieName] = useState('');
  
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
          .eq('id_macchina', currentMachineId),
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

  const handleCreateSerie = async () => {
    if (!newSerieName.trim() || !isOperator) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('l_lame_stampi_serie')
        .insert([{ lama_stampo_serie: newSerieName.trim().toUpperCase() }])
        .select();
      
      if (error) throw error;
      if (data && data[0]) {
        setActiveSerieId(data[0].id_lama_stampo_serie);
        setNewSerieName('');
        setShowNewSerieModal(false);
        fetchData();
      }
    } catch (err: any) {
      alert("Errore creazione serie: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    if (!isOperator) return;
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        lama_stampo_tipo: formData.lama_stampo_tipo,
        lama_stampo_serie: activeSerieId,
        id_macchina: currentMachineId,
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
    const types: Record<string, { items: LameStampo[], totalQta: number, totalLen: number, avgDiameter: string }> = {};
    
    ['LAME', 'GOMME'].forEach(t => {
      types[t] = { items: [], totalQta: 0, totalLen: 0, avgDiameter: '--' };
    });

    currentSerie.forEach(l => {
      let tName = l.l_lame_stampi_tipi?.tipo_lama_stampo?.toUpperCase() || 'ALTRO';
      if (!tName.includes('GOMMA')) tName = 'LAME'; else tName = 'GOMME';
      
      types[tName].items.push(l);
      types[tName].totalQta += (l.lama_stampo_quantita || 0);
      types[tName].totalLen += (l.lama_stampo_misura || 0) * (l.lama_stampo_quantita || 0);
      
      if (types[tName].avgDiameter === '--' && l.lama_stampo_misura_attuale) {
        types[tName].avgDiameter = l.lama_stampo_misura_attuale.toString().replace('.', ',');
      }
    });

    Object.keys(types).forEach(k => {
      types[k].items.sort((a,b) => (a.lama_stampo_misura || 0) - (b.lama_stampo_misura || 0));
    });

    return types;
  }, [lame, activeSerieId]);

  const activeSerieName = useMemo(() => serie.find(s => s.id_lama_stampo_serie === activeSerieId)?.lama_stampo_serie || 'SELEZIONA SERIE', [serie, activeSerieId]);

  return (
    <div className="min-h-screen bg-[#cbd5e1] text-slate-900 pb-20 font-sans selection:bg-blue-200">
      
      {/* Top Banner Control */}
      <div className="bg-[#1e293b] p-4 flex justify-between items-center border-b-2 border-black/20 sticky top-0 z-[100]">
         <div className="flex items-center gap-6">
            <Link to="/lavoro/slitter-piccolo" className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
               <ArrowLeft size={20} /> <span className="text-xs font-bold uppercase tracking-widest">Esci</span>
            </Link>
            <div className="h-6 w-[1px] bg-white/10"></div>
            
            {/* Series Selector and ADD NEW button */}
            <div className="flex items-center gap-2">
              <div className="relative group">
                <select 
                  value={activeSerieId || ''} 
                  onChange={(e) => setActiveSerieId(Number(e.target.value))}
                  className="bg-transparent text-blue-400 font-black uppercase tracking-widest text-sm outline-none cursor-pointer appearance-none pr-8 hover:text-blue-300 transition-colors"
                >
                  {serie.map(s => <option key={s.id_lama_stampo_serie} value={s.id_lama_stampo_serie} className="bg-slate-800 text-white">{s.lama_stampo_serie}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-0 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none" />
              </div>
              {isOperator && (
                <button 
                  onClick={() => setShowNewSerieModal(true)}
                  className="p-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg transition-all border border-blue-600/20"
                  title="Crea Nuova Serie"
                >
                  <Plus size={14} />
                </button>
              )}
            </div>
         </div>
         
         <div className="flex gap-3">
            {isOperator && (
              <button 
                onClick={() => { 
                  setEditingLama(null); 
                  setFormData({ lama_stampo_tipo: tipi[0]?.id_tipo_lama_stampo, lama_stampo_serie: activeSerieId, id_macchina: currentMachineId, lama_stampo_misura: 0, lama_stampo_misura_attuale: 0, lama_stampo_quantita: 1 }); 
                  setShowModal(true); 
                }}
                className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 border-b-4 border-emerald-800"
              >
                + Aggiungi Pezzo
              </button>
            )}
            <button onClick={fetchData} className="p-2 bg-white/10 text-white rounded-lg hover:bg-white/20"><RefreshCw size={18} className={loading ? 'animate-spin' : ''} /></button>
         </div>
      </div>

      <div className="max-w-[1900px] mx-auto p-4 sm:p-6">
        
        {/* Titolo Gigante Serie con Diametro */}
        <div className="bg-white/70 backdrop-blur-md rounded-[2.5rem] border-b-[8px] border-black/10 p-10 mb-12 text-center shadow-2xl relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-8 text-slate-800/5 group-hover:scale-110 transition-transform duration-1000">
              <LayoutGrid size={240} />
           </div>
           
           <div className="relative z-10">
             <h1 className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter text-slate-800 drop-shadow-sm leading-none">
               {activeSerieName}
             </h1>
             <div className="mt-6 flex justify-center items-center gap-6">
                <div className="h-[2px] w-20 bg-slate-300"></div>
                <div className="flex items-center gap-3">
                   <span className="text-xl font-black text-blue-600 uppercase tracking-widest italic">DIAMETRO ATTUALE:</span>
                   <span className="text-5xl font-black text-slate-900 tabular-nums italic">Ø {dashboardData['LAME'].avgDiameter}</span>
                </div>
                <div className="h-[2px] w-20 bg-slate-300"></div>
             </div>
           </div>
        </div>

        <div className="space-y-12">
           {['LAME', 'GOMME'].map(typeKey => {
             const data = dashboardData[typeKey];
             const isGomme = typeKey === 'GOMME';
             const colorClass = isGomme ? 'bg-[#ff0000]' : 'bg-[#94a3b8]';
             const textClass = isGomme ? 'text-white' : 'text-slate-900';

             return (
               <div key={typeKey} className="flex flex-col lg:flex-row gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex-grow bg-white border-2 border-black/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
                     <div className={`${colorClass} ${textClass} py-6 px-12 text-center border-b-2 border-black/20 flex justify-between items-center`}>
                        <h3 className="text-4xl font-black italic tracking-[0.3em] uppercase">{typeKey}</h3>
                        {isGomme && <span className="text-xs font-black bg-white/20 px-4 py-1 rounded-full border border-white/20">Ø {data.avgDiameter}</span>}
                     </div>
                     
                     <div className="p-6 bg-[#f1f5f9]">
                        {data.items.length === 0 ? (
                          <div className="py-24 text-center text-slate-400 font-black uppercase italic tracking-widest bg-white/50 rounded-3xl border-2 border-dashed border-slate-200">
                             Nessun dato registrato
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-4">
                             {data.items.map(l => (
                               <div 
                                 key={l.id_lama_stampo} 
                                 className="bg-white border-2 border-slate-300 rounded-[1.5rem] overflow-hidden hover:border-blue-500 transition-all group relative cursor-default shadow-sm"
                               >
                                  <div className="p-5 text-center flex flex-col items-center justify-center min-h-[120px]">
                                     <p className="text-3xl font-black italic tabular-nums leading-none text-slate-900 mb-2">
                                       {l.lama_stampo_misura?.toString().replace('.', ',')}
                                     </p>
                                     <div className="w-12 h-[2px] bg-slate-200 mb-2"></div>
                                     <p className="text-sm font-black text-slate-500 tabular-nums tracking-widest">
                                       {l.lama_stampo_quantita} <span className="text-[10px] opacity-40">PZ</span>
                                     </p>
                                  </div>

                                  {isOperator && (
                                    <div className="absolute inset-0 bg-blue-600/95 flex flex-col items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                       <div className="flex gap-2">
                                          <button onClick={() => handleDuplicate(l)} className="p-3 bg-white text-blue-600 rounded-xl shadow-lg active:scale-90 transition-transform"><Copy size={16}/></button>
                                          <button onClick={() => { setEditingLama(l); setFormData(l); setShowModal(true); }} className="p-3 bg-white text-amber-600 rounded-xl shadow-lg active:scale-90 transition-transform"><Pencil size={16}/></button>
                                       </div>
                                       <button onClick={() => handleDelete(l.id_lama_stampo)} className="p-3 bg-white text-rose-600 rounded-xl shadow-lg active:scale-90 transition-transform"><Trash2 size={16}/></button>
                                    </div>
                                  )}
                               </div>
                             ))}
                          </div>
                        )}
                     </div>
                  </div>

                  <div className="lg:w-80 shrink-0 flex flex-col gap-6">
                     <div className="bg-[#1e293b] rounded-[2rem] p-8 border-l-[14px] border-blue-500 shadow-xl flex flex-col justify-center min-h-[160px]">
                        <p className="text-[11px] font-black text-blue-400 uppercase tracking-widest mb-1 italic">TOTALE {typeKey}</p>
                        <p className="text-7xl font-black text-white italic tabular-nums leading-none">
                          {data.totalQta}
                        </p>
                     </div>
                     <div className="bg-[#1e293b] rounded-[2rem] p-8 border-l-[14px] border-emerald-500 shadow-xl flex flex-col justify-center min-h-[160px]">
                        <p className="text-[11px] font-black text-emerald-400 uppercase tracking-widest mb-1 italic">SVILUPPO TOTALE (MT)</p>
                        <p className="text-5xl font-black text-white italic tabular-nums leading-none">
                          {(data.totalLen / 1000).toFixed(3).replace('.', ',')}
                        </p>
                        <p className="text-[9px] font-bold text-white/20 uppercase mt-4 leading-tight tracking-[0.2em]">Calcolato su Largh. Nominale</p>
                     </div>
                  </div>
               </div>
             );
           })}
        </div>
      </div>

      {/* Modale Nuova Serie */}
      {showNewSerieModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[2000] flex items-center justify-center p-4 animate-in zoom-in duration-200">
           <div className="bg-white rounded-[3rem] w-full max-w-sm shadow-2xl overflow-hidden border-2 border-white/20">
              <div className="bg-[#1e293b] p-8 text-white flex justify-between items-center">
                 <div className="flex items-center gap-4">
                    <FolderPlus size={24} className="text-blue-400" />
                    <h3 className="text-xl font-black uppercase italic tracking-tighter">Nuova Serie</h3>
                 </div>
                 <button onClick={() => setShowNewSerieModal(false)} className="p-2 hover:bg-white/10 rounded-xl"><X size={20}/></button>
              </div>
              <div className="p-8 space-y-6 bg-[#f8fafc]">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Nome Identificativo Serie</label>
                    <input 
                      type="text"
                      autoFocus
                      placeholder="Es: SN SERIE 3"
                      value={newSerieName}
                      onChange={e => setNewSerieName(e.target.value)}
                      className="w-full p-5 bg-white border-2 border-slate-200 focus:border-blue-500 rounded-2xl font-black uppercase italic outline-none transition-all shadow-sm"
                    />
                 </div>
                 <button 
                   onClick={handleCreateSerie}
                   disabled={loading || !newSerieName.trim()}
                   className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 border-b-4 border-blue-800 disabled:opacity-50"
                 >
                    <Save size={18} /> CREA CATEGORIA
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Modale Tecnico Pezzo */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[2000] flex items-center justify-center p-4 animate-in zoom-in duration-200">
           <div className="bg-white rounded-[3rem] w-full max-w-lg shadow-2xl overflow-hidden border-2 border-white/20">
              <div className="bg-[#1e293b] p-8 text-white flex justify-between items-center">
                 <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                       <Calculator size={28} />
                    </div>
                    <div>
                       <h3 className="text-2xl font-black uppercase italic tracking-tighter leading-none">MODULO TECNICO</h3>
                       <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mt-1">{activeSerieName}</p>
                    </div>
                 </div>
                 <button onClick={() => setShowModal(false)} className="p-3 hover:bg-white/10 rounded-2xl transition-colors"><X size={24}/></button>
              </div>

              <form onSubmit={handleSave} className="p-10 space-y-8 bg-[#f8fafc]">
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

                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-blue-600 uppercase ml-1">Diametro Ø (Attuale)</label>
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
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1 text-center block">Quantità Pezzi</label>
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
                    {editingLama ? 'AGGIORNA DATI' : 'REGISTRA NUOVO'}
                 </button>
              </form>
           </div>
        </div>
      )}

      {loading && !showModal && !showNewSerieModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex flex-col items-center justify-center z-[1000]">
           <RefreshCw size={60} className="text-blue-500 animate-spin mb-4" />
           <p className="text-xs font-black uppercase tracking-[0.5em] text-white animate-pulse italic">Aggiornamento Dashboard...</p>
        </div>
      )}
    </div>
  );
};

export default SlitterLame;
