
// @ts-nocheck
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { 
  Lavorazione, 
  Macchina, 
  FaseLavorazione, 
  Stati,
  UserProfile,
  AccessLevel
} from '../types';
import Chat from '../components/Chat';
import { 
  ArrowLeft, RefreshCw, CheckCircle2, X, 
  Activity, Plus, Settings2, Calendar, Inbox, 
  ChevronLeft, ChevronRight, PlayCircle, Layers, Box, Eye, ShieldAlert,
  Zap, ArrowRightLeft, Calculator, Edit3, Save, Copy, ArrowDownCircle
} from 'lucide-react';

interface Props {
  profile: UserProfile | null;
}

const formatDateForDisplay = (dateStr: string | null) => {
  if (!dateStr) return 'N/D';
  try {
    const date = new Date(dateStr);
    const months = ['GEN', 'FEB', 'MAR', 'APR', 'MAG', 'GIU', 'LUG', 'AGO', 'SET', 'OTT', 'NOV', 'DIC'];
    return `${date.getDate().toString().padStart(2, '0')} ${months[date.getMonth()]}`;
  } catch (e) { return dateStr; }
};

const formatDate = (date: Date) => date.toISOString().split('T')[0];

const Produzione: React.FC<Props> = ({ profile }) => {
  const [accessLevel, setAccessLevel] = useState<AccessLevel>('VISUALIZZATORE');
  const [selectedMacchina, setSelectedMacchina] = useState<string | null>(() => {
    const saved = localStorage.getItem('kme_selected_macchina');
    return (saved && saved !== 'null') ? saved : null;
  });
  
  const [macchine, setMacchine] = useState<Macchina[]>([]);
  const [fasi, setFasi] = useState<FaseLavorazione[]>([]);
  const [lavorazioni, setLavorazioni] = useState<Lavorazione[]>([]);
  const [magazzino, setMagazzino] = useState<Lavorazione[]>([]);
  const [filterDate, setFilterDate] = useState(formatDate(new Date()));
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('SYNC...');
  
  const [showTerminaPicker, setShowTerminaPicker] = useState<Lavorazione | null>(null);
  const [showMagazzinoPicker, setShowMagazzinoPicker] = useState(false);

  const isOperator = profile?.role === 'ADMIN' || accessLevel === 'OPERATORE';

  const fetchAccess = useCallback(async () => {
    if (profile?.role === 'ADMIN') {
      setAccessLevel('OPERATORE');
      return;
    }
    const { data } = await supabase
      .from('l_permessi')
      .select('livello')
      .eq('user_id', profile?.id)
      .eq('sezione', 'LAVORO')
      .eq('sottosezione', 'PRODUZIONE')
      .maybeSingle();
    if (data) setAccessLevel(data.livello as AccessLevel);
  }, [profile]);

  const fetchData = useCallback(async () => {
    if (!selectedMacchina) return;
    setLoading(true);
    try {
      // Macchine e Fasi
      const { data: m } = await supabase.from('l_macchine').select('*').order('macchina');
      const { data: f } = await supabase.from('l_fasi_di_lavorazione').select('*').order('fase_di_lavorazione');
      if (m) setMacchine(m);
      if (f) setFasi(f);

      // Lavorazioni Correnti
      const { data: l } = await supabase
        .from('l_lavorazioni')
        .select('*, l_clienti(*), l_macchine(*), l_fasi_di_lavorazione(*)')
        .eq('id_macchina', selectedMacchina)
        .in('id_stato', ['ATT', 'PRE', 'PRO', 'EXT'])
        .order('inizio_lavorazione', { ascending: false });
      if (l) setLavorazioni(l);

      // Magazzino (Materiale pronto per essere caricato)
      const { data: mag } = await supabase
        .from('l_lavorazioni')
        .select('*, l_clienti(*), l_macchine(*), l_fasi_di_lavorazione(*)')
        .eq('id_macchina', 'MAGAZZINO')
        .order('created_at', { ascending: false });
      if (mag) setMagazzino(mag);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedMacchina]);

  useEffect(() => {
    fetchAccess();
    fetchData();
  }, [fetchAccess, fetchData]);

  const handleStartLavorazione = async (id: string) => {
    if (!isOperator) return;
    setLoading(true);
    await supabase.from('l_lavorazioni').update({
      id_stato: 'PRO',
      inizio_lavorazione: new Date().toISOString()
    }).eq('id_lavorazione', id);
    fetchData();
  };

  const handleCloseTermina = () => setShowTerminaPicker(null);

  const currentMachineName = useMemo(() => 
    macchine.find(m => m.id_macchina === selectedMacchina)?.macchina || 'MACCHINA NON SELEZIONATA',
  [macchine, selectedMacchina]);

  return (
    <div className="min-h-screen bg-[#060a14] text-slate-100 pb-20">
      <div className="bg-[#0f172a] border-b border-white/5 pt-12 pb-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(245,158,11,0.05),_transparent_40%)]"></div>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-end gap-6 relative z-10">
          <div className="flex items-center gap-6">
            <Link to="/lavoro/macchine" className="p-3 bg-white/5 rounded-2xl text-white/40 hover:text-white transition-all border border-white/5 hover:bg-white/10 shadow-xl">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <span className="text-amber-500 font-black text-[9px] uppercase tracking-[0.4em] leading-none mb-1">Reparto Produzione Mortara</span>
              <h1 className="text-4xl font-black uppercase tracking-tighter italic leading-none text-white">{currentMachineName}</h1>
            </div>
          </div>
          
          <div className="flex gap-3">
             <button onClick={() => setShowMagazzinoPicker(true)} className="px-6 py-4 bg-white/5 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 border border-white/10 hover:bg-white/10 transition-all">
                <Inbox size={16} className="text-amber-500" /> Carica da Magazzino
             </button>
             <button onClick={fetchData} className="p-4 bg-indigo-600 text-white rounded-2xl shadow-xl active:scale-95 transition-all">
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
             </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-10 relative z-20">
        <div className="space-y-6">
          {lavorazioni.map((lav) => (
            <div key={lav.id_lavorazione} className={`bg-[#0f172a] rounded-[2.5rem] border border-white/5 p-8 flex flex-col lg:flex-row gap-8 transition-all hover:bg-[#131d35] ${lav.id_stato === 'PRO' ? 'border-amber-500/30 shadow-[0_0_40px_rgba(245,158,11,0.05)]' : ''}`}>
              
              <div className="flex flex-col md:flex-row flex-grow gap-8">
                 <div className="md:w-32 shrink-0 flex flex-col justify-center items-center md:items-start">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Scheda</span>
                    <span className="text-4xl font-black text-white italic tabular-nums leading-none">{lav.scheda}</span>
                    <div className="mt-3 px-3 py-1 bg-white/5 rounded-lg border border-white/5 text-[8px] font-black uppercase text-amber-500 tracking-widest">
                       {lav.l_fasi_di_lavorazione?.fase_di_lavorazione}
                    </div>
                 </div>

                 <div className="flex-grow grid grid-cols-2 sm:grid-cols-4 gap-6">
                    <div>
                       <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Cliente</p>
                       <p className="text-sm font-black text-white uppercase truncate">{lav.l_clienti?.cliente || 'N/D'}</p>
                       <p className="text-[9px] font-bold text-slate-500 italic mt-0.5">{lav.conferma_voce}</p>
                    </div>
                    <div>
                       <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Materiale</p>
                       <p className="text-sm font-black text-amber-500 uppercase italic">{lav.mcoil_lega}</p>
                       <p className="text-[9px] font-bold text-slate-500 truncate">{lav.mcoil_stato_fisico}</p>
                    </div>
                    <div>
                       <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Misure</p>
                       <p className="text-sm font-black text-white italic tabular-nums">{lav.spessore} <span className="text-[9px] opacity-40">mm</span></p>
                       <p className="text-xs font-black text-white italic tabular-nums">Largh: {lav.misura}</p>
                    </div>
                    <div>
                       <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Quantità</p>
                       <p className="text-sm font-black text-white italic tabular-nums">{lav.ordine_kg_richiesto?.toLocaleString() || '--'} <span className="text-[9px] opacity-40">KG</span></p>
                       <div className="flex items-center gap-1.5 mt-1">
                          <div className={`w-1.5 h-1.5 rounded-full ${lav.id_stato === 'PRO' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></div>
                          <span className="text-[8px] font-black uppercase text-slate-400">{lav.id_stato === 'PRO' ? 'In Produzione' : 'In Attesa'}</span>
                       </div>
                    </div>
                 </div>
              </div>

              <div className="shrink-0 flex items-center justify-end gap-3 min-w-[200px]">
                 {lav.id_stato === 'PRO' ? (
                    <button 
                      onClick={() => setShowTerminaPicker(lav)}
                      className="w-full py-5 bg-amber-500 text-slate-950 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl hover:bg-amber-400 active:scale-95 transition-all"
                    >
                       <CheckCircle2 size={18} /> Termina Lavorazione
                    </button>
                 ) : isOperator ? (
                    <button 
                      onClick={() => handleStartLavorazione(lav.id_lavorazione)}
                      className="w-full py-5 bg-white/5 text-white border border-white/10 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-emerald-600 hover:border-emerald-500 transition-all active:scale-95"
                    >
                       <PlayCircle size={18} className="text-emerald-500 group-hover:text-white" /> Avvia Produzione
                    </button>
                 ) : null}
              </div>
            </div>
          ))}

          {lavorazioni.length === 0 && (
            <div className="py-40 bg-white/[0.02] border border-dashed border-white/5 rounded-[3rem] flex flex-col items-center justify-center text-slate-600">
               <Activity size={48} className="opacity-10 mb-4" />
               <p className="text-[10px] font-black uppercase tracking-[0.4em]">Nessuna lavorazione attiva su questa macchina</p>
            </div>
          )}
        </div>
      </div>

      <TerminaModal 
        lavorazione={showTerminaPicker} 
        onClose={handleCloseTermina} 
        onSuccess={fetchData} 
        macchine={macchine}
        isOperator={isOperator}
      />
      
      <MagazzinoModal 
        isOpen={showMagazzinoPicker}
        onClose={() => setShowMagazzinoPicker(false)}
        materiale={magazzino}
        macchinaId={selectedMacchina}
        onSuccess={fetchData}
        isOperator={isOperator}
      />

      <Chat />
    </div>
  );
};

// --- COMPONENTE MODALE TERMINA ---
const TerminaModal = ({ lavorazione, onClose, onSuccess, macchine, isOperator }) => {
  if (!lavorazione) return null;

  const [form, setForm] = useState({
    kg: lavorazione.ordine_kg_richiesto || 0,
    metri: 0,
    passate: 1,
    pezzi: 1,
    altraMacchina: lavorazione.id_macchina
  });

  const [isManualMetri, setIsManualMetri] = useState(false);
  const [loading, setLoading] = useState(false);

  // Calcolo automatico metri basato sulla fisica del rame/ottone KME
  const autoMetri = useMemo(() => {
    if (isManualMetri) return form.metri;
    const spess = parseFloat(lavorazione.spessore) || 0;
    const largh = parseFloat(lavorazione.misura) || 0;
    const kg = parseFloat(form.kg) || 0;
    if (spess <= 0 || largh <= 0 || kg <= 0) return 0;
    
    // Coefficiente densità KME (Rame appross. 0.00896, Ottone 0.0085)
    const isBrass = lavorazione.mcoil_lega?.toUpperCase().startsWith('OT');
    const coeff = isBrass ? 0.0085 : 0.00896;
    
    return Math.round(kg / (spess * largh * coeff));
  }, [form.kg, isManualMetri, lavorazione]);

  const isMultiplo = lavorazione.l_fasi_di_lavorazione?.fase_di_lavorazione?.toUpperCase().includes('MULTIPLO');
  const isAltraMacchina = lavorazione.l_fasi_di_lavorazione?.fase_di_lavorazione?.toUpperCase().includes('ALTRA');

  const handleSave = async () => {
    if (!isOperator) return;
    setLoading(true);
    try {
      // 1. Chiudi la lavorazione attuale
      const { error: updateError } = await supabase.from('l_lavorazioni').update({
        id_stato: 'TER',
        fine_lavorazione: new Date().toISOString(),
        ordine_kg_lavorato: form.kg,
        metri_avvolti: isManualMetri ? form.metri : autoMetri,
        numero_passate: form.passate,
        numero_pezzi: form.pezzi
      }).eq('id_lavorazione', lavorazione.id_lavorazione);

      if (updateError) throw updateError;

      // 2. Se è un MULTIPLO, clona il record
      if (isMultiplo) {
        const nextMacchina = isAltraMacchina ? form.altraMacchina : lavorazione.id_macchina;
        
        // Prepariamo i dati per la clonazione (rimuovendo ID e tempi)
        const { id_lavorazione, created_at, inizio_lavorazione, fine_lavorazione, l_clienti, l_macchine, l_fasi_di_lavorazione, ...cloneData } = lavorazione;
        
        const { error: insertError } = await supabase.from('l_lavorazioni').insert({
          ...cloneData,
          id_macchina: nextMacchina,
          id_stato: 'ATT', // Torna in attesa
          ordine_kg_richiesto: lavorazione.ordine_kg_richiesto - form.kg, // Residuo
          inizio_lavorazione: null,
          fine_lavorazione: null,
          attesa_lavorazione: null,
          ordine_kg_lavorato: null,
          metri_avvolti: null,
          numero_passate: null,
          numero_pezzi: null
        });

        if (insertError) throw insertError;
      }

      onSuccess();
      onClose();
    } catch (e) {
      alert("Errore salvataggio: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[3000] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#0f172a] border border-white/10 rounded-[3rem] w-full max-w-2xl shadow-2xl overflow-hidden">
        <div className="p-10 border-b border-white/5 flex justify-between items-center bg-amber-500/5">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-amber-500 text-slate-950 rounded-2xl flex items-center justify-center shadow-xl">
              <Calculator size={28} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter leading-none">Termina Scheda {lavorazione.scheda}</h3>
              <p className="text-[9px] font-black text-amber-500/60 uppercase tracking-widest mt-1">Registrazione dati di produzione</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-2"><X size={24} /></button>
        </div>

        <div className="p-10 space-y-8">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">KG Lavorati</label>
              <input type="number" value={form.kg} onChange={e => setForm({...form, kg: parseFloat(e.target.value)})} className="w-full p-5 bg-white/5 border border-white/5 rounded-2xl font-black text-2xl text-white outline-none focus:border-amber-500 transition-all text-center italic tabular-nums" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center ml-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Metri Avvolti</label>
                <button 
                  onClick={() => setIsManualMetri(!isManualMetri)}
                  className={`px-3 py-1 rounded-full text-[8px] font-black uppercase transition-all ${isManualMetri ? 'bg-amber-500 text-slate-950' : 'bg-white/5 text-slate-500'}`}
                >
                  {isManualMetri ? 'Manuale' : 'Auto'}
                </button>
              </div>
              <input 
                type="number" 
                value={isManualMetri ? form.metri : autoMetri} 
                onChange={e => setForm({...form, metri: parseFloat(e.target.value)})}
                disabled={!isManualMetri}
                className={`w-full p-5 border rounded-2xl font-black text-2xl outline-none transition-all text-center italic tabular-nums ${isManualMetri ? 'bg-white/5 border-amber-500/50 text-white' : 'bg-black/20 border-white/5 text-slate-500'}`} 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">N. Passate</label>
              <div className="flex items-center gap-4 bg-white/5 p-2 rounded-2xl border border-white/5">
                <button onClick={() => setForm({...form, passate: Math.max(1, form.passate - 1)})} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-white">-</button>
                <span className="flex-grow text-center font-black text-xl italic">{form.passate}</span>
                <button onClick={() => setForm({...form, passate: form.passate + 1})} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-white">+</button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">N. Pezzi</label>
              <input type="number" value={form.pezzi} onChange={e => setForm({...form, pezzi: parseInt(e.target.value)})} className="w-full p-5 bg-white/5 border border-white/5 rounded-2xl font-black text-xl text-white outline-none focus:border-amber-500 transition-all text-center italic" />
            </div>
          </div>

          {isMultiplo && (
            <div className="p-6 bg-amber-500/10 border border-amber-500/20 rounded-3xl space-y-4 animate-in slide-in-from-bottom-2">
               <div className="flex items-center gap-3">
                  <Copy size={18} className="text-amber-500" />
                  <h4 className="text-[10px] font-black text-white uppercase tracking-widest italic">Ordine Multiplo Rilevato</h4>
               </div>
               <p className="text-[9px] font-bold text-slate-400 leading-relaxed uppercase">
                  Questa scheda verrà clonata per la parte residua. {isAltraMacchina ? 'Seleziona dove destinare il prossimo ciclo:' : 'Verrà rimessa in coda su questa macchina.'}
               </p>
               {isAltraMacchina && (
                 <select 
                   value={form.altraMacchina}
                   onChange={e => setForm({...form, altraMacchina: e.target.value})}
                   className="w-full p-4 bg-[#0f172a] border border-amber-500/30 rounded-2xl text-[11px] font-black text-white uppercase outline-none"
                 >
                   {macchine.filter(m => !['MAGAZZINO', 'UFFICIO'].includes(m.macchina.toUpperCase())).map(m => (
                     <option key={m.id_macchina} value={m.id_macchina}>{m.macchina}</option>
                   ))}
                 </select>
               )}
            </div>
          )}

          <button 
            onClick={handleSave}
            disabled={loading}
            className="w-full py-6 bg-amber-500 text-slate-950 font-black rounded-[2rem] uppercase text-[11px] tracking-[0.2em] shadow-2xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-4 transition-all"
          >
            {loading ? <RefreshCw size={20} className="animate-spin" /> : <Save size={20} />}
            Conferma Fine Lavorazione
          </button>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENTE MODALE MAGAZZINO ---
const MagazzinoModal = ({ isOpen, onClose, materiale, macchinaId, onSuccess, isOperator }) => {
  if (!isOpen) return null;

  const handleCarica = async (id: string) => {
    if (!isOperator) return;
    await supabase.from('l_lavorazioni').update({
      id_macchina: macchinaId,
      id_stato: 'ATT',
      attesa_lavorazione: new Date().toISOString()
    }).eq('id_lavorazione', id);
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[3000] flex items-center justify-center p-4">
       <div className="bg-[#0f172a] border border-white/10 rounded-[3rem] w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl">
          <div className="p-10 border-b border-white/5 flex justify-between items-center bg-indigo-600/5">
             <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-xl">
                   <Inbox size={28} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter leading-none">Magazzino Mortara</h3>
                  <p className="text-[9px] font-black text-indigo-400/60 uppercase tracking-widest mt-1">Seleziona materiale pronto per il carico</p>
                </div>
             </div>
             <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-2"><X size={24} /></button>
          </div>
          
          <div className="flex-grow overflow-y-auto p-10 space-y-4 custom-scrollbar">
             {materiale.map(m => (
               <div key={m.id_lavorazione} className="bg-white/5 p-6 rounded-3xl border border-white/5 flex items-center justify-between group hover:bg-white/10 transition-all">
                  <div className="flex items-center gap-10">
                    <div className="text-center">
                       <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Scheda</p>
                       <p className="text-2xl font-black text-white italic">{m.scheda}</p>
                    </div>
                    <div className="max-w-[150px]">
                       <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Cliente</p>
                       <p className="text-xs font-black text-white uppercase truncate">{m.l_clienti?.cliente}</p>
                    </div>
                    <div>
                       <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Specifiche</p>
                       <p className="text-xs font-black text-amber-500 italic">{m.mcoil_lega} {m.spessore}mm</p>
                       <p className="text-[8px] font-bold text-white/40 uppercase">{m.l_fasi_di_lavorazione?.fase_di_lavorazione}</p>
                    </div>
                  </div>
                  <button onClick={() => handleCarica(m.id_lavorazione)} className="p-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-500 transition-all active:scale-90">
                     <ArrowRightLeft size={14} /> Carica
                  </button>
               </div>
             ))}
             {materiale.length === 0 && (
                <div className="py-20 text-center text-slate-500 italic uppercase text-[10px] tracking-[0.3em]">Magazzino Vuoto</div>
             )}
          </div>
       </div>
    </div>
  );
};

export default Produzione;
