
// @ts-nocheck
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { 
  LameStampo, LameStampoTipo, LameStampoSerie, Macchina 
} from '../types';
import { 
  ArrowLeft, Scissors, Plus, X, Pencil, Trash2, 
  RefreshCw, Search, Save, Settings2,
  ChevronRight, Copy, History, AlertCircle, Layers
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
    lama_stampo_misura_attuale: 0,
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

      if (tRes.data) setTipi(tRes.data as LameStampoTipo[]);
      if (sRes.data) setSerie(sRes.data as LameStampoSerie[]);
      if (mRes.data) setMacchine(mRes.data as Macchina[]);
      if (lRes.data) setLame(lRes.data as LameStampo[]);
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
        lama_stampo_misura_attuale: formData.lama_stampo_misura_attuale || formData.lama_stampo_misura,
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
    if (!confirm("Sei sicuro di voler eliminare questo elemento?")) return;
    setLoading(true);
    const { error } = await supabase.from('l_lame_stampi').delete().eq('id_lama_stampo', id);
    if (!error) fetchData();
    else alert(error.message);
    setLoading(false);
  };

  const handleDuplicate = (lama: LameStampo) => {
    setEditingLama(null);
    setFormData({
      lama_stampo_tipo: lama.lama_stampo_tipo,
      lama_stampo_serie: lama.lama_stampo_serie,
      id_macchina: lama.id_macchina,
      lama_stampo_misura: lama.lama_stampo_misura,
      lama_stampo_misura_attuale: lama.lama_stampo_misura_attuale,
      lama_stampo_quantita: lama.lama_stampo_quantita
    });
    setShowModal(true);
  };

  const groupedData = useMemo(() => {
    const filtered = lame.filter(l => {
      const search = searchTerm.toLowerCase();
      const type = l.l_lame_stampi_tipi?.tipo_lama_stampo || '';
      const s = l.l_lame_stampi_serie?.lama_stampo_serie || '';
      return type.toLowerCase().includes(search) || s.toLowerCase().includes(search);
    });

    const groups: Record<string, { series: Record<string, LameStampo[]>, standalone: LameStampo[] }> = {};
    
    filtered.forEach(l => {
      const typeName = l.l_lame_stampi_tipi?.tipo_lama_stampo || 'ALTRO';
      if (!groups[typeName]) groups[typeName] = { series: {}, standalone: [] };
      
      if (l.l_lame_stampi_serie?.lama_stampo_serie) {
        const sName = l.l_lame_stampi_serie.lama_stampo_serie;
        if (!groups[typeName].series[sName]) groups[typeName].series[sName] = [];
        groups[typeName].series[sName].push(l);
      } else {
        groups[typeName].standalone.push(l);
      }
    });

    // Ordina all'interno dei gruppi
    Object.keys(groups).forEach(tk => {
      groups[tk].standalone.sort((a, b) => (a.lama_stampo_misura || 0) - (b.lama_stampo_misura || 0));
      Object.keys(groups[tk].series).forEach(sk => {
        groups[tk].series[sk].sort((a, b) => (a.lama_stampo_misura || 0) - (b.lama_stampo_misura || 0));
      });
    });

    return groups;
  }, [lame, searchTerm]);

  return (
    <div className="min-h-screen bg-[#060a14] text-slate-100 pb-20">
      
      {/* Header compattato ed elegante */}
      <div className="relative pt-12 pb-24 px-6 overflow-hidden border-b border-white/5 bg-slate-900/40">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_-20%,_rgba(99,102,241,0.15),_transparent_50%)]"></div>
        <div className="relative z-10 max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-end gap-6">
          <div>
            <div className="flex items-center gap-4 mb-6">
              <Link to="/lavoro/slitter-piccolo" className="p-3 bg-white/5 rounded-2xl text-white/40 hover:text-white transition-all border border-white/5 hover:bg-white/10 shadow-xl">
                <ArrowLeft size={18} />
              </Link>
              <div className="flex flex-col">
                <span className="text-indigo-400 font-black text-[9px] uppercase tracking-[0.4em] leading-none mb-1">INVENTORY MANAGEMENT</span>
                <h1 className="text-4xl font-black uppercase tracking-tighter italic leading-none text-white">LAME <span className="text-indigo-500">& STAMPI</span></h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
               <div className="relative flex-1 md:w-80">
                  <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input 
                    type="text" 
                    placeholder="Cerca per tipo o serie..." 
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
                id_macchina: 'SLP', 
                lama_stampo_misura: 0, 
                lama_stampo_misura_attuale: 0,
                lama_stampo_quantita: 1 
              }); 
              setShowModal(true); 
            }}
            className="px-8 py-4 bg-indigo-600 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest flex items-center gap-3 shadow-2xl active:scale-95 transition-all"
          >
            <Plus size={18} /> Nuova Registrazione
          </button>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 -mt-10 relative z-20">
        
        {/* Lista Raggruppata */}
        <div className="space-y-12">
           {Object.keys(groupedData).length === 0 ? (
             <div className="py-40 text-center bg-white/[0.02] rounded-[3rem] border border-dashed border-white/10">
                <Scissors size={60} className="mx-auto mb-6 opacity-10" />
                <p className="text-xs font-black uppercase tracking-[0.4em] italic text-slate-600">Nessuna referenza trovata</p>
             </div>
           ) : Object.entries(groupedData).map(([typeName, group]) => (
             <div key={typeName} className="bg-white/[0.02] border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl">
                <div className="px-10 py-6 border-b border-white/5 bg-indigo-600/5 flex justify-between items-center">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                         <Scissors size={20} />
                      </div>
                      <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">{typeName}</h3>
                   </div>
                   <span className="bg-indigo-600/20 text-indigo-400 px-4 py-1 rounded-full text-[9px] font-black border border-indigo-500/20">
                     {Object.values(group.series).flat().length + group.standalone.length} ELEMENTI
                   </span>
                </div>
                
                <div className="p-2">
                   {/* Rendering SERIE */}
                   {Object.entries(group.series).map(([sName, items]) => (
                     <div key={sName} className="mb-6 last:mb-2 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="px-8 py-4 bg-white/[0.03] border-l-4 border-indigo-500 flex justify-between items-center rounded-r-2xl mb-2">
                           <div className="flex items-center gap-4">
                              <Layers size={14} className="text-indigo-400" />
                              <h4 className="text-sm font-black text-white uppercase italic tracking-tighter">SERIE: {sName}</h4>
                           </div>
                           <div className="flex items-center gap-6">
                              <div className="flex flex-col items-end">
                                 <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">Misura Attuale di Serie</span>
                                 <span className="text-lg font-black text-indigo-400 italic tabular-nums">{items[0]?.lama_stampo_misura_attuale || items[0]?.lama_stampo_misura} <span className="text-[10px] not-italic opacity-40">mm</span></span>
                              </div>
                           </div>
                        </div>
                        
                        <div className="overflow-x-auto px-6">
                           <table className="w-full text-left">
                              <thead>
                                 <tr className="text-[8px] font-black text-slate-600 uppercase tracking-widest border-b border-white/5">
                                    <th className="px-4 py-3">Variante (Misura Nominale)</th>
                                    <th className="px-4 py-3 text-center">Quantità</th>
                                    <th className="px-4 py-3 text-right">Azioni</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-white/[0.02]">
                                 {items.map(l => (
                                   <tr key={l.id_lama_stampo} className="group hover:bg-white/[0.02] transition-colors">
                                      <td className="px-4 py-4">
                                         <div className="flex items-center gap-3">
                                            <span className="text-base font-black text-white italic tabular-nums">{l.lama_stampo_misura || '--'} <span className="text-[10px] opacity-40 not-italic">mm</span></span>
                                            <span className="text-[8px] font-bold text-slate-700 uppercase">ID: {l.id_lama_stampo}</span>
                                         </div>
                                      </td>
                                      <td className="px-4 py-4 text-center">
                                         <span className="inline-flex items-center gap-1 bg-amber-600/10 text-amber-500 px-3 py-1 rounded-xl border border-amber-500/20 font-black italic tabular-nums">
                                            {l.lama_stampo_quantita || 1} <span className="text-[8px] opacity-60 not-italic">PZ</span>
                                         </span>
                                      </td>
                                      <td className="px-4 py-4 text-right">
                                         <div className="flex justify-end gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleDuplicate(l)} className="p-2 bg-white/5 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-xl transition-all border border-white/5"><Copy size={12} /></button>
                                            <button onClick={() => { setEditingLama(l); setFormData(l); setShowModal(true); }} className="p-2 bg-white/5 text-slate-400 hover:bg-indigo-600 hover:text-white rounded-xl transition-all border border-white/5"><Pencil size={12} /></button>
                                            <button onClick={() => handleDelete(l.id_lama_stampo)} className="p-2 bg-white/5 text-slate-400 hover:bg-rose-600 hover:text-white rounded-xl transition-all border border-white/5"><Trash2 size={12} /></button>
                                         </div>
                                      </td>
                                   </tr>
                                 ))}
                              </tbody>
                           </table>
                        </div>
                     </div>
                   ))}

                   {/* Rendering STANDALONE (Senza Serie) */}
                   {group.standalone.length > 0 && (
                     <div className="mt-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="px-8 py-2 border-b border-white/5 mb-4">
                           <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Elementi Singoli / Stampi</h4>
                        </div>
                        <div className="overflow-x-auto px-6 pb-4">
                           <table className="w-full text-left">
                              <thead>
                                 <tr className="text-[8px] font-black text-slate-600 uppercase tracking-widest border-b border-white/5">
                                    <th className="px-4 py-3">Identificativo</th>
                                    <th className="px-4 py-3 text-center">Misura Nominale</th>
                                    <th className="px-4 py-3 text-center">Misura Attuale</th>
                                    <th className="px-4 py-3 text-center">Quantità</th>
                                    <th className="px-4 py-3 text-right">Azioni</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-white/[0.02]">
                                 {group.standalone.map(l => (
                                   <tr key={l.id_lama_stampo} className="group hover:bg-white/[0.02] transition-colors">
                                      <td className="px-4 py-4">
                                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">ID: {l.id_lama_stampo}</span>
                                      </td>
                                      <td className="px-4 py-4 text-center">
                                         <span className="text-base font-black text-white italic tabular-nums">{l.lama_stampo_misura || '--'}</span>
                                      </td>
                                      <td className="px-4 py-4 text-center">
                                         <span className="text-base font-black text-indigo-400 italic tabular-nums">{l.lama_stampo_misura_attuale || l.lama_stampo_misura}</span>
                                      </td>
                                      <td className="px-4 py-4 text-center">
                                         <span className="inline-flex items-center gap-1 bg-amber-600/10 text-amber-500 px-3 py-1 rounded-xl border border-amber-500/20 font-black italic tabular-nums">
                                            {l.lama_stampo_quantita || 1}
                                         </span>
                                      </td>
                                      <td className="px-4 py-4 text-right">
                                         <div className="flex justify-end gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleDuplicate(l)} className="p-2 bg-white/5 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-xl transition-all border border-white/5"><Copy size={12} /></button>
                                            <button onClick={() => { setEditingLama(l); setFormData(l); setShowModal(true); }} className="p-2 bg-white/5 text-slate-400 hover:bg-indigo-600 hover:text-white rounded-xl transition-all border border-white/5"><Pencil size={12} /></button>
                                            <button onClick={() => handleDelete(l.id_lama_stampo)} className="p-2 bg-white/5 text-slate-400 hover:bg-rose-600 hover:text-white rounded-xl transition-all border border-white/5"><Trash2 size={12} /></button>
                                         </div>
                                      </td>
                                   </tr>
                                 ))}
                              </tbody>
                           </table>
                        </div>
                     </div>
                   )}
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
                       {editingLama ? <Pencil size={28} /> : !formData.id_lama_stampo ? <Copy size={28} /> : <Plus size={28} />}
                    </div>
                    <div>
                       <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter leading-none">
                         {editingLama ? 'Modifica' : !formData.id_lama_stampo && formData.lama_stampo_tipo !== 0 ? 'Clona' : 'Nuova'} Registrazione
                       </h3>
                       <p className="text-[9px] font-black text-indigo-400/60 uppercase tracking-widest mt-1">Dati tecnici Slitter</p>
                    </div>
                 </div>
                 <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white transition-colors p-2"><X size={24} /></button>
              </div>

              <form onSubmit={handleSave} className="p-10 space-y-6">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-slate-500 uppercase ml-2">Categoria</label>
                       <select 
                         value={formData.lama_stampo_tipo}
                         onChange={e => setFormData({...formData, lama_stampo_tipo: Number(e.target.value)})}
                         className="w-full p-4 bg-slate-900 border border-white/5 rounded-2xl text-xs font-bold outline-none focus:border-indigo-500 transition-all text-white"
                       >
                          <option value={0}>Scegli Categoria...</option>
                          {tipi.map(t => <option key={t.id_tipo_lama_stampo} value={t.id_tipo_lama_stampo}>{t.tipo_lama_stampo}</option>)}
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-slate-500 uppercase ml-2">Serie</label>
                       <select 
                         value={formData.lama_stampo_serie || ''}
                         onChange={e => setFormData({...formData, lama_stampo_serie: e.target.value ? Number(e.target.value) : null})}
                         className="w-full p-4 bg-slate-900 border border-white/5 rounded-2xl text-xs font-bold outline-none focus:border-indigo-500 transition-all text-white"
                       >
                          <option value="">Serie Generica...</option>
                          {serie.map(s => <option key={s.id_lama_stampo_serie} value={s.id_lama_stampo_serie}>{s.lama_stampo_serie}</option>)}
                       </select>
                    </div>
                 </div>

                 <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-slate-500 uppercase ml-2">M. Nominale</label>
                       <input 
                         type="number" step="0.01" required
                         value={formData.lama_stampo_misura || ''} 
                         onChange={e => setFormData({...formData, lama_stampo_misura: Number(e.target.value)})}
                         className="w-full p-4 bg-slate-900 border border-white/5 rounded-2xl text-lg font-black text-center outline-none focus:border-indigo-500 transition-all text-white italic tabular-nums" 
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-indigo-400 uppercase ml-2">M. Attuale</label>
                       <input 
                         type="number" step="0.01"
                         value={formData.lama_stampo_misura_attuale || ''} 
                         onChange={e => setFormData({...formData, lama_stampo_misura_attuale: Number(e.target.value)})}
                         className="w-full p-4 bg-slate-900 border border-white/5 rounded-2xl text-lg font-black text-center outline-none focus:border-indigo-500 transition-all text-indigo-400 italic tabular-nums" 
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-slate-500 uppercase ml-2">Quantità</label>
                       <input 
                         type="number" required
                         value={formData.lama_stampo_quantita || ''} 
                         onChange={e => setFormData({...formData, lama_stampo_quantita: Number(e.target.value)})}
                         className="w-full p-4 bg-slate-900 border border-white/5 rounded-2xl text-lg font-black text-center outline-none focus:border-indigo-500 transition-all text-amber-500 italic tabular-nums" 
                       />
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-2">Macchina</label>
                    <select 
                      value={formData.id_macchina || ''}
                      onChange={e => setFormData({...formData, id_macchina: e.target.value})}
                      className="w-full p-4 bg-slate-900 border border-white/5 rounded-2xl text-xs font-bold outline-none focus:border-indigo-500 transition-all text-white"
                    >
                       {macchine.map(m => <option key={m.id_macchina} value={m.id_macchina}>{m.macchina}</option>)}
                    </select>
                 </div>

                 <button 
                   type="submit"
                   disabled={loading}
                   className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black text-[11px] uppercase tracking-widest shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-4 mt-6"
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
           <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/50 animate-pulse italic text-center px-6">Sincronizzazione registro tecnico...</p>
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
