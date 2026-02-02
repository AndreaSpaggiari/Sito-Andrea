
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
  Laptop, ClipboardList, Box, Hash, User, Ruler, Activity, AlertTriangle, HardDrive, Scale, Search
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

const compressImage = (base64: string, maxWidth = 2200, quality = 0.98): Promise<string> => {
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
    img.onerror = () => reject(new Error("Errore immagine"));
  });
};

type SortCriteria = 'scheda' | 'cliente' | 'data' | 'misura';

const Produzione: React.FC = () => {
  const [selectedMacchina, setSelectedMacchina] = useState<string | null>(localStorage.getItem('kme_selected_macchina'));
  const [macchine, setMacchine] = useState<Macchina[]>([]);
  const [fasi, setFasi] = useState<FaseLavorazione[]>([]);
  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(formatDate(new Date()));
  const [lavorazioni, setLavorazioni] = useState<Lavorazione[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('CARICAMENTO...');
  const [scanResult, setScanResult] = useState<any>(null);
  const [isManualEntry, setIsManualEntry] = useState(false);
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

  const triggerManualEntry = () => {
    setIsManualEntry(true);
    setScanResult({ 
      scheda: '', cliente: '', misura: '', ordine_kg_richiesto: '', ordine_kg_lavorato: '', data_consegna: formatDate(new Date()),
      mcoil: '', mcoil_kg: '', spessore: '', mcoil_larghezza: '', mcoil_lega: 'RAME', mcoil_stato_fisico: 'N/D', conferma_voce: ''
    });
    setShowScanOptions(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setLoading(true);
    setLoadingMsg('OTTIMIZZAZIONE HD...');
    setShowScanOptions(false);
    
    try {
      const base64Raw = await blobToBase64(file);
      const compressedBase64 = await compressImage(base64Raw);
      
      setLoadingMsg('ANALISI IA DETTAGLIATA...');
      const data = await processLabelImage(compressedBase64);
      
      const hasData = data.scheda || data.cliente;
      setScanResult(data);
      setIsManualEntry(!hasData);
    } catch (err: any) {
      console.error("Errore Scan:", err);
      triggerManualEntry();
    } finally {
      setLoading(false);
    }
  };

  const handleInviaScheda = async () => {
    if (!scanResult || !selectedMacchina) return;
    
    if (!scanResult.scheda || !scanResult.cliente) {
      alert("ATTENZIONE: Il Numero Scheda e il Cliente sono obbligatori.");
      return;
    }

    setLoading(true);
    setLoadingMsg('SALVATAGGIO...');
    try {
      const nomeCliente = (scanResult.cliente || 'CLIENTE IGNOTO').toUpperCase().trim();
      const safeClientId = nomeCliente.replace(/[^A-Z0-9]/g, '_').substring(0, 30);
      
      // Upsert cliente
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
        mcoil_kg: parseInt(scanResult.mcoil_kg) || 0,
        spessore: parseFloat(scanResult.spessore) || 0,
        mcoil_larghezza: parseInt(scanResult.mcoil_larghezza) || 0,
        mcoil_lega: (scanResult.mcoil_lega || 'RAME').toUpperCase(),
        mcoil_stato_fisico: (scanResult.mcoil_stato_fisico || 'N/D').toUpperCase(),
        conferma_voce: (scanResult.conferma_voce || 'N/D').toUpperCase()
      };

      const { error } = await supabase.from('l_lavorazioni').insert(payload);
      if (error) throw error;
      setScanResult(null);
      setIsManualEntry(false);
      await fetchLavorazioni(false);
      await fetchMeta(); // Aggiorna lista clienti per futuro uso
    } catch (err: any) {
      console.error("Errore Salvataggio:", err);
      alert(`Errore: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const startLavorazione = async (id: string, faseId: string) => {
    setLoading(true);
    setLoadingMsg('AVVIO...');
    await supabase.from('l_lavorazioni').update({ 
      id_fase: faseId, 
      id_stato: Stati.PRO, 
      inizio_lavorazione: new Date().toISOString() 
    }).eq('id_lavorazione', id);
    setShowFasePicker(null);
    await fetchLavorazioni(false);
    setLoading(false);
  };

  const finishLavorazione = async (l: Lavorazione, kg: number, nastri: number, pezzi: number, metri: number) => {
    setLoading(true);
    setLoadingMsg('ARCHIVIAZIONE...');
    try {
      await supabase.from('l_lavorazioni').update({ 
        id_stato: Stati.TER, 
        fine_lavorazione: new Date().toISOString(),
        ordine_kg_lavorato: Math.round(kg),
        numero_passate: Math.round(nastri),
        numero_pezzi: Math.round(pezzi),
        metri_avvolti: Math.round(metri)
      }).eq('id_lavorazione', l.id_lavorazione);
      setShowTerminaPicker(null);
      await fetchLavorazioni(false);
    } catch (e: any) {
      alert("Errore: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const proItems = useMemo(() => {
    return lavorazioni
      .filter(l => l.id_stato === Stati.PRO || (l.id_stato === Stati.TER && l.fine_lavorazione?.startsWith(selectedDate)))
      .sort((a, b) => (a.id_stato === b.id_stato ? 0 : a.id_stato === Stati.PRO ? -1 : 1));
  }, [lavorazioni, selectedDate]);

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

  const TableComponent = ({ items, title, type }: any) => (
    <div className="bg-white rounded-xl shadow-sm border border-yellow-200 overflow-hidden h-fit w-full">
      <div className={`${type === 'PRO' ? 'bg-blue-600' : 'bg-slate-800'} p-3 text-white font-black uppercase text-[10px] tracking-widest flex justify-between items-center shrink-0`}>
        <span>{title}</span>
        <span className="bg-white/20 px-2 py-0.5 rounded-full text-[9px]">{items.length}</span>
      </div>
      <div className="w-full overflow-hidden">
        <table className="w-full text-left border-collapse table-fixed">
          <thead className="bg-gray-50 text-[10px] font-black text-gray-500 uppercase border-b">
            <tr>
              <th className="w-[8%] py-2 text-center">ST</th>
              <th className="w-[44%] py-2 px-2 text-left">SCHEDA / CLIENTE</th>
              <th className="w-[14%] py-2 text-center">CONS.</th>
              <th className="w-[12%] py-2 text-center">KG</th>
              <th className="w-[12%] py-2 text-center">MIS</th>
              <th className="w-[10%] py-2 text-center">AZ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((l: Lavorazione) => (
              <tr key={l.id_lavorazione} className={`${l.id_stato === Stati.ATT ? 'bg-yellow-50/20' : (l.id_stato === Stati.PRO ? 'bg-blue-50/40' : 'bg-green-100/70')}`}>
                <td className="py-3 text-center">
                  <div className={`w-2 h-2 rounded-full mx-auto ${l.id_stato === Stati.ATT ? 'bg-yellow-400' : (l.id_stato === Stati.PRO ? 'bg-blue-600 animate-pulse' : 'bg-green-600')}`}></div>
                </td>
                <td className="py-3 px-2 overflow-hidden">
                  <div className="flex flex-col leading-tight min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-[13px] text-slate-800">{l.scheda}</span>
                      <span className="font-bold text-[11px] text-slate-500 truncate uppercase">{l.l_clienti?.cliente || '...'}</span>
                    </div>
                  </div>
                </td>
                <td className="py-3 text-center">
                   <span className="text-[10px] font-black text-red-600">{formatShortDate(l.data_consegna)}</span>
                </td>
                <td className="py-3 text-center font-black text-slate-700 text-[12px]">{l.ordine_kg_richiesto || '--'}</td>
                <td className="py-3 text-center font-black text-blue-700 text-[12px]">{l.misura}</td>
                <td className="py-3 text-center px-1">
                  {l.id_stato === Stati.ATT ? (
                    <button onClick={() => setShowFasePicker({ id: l.id_lavorazione })} className="text-blue-600 active:scale-90"><PlayCircle size={20} /></button>
                  ) : l.id_stato === Stati.PRO ? (
                    <button onClick={() => setShowTerminaPicker(l)} className="text-blue-600 active:scale-90"><CheckCircle2 size={20} /></button>
                  ) : <CheckCircle2 size={18} className="text-green-600 mx-auto" />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-yellow-50 pb-20 flex flex-col overflow-x-hidden">
      <div className="w-full px-2 py-4 max-w-[1920px] mx-auto">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <div className="flex-1 min-w-0 w-full">
            <div className="flex justify-between items-center mb-6 bg-white/50 p-3 rounded-2xl border border-yellow-200/50 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <Link to="/lavoro" className="p-2 bg-white rounded-xl text-yellow-700 shadow-sm"><ArrowLeft size={18} /></Link>
                <h1 className="text-base font-black text-yellow-900 uppercase">{macchine.find(m => m.id_macchina === selectedMacchina)?.macchina || 'POSTAZIONE'}</h1>
              </div>
              <button onClick={() => fetchLavorazioni(true)} className="p-2 bg-yellow-600 text-white rounded-xl shadow-md active:scale-90"><RefreshCw size={18} className={loading ? 'animate-spin' : ''} /></button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <TableComponent items={proItems} title="Produzione Corrente" type="PRO" />
              <div className="flex flex-col gap-6">
                <div className="bg-white border border-yellow-200 rounded-xl p-1.5 flex items-center shadow-sm">
                  {[{ id: 'scheda', label: 'SCHEDA', icon: Hash }, { id: 'cliente', label: 'CLIENTE', icon: User }, { id: 'misura', label: 'MISURA', icon: Ruler }].map((btn) => (
                    <button key={btn.id} onClick={() => setSortCriteria(btn.id as SortCriteria)} className={`flex-1 py-2 px-3 rounded-lg text-[9px] font-black uppercase transition-all ${sortCriteria === btn.id ? 'bg-yellow-500 text-white shadow-md' : 'text-yellow-700 hover:bg-yellow-50'}`}>{btn.label}</button>
                  ))}
                </div>
                <TableComponent items={attItems} title="Schede in Attesa" type="ATT" />
              </div>
            </div>
          </div>
          <div className="w-full lg:w-96 shrink-0 h-fit lg:sticky lg:top-24"><Chat /></div>
        </div>

        <button onClick={() => setShowScanOptions(true)} className="fixed bottom-6 right-6 w-14 h-14 bg-yellow-600 text-white rounded-full flex items-center justify-center shadow-2xl border-2 border-white active:scale-110 z-40"><Camera size={24} /></button>

        {/* Modal Opzioni Inserimento */}
        {showScanOptions && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
            <div className="bg-white rounded-3xl p-8 w-full max-w-xs shadow-2xl relative border-t-4 border-yellow-500">
              <button onClick={() => setShowScanOptions(false)} className="absolute top-5 right-5 text-gray-300"><X size={22} /></button>
              <h3 className="text-sm font-black text-slate-900 mb-8 text-center uppercase tracking-widest">Aggiunta Scheda</h3>
              <div className="flex flex-col gap-3">
                <button onClick={() => cameraInputRef.current?.click()} className="flex items-center gap-4 bg-slate-900 text-white p-4 rounded-2xl font-black text-[11px] uppercase active:scale-95"><Camera size={18} /> SCATTA FOTO HD</button>
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-4 bg-gray-100 text-slate-700 p-4 rounded-2xl font-black text-[11px] uppercase active:scale-95"><Upload size={18} /> GALLERIA</button>
                <button onClick={triggerManualEntry} className="flex items-center gap-4 bg-yellow-50 text-yellow-800 p-4 rounded-2xl font-black text-[11px] uppercase active:scale-95 border border-yellow-200"><Keyboard size={18} /> MANUALE</button>
              </div>
              <input type="file" ref={cameraInputRef} accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
              <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>
          </div>
        )}

        {/* Modal Riepilogo AGGIORNATO */}
        {scanResult && (
          <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-1 z-[250]">
            <div className="bg-white rounded-[2rem] w-full max-w-xl shadow-2xl border-t-8 border-green-500 flex flex-col max-h-[98vh] overflow-hidden">
              <div className="px-5 py-4 border-b flex justify-between items-center bg-white shrink-0">
                <h3 className="text-[13px] font-black text-slate-900 uppercase flex items-center gap-2">
                  {isManualEntry ? <Keyboard size={18} className="text-yellow-600" /> : <ClipboardList size={18} className="text-green-600" />}
                  {isManualEntry ? 'Inserimento Manuale' : 'Riepilogo Dati Estratti'}
                </h3>
                <button onClick={() => { setScanResult(null); setIsManualEntry(false); }} className="text-gray-300 hover:text-red-500"><X size={24} /></button>
              </div>
              
              <div className="flex-grow overflow-y-auto p-3 sm:p-5 space-y-5">
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2 p-2.5 bg-blue-50/50 rounded-xl border border-blue-100">
                     <label className="block text-[7px] font-black text-blue-400 uppercase mb-0.5">CLIENTE (Scegli o Scrivi nuovo) *</label>
                     <div className="relative">
                        <input 
                          list="lista-clienti"
                          type="text" 
                          value={scanResult.cliente || ''} 
                          onChange={(e) => setScanResult({...scanResult, cliente: e.target.value})} 
                          className="w-full bg-transparent border-none font-bold text-slate-900 outline-none uppercase text-xs" 
                          placeholder="DIGITA NOME CLIENTE..."
                        />
                        <datalist id="lista-clienti">
                          {clienti.map(c => <option key={c.id_cliente} value={c.cliente} />)}
                        </datalist>
                        <Search size={10} className="absolute right-0 top-1/2 -translate-y-1/2 text-blue-300" />
                     </div>
                  </div>
                  <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                    <label className="block text-[7px] font-black text-gray-400 uppercase mb-0.5">N° SCHEDA *</label>
                    <input type="text" value={scanResult.scheda || ''} onChange={(e) => setScanResult({...scanResult, scheda: e.target.value})} className="w-full bg-transparent border-none font-bold text-slate-900 outline-none" />
                  </div>
                  <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                    <label className="block text-[7px] font-black text-gray-400 uppercase mb-0.5">MISURA FINALE *</label>
                    <input type="text" value={scanResult.misura || ''} onChange={(e) => setScanResult({...scanResult, misura: e.target.value})} className="w-full bg-transparent border-none font-bold text-slate-900 outline-none" />
                  </div>
                  
                  <div className="p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-100 shadow-inner">
                    <label className="block text-[7px] font-black text-emerald-600 uppercase mb-0.5 flex items-center gap-1"><Scale size={8} /> PESO TEORICO (SOPRA)</label>
                    <input type="text" value={scanResult.ordine_kg_lavorato || ''} onChange={(e) => setScanResult({...scanResult, ordine_kg_lavorato: e.target.value})} className="w-full bg-transparent border-none font-black text-emerald-700 outline-none text-lg" placeholder="0" />
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <label className="block text-[7px] font-black text-slate-400 uppercase mb-0.5">PESO ORDINATO (SOTTO)</label>
                    <input type="text" value={scanResult.ordine_kg_richiesto || ''} onChange={(e) => setScanResult({...scanResult, ordine_kg_richiesto: e.target.value})} className="w-full bg-transparent border-none font-bold text-slate-900 outline-none text-lg" placeholder="0" />
                  </div>

                  <div className="col-span-2 p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                    <label className="block text-[7px] font-black text-gray-400 uppercase mb-0.5">DATA CONSEGNA</label>
                    <input type="date" value={scanResult.data_consegna || ''} onChange={(e) => setScanResult({...scanResult, data_consegna: e.target.value})} className="w-full bg-transparent border-none font-bold text-slate-900 outline-none text-[10px]" />
                  </div>
                </div>

                <div className="pt-3 border-t">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 bg-yellow-50/50 rounded-xl border border-yellow-100">
                      <label className="block text-[7px] font-black text-yellow-600 uppercase mb-0.5">LEGA *</label>
                      <input type="text" value={scanResult.mcoil_lega || ''} onChange={(e) => setScanResult({...scanResult, mcoil_lega: e.target.value})} className="w-full bg-transparent border-none font-bold text-slate-900 outline-none uppercase" />
                    </div>
                    <div className="p-2.5 bg-yellow-50/50 rounded-xl border border-yellow-100">
                      <label className="block text-[7px] font-black text-yellow-600 uppercase mb-0.5">STATO FISICO *</label>
                      <input type="text" value={scanResult.mcoil_stato_fisico || ''} onChange={(e) => setScanResult({...scanResult, mcoil_stato_fisico: e.target.value})} className="w-full bg-transparent border-none font-bold text-slate-900 outline-none uppercase" />
                    </div>
                    <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                      <label className="block text-[7px] font-black text-gray-400 uppercase mb-0.5">SPESSORE MC</label>
                      <input type="text" value={scanResult.spessore || ''} onChange={(e) => setScanResult({...scanResult, spessore: e.target.value})} className="w-full bg-transparent border-none font-bold text-slate-900 outline-none" />
                    </div>
                    <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                      <label className="block text-[7px] font-black text-gray-400 uppercase mb-0.5">LARGHEZZA MC</label>
                      <input type="text" value={scanResult.mcoil_larghezza || ''} onChange={(e) => setScanResult({...scanResult, mcoil_larghezza: e.target.value})} className="w-full bg-transparent border-none font-bold text-slate-900 outline-none" />
                    </div>
                    <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                      <label className="block text-[7px] font-black text-gray-400 uppercase mb-0.5">CODICE MCOIL</label>
                      <input type="text" value={scanResult.mcoil || ''} onChange={(e) => setScanResult({...scanResult, mcoil: e.target.value})} className="w-full bg-transparent border-none font-bold text-slate-900 outline-none uppercase" />
                    </div>
                    <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                      <label className="block text-[7px] font-black text-gray-400 uppercase mb-0.5">PESO MCOIL (KG)</label>
                      <input type="text" value={scanResult.mcoil_kg || ''} onChange={(e) => setScanResult({...scanResult, mcoil_kg: e.target.value})} className="w-full bg-transparent border-none font-bold text-slate-900 outline-none" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t flex gap-3 shrink-0">
                <button onClick={() => { setScanResult(null); setIsManualEntry(false); }} className="flex-1 py-4 bg-white border border-slate-200 text-slate-400 rounded-2xl font-black uppercase text-[10px] active:scale-95 transition-all shadow-sm">Annulla</button>
                <button onClick={handleInviaScheda} className="flex-[2] py-4 bg-green-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-green-600/30 active:scale-95 transition-all">Salva Scheda</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Postazione Picker */}
        {showMacchinaPicker && (
          <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-[100]">
            <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl">
              <h3 className="text-sm font-black text-slate-900 mb-6 text-center uppercase tracking-widest">Postazione Lavoro</h3>
              <div className="grid grid-cols-2 gap-3">
                {macchine.map(m => (
                  <button key={m.id_macchina} onClick={() => { setSelectedMacchina(m.id_macchina); localStorage.setItem('kme_selected_macchina', m.id_macchina); setShowMacchinaPicker(false); }} className="flex flex-col items-center justify-center p-4 bg-gray-50 hover:bg-yellow-500 hover:text-white border border-gray-100 rounded-xl transition-all group shrink-0 active:scale-95"><Laptop size={20} className="mb-2 opacity-30 group-hover:opacity-100" /><span className="text-sm font-black uppercase tracking-tighter">{m.id_macchina}</span></button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Modal Fasi Picker */}
        {showFasePicker && (
          <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-6 z-[100]">
            <div className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-2xl">
              <h3 className="text-sm font-black text-slate-900 mb-6 text-center uppercase tracking-widest">Avvio Lavorazione</h3>
              <div className="flex flex-col gap-2">
                {fasi.filter(f => f.id_fase !== 'ATT').map(f => (
                  <button key={f.id_fase} onClick={() => startLavorazione(showFasePicker.id, f.id_fase)} className="w-full p-4 bg-blue-50 hover:bg-blue-600 text-blue-800 hover:text-white rounded-xl font-black text-[11px] uppercase tracking-tighter transition-all active:scale-95">{f.fase_di_lavorazione}</button>
                ))}
              </div>
              <button onClick={() => setShowFasePicker(null)} className="mt-4 w-full py-2 text-[10px] font-black text-gray-300 uppercase tracking-widest">Indietro</button>
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {loading && (
          <div className="fixed inset-0 bg-white/85 backdrop-blur-md flex flex-col items-center justify-center z-[1000] p-6 text-center">
             <div className="relative mb-8">
                <div className="w-20 h-20 border-4 border-yellow-100 border-t-yellow-600 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center"><Activity size={24} className="text-yellow-600 animate-pulse" /></div>
             </div>
             <p className="font-black text-yellow-900 uppercase text-[12px] tracking-[0.3em] animate-pulse mb-8">{loadingMsg}</p>
             
             {loadingMsg.includes('ANALISI') && (
               <div className="animate-in fade-in duration-1000 slide-in-from-bottom-2">
                 <button 
                   onClick={() => {
                     setLoading(false);
                     triggerManualEntry();
                   }}
                   className="flex items-center gap-2 bg-slate-900 text-white px-6 py-4 rounded-2xl font-black uppercase text-[10px] shadow-xl active:scale-95"
                 >
                   <AlertTriangle size={16} className="text-yellow-400" /> ANNULLA E SCRIVI A MANO
                 </button>
               </div>
             )}
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
    return Math.round(((kg / 1 / rho) * 1000) / (lavorazione.spessore * lavorazione.misura) * 1);
  }, [kg, lavorazione]);

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4 z-[130]">
      <div className="bg-white rounded-[2.5rem] p-6 w-full max-w-sm shadow-2xl border-t-8 border-red-600">
        <div className="flex justify-between items-start mb-6">
          <h3 className="text-base font-black text-slate-900 uppercase tracking-tighter">Fine Lavorazione</h3>
          <button onClick={onClose} className="text-gray-300 hover:text-red-500"><X size={22} /></button>
        </div>
        <div className="space-y-4">
          <div className="bg-gray-50 p-6 rounded-3xl border text-center">
            <label className="block text-[9px] font-black text-gray-400 uppercase mb-2 tracking-widest">KG REALI LAVORATI</label>
            <input type="number" value={kg} onChange={(e) => setKg(Number(e.target.value))} className="w-full bg-transparent border-none font-black text-5xl text-center text-red-600 outline-none" />
          </div>
          <div className="p-4 rounded-2xl bg-blue-50 text-center border border-blue-100">
            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Sviluppo: {metri} metri lineari</span>
          </div>
        </div>
        <button onClick={() => onConfirm(lavorazione, kg, 1, 1, metri)} className="mt-8 w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] shadow-xl active:scale-95 transition-all">Salva e Archivia</button>
      </div>
    </div>
  );
}

export default Produzione;
