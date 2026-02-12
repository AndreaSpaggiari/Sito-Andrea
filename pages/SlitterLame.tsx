
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
  
  const isOperator = profile?.role === 'ADMIN' || accessLevel === 'OPERATORE';

  const [formData, setFormData] = useState<Partial<LameStampo>>({
    lama_stampo_tipo: 0,
    lama_stampo_serie: null,
    id_macchina: 'SLP',
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
        supabase.from('l_lame_stampi').select('*, l_lame_stampi_tipi(*), l_lame_stampi_serie(*)'),
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
  }, [activeSerieId]);

  useEffect(() => { fetchAccess(); fetchData(); }, [fetchAccess, fetchData]);

  const handleSave = async (e: React.FormEvent) => {
    if (!isOperator) return;
    e.preventDefault();
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

  // Logica di Raggruppamento Dashboard
  const dashboardData = useMemo(() => {
    const currentSerie = lame.filter(l => l.lama_stampo_serie === activeSerieId);
    
    const types: Record<string, { diametri: Record<string, LameStampo[]>, totalQta: number, totalLen: number }> = {};
    
    // Inizializziamo sempre LAME e GOMME per mantenere la UI stabile
    ['LAME', 'GOMME'].forEach(t => {
      types[t] = { diametri: {}, totalQta: 0, totalLen: 0 };
    });

    currentSerie.forEach(l => {
      let tName = l.l_lame_stampi_tipi?.tipo_lama_stampo?.toUpperCase() || 'ALTRO';
      if (!tName.includes('GOMMA')) tName = 'LAME'; else tName = 'GOMME';
      
      if (!types[tName]) types[tName] = { diametri: {}, totalQta: 0, totalLen: 0 };
      
      const diam = (l.lama_stampo_misura_attuale || 0).toString().replace('.', ',');
      if (!types[tName].diametri[diam]) types[tName].diametri[diam] = [];
      
      types[tName].diametri[diam].push(l);
      types[tName].totalQta += (l.lama_stampo_quantita || 0);
      types[tName].totalLen += (l.lama_stampo_misura || 0) * (l.lama_stampo_quantita || 0);
    });

    return types;
  }, [lame, activeSerieId]);

  const activeSerieName = useMemo(() => serie.find(s => s.id_lama_stampo_serie === activeSerieId)?.lama_stampo_serie || 'SELEZIONA SERIE', [serie, activeSerieId]);

  return (
    <div className="min-h-screen bg-[#c8d1d8] text-slate-900 pb-32 font-sans selection:bg-blue-200">
      
      {/* Top Banner Control */}
      <div className="bg-[#1e293b] p-4 flex justify-between items-center border-b-2 border-black/20">
         <div className="flex items-center gap-6">
            <Link to="/lavoro/slitter-piccolo" className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
               <ArrowLeft size={20} /> <span className="text-xs font-bold uppercase tracking-widest">Indietro</span>
            </Link>
            <h2 className="text-white font-black italic uppercase tracking-tighter text-lg">Registro Affilatura & Stampi</h2>
         </div>
         <div className="flex gap-3">
            {isOperator && (
              <button 
                onClick={() => { setEditingLama(null); setFormData({ lama_stampo_tipo: tipi[0]?.id_tipo_lama_stampo, lama_stampo_serie: activeSerieId, id_macchina: 'SLP', lama_stampo_misura: 0, lama_stampo_misura_attuale: 0, lama_stampo_quantita: 1 }); setShowModal(true); }}
                className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95"
              >
                + Inserimento Rapido
              </button>
            )}
            <button onClick={fetchData} className="p-2 bg-white/10 text-white rounded-lg"><RefreshCw size={18} className={loading ? 'animate-spin' : ''} /></button>
         </div>
      </div>

      <div className="max-w-[1900px] mx-auto p-4 sm:p-8">
        
        {/* Titolo Gigante Serie (Come da Foto) */}
        <div className="bg-white/40 backdrop-blur-md rounded-xl border-b-4 border-black/10 p-6 mb-10 text-center shadow-xl">
           <h1 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter text-slate-800 drop-shadow-sm">
             {activeSerieName}
           </h1>
        </div>

        <div className="space-y-16">
           {['LAME', 'GOMME'].map(typeKey => {
             const data = dashboardData[typeKey];
             const isGomme = typeKey === 'GOMME';
             const colorClass = isGomme ? 'bg-[#ff0000]' : 'bg-[#a3aab1]';
             const textClass = isGomme ? 'text-white' : 'text-slate-900';
             const borderClass = isGomme ? 'border-red-800' : 'border-slate-400';

             return (
               <div key={typeKey} className="relative flex flex-col lg:flex-row gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  
                  {/* Blocco Principale Griglia */}
                  <div className="flex-grow bg-white border-2 border-black/10 rounded-xl overflow-hidden shadow-2xl">
                     <div className={`${colorClass} ${textClass} py-3 px-8 text-center border-b-2 border-black/20`}>
                        <h3 className="text-3xl font-black italic tracking-[0.2em]">{typeKey}</h3>
                     </div>
                     
                     <div className="overflow-x-auto">
                        <div className="flex min-w-max">
                           {Object.entries(data.diametri).length === 0 ? (
                             <div className="p-20 w-full text-center text-slate-300 font-black uppercase italic tracking-widest">Nessun dato registrato</div>
                           ) : Object.entries(data.diametri).sort((a,b) => parseFloat(a[0].replace(',','.')) - parseFloat(b[0].replace(',','.'))).map(([diam, items]) => (
                             <div key={diam} className="border-r-2 border-black/5 last:border-0">
                                {/* Intestazione Diametro */}
                                <div className="bg-[#e2e8f0] p-4 text-center border-b-2 border-black/10 min-w-[140px]">
                                   <span className="text-2xl font-black italic tabular-nums">{diam}</span>
                                </div>
                                
                                {/* Celle Contenuto */}
                                <div className="divide-y divide-black/5">
                                   {items.map(l => (
                                     <div key={l.id_lama_stampo} className="p-4 hover:bg-blue-50 transition-colors group relative">
                                        <div className="text-center">
                                           <p className="text-xl font-black italic mb-1">{l.lama_stampo_quantita}</p>
                                           <p className="text-sm font-bold text-slate-500 border-t border-black/10 pt-1">{l.lama_stampo_misura}</p>
                                        </div>
                                        
                                        {/* Overlay Azioni al passaggio */}
                                        {isOperator && (
                                          <div className="absolute inset-0 bg-blue-600/90 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                             <button onClick={() => handleDuplicate(l)} className="p-2 bg-white text-blue-600 rounded-lg shadow-lg"><Copy size={14}/></button>
                                             <button onClick={() => { setEditingLama(l); setFormData(l); setShowModal(true); }} className="p-2 bg-white text-amber-600 rounded-lg shadow-lg"><Pencil size={14}/></button>
                                             <button onClick={() => handleDelete(l.id_lama_stampo)} className="p-2 bg-white text-rose-600 rounded-lg shadow-lg"><Trash2 size={14}/></button>
                                          </div>
                                        )}
                                     </div>
                                   ))}
                                </div>
                             </div>
                           ))}
                        </div>
                     </div>
                  </div>

                  {/* Widget Totali Laterali (Stile Foto) */}
                  <div className="lg:w-80 space-y-4 shrink-0">
                     <div className="bg-[#1e293b] rounded-xl p-6 border-l-8 border-blue-500 shadow-xl">
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">TOTALE {typeKey}</p>
                        <p className="text-5xl font-black text-white italic tabular-nums leading-none">
                          {data.totalQta}
                        </p>
                     </div>
                     <div className="bg-[#1e293b] rounded-xl p-6 border-l-8 border-emerald-500 shadow-xl">
                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">SVILUPPO TOTALE (MM)</p>
                        <p className="text-4xl font-black text-white italic tabular-nums leading-none">
                          {(data.totalLen / 1000).toFixed(3).replace('.', ',')}
                        </p>
                        <p className="text-[9px] font-bold text-white/30 uppercase mt-2">Valore calcolato su misura nominale</p>
                     </div>
                  </div>

               </div>
             );
           })}
        </div>
      </div>

      {/* Navigazione Serie Inferiore (Stile Tab Excel) */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#cbd5e1] border-t-2 border-black/10 p-2 flex items-center overflow-x-auto gap-1 z-50">
         <div className="flex items-center gap-2 px-4 border-r-2 border-black/10 mr-2 shrink-0">
            <LayoutGrid size={16} className="text-slate-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Serie Attiva:</span>
         </div>
         {serie.map(s => (
           <button 
             key={s.id_lama_stampo_serie}
             onClick={() => setActiveSerieId(s.id_lama_stampo_serie)}
             className={`px-6 py-3 font-black text-[11px] uppercase tracking-tighter italic transition-all whitespace-nowrap rounded-t-xl border-x-2 border-t-2 ${
               activeSerieId === s.id_lama_stampo_serie 
                 ? 'bg-white text-blue-600 border-black/20 shadow-[-4px_-4px_10px_rgba(0,0,0,0.05)] translate-y-[-4px]' 
                 : 'bg-slate-300 text-slate-500 border-transparent hover:bg-slate-200'
             }`}
           >
             {s.lama_stampo_serie}
           </button>
         ))}
         {isOperator && (
            <button className="px-4 py-3 text-slate-400 hover:text-blue-600 transition-colors"><Plus size={20}/></button>
         )}
      </div>

      {/* Modale Inserimento / Modifica */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[2000] flex items-center justify-center p-4 animate-in zoom-in duration-200">
           <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-[0_30px_100px_rgba(0,0,0,0.5)] overflow-hidden">
              <div className="bg-[#1e293b] p-8 text-white flex justify-between items-center">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                       <Calculator size={24} />
                    </div>
                    <div>
                       <h3 className="text-xl font-black uppercase italic tracking-tighter leading-none">Modulo Tecnico</h3>
                       <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mt-1">{editingLama ? 'Aggiornamento Dati' : 'Nuovo Inserimento'}</p>
                    </div>
                 </div>
                 <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-lg"><X /></button>
              </div>

              <form onSubmit={handleSave} className="p-10 space-y-6">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Tipo Componente</label>
                       <select 
                         value={formData.lama_stampo_tipo}
                         onChange={e => setFormData({...formData, lama_stampo_tipo: Number(e.target.value)})}
                         className="w-full p-4 bg-slate-100 border-2 border-transparent focus:border-blue-500 rounded-xl font-bold outline-none transition-all"
                       >
                          <option value={0}>Seleziona...</option>
                          {tipi.map(t => <option key={t.id_tipo_lama_stampo} value={t.id_tipo_lama_stampo}>{t.tipo_lama_stampo}</option>)}
                       </select>
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Serie Slitter</label>
                       <select 
                         value={formData.lama_stampo_serie || ''}
                         onChange={e => setFormData({...formData, lama_stampo_serie: e.target.value ? Number(e.target.value) : null})}
                         className="w-full p-4 bg-slate-100 border-2 border-transparent focus:border-blue-500 rounded-xl font-bold outline-none transition-all"
                       >
                          <option value="">Generica...</option>
                          {serie.map(s => <option key={s.id_lama_stampo_serie} value={s.id_lama_stampo_serie}>{s.lama_stampo_serie}</option>)}
                       </select>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Diametro Esterno (ATTUALE)</label>
                       <input 
                         type="number" step="0.01" required
                         placeholder="Es: 180,00"
                         value={formData.lama_stampo_misura_attuale || ''} 
                         onChange={e => setFormData({...formData, lama_stampo_misura_attuale: Number(e.target.value)})}
                         className="w-full p-4 bg-slate-100 border-2 border-transparent focus:border-blue-500 rounded-xl font-black text-xl italic outline-none transition-all" 
                       />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Larghezza Nominale</label>
                       <input 
                         type="number" step="0.01" required
                         placeholder="Es: 10,00"
                         value={formData.lama_stampo_misura || ''} 
                         onChange={e => setFormData({...formData, lama_stampo_misura: Number(e.target.value)})}
                         className="w-full p-4 bg-slate-100 border-2 border-transparent focus:border-blue-500 rounded-xl font-black text-xl italic outline-none transition-all" 
                       />
                    </div>
                 </div>

                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Quantità Pezzi</label>
                    <input 
                      type="number" required
                      value={formData.lama_stampo_quantita || ''} 
                      onChange={e => setFormData({...formData, lama_stampo_quantita: Number(e.target.value)})}
                      className="w-full p-5 bg-blue-50 border-2 border-blue-100 focus:border-blue-500 rounded-2xl font-black text-3xl text-center text-blue-600 italic outline-none transition-all tabular-nums" 
                    />
                 </div>

                 <button 
                   type="submit"
                   disabled={loading}
                   className="w-full py-6 bg-blue-600 text-white font-black rounded-2xl uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-4 mt-6 text-xs"
                 >
                    {loading ? <RefreshCw size={20} className="animate-spin" /> : <Save size={20} />}
                    {editingLama ? 'Aggiorna Database' : 'Registra Componente'}
                 </button>
              </form>
           </div>
        </div>
      )}

      {loading && !showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex flex-col items-center justify-center z-[1000]">
           <RefreshCw size={50} className="text-blue-600 animate-spin mb-4" />
           <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-800">Allineamento Dati Officina...</p>
        </div>
      )}
    </div>
  );
};

export default SlitterLame;
