
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
  Laptop, ClipboardList, Ruler, Activity, AlertTriangle, Search, Plus
} from 'lucide-react';

const formatDate = (date: Date) => date.toISOString().split('T')[0];
const formatShortDate = (dateStr: string | null) => {
  if (!dateStr) return '--';
  const parts = dateStr.split('-');
  return parts.length >= 3 ? `${parts[2]}-${parts[1]}` : dateStr;
};

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const compressImage = (base64: string, maxWidth = 1600, quality = 0.85): Promise<string> => {
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
      if (data) setLavorazioni(data);
    } catch (e) { console.error(e); }
    finally { if (showLoader) setLoading(false); }
  }, [selectedMacchina]);

  useEffect(() => { fetchLavorazioni(); }, [fetchLavorazioni]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true); setLoadingMsg('ELABORAZIONE FOTO...'); setShowScanOptions(false);
    try {
      const base64Raw = await blobToBase64(file);
      const compressed = await compressImage(base64Raw);
      setLoadingMsg('ANALISI IA KME...');
      const data = await processLabelImage(compressed);
      setScanResult(data);
    } catch (err: any) {
      alert("Errore IA: " + err.message);
      setScanResult({ scheda: '', cliente: '', misura: '', ordine_kg_richiesto: '', data_consegna: formatDate(new Date()) });
    } finally { setLoading(false); }
  };

  const handleInviaScheda = async () => {
    if (!scanResult || !selectedMacchina) return;
    setLoading(true);
    try {
      const nomeCliente = scanResult.cliente.toUpperCase().trim();
      const safeId = nomeCliente.replace(/[^A-Z0-9]/g, '_').substring(0, 30);
      await supabase.from('l_clienti').upsert({ id_cliente: safeId, cliente: nomeCliente }, { onConflict: 'id_cliente' });
      
      const payload = {
        id_macchina: selectedMacchina, id_fase: 'ATT', id_stato: Stati.ATT,
        scheda: parseInt(scanResult.scheda) || 0, id_cliente: safeId,
        ordine_kg_richiesto: parseInt(scanResult.ordine_kg_richiesto) || 0,
        misura: parseFloat(scanResult.misura) || 0,
        attesa_lavorazione: new Date().toISOString(),
        data_consegna: scanResult.data_consegna || null,
        mcoil: (scanResult.mcoil || 'N/D').toUpperCase(),
        mcoil_kg: parseFloat(scanResult.mcoil_kg) || 0,
        spessore: parseFloat(scanResult.spessore) || 0,
        mcoil_larghezza: parseInt(scanResult.mcoil_larghezza) || 0,
        mcoil_lega: (scanResult.mcoil_lega || 'RAME').toUpperCase()
      };
      const { error } = await supabase.from('l_lavorazioni').insert(payload);
      if (error) throw error;
      setScanResult(null); fetchLavorazioni(false);
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  const startLavorazione = async (id: string, faseId: string) => {
    setLoading(true);
    await supabase.from('l_lavorazioni').update({ 
      id_fase: faseId, id_stato: Stati.PRO, inizio_lavorazione: new Date().toISOString() 
    }).eq('id_lavorazione', id);
    setShowFasePicker(null); fetchLavorazioni(false); setLoading(false);
  };

  const finishLavorazione = async (l: Lavorazione, kg: number, metri: number) => {
    setLoading(true);
    await supabase.from('l_lavorazioni').update({ 
      id_stato: Stati.TER, fine_lavorazione: new Date().toISOString(),
      ordine_kg_lavorato: Math.round(kg), metri_avvolti: Math.round(metri)
    }).eq('id_lavorazione', l.id_lavorazione);
    setShowTerminaPicker(null); fetchLavorazioni(false); setLoading(false);
  };

  const proItems = useMemo(() => {
    const today = formatDate(new Date());
    return lavorazioni
      .filter(l => l.id_stato === Stati.PRO || (l.id_stato === Stati.TER && l.fine_lavorazione?.startsWith(today)))
      .sort((a, b) => (a.id_stato === b.id_stato ? 0 : a.id_stato === Stati.PRO ? -1 : 1));
  }, [lavorazioni]);

  const attItems = useMemo(() => {
    return lavorazioni.filter(l => l.id_stato === Stati.ATT).sort((a, b) => {
      if (sortCriteria === 'cliente') return (a.l_clienti?.cliente || '').localeCompare(b.l_clienti?.cliente || '');
      if (sortCriteria === 'data') return (a.data_consegna || '9').localeCompare(b.data_consegna || '9');
      if (sortCriteria === 'misura') return (a.misura || 0) - (b.misura || 0);
      return (a.scheda || 0) - (b.scheda || 0);
    });
  }, [lavorazioni, sortCriteria]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="w-full max-w-[1600px] mx-auto p-4 flex flex-col lg:flex-row gap-6">
        
        {/* Sinistra: Tabelle */}
        <div className="flex-1 space-y-6 min-w-0">
          
          {/* Header Postazione */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Link to="/lavoro" className="p-2 bg-slate-100 rounded-lg text-slate-500 hover:bg-slate-200"><ArrowLeft size={20} /></Link>
              <h1 className="text-xl font-bold text-slate-900 uppercase">
                {macchine.find(m => m.id_macchina === selectedMacchina)?.macchina || 'POSTAZIONE'}
              </h1>
            </div>
            <button onClick={() => fetchLavorazioni(true)} className="p-2 bg-blue-600 text-white rounded-lg shadow active:scale-95">
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
            
            {/* Tabella In Produzione */}
            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
              <div className="bg-blue-600 px-4 py-3 text-white flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-widest flex items-center gap-2"><Activity size={14}/> In Corso / Finiti</span>
                <span className="bg-white/20 px-2 py-0.5 rounded-md text-[10px] font-bold">{proItems.length}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase border-b">
                    <tr>
                      <th className="px-4 py-3 text-left w-10">ST</th>
                      <th className="px-2 py-3 text-left">Scheda / Cliente</th>
                      <th className="px-2 py-3 text-center">KG</th>
                      <th className="px-2 py-3 text-center">MIS</th>
                      <th className="px-4 py-3 text-right">Azione</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {proItems.map(l => (
                      <tr key={l.id_lavorazione} className={l.id_stato === Stati.PRO ? 'bg-blue-50/30' : 'bg-emerald-50/20'}>
                        <td className="px-4 py-3">
                          <div className={`w-2 h-2 rounded-full mx-auto ${l.id_stato === Stati.PRO ? 'bg-blue-600 animate-pulse' : 'bg-emerald-500'}`} />
                        </td>
                        <td className="px-2 py-3">
                          <div className="font-bold text-slate-900 leading-none">{l.scheda}</div>
                          <div className="text-[10px] text-slate-500 uppercase truncate max-w-[120px]">{l.l_clienti?.cliente}</div>
                        </td>
                        <td className="px-2 py-3 text-center font-medium text-slate-700">{l.ordine_kg_richiesto}</td>
                        <td className="px-2 py-3 text-center font-bold text-blue-600">{l.misura}</td>
                        <td className="px-4 py-3 text-right">
                          {l.id_stato === Stati.PRO ? (
                            <button onClick={() => setShowTerminaPicker(l)} className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm active:scale-95">
                              <CheckCircle2 size={16} />
                            </button>
                          ) : (
                            <span className="text-emerald-500 font-bold text-[10px]">OK</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tabella In Attesa */}
            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
              <div className="bg-slate-800 px-4 py-2 flex justify-between items-center">
                <span className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2"><ClipboardList size={14}/> In Coda</span>
                <div className="flex gap-1">
                  {['scheda', 'cliente', 'misura'].map(c => (
                    <button key={c} onClick={() => setSortCriteria(c as any)} className={`px-2 py-1 rounded text-[8px] font-bold uppercase ${sortCriteria === c ? 'bg-blue-600 text-white' : 'bg-white/10 text-white/50'}`}>{c}</button>
                  ))}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase border-b">
                    <tr>
                      <th className="px-4 py-3 text-left w-10">ST</th>
                      <th className="px-2 py-3 text-left">Scheda / Cliente</th>
                      <th className="px-2 py-3 text-center">CONS.</th>
                      <th className="px-2 py-3 text-center">KG</th>
                      <th className="px-4 py-3 text-right">Azione</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {attItems.map(l => (
                      <tr key={l.id_lavorazione} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3"><div className="w-2 h-2 rounded-full mx-auto bg-amber-400" /></td>
                        <td className="px-2 py-3">
                          <div className="font-bold text-slate-900 leading-none">{l.scheda}</div>
                          <div className="text-[10px] text-slate-500 uppercase truncate max-w-[120px]">{l.l_clienti?.cliente}</div>
                        </td>
                        <td className="px-2 py-3 text-center text-[10px] font-bold text-red-500">{formatShortDate(l.data_consegna)}</td>
                        <td className="px-2 py-3 text-center font-medium text-slate-700">{l.ordine_kg_richiesto}</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => setShowFasePicker({ id: l.id_lavorazione })} className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-blue-600 hover:text-white active:scale-95 transition-all">
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

        {/* Destra: Chat Sticky */}
        <div className="w-full lg:w-[350px] shrink-0">
          <div className="lg:sticky lg:top-24">
            <Chat />
          </div>
        </div>
      </div>

      {/* Camera Button */}
      <button onClick={() => setShowScanOptions(true)} className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-xl z-50 active:scale-90 border-2 border-white">
        <Camera size={24} />
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full text-blue-600 flex items-center justify-center border-2 border-blue-600"><Plus size={12} strokeWidth={4} /></div>
      </button>

      {/* Modale Scansione */}
      {showScanOptions && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-2xl relative">
            <button onClick={() => setShowScanOptions(false)} className="absolute top-4 right-4 text-slate-300 hover:text-slate-900"><X size={20} /></button>
            <h3 className="text-sm font-bold text-slate-900 mb-6 uppercase text-center tracking-widest">Carica Scheda</h3>
            <div className="flex flex-col gap-3">
              <button onClick={() => cameraInputRef.current?.click()} className="flex items-center gap-3 bg-slate-900 text-white p-4 rounded-xl text-xs font-bold uppercase active:scale-95"><Camera size={18} /> Scatta Foto</button>
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-3 bg-slate-100 text-slate-600 p-4 rounded-xl text-xs font-bold uppercase active:scale-95"><Upload size={18} /> Galleria</button>
              <button onClick={() => { setShowScanOptions(false); setScanResult({ scheda: '', cliente: '', misura: '', ordine_kg_richiesto: '', data_consegna: formatDate(new Date()) }); }} className="flex items-center gap-3 bg-blue-50 text-blue-600 p-4 rounded-xl text-xs font-bold uppercase active:scale-95"><Keyboard size={18} /> Manuale</button>
            </div>
            <input type="file" ref={cameraInputRef} accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
            <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>
        </div>
      )}

      {/* Modale Conferma IA */}
      {scanResult && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 z-[200]">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-5 border-b flex justify-between items-center sticky top-0 bg-white rounded-t-2xl">
              <h3 className="text-sm font-bold uppercase tracking-tight">Verifica Dati IA</h3>
              <button onClick={() => setScanResult(null)} className="text-slate-300 hover:text-red-500"><X size={20} /></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Cliente</label>
                <input list="c-list" type="text" value={scanResult.cliente || ''} onChange={(e) => setScanResult({...scanResult, cliente: e.target.value})} className="w-full p-3 bg-slate-50 border rounded-xl font-bold uppercase text-sm outline-none focus:border-blue-500" />
                <datalist id="c-list">{clienti.map(c => <option key={c.id_cliente} value={c.cliente} />)}</datalist>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Scheda</label>
                  <input type="text" value={scanResult.scheda || ''} onChange={(e) => setScanResult({...scanResult, scheda: e.target.value})} className="w-full p-3 bg-slate-50 border rounded-xl font-bold text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Misura (mm)</label>
                  <input type="text" value={scanResult.misura || ''} onChange={(e) => setScanResult({...scanResult, misura: e.target.value})} className="w-full p-3 bg-slate-50 border rounded-xl font-bold text-blue-600 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-emerald-600 uppercase">Peso Richiesto</label>
                  <input type="text" value={scanResult.ordine_kg_richiesto || ''} onChange={(e) => setScanResult({...scanResult, ordine_kg_richiesto: e.target.value})} className="w-full p-3 bg-emerald-50 border border-emerald-100 rounded-xl font-bold text-emerald-700" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Consegna</label>
                  <input type="date" value={scanResult.data_consegna || ''} onChange={(e) => setScanResult({...scanResult, data_consegna: e.target.value})} className="w-full p-3 bg-slate-50 border rounded-xl font-bold text-xs" />
                </div>
              </div>
            </div>
            <div className="p-5 bg-slate-50 border-t flex gap-3 rounded-b-2xl">
              <button onClick={() => setScanResult(null)} className="flex-1 py-3 bg-white border text-slate-500 rounded-xl font-bold text-[10px] uppercase">Esci</button>
              <button onClick={handleInviaScheda} className="flex-[2] py-3 bg-blue-600 text-white rounded-xl font-bold text-[10px] uppercase shadow-lg shadow-blue-500/20 active:scale-95">Conferma e Inserisci</button>
            </div>
          </div>
        </div>
      )}

      {/* Modale Chiusura */}
      {showTerminaPicker && (
        <TerminaModal lavorazione={showTerminaPicker} onClose={() => setShowTerminaPicker(null)} onConfirm={finishLavorazione} />
      )}

      {/* Picker Fase */}
      {showFasePicker && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[150]">
          <div className="bg-white rounded-2xl p-6 w-full max-w-xs">
            <h3 className="text-xs font-bold uppercase text-center mb-6">Seleziona Operazione</h3>
            <div className="flex flex-col gap-2">
              {fasi.filter(f => f.id_fase !== 'ATT').map(f => (
                <button key={f.id_fase} onClick={() => startLavorazione(showFasePicker.id, f.id_fase)} className="p-4 bg-slate-50 hover:bg-blue-600 hover:text-white rounded-xl font-bold text-[10px] uppercase transition-all">
                  {f.fase_di_lavorazione}
                </button>
              ))}
              <button onClick={() => setShowFasePicker(null)} className="mt-4 text-[9px] font-bold text-slate-400 uppercase">Chiudi</button>
            </div>
          </div>
        </div>
      )}

      {/* Modale Postazione */}
      {showMacchinaPicker && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-6 z-[1000]">
          <div className="bg-white rounded-2xl p-8 w-full max-w-sm">
            <h3 className="text-sm font-bold uppercase text-center mb-8">Postazione di Lavoro</h3>
            <div className="grid grid-cols-2 gap-3">
              {macchine.map(m => (
                <button key={m.id_macchina} onClick={() => { setSelectedMacchina(m.id_macchina); localStorage.setItem('kme_selected_macchina', m.id_macchina); setShowMacchinaPicker(false); }} className="flex flex-col items-center justify-center p-5 bg-slate-50 hover:bg-blue-600 hover:text-white border rounded-xl transition-all active:scale-95 group">
                  <Laptop size={20} className="mb-2 opacity-30 group-hover:opacity-100" />
                  <span className="text-xs font-bold uppercase">{m.id_macchina}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-white/90 backdrop-blur-md flex flex-col items-center justify-center z-[9999]">
          <div className="w-12 h-12 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin mb-4" />
          <p className="text-[10px] font-bold text-slate-900 uppercase tracking-[0.2em]">{loadingMsg}</p>
        </div>
      )}
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
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-[9999]">
      <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl border-t-4 border-emerald-500">
        <div className="flex justify-between items-center mb-6">
           <h3 className="text-sm font-bold uppercase">Fine Lavorazione</h3>
           <button onClick={onClose} className="text-slate-300 hover:text-red-500"><X size={20} /></button>
        </div>
        <div className="space-y-4">
          <div className="bg-slate-50 p-6 rounded-xl border text-center">
            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-2">Peso Reale (KG)</label>
            <input type="number" value={kg} autoFocus onChange={(e) => setKg(Number(e.target.value))} className="w-full bg-transparent border-none font-bold text-4xl text-center text-emerald-600 outline-none" />
          </div>
          <div className="p-4 rounded-xl bg-blue-50 flex items-center justify-center gap-2 border border-blue-100">
            <Ruler size={14} className="text-blue-500" />
            <span className="text-[10px] font-bold text-blue-600 uppercase">Sviluppo: {metri} Metri</span>
          </div>
        </div>
        <button onClick={() => onConfirm(lavorazione, kg, metri)} className="mt-8 w-full py-4 bg-slate-950 text-white rounded-xl font-bold uppercase text-xs active:scale-95 flex items-center justify-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-400" /> Salva e Chiudi
        </button>
      </div>
    </div>
  );
}

export default Produzione;
