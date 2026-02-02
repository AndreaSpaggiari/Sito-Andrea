
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { 
  Lavorazione, 
  Macchina, 
  FaseLavorazione, 
  Stati,
  Cliente
} from '../types';
import { processLabelImage } from '../geminiService';
import Chat from '../components/Chat';
import { 
  ArrowLeft, RefreshCw, Camera, Upload, Keyboard, CheckCircle2, PlayCircle, X, 
  Laptop, ClipboardList, Box, Hash, User, Ruler, Activity, AlertTriangle, Scale, Search, Plus
} from 'lucide-react';

const formatDate = (date: Date) => date.toISOString().split('T')[0];
const formatShortDate = (dateStr: string | null) => {
  if (!dateStr) return '--';
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  return `${parts[2]}-${parts[1]}`;
};

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const compressImage = (base64: string, maxWidth = 2000, quality = 0.92): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = `data:image/jpeg;base64,${base64}`;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      if (width > maxWidth) {
        height = (maxWidth / width) * height;
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
      }
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality).split(',')[1]);
    };
    img.onerror = () => reject(new Error("Errore caricamento immagine"));
  });
};

type SortCriteria = 'scheda' | 'cliente' | 'data' | 'misura';

const Produzione: React.FC = () => {
  const [selectedMacchina, setSelectedMacchina] = useState<string | null>(localStorage.getItem('kme_selected_macchina'));
  const [macchine, setMacchine] = useState<Macchina[]>([]);
  const [fasi, setFasi] = useState<FaseLavorazione[]>([]);
  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [lavorazioni, setLavorazioni] = useState<Lavorazione[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('CARICAMENTO...');
  const [scanResult, setScanResult] = useState<any>(null);
  const [showMacchinaPicker, setShowMacchinaPicker] = useState(!selectedMacchina);
  const [showFasePicker, setShowFasePicker] = useState<{ id: string } | null>(null);
  const [showTerminaPicker, setShowTerminaPicker] = useState<Lavorazione | null>(null);
  const [showScanOptions, setShowScanOptions] = useState(false);
  const [sortCriteria, setSortCriteria] = useState<SortCriteria>('scheda');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const fetchMeta = useCallback(async () => {
    try {
      const { data: m } = await supabase.from('l_macchine').select('*').order('macchina');
      const { data: f } = await supabase.from('l_fasi_di_lavorazione').select('*').order('fase_di_lavorazione');
      const { data: c } = await supabase.from('l_clienti').select('*').order('cliente');
      if (m) setMacchine(m);
      if (f) setFasi(f);
      if (c) setClienti(c);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { fetchMeta(); }, [fetchMeta]);

  const fetchLavorazioni = useCallback(async (showLoader = true) => {
    if (!selectedMacchina) return;
    if (showLoader) { setLoading(true); setLoadingMsg('SINCRONIZZAZIONE...'); }
    try {
      const { data } = await supabase
        .from('l_lavorazioni')
        .select(`*, l_clienti:id_cliente (*), l_macchine:id_macchina (*), l_fasi_di_lavorazione:id_fase (*)`)
        .eq('id_macchina', selectedMacchina);
      if (data) {
        setLavorazioni(data);
      }
    } catch (e) { 
      console.error("Errore fetch lavorazioni:", e);
    } finally { 
      if (showLoader) setLoading(false); 
    }
  }, [selectedMacchina]);

  useEffect(() => { fetchLavorazioni(); }, [fetchLavorazioni]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setLoading(true);
    setLoadingMsg('FOTO IN CORSO...');
    setShowScanOptions(false);
    
    try {
      const base64Raw = await blobToBase64(file);
      const compressedBase64 = await compressImage(base64Raw);
      
      setLoadingMsg('IA PRO: ANALISI KME...');
      const data = await processLabelImage(compressedBase64);
      
      setScanResult(data);
    } catch (err: any) {
      console.error("Errore Scan:", err);
      alert("Errore IA: " + err.message);
      setScanResult({ scheda: '', cliente: '', misura: '', ordine_kg_richiesto: '', ordine_kg_lavorato: '', data_consegna: formatDate(new Date()) });
    } finally {
      setLoading(false);
    }
  };

  const handleInviaScheda = async () => {
    if (!scanResult || !selectedMacchina) return;
    if (!scanResult.scheda || !scanResult.cliente) {
      alert("Scheda e Cliente sono obbligatori.");
      return;
    }

    setLoading(true);
    setLoadingMsg('REGISTRAZIONE...');
    try {
      const nomeCliente = scanResult.cliente.toUpperCase().trim();
      const safeClientId = nomeCliente.replace(/[^A-Z0-9]/g, '_').substring(0, 30);
      
      await supabase.from('l_clienti').upsert({ id_cliente: safeClientId, cliente: nomeCliente }, { onConflict: 'id_cliente' });

      const payload = {
        id_macchina: selectedMacchina,
        id_fase: 'ATT',
        id_stato: Stati.ATT,
        scheda: parseInt(scanResult.scheda) || 0,
        id_cliente: safeClientId,
        ordine_kg_richiesto: parseInt(scanResult.ordine_kg_richiesto) || 0,
        ordine_kg_lavorato: parseInt(scanResult.ordine_kg_lavorato) || 0,
        misura: parseFloat(scanResult.misura) || 0,
        attesa_lavorazione: new Date().toISOString(),
        data_consegna: scanResult.data_consegna || null,
        mcoil: (scanResult.mcoil || 'N/D').toUpperCase(),
        mcoil_kg: parseFloat(scanResult.mcoil_kg) || 0,
        spessore: parseFloat(scanResult.spessore) || 0,
        mcoil_larghezza: parseInt(scanResult.mcoil_larghezza) || 0,
        mcoil_lega: (scanResult.mcoil_lega || 'RAME').toUpperCase(),
        mcoil_stato_fisico: (scanResult.mcoil_stato_fisico || 'N/D').toUpperCase()
      };

      const { error } = await supabase.from('l_lavorazioni').insert(payload);
      if (error) throw error;
      
      setScanResult(null);
      await fetchLavorazioni(false);
    } catch (err: any) {
      alert(`Errore: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const startLavorazione = async (id: string, faseId: string) => {
    setLoading(true);
    setLoadingMsg('AVVIO...');
    const { error } = await supabase.from('l_lavorazioni').update({ 
      id_fase: faseId, 
      id_stato: Stati.PRO, 
      inizio_lavorazione: new Date().toISOString() 
    }).eq('id_lavorazione', id);
    
    if (error) alert("Errore Avvio: " + error.message);
    setShowFasePicker(null);
    await fetchLavorazioni(false);
    setLoading(false);
  };

  const finishLavorazione = async (l: Lavorazione, kg: number, metri: number) => {
    setLoading(true);
    setLoadingMsg('SALVATAGGIO...');
    try {
      const { error } = await supabase.from('l_lavorazioni').update({ 
        id_stato: Stati.TER, 
        fine_lavorazione: new Date().toISOString(),
        ordine_kg_lavorato: Math.round(kg),
        metri_avvolti: Math.round(metri)
      }).eq('id_lavorazione', l.id_lavorazione);
      
      if (error) throw error;
      setShowTerminaPicker(null);
      await fetchLavorazioni(false);
    } catch (e: any) {
      console.error("Errore chiusura:", e);
      alert("Errore in Chiusura: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const proItems = useMemo(() => {
    const today = formatDate(new Date());
    return lavorazioni
      .filter(l => l.id_stato === Stati.PRO || (l.id_stato === Stati.TER && l.fine_lavorazione?.startsWith(today)))
      .sort((a, b) => (a.id_stato === b.id_stato ? 0 : a.id_stato === Stati.PRO ? -1 : 1));
  }, [lavorazioni]);

  const attItems = useMemo(() => {
    let list = lavorazioni.filter(l => l.id_stato === Stati.ATT);
    return list.sort((a, b) => {
      switch (sortCriteria) {
        case 'cliente': return (a.l_clienti?.cliente || '').localeCompare(b.l_clienti?.cliente || '');
        case 'data': return (a.data_consegna || '9999-12-31').localeCompare(b.data_consegna || '9999-12-31');
        case 'misura': return (a.misura || 0) - (b.misura || 0);
        case 'scheda': default: return (a.scheda || 0) - (b.scheda || 0);
      }
    });
  }, [lavorazioni, sortCriteria]);

  return (
    <div className="min-h-screen bg-slate-50 pb-20 flex flex-col overflow-x-hidden">
      <div className="w-full px-2 py-4 max-w-[1920px] mx-auto">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <div className="flex-1 min-w-0 w-full">
            <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-2xl border shadow-sm">
              <div className="flex items-center gap-3">
                <Link to="/lavoro" className="p-2 bg-slate-100 rounded-xl text-slate-700 hover:bg-slate-200 transition-colors"><ArrowLeft size={18} /></Link>
                <h1 className="text-lg font-black text-slate-900 uppercase italic tracking-tighter">
                  {macchine.find(m => m.id_macchina === selectedMacchina)?.macchina || 'POSTAZIONE'}
                </h1>
              </div>
              <button onClick={() => fetchLavorazioni(true)} className="p-2 bg-blue-600 text-white rounded-xl shadow-lg active:scale-90 transition-transform">
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Tabella Produzione */}
              <div className="bg-white rounded-2xl shadow-xl border border-blue-100 overflow-hidden h-fit w-full">
                <div className="bg-blue-600 p-4 text-white font-black uppercase text-[10px] tracking-[0.2em] flex justify-between items-center">
                  <div className="flex items-center gap-2"><Activity size={14} /> IN LAVORAZIONE / FINITI OGGI</div>
                  <span className="bg-white/20 px-3 py-1 rounded-full">{proItems.length}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[500px]">
                    <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase border-b">
                      <tr>
                        <th className="w-12 py-3 text-center">ST</th>
                        <th className="py-3 px-4">SCHEDA / CLIENTE</th>
                        <th className="w-20 text-center">CONS.</th>
                        <th className="w-20 text-center">KG</th>
                        <th className="w-20 text-center">MIS</th>
                        <th className="w-16 text-center">AZ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {proItems.map((l) => (
                        <tr key={l.id_lavorazione} className={`${l.id_stato === Stati.PRO ? 'bg-blue-50/60' : 'bg-emerald-50/40 opacity-70'}`}>
                          <td className="py-4 text-center">
                            <div className={`w-3 h-3 rounded-full mx-auto ${l.id_stato === Stati.PRO ? 'bg-blue-600 animate-pulse' : 'bg-emerald-500'}`}></div>
                          </td>
                          <td className="py-4 px-4 min-w-0">
                            <div className="flex flex-col leading-tight">
                              <span className="font-black text-sm text-slate-900">{l.scheda}</span>
                              <span className="font-bold text-[10px] text-slate-500 truncate uppercase tracking-tight">{l.l_clienti?.cliente}</span>
                            </div>
                          </td>
                          <td className="py-4 text-center text-[10px] font-black text-red-600">{formatShortDate(l.data_consegna)}</td>
                          <td className="py-4 text-center font-black text-slate-700 text-xs tabular-nums">{l.ordine_kg_richiesto}</td>
                          <td className="py-4 text-center font-black text-blue-700 text-xs tabular-nums">{l.misura}</td>
                          <td className="py-4 text-center">
                            {l.id_stato === Stati.PRO ? (
                              <button 
                                onClick={() => setShowTerminaPicker(l)} 
                                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-95 shadow-md flex items-center justify-center transition-all"
                              >
                                <CheckCircle2 size={18} />
                              </button>
                            ) : (
                               <div className="text-emerald-600"><CheckCircle2 size={18} /></div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tabella In Attesa */}
              <div className="flex flex-col gap-4">
                <div className="bg-white border rounded-2xl p-2 flex items-center shadow-sm">
                  {[{ id: 'scheda', label: 'SCHEDA' }, { id: 'cliente', label: 'CLIENTE' }, { id: 'misura', label: 'MISURA' }].map((btn) => (
                    <button key={btn.id} onClick={() => setSortCriteria(btn.id as SortCriteria)} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${sortCriteria === btn.id ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100'}`}>{btn.label}</button>
                  ))}
                </div>
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden h-fit w-full">
                  <div className="bg-slate-800 p-4 text-white font-black uppercase text-[10px] tracking-[0.2em] flex justify-between items-center">
                    <div className="flex items-center gap-2"><ClipboardList size={14} /> SCHEDE IN ATTESA</div>
                    <span className="bg-white/10 px-3 py-1 rounded-full">{attItems.length}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[500px]">
                      <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase border-b">
                        <tr>
                          <th className="w-12 py-3 text-center">ST</th>
                          <th className="py-3 px-4">SCHEDA / CLIENTE</th>
                          <th className="w-20 text-center">CONS.</th>
                          <th className="w-20 text-center">KG</th>
                          <th className="w-20 text-center">MIS</th>
                          <th className="w-16 text-center">AZ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {attItems.map((l) => (
                          <tr key={l.id_lavorazione} className="hover:bg-slate-50 transition-colors">
                            <td className="py-4 text-center"><div className="w-3 h-3 rounded-full mx-auto bg-amber-400"></div></td>
                            <td className="py-4 px-4 min-w-0">
                              <div className="flex flex-col leading-tight">
                                <span className="font-black text-sm text-slate-900">{l.scheda}</span>
                                <span className="font-bold text-[10px] text-slate-500 truncate uppercase tracking-tight">{l.l_clienti?.cliente}</span>
                              </div>
                            </td>
                            <td className="py-4 text-center text-[10px] font-black text-red-600">{formatShortDate(l.data_consegna)}</td>
                            <td className="py-4 text-center font-black text-slate-700 text-xs tabular-nums">{l.ordine_kg_richiesto}</td>
                            <td className="py-4 text-center font-black text-blue-700 text-xs tabular-nums">{l.misura}</td>
                            <td className="py-4 text-center">
                              <button onClick={() => setShowFasePicker({ id: l.id_lavorazione })} className="p-2 bg-slate-100 text-slate-900 rounded-lg hover:bg-blue-600 hover:text-white active:scale-90 border transition-all">
                                <PlayCircle size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="w-full lg:w-96 shrink-0 h-fit lg:sticky lg:top-24"><Chat /></div>
        </div>

        {/* Pulsante Camera Galleggiante */}
        <button onClick={() => setShowScanOptions(true)} className="fixed bottom-8 right-8 w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-2xl z-[80] active:scale-90 transition-all border-4 border-white">
          <Camera size={28} />
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-white rounded-full text-blue-600 flex items-center justify-center border-2 border-blue-600"><Plus size={14} strokeWidth={4} /></div>
        </button>

        {/* Modale Opzioni Scansione */}
        {showScanOptions && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-[400]">
            <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-xs shadow-2xl relative">
              <button onClick={() => setShowScanOptions(false)} className="absolute top-6 right-6 text-slate-300 hover:text-slate-900 transition-colors"><X size={24} /></button>
              <h3 className="text-sm font-black text-slate-900 mb-8 text-center uppercase tracking-widest italic">Acquisisci Scheda</h3>
              <div className="flex flex-col gap-4">
                <button onClick={() => cameraInputRef.current?.click()} className="flex items-center gap-4 bg-slate-900 text-white p-5 rounded-2xl font-black text-[11px] uppercase active:scale-95 shadow-lg"><Camera size={20} className="text-blue-400" /> SCATTA FOTO</button>
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-4 bg-slate-100 text-slate-700 p-5 rounded-2xl font-black text-[11px] uppercase active:scale-95"><Upload size={20} /> DALLA GALLERIA</button>
                <button onClick={() => { setShowScanOptions(false); setScanResult({ scheda: '', cliente: '', misura: '', ordine_kg_richiesto: '', ordine_kg_lavorato: '', data_consegna: formatDate(new Date()) }); }} className="flex items-center gap-4 bg-blue-50 text-blue-800 p-5 rounded-2xl font-black text-[11px] uppercase active:scale-95 border border-blue-200"><Keyboard size={20} /> MANUALE</button>
              </div>
              <input type="file" ref={cameraInputRef} accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
              <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>
          </div>
        )}

        {/* Modale Risultati IA / Editing */}
        {scanResult && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-2 z-[500]">
            <div className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl flex flex-col max-h-[96vh] overflow-hidden">
              <div className="px-6 py-5 border-b flex justify-between items-center bg-white sticky top-0 z-10">
                <h3 className="text-base font-black text-slate-900 uppercase italic tracking-tighter">Conferma Dati</h3>
                <button onClick={() => setScanResult(null)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><X size={24} /></button>
              </div>
              
              <div className="flex-grow overflow-y-auto p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 p-4 bg-slate-50 rounded-2xl border">
                     <label className="block text-[8px] font-black text-slate-400 uppercase mb-1 tracking-widest">CLIENTE *</label>
                     <input list="lista-clienti-db" type="text" value={scanResult.cliente || ''} onChange={(e) => setScanResult({...scanResult, cliente: e.target.value})} className="w-full bg-transparent border-none font-black text-slate-900 outline-none uppercase text-base" />
                     <datalist id="lista-clienti-db">{clienti.map(c => <option key={c.id_cliente} value={c.cliente} />)}</datalist>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border">
                    <label className="block text-[8px] font-black text-slate-400 uppercase mb-1 tracking-widest">SCHEDA *</label>
                    <input type="text" value={scanResult.scheda || ''} onChange={(e) => setScanResult({...scanResult, scheda: e.target.value})} className="w-full bg-transparent border-none font-black text-slate-900 outline-none text-base" />
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border">
                    <label className="block text-[8px] font-black text-slate-400 uppercase mb-1 tracking-widest">MISURA (MM)</label>
                    <input type="text" value={scanResult.misura || ''} onChange={(e) => setScanResult({...scanResult, misura: e.target.value})} className="w-full bg-transparent border-none font-black text-blue-600 outline-none text-base" />
                  </div>
                  <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <label className="block text-[8px] font-black text-emerald-600 uppercase mb-1 italic">PESO TEORICO (KG)</label>
                    <input type="text" value={scanResult.ordine_kg_lavorato || ''} onChange={(e) => setScanResult({...scanResult, ordine_kg_lavorato: e.target.value})} className="w-full bg-transparent border-none font-black text-emerald-700 outline-none text-2xl" />
                  </div>
                  <div className="p-5 bg-slate-100 rounded-2xl border">
                    <label className="block text-[8px] font-black text-slate-400 uppercase mb-1 italic">PESO ORDINATO (KG)</label>
                    <input type="text" value={scanResult.ordine_kg_richiesto || ''} onChange={(e) => setScanResult({...scanResult, ordine_kg_richiesto: e.target.value})} className="w-full bg-transparent border-none font-bold text-slate-500 outline-none text-2xl" />
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t flex gap-4">
                <button onClick={() => setScanResult(null)} className="flex-1 py-4 bg-white border text-slate-400 rounded-2xl font-black uppercase text-[10px]">Annulla</button>
                <button onClick={handleInviaScheda} className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-xl">Salva</button>
              </div>
            </div>
          </div>
        )}

        {/* Picker Postazione */}
        {showMacchinaPicker && (
          <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-6 z-[1000]">
            <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-sm shadow-2xl">
              <h3 className="text-base font-black text-slate-900 mb-8 text-center uppercase tracking-tighter italic">Postazione</h3>
              <div className="grid grid-cols-2 gap-4">
                {macchine.map(m => (
                  <button key={m.id_macchina} onClick={() => { setSelectedMacchina(m.id_macchina); localStorage.setItem('kme_selected_macchina', m.id_macchina); setShowMacchinaPicker(false); }} className="flex flex-col items-center justify-center p-6 bg-slate-50 hover:bg-blue-600 hover:text-white border border-slate-200 rounded-[2rem] transition-all group active:scale-95">
                    <Laptop size={24} className="mb-3 opacity-20 group-hover:opacity-100" />
                    <span className="text-sm font-black uppercase tracking-tight">{m.id_macchina}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Picker Fase Lavorazione */}
        {showFasePicker && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-6 z-[600]">
            <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-xs shadow-2xl">
              <h3 className="text-sm font-black text-slate-900 mb-8 text-center uppercase tracking-widest italic">Avvia Scheda</h3>
              <div className="flex flex-col gap-3">
                {fasi.filter(f => f.id_fase !== 'ATT').map(f => (
                  <button key={f.id_fase} onClick={() => startLavorazione(showFasePicker.id, f.id_fase)} className="w-full p-5 bg-blue-50 hover:bg-blue-600 text-blue-900 hover:text-white rounded-2xl font-black text-[11px] uppercase transition-all active:scale-95">
                    {f.fase_di_lavorazione}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Modale Fine Lavorazione */}
        {showTerminaPicker && (
          <TerminaModal 
            lavorazione={showTerminaPicker} 
            onClose={() => setShowTerminaPicker(null)} 
            onConfirm={finishLavorazione} 
          />
        )}

        {/* Schermata Loading Globale */}
        {loading && (
          <div className="fixed inset-0 bg-white/95 backdrop-blur-2xl flex flex-col items-center justify-center z-[9999] p-10 text-center">
             <div className="w-24 h-24 border-8 border-slate-100 border-t-blue-600 rounded-full animate-spin mb-10"></div>
             <p className="font-black text-slate-900 uppercase text-[12px] tracking-[0.4em] mb-4 animate-pulse italic">{loadingMsg}</p>
          </div>
        )}
      </div>
    </div>
  );
};

const TerminaModal: React.FC<any> = ({ lavorazione, onClose, onConfirm }) => {
  const [kg, setKg] = useState<number>(lavorazione.ordine_kg_richiesto || 0);
  const metri = useMemo(() => {
    if (!kg || !lavorazione.spessore || !lavorazione.misura) return 0;
    const rho = (lavorazione.mcoil_lega || '').includes('OT') ? 8.41 : 8.96;
    return Math.round(((kg / 1 / rho) * 1000) / (lavorazione.spessore * lavorazione.misura));
  }, [kg, lavorazione]);

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-[9999]">
      <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl border-t-8 border-emerald-500">
        <div className="flex justify-between items-center mb-8">
           <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter italic">Fine Scheda</h3>
           <button onClick={onClose} className="text-slate-300 hover:text-red-500 transition-colors"><X size={24} /></button>
        </div>
        
        <div className="space-y-6">
          <div className="bg-slate-50 p-6 rounded-[2rem] border text-center">
            <label className="block text-[8px] font-black text-slate-400 uppercase mb-2 tracking-widest">PESO REALE (KG)</label>
            <input 
              type="number" 
              value={kg} 
              autoFocus
              onChange={(e) => setKg(Number(e.target.value))} 
              className="w-full bg-transparent border-none font-black text-5xl text-center text-emerald-600 outline-none tabular-nums" 
            />
          </div>
          <div className="p-5 rounded-2xl bg-blue-50 text-center border border-blue-100 flex items-center justify-center gap-3">
            <Ruler size={16} className="text-blue-400" />
            <span className="text-[11px] font-black text-blue-600 uppercase tracking-widest">{metri} METRI SVILUPPATI</span>
          </div>
        </div>
        
        <button 
          onClick={() => onConfirm(lavorazione, kg, metri)} 
          className="mt-8 w-full py-5 bg-slate-950 text-white rounded-[2rem] font-black uppercase text-[11px] tracking-[0.2em] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3"
        >
          <CheckCircle2 size={18} className="text-emerald-400" /> SALVA E CHIUDI
        </button>
      </div>
    </div>
  );
}

export default Produzione;
