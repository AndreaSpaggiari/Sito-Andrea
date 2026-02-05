
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { 
  LameStampo, LameStampoTipo, LameStampoSerie, Macchina 
} from '../types';
import { 
  ArrowLeft, Scissors, Plus, X, Pencil, Trash2, 
  RefreshCw, Search, Info, Save, Settings2, Hash,
  LayoutDashboard, ChevronRight, AlertCircle, Layers
} from 'lucide-react';

const SlitterLame: React.FC = () => {
  const [lame, setLame] = useState<LameStampo[]>([]);
  const [tipi, setTipi] = useState<LameStampoTipo[]>([]);
  const [serie, setSerie] = useState<LameStampoSerie[]>([]);
  const [macchine, setMacchine] = useState<Macchina[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingLama, setEditingLama] = useState<LameStampo | null>(null);
  
  const [formData, setFormData] = useState<Partial<LameStampo>>({
    lama_stampo_tipo: 0,
    lama_stampo_serie: null,
    id_macchina: 'SLP',
    lama_stampo_misura: 0,
    lama_stampo_quantita: 1
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [lRes, tRes, sRes, mRes] = await Promise.all([
        supabase.from('l_lame_stampi').select('*, l_lame_stampi_tipi(*), l_lame_stampi_serie(*)'),
        supabase.from('l_lame_stampi_tipi').select('*'),
        supabase.from('l_lame_stampi_serie').select('*'),
        supabase.from('l_macchine').select('*')
      ]);

      if (tRes.data) setTipi(tRes.data);
      if (sRes.data) setSerie(sRes.data);
      if (mRes.data) {
        setMacchine(mRes.data);
        const slp = mRes.data.find(m => m.macchina.toUpperCase().includes('SLITTER PICCOLO'));
        if (slp) setFormData(prev => ({ ...prev, id_macchina: slp.id_macchina }));
      }
      if (lRes.data) setLame(lRes.data);
    } catch (err) {
      console.error("Errore fetch database:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.lama_stampo_tipo || formData.lama_stampo_tipo === 0) {
      alert("Seleziona un tipo di lama/stampo");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        lama_stampo_tipo: formData.lama_stampo_tipo,
        lama_stampo_serie: formData.lama_stampo_serie,
        id_macchina: formData.id_macchina,
        lama_stampo_misura: formData.lama_stampo_misura,
        lama_stampo_quantita: formData.lama_stampo_quantita
      };

      if (editingLama) {
        const { error } = await supabase
          .from('l_lame_stampi')
          .update(payload)
          .eq('id_lama_stampo', editingLama.id_lama_stampo);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('l_lame_stampi')
          .insert([payload]);
        if (error) throw error;
      }
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      alert("Errore salvataggio: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Sei sicuro di voler eliminare questo elemento dal registro?")) return;
    setLoading(true);
    const { error } = await supabase
      .from('l_lame_stampi')
      .delete()
      .eq('id_lama_stampo', id);
    if (!error) fetchData();
    else alert(error.message);
    setLoading(false);
  };

  const groupedLame = useMemo<Record<string, LameStampo[]>>(() => {
    const filtered = lame.filter(l => {
      const typeName = l.l_lame_stampi_tipi?.tipo_lama_stampo || '';
      const serieName = l.l_lame_stampi_serie?.lama_stampo_serie || '';
      const search = searchTerm.toLowerCase();
      return typeName.toLowerCase().includes(search) || serieName.toLowerCase().includes(search);
    });
    
    const groups: Record<string, LameStampo[]> = {};
    filtered.forEach(l => {
      const typeName = l.l_lame_stampi_tipi?.tipo_lama_stampo || 'NON CATEGORIZZATO';
      if (!groups[typeName]) groups[typeName] = [];
      groups[typeName].push(l);
    });
    return groups;
  }, [lame, searchTerm]);

  return (
    <div className="min-h-screen bg-[#060a14] text-slate-100 pb-20 overflow-x-hidden">
      
      {/* Header compattato ed elegante */}
      <div className="relative pt-12 pb-24 px-6 overflow-hidden border-b border-white/5 bg-slate-900/40">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_-20%,_rgba(99,102,241,0.15),_transparent_50%)]"></div>
        <div className="relative z-10 max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-end gap-6">
          <div className="w-full md:w-auto">
            <div className="flex items-center gap-4 mb-6">
              <Link to="/lavoro/slitter-piccolo" className="p-3 bg-white/5 rounded-2xl text-white/40 hover:text-white transition-all border border-white/5 hover:bg-white/10 shadow-xl">
                <ArrowLeft size={18} />
              </Link>
              <div className="flex flex-col">
                <span className="text-indigo-400 font-black text-[9px] uppercase tracking-[0.4em] italic leading-none mb-1">Slitter Inventory Management</span>
                <h1 className="text-4xl font-black uppercase tracking-tighter italic leading-none text-white">LAME <span className="text-indigo-500">& STAMPI</span></h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
               <div className="relative flex-1 md:w-80">
                  <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input 
                    type="text" 
                    placeholder="Filtra per tipo o serie..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-xs font-bold outline-none focus:border-indigo-500 transition-all text-white" 
                  />
               </div>
               <button onClick={fetchData} className="p-3 bg-white/5 text-slate-400 hover:text-indigo-400 rounded-2xl border border-white/10 transition-all">
                  <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
               </button>
            </div>
          </div>

          <button 
            onClick={() => { 
              setEditingLama(null); 
              setFormData({ 
                lama_stampo_tipo: tipi[0]?.id_tipo_lama_stampo || 0, 
                lama_stampo_serie: null, 
                id_macchina: macchine.find(m => m.macchina.toUpperCase().includes('SLITTER PICCOLO'))?.id_macchina || 'SLP', 
                lama_stampo_misura: 0, 
                lama_stampo_quantita: 1 
              }); 
              setShowModal(true); 
            }}
            className="px-8 py-4 bg-indigo-600 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest flex items-center gap-3 shadow-2xl shadow-indigo-600/20 active:scale-95 transition-all"
          >
            <Plus size={18} /> Nuova Registrazione
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-10 relative z-20">
        
        {/* KPI Scoreboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
           <div className="bg-[#0f172a] rounded-[2.5rem] p-6 border border-white/5 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 text-indigo-500/5 group-hover:scale-110 transition-transform"><Scissors size={60} /></div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Varianti Totali</p>
              <p className="text-3xl font-black text-white italic tabular-nums leading-none">{lame.length}</p>
           </div>
           <div className="bg-[#0f172a] rounded-[2.5rem] p-6 border border-white/5 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 text-emerald-500/5 group-hover:scale-110 transition-transform"><Layers size={60} /></div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Pezzi Totali</p>
              <p className="text-3xl font-black text-emerald-400 italic tabular-nums leading-none">{lame.reduce((acc, l) => acc + (l.lama_stampo_quantita || 0), 0)}</p>
           </div>
           <div className="bg-[#0f172a] rounded-[2.5rem] p-6 border border-white/5 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 text-amber-500/5 group-hover:scale-110 transition-transform"><Settings2 size={60} /></div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Categorie</p>
              <p className="text-3xl font-black text-amber-500 italic tabular-nums leading-none">{tipi.length}</p>
           </div>
           <div className="bg-[#0f172a] rounded-[2.5rem] p-6 border border-white/5 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 text-blue-500/5 group-hover:scale-110 transition-transform"><LayoutDashboard size={60} /></div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Serie Attive</p>
              <p className="text-3xl font-black text-blue-400 italic tabular-nums leading-none">{serie.length}</p>
           </div>
        </div>

        {/* Lista Raggruppata per Tipo */}
        <div className="space-y-16">
           {Object.keys(groupedLame).length === 0 ? (
             <div className="py-40 text-center text-slate-700">
                <Scissors size={60} className="mx-auto mb-6 opacity-10" />
                <p className="text-xs font-black uppercase tracking-[0.4em] italic">Nessuna lama registrata in archivio</p>
             </div>
           /* Fix: Explicitly type the arguments of Object.entries map to avoid unknown inference issues */
           ) : Object.entries(groupedLame).map(([typeName, items]: [string, LameStampo[]]) => (
             <div key={typeName} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-6 mb-8">
                   <h3 className="text-xl font-black text-indigo-400 uppercase italic tracking-[0.2em] leading-none">{typeName}</h3>
                   <div className="h-[1px] flex-1 bg-gradient-to-r from-indigo-500/20 to-transparent"></div>
                   <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">{items.length} Referenze</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                   {items.map(l => (
                     <div key={l.id_lama_stampo} className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-8 group hover:bg-white/[0.04] transition-all relative overflow-hidden flex flex-col h-full shadow-xl">
                        <div className="absolute top-0 right-0 p-4 text-white/[0.01] group-hover:text-indigo-500/5 transition-colors"><Scissors size={100} /></div>
                        
                        <div className="flex justify-between items-start mb-8 relative z-10">
                           <div className="flex flex-col leading-tight">
                              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Serie</span>
                              <p className="text-lg font-black text-white italic tracking-tighter uppercase">{l.l_lame_stampi_serie?.lama_stampo_serie || 'Generica'}</p>
                           </div>
                           <div className="bg-indigo-600/10 text-indigo-400 px-3 py-1 rounded-xl border border-indigo-500/20 text-[10px] font-black">
                             ID {l.id_lama_stampo}
                           </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-8 relative z-10 flex-grow">
                           <div className="bg-black/40 p-4 rounded-2xl border border-white/5 flex flex-col items-center justify-center">
                              <span className="text-[8px] font-black text-slate-500 uppercase block mb-1">Misura (mm)</span>
                              <span className="text-2xl font-black text-white italic tabular-nums">{l.lama_stampo_misura || '--'}</span>
                           </div>
                           <div className="bg-black/40 p-4 rounded-2xl border border-white/5 flex flex-col items-center justify-center">
                              <span className="text-[8px] font-black text-slate-500 uppercase block mb-1">Quantità</span>
                              <span className="text-2xl font-black text-amber-500 italic tabular-nums">{l.lama_stampo_quantita || '--'}</span>
                           </div>
                        </div>

                        <div className="flex justify-between items-center pt-6 border-t border-white/5 relative z-10">
                           <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Disponibile</span>
                           </div>
                           <div className="flex gap-2">
                              <button 
                                onClick={() => { setEditingLama(l); setFormData(l); setShowModal(true); }}
                                className="p-2.5 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all border border-white/5"
                              >
                                <Pencil size={14} />
                              </button>
                              <button 
                                onClick={() => handleDelete(l.id_lama_stampo)}
                                className="p-2.5 bg-white/5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all border border-white/5"
                              >
                                <Trash2 size={14} />
                              </button>
                           </div>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
           ))}
        </div>
      </div>

      {/* Modal Registrazione */}
      {showModal && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 z-[2000] animate-in zoom-in-95 duration-200">
           <div className="bg-[#1e293b] border border-white/10 rounded-[3rem] w-full max-w-lg shadow-2xl overflow-hidden">
              <div className="px-10 py-10 border-b border-white/5 flex justify-between items-center bg-indigo-600/5">
                 <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-indigo-600 rounded-[1.2rem] flex items-center justify-center text-white shadow-xl">
                       <Scissors size={28} />
                    </div>
                    <div>
                       <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter leading-none">{editingLama ? 'MODIFICA' : 'NUOVA'} LAMA</h3>
                       <p className="text-[9px] font-black text-indigo-400/60 uppercase tracking-widest mt-1">Inventario Tecnico Slitter</p>
                    </div>
                 </div>
                 <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white transition-colors p-2">
                    <X size={24} />
                 </button>
              </div>

              <form onSubmit={handleSave} className="p-10 space-y-8">
                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-slate-500 uppercase ml-2 tracking-widest">Categoria</label>
                       <select 
                         value={formData.lama_stampo_tipo}
                         onChange={e => setFormData({...formData, lama_stampo_tipo: Number(e.target.value)})}
                         className="w-full p-4 bg-slate-900 border border-white/5 rounded-2xl text-xs font-bold outline-none focus:border-indigo-500 transition-all text-white appearance-none"
                       >
                          <option value={0}>Scegli Categoria...</option>
                          {tipi.map(t => <option key={t.id_tipo_lama_stampo} value={t.id_tipo_lama_stampo}>{t.tipo_lama_stampo}</option>)}
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-slate-500 uppercase ml-2 tracking-widest">Serie Produttiva</label>
                       <select 
                         value={formData.lama_stampo_serie || ''}
                         onChange={e => setFormData({...formData, lama_stampo_serie: e.target.value ? Number(e.target.value) : null})}
                         className="w-full p-4 bg-slate-900 border border-white/5 rounded-2xl text-xs font-bold outline-none focus:border-indigo-500 transition-all text-white appearance-none"
                       >
                          <option value="">Serie Generica...</option>
                          {serie.map(s => <option key={s.id_lama_stampo_serie} value={s.id_lama_stampo_serie}>{s.lama_stampo_serie}</option>)}
                       </select>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-slate-500 uppercase ml-2 tracking-widest">Sviluppo Misura (mm)</label>
                       <input 
                         type="number" step="0.1" required
                         value={formData.lama_stampo_misura || ''} 
                         onChange={e => setFormData({...formData, lama_stampo_misura: Number(e.target.value)})}
                         className="w-full p-5 bg-slate-900 border border-white/5 rounded-2xl text-xl font-black text-center outline-none focus:border-indigo-500 transition-all text-white italic tabular-nums" 
                         placeholder="0.0"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-slate-500 uppercase ml-2 tracking-widest">Quantità Disponibile</label>
                       <input 
                         type="number" required
                         value={formData.lama_stampo_quantita || ''} 
                         onChange={e => setFormData({...formData, lama_stampo_quantita: Number(e.target.value)})}
                         className="w-full p-5 bg-slate-900 border border-white/5 rounded-2xl text-xl font-black text-center outline-none focus:border-indigo-500 transition-all text-amber-500 italic tabular-nums" 
                         placeholder="1"
                       />
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-2 tracking-widest">Macchina</label>
                    <select 
                      value={formData.id_macchina || ''}
                      onChange={e => setFormData({...formData, id_macchina: e.target.value})}
                      className="w-full p-4 bg-slate-900 border border-white/5 rounded-2xl text-xs font-bold outline-none focus:border-indigo-500 transition-all text-white appearance-none"
                    >
                       {macchine.map(m => <option key={m.id_macchina} value={m.id_macchina}>{m.macchina}</option>)}
                    </select>
                 </div>

                 <button 
                   type="submit"
                   disabled={loading}
                   className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black text-[11px] uppercase tracking-widest shadow-2xl shadow-indigo-600/20 active:scale-95 transition-all flex items-center justify-center gap-4 mt-6"
                 >
                    {loading ? <RefreshCw size={20} className="animate-spin" /> : <Save size={20} />}
                    {editingLama ? 'Salva Modifiche' : 'Registra Elemento'}
                 </button>
              </form>
           </div>
        </div>
      )}

      {loading && !showModal && (
        <div className="fixed inset-0 bg-[#060a14]/70 backdrop-blur-md flex flex-col items-center justify-center z-[1000]">
           <RefreshCw size={40} className="text-indigo-500 animate-spin mb-6" />
           <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/50 animate-pulse italic">Aggiornamento Inventario...</p>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { height: 4px; width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(99,102,241,0.2); }
      `}</style>
    </div>
  );
};

export default SlitterLame;
