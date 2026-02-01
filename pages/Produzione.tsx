
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
import { ArrowLeft, RefreshCw, Camera, Upload, Keyboard, CheckCircle2, PlayCircle, X, Settings, Calendar, Laptop, ClipboardList, Box, SortAsc, Hash, User, Clock, Ruler, ArrowRight } from 'lucide-react';

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
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

type SortCriteria = 'scheda' | 'cliente' | 'data' | 'misura';

const Produzione: React.FC = () => {
  const [selectedMacchina, setSelectedMacchina] = useState<string | null>(localStorage.getItem('kme_selected_macchina'));
  const [macchine, setMacchine] = useState<Macchina[]>([]);
  const [fasi, setFasi] = useState<FaseLavorazione[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(formatDate(new Date()));
  const [lavorazioni, setLavorazioni] = useState<Lavorazione[]>([]);
  const [loading, setLoading] = useState(false);
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
      if (m) setMacchine(m);
      if (f) setFasi(f);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { fetchMeta(); }, [fetchMeta]);

  const fetchLavorazioni = useCallback(async () => {
    if (!selectedMacchina) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('l_lavorazioni')
        .select(`*, l_clienti:id_cliente (*), l_macchine:id_macchina (*), l_fasi_di_lavorazione:id_fase (*)`)
        .eq('id_macchina', selectedMacchina);
      if (data) setLavorazioni(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [selectedMacchina]);

  useEffect(() => { fetchLavorazioni(); }, [fetchLavorazioni]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setShowScanOptions(false);
    try {
      const base64 = await blobToBase64(file);
      const data = await processLabelImage(base64);
      setScanResult(data);
    } catch (err: any) {
      alert("Errore lettura immagine: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMacchina = (id: string) => {
    setSelectedMacchina(id);
    localStorage.setItem('kme_selected_macchina', id);
    setShowMacchinaPicker(false);
  };

  const handleInviaScheda = async () => {
    if (!scanResult || !selectedMacchina) return;
    setLoading(true);
    try {
      const nomeCliente = (scanResult.cliente || 'CLIENTE IGNOTO').toUpperCase().trim();
      const safeClientId = nomeCliente.replace(/[^A-Z0-9]/g, '_').substring(0, 30);
      await supabase.from('l_clienti').upsert({ id_cliente: safeClientId, cliente: nomeCliente }, { onConflict: 'id_cliente' });

      const payload = {
        id_macchina: selectedMacchina,
        id_fase: 'ATT',
        id_stato: Stati.ATT,
        scheda: parseInt(scanResult.scheda) || 0,
        mcoil: (scanResult.mcoil || 'N/D').toUpperCase(),
        mcoil_kg: parseInt(scanResult.mcoil_kg) || 0,
        spessore: parseFloat(scanResult.spessore) || 0,
        mcoil_larghezza: parseInt(scanResult.mcoil_larghezza) || 0,
        mcoil_lega: (scanResult.mcoil_lega || 'RAME').toUpperCase(),
        mcoil_stato_fisico: scanResult.mcoil_stato_fisico || 'N/D',
        conferma_voce: scanResult.conferma_voce || 'N/D',
        id_cliente: safeClientId,
        ordine_kg_richiesto: parseInt(scanResult.ordine_kg_richiesto) || 0,
        ordine_kg_lavorato: parseInt(scanResult.ordine_kg_lavorato) || null,
        misura: parseFloat(scanResult.misura) || 0,
        attesa_lavorazione: new Date().toISOString(),
        data_consegna: scanResult.data_consegna || null
      };

      const { error } = await supabase.from('l_lavorazioni').insert(payload);
      if (error) throw error;
      setScanResult(null);
      await fetchLavorazioni();
    } catch (err: any) {
      alert(`Errore salvataggio: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const startLavorazione = async (id: string, faseId: string) => {
    setLoading(true);
    await supabase.from('l_lavorazioni').update({ 
      id_fase: faseId, 
      id_stato: Stati.PRO, 
      inizio_lavorazione: new Date().toISOString() 
    }).eq('id_lavorazione', id);
    setShowFasePicker(null);
    await fetchLavorazioni();
    setLoading(false);
  };

  const finishLavorazione = async (l: Lavorazione, kg: number, nastri: number, pezzi: number, metri: number, nextMachineId?: string) => {
    setLoading(true);
    try {
      await supabase.from('l_lavorazioni').update({ 
        id_stato: Stati.TER, 
        fine_lavorazione: new Date().toISOString(),
        ordine_kg_lavorato: Math.round(kg),
        numero_passate: Math.round(nastri),
        numero_pezzi: Math.round(pezzi),
        metri_avvolti: Math.round(metri)
      }).eq('id_lavorazione', l.id_lavorazione);

      const faseName = (l.l_fasi_di_lavorazione?.fase_di_lavorazione || '').toUpperCase();
      
      let needsNewRecord = false;
      let targetMachine = l.id_macchina;
      let targetStatus = Stati.ATT;

      if (faseName.includes('MULTIPLO x ALTRA MACCHINA') || faseName.includes('TAGLIO x SBAVATURA')) {
        needsNewRecord = true;
        targetMachine = nextMachineId || l.id_macchina;
      } else if (faseName === 'MULTIPLO') {
        needsNewRecord = true;
        targetMachine = l.id_macchina;
      } else if (faseName.includes('STAGNATURA')) {
        needsNewRecord = true;
        targetStatus = Stati.EXT;
        targetMachine = l.id_macchina;
      } else if (faseName === 'ROTTAME') {
        needsNewRecord = true;
        targetMachine = 'CASSONE';
      }

      if (needsNewRecord) {
        const nextPayload = {
          id_macchina: targetMachine,
          id_fase: 'ATT',
          id_stato: targetStatus,
          scheda: l.scheda,
          mcoil: l.mcoil,
          mcoil_kg: Math.round(kg),
          spessore: l.spessore,
          mcoil_larghezza: l.mcoil_larghezza,
          mcoil_lega: l.mcoil_lega,
          mcoil_stato_fisico: l.mcoil_stato_fisico,
          conferma_voce: l.conferma_voce,
          id_cliente: l.id_cliente,
          ordine_kg_richiesto: l.ordine_kg_richiesto,
          misura: l.misura,
          attesa_lavorazione: new Date().toISOString(),
          data_consegna: l.data_consegna
        };
        await supabase.from('l_lavorazioni').insert(nextPayload);
      }

      setShowTerminaPicker(null);
      await fetchLavorazioni();
    } catch (e: any) {
      alert("Errore chiusura: " + e.message);
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
              <tr key={l.id_lavorazione} className={`${l.id_stato === Stati.ATT ? 'bg-yellow-50/20' : (l.id_stato === Stati.PRO ? 'bg-blue-50/40' : 'bg-green-100/70')} transition-colors`}>
                <td className="py-3 text-center">
                  <div className={`w-2 h-2 rounded-full mx-auto ${l.id_stato === Stati.ATT ? 'bg-yellow-400' : (l.id_stato === Stati.PRO ? 'bg-blue-600 animate-pulse' : 'bg-green-600')}`}></div>
                </td>
                <td className="py-3 px-2 overflow-hidden">
                  <div className="flex flex-col leading-tight min-w-0">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      <span className="font-black text-[13px] text-slate-800 shrink-0">{l.scheda}</span>
                      <span className="font-bold text-[11px] text-slate-500 truncate uppercase flex-1">
                        {l.l_clienti?.cliente || '...'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap overflow-hidden">
                      {type === 'PRO' && l.id_fase !== 'ATT' && (
                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-[4px] text-[8px] font-black uppercase tracking-tight whitespace-nowrap border border-blue-200">
                          {l.l_fasi_di_lavorazione?.fase_di_lavorazione || l.id_fase}
                        </span>
                      )}
                      <div className="text-[10px] text-gray-400 font-bold uppercase truncate max-w-full">
                        {l.mcoil_lega} {l.spessore}x{l.mcoil_larghezza}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-3 text-center">
                  <div className="text-[10px] font-black text-red-600 bg-red-50 px-1.5 py-0.5 rounded uppercase tracking-tighter inline-block">
                    {formatShortDate(l.data_consegna)}
                  </div>
                </td>
                <td className="py-3 text-center">
                  <div className="flex flex-col items-center justify-center leading-none">
                    <span className="font-black text-slate-700 text-[12px]">{l.ordine_kg_richiesto || '--'}</span>
                    <span className="text-[8px] text-gray-400 font-bold uppercase">KG</span>
                  </div>
                </td>
                <td className="py-3 text-center font-black text-blue-700 text-[12px]">
                  {l.misura}
                </td>
                <td className="py-3 text-center px-1">
                  {l.id_stato === Stati.ATT ? (
                    <button onClick={() => setShowFasePicker({ id: l.id_lavorazione })} className="text-blue-600 hover:scale-110 transition-transform active:scale-90"><PlayCircle size={20} /></button>
                  ) : l.id_stato === Stati.PRO ? (
                    <button onClick={() => setShowTerminaPicker(l)} className="text-blue-600 hover:scale-110 transition-transform active:scale-90"><CheckCircle2 size={20} /></button>
                  ) : <CheckCircle2 size={18} className="text-green-600 mx-auto" />}
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-gray-400 italic text-[11px] uppercase tracking-widest">Nessuna scheda presente</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-yellow-50 pb-20 flex flex-col overflow-x-hidden">
      <div className="w-full px-2 sm:px-4 py-4 max-w-[1920px] mx-auto">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          
          {/* Main Area: Produzione */}
          <div className="flex-1 min-w-0 w-full">
            <div className="flex flex-row justify-between items-center gap-4 mb-6 bg-white/50 p-3 rounded-2xl backdrop-blur-sm border border-yellow-200/50 shadow-sm">
              <div className="flex items-center gap-3 min-w-0">
                <Link to="/lavoro" className="p-2 bg-white rounded-xl shadow-sm border border-yellow-200 text-yellow-700 active:scale-90 shrink-0"><ArrowLeft size={18} /></Link>
                <div className="min-w-0">
                  <h1 className="text-base sm:text-xl font-black text-yellow-900 uppercase tracking-tighter leading-none truncate">{macchine.find(m => m.id_macchina === selectedMacchina)?.macchina || 'POSTAZIONE'}</h1>
                  <button onClick={() => setShowMacchinaPicker(true)} className="text-[10px] font-black text-yellow-600 uppercase flex items-center gap-1.5 mt-1 hover:text-yellow-700 transition-colors"><Settings size={12} /> Cambia</button>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl shadow-sm border border-yellow-200">
                  <Calendar size={14} className="text-yellow-600" />
                  <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent border-none p-0 font-black text-[11px] text-slate-800 outline-none w-24" />
                </div>
                <button onClick={fetchLavorazioni} className="p-2 bg-yellow-600 text-white rounded-xl shadow-md transition-transform active:scale-90"><RefreshCw size={18} className={loading ? 'animate-spin' : ''} /></button>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="w-full">
                <TableComponent items={proItems} title="Produzione Corrente" type="PRO" />
              </div>
              <div className="flex flex-col gap-6 w-full min-w-0">
                <div className="bg-white border border-yellow-200 rounded-xl p-1.5 flex items-center shadow-sm overflow-hidden">
                  <div className="px-3 flex items-center gap-2 border-r border-yellow-100 mr-2 shrink-0">
                    <SortAsc size={14} className="text-yellow-600" />
                    <span className="text-[10px] font-black text-yellow-900 uppercase">Filtra:</span>
                  </div>
                  <div className="flex flex-1 gap-1.5 min-w-0 overflow-x-auto no-scrollbar py-1">
                    {[{ id: 'scheda', label: 'SCHEDA', icon: Hash }, { id: 'cliente', label: 'CLIENTE', icon: User }, { id: 'data', label: 'CONSEGNA', icon: Clock }, { id: 'misura', label: 'MISURA', icon: Ruler }].map((btn) => (
                      <button key={btn.id} onClick={() => setSortCriteria(btn.id as SortCriteria)} className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg transition-all shrink-0 ${sortCriteria === btn.id ? 'bg-yellow-500 text-white font-black shadow-md' : 'text-yellow-700 font-bold hover:bg-yellow-50'}`}><btn.icon size={11} /><span className="text-[9px] uppercase tracking-tighter">{btn.label}</span></button>
                    ))}
                  </div>
                </div>
                <div className="w-full">
                  <TableComponent items={attItems} title="Schede in Attesa" type="ATT" />
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Chat: Persistente */}
          <div className="w-full lg:w-80 xl:w-96 shrink-0 h-fit lg:sticky lg:top-24 z-10">
            <Chat />
          </div>
        </div>

        {/* Floating Action Button */}
        <button onClick={() => setShowScanOptions(true)} className="fixed bottom-6 right-6 w-14 h-14 bg-yellow-600 text-white rounded-full flex items-center justify-center shadow-2xl border-2 border-white z-40 transition-transform active:scale-110 hover:bg-yellow-700"><Camera size={24} /></button>

        {/* Picker Macchina */}
        {showMacchinaPicker && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
            <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl animate-in zoom-in duration-150">
              <h3 className="text-sm font-black text-slate-900 mb-6 text-center uppercase tracking-widest">Postazione Lavoro</h3>
              <div className="grid grid-cols-2 gap-3">
                {macchine.map(m => (
                  <button key={m.id_macchina} onClick={() => handleSelectMacchina(m.id_macchina)} className="flex flex-col items-center justify-center p-4 bg-gray-50 hover:bg-yellow-500 hover:text-white border border-gray-100 rounded-xl group transition-all shrink-0"><Laptop size={20} className="mb-2 opacity-30 group-hover:opacity-100" /><span className="text-sm font-black uppercase">{m.id_macchina}</span><span className="text-[10px] font-bold uppercase opacity-60 truncate w-full text-center mt-1">{m.macchina}</span></button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Opzioni Scansione */}
        {showScanOptions && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
            <div className="bg-white rounded-2xl p-8 w-full max-w-xs shadow-2xl relative">
              <button onClick={() => setShowScanOptions(false)} className="absolute top-5 right-5 text-gray-300 hover:text-red-500 transition-colors"><X size={22} /></button>
              <h3 className="text-sm font-black text-slate-900 mb-8 text-center uppercase tracking-widest">Inserimento Scheda</h3>
              <div className="flex flex-col gap-3">
                <button onClick={() => cameraInputRef.current?.click()} className="flex items-center gap-4 bg-slate-900 text-white p-4 rounded-2xl font-black text-[11px] uppercase active:scale-95 transition-transform"><Camera size={18} /> FOTOCAMERA</button>
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-4 bg-gray-100 text-slate-700 p-4 rounded-2xl font-black text-[11px] uppercase active:scale-95 transition-transform"><Upload size={18} /> GALLERIA</button>
                <button onClick={() => { setScanResult({ scheda: '', cliente: '', mcoil: 'N/D', misura: '', ordine_kg_richiesto: '', ordine_kg_lavorato: '', spessore: '', mcoil_larghezza: '', mcoil_lega: 'RAME', data_consegna: formatDate(new Date()) }); setShowScanOptions(false); }} className="flex items-center gap-4 bg-yellow-50 text-yellow-800 p-4 rounded-2xl font-black text-[11px] uppercase active:scale-95 transition-transform"><Keyboard size={18} /> MANUALE</button>
              </div>
              <input type="file" ref={cameraInputRef} accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
              <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>
          </div>
        )}

        {/* Modal Riepilogo Scansione */}
        {scanResult && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-[110] overflow-y-auto">
            <div className="bg-white rounded-3xl p-6 w-full max-w-xl shadow-2xl my-auto border-t-8 border-green-500 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6"><h3 className="text-base font-black text-slate-900 uppercase flex items-center gap-3"><ClipboardList size={20} className="text-green-600" /> Dati Estratti da IA</h3><button onClick={() => setScanResult(null)} className="text-gray-300 hover:text-red-500 transition-colors"><X size={24} /></button></div>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-3">
                  {[{ label: 'Scheda n° *', key: 'scheda' }, { label: 'Misura *', key: 'misura' }, { label: 'Peso Ord. (kg)', key: 'ordine_kg_richiesto' }, { label: 'Peso Teor. (kg)', key: 'ordine_kg_lavorato' }, { label: 'Consegna', key: 'data_consegna', type: 'date' }, { label: 'Conferma-Voce', key: 'conferma_voce' }, { label: 'Cliente', key: 'cliente', col: 'col-span-2' }].map((f: any) => (
                    <div key={f.key} className={`p-2 bg-gray-50 rounded-xl border border-gray-100 ${f.col || ''}`}><label className="block text-[9px] font-black text-gray-400 uppercase mb-1">{f.label}</label><input type={f.type || 'text'} value={scanResult[f.key] || ''} onChange={(e) => setScanResult({...scanResult, [f.key]: e.target.value})} className="w-full bg-transparent border-none font-bold text-slate-900 text-[13px] outline-none focus:text-green-600 transition-colors" /></div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3 border-t pt-5">
                  {[{ label: 'Codice MC', key: 'mcoil' }, { label: 'Peso MC', key: 'mcoil_kg' }, { label: 'Spessore', key: 'spessore' }, { label: 'Largh. MC', key: 'mcoil_larghezza' }].map((f: any) => (
                    <div key={f.key} className="p-2 bg-blue-50/30 rounded-xl border border-blue-100"><label className="block text-[9px] font-black text-blue-400 uppercase mb-1">{f.label}</label><input type="text" value={scanResult[f.key] || ''} onChange={(e) => setScanResult({...scanResult, [f.key]: e.target.value})} className="w-full bg-transparent border-none font-bold text-slate-900 text-[13px] outline-none focus:text-blue-600 transition-colors" /></div>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 mt-8 border-t pt-6"><button onClick={() => setScanResult(null)} className="flex-1 py-4 bg-gray-50 text-gray-400 rounded-2xl font-black uppercase text-[11px] tracking-widest active:scale-95 transition-all">Annulla</button><button onClick={handleInviaScheda} className="flex-[2] py-4 bg-green-600 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl active:scale-95 transition-all">Salva in Archivio</button></div>
            </div>
          </div>
        )}

        {/* Modal Tipo Fase */}
        {showFasePicker && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-6 z-[100]">
            <div className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-2xl">
              <h3 className="text-sm font-black text-slate-900 mb-6 text-center uppercase tracking-widest">Inizio Lavorazione</h3>
              <div className="flex flex-col gap-2">
                {fasi.filter(f => f.id_fase !== 'ATT').map(f => (
                  <button key={f.id_fase} onClick={() => startLavorazione(showFasePicker.id, f.id_fase)} className="w-full p-4 bg-blue-50 hover:bg-blue-600 text-blue-800 hover:text-white rounded-xl font-black text-[11px] text-left uppercase transition-all">{f.fase_di_lavorazione}</button>
                ))}
              </div>
              <button onClick={() => setShowFasePicker(null)} className="mt-5 w-full py-2 text-[10px] font-black text-gray-300 uppercase">Annulla</button>
            </div>
          </div>
        )}

        {/* Modal Termina */}
        {showTerminaPicker && (
          <TerminaModal macchine={macchine} lavorazione={showTerminaPicker} onClose={() => setShowTerminaPicker(null)} onConfirm={finishLavorazione} />
        )}

        {/* Loading Overlay */}
        {loading && (
          <div className="fixed inset-0 bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center z-[200]">
             <div className="w-10 h-10 border-4 border-yellow-100 border-t-yellow-600 rounded-full animate-spin"></div>
             <p className="mt-3 font-black text-yellow-900 uppercase text-[9px] tracking-widest animate-pulse">Aggiornamento Database...</p>
          </div>
        )}
      </div>
    </div>
  );
};

const TerminaModal: React.FC<any> = ({ lavorazione, onClose, onConfirm, macchine }) => {
  const [kg, setKg] = useState<number>(lavorazione.ordine_kg_richiesto || 0);
  const [nastri, setNastri] = useState<number>(1);
  const [pezzi, setPezzi] = useState<number>(1);
  const [nextMachine, setNextMachine] = useState<string>('');

  const faseName = (lavorazione.l_fasi_di_lavorazione?.fase_di_lavorazione || '').toUpperCase();
  const needsMachineSelection = faseName.includes('MULTIPLO x ALTRA MACCHINA') || faseName.includes('TAGLIO x SBAVATURA');
  const isSbavatura = faseName.includes('SBAVATURA');

  const filteredMacchine = useMemo(() => {
    if (!isSbavatura) return macchine.filter((m: any) => m.id_macchina !== 'CASSONE');
    return macchine.filter((m: any) => m.macchina.toUpperCase().includes('SBAVATRICE'));
  }, [macchine, isSbavatura]);

  const metri = useMemo(() => {
    if (!kg || !lavorazione.spessore || !lavorazione.misura || pezzi === 0) return 0;
    const rho = (lavorazione.mcoil_lega || '').toUpperCase().includes('OT') ? 8.41 : 8.96;
    return Math.round(((kg / pezzi / rho) * 1000) / (lavorazione.spessore * lavorazione.misura) * nastri);
  }, [kg, nastri, pezzi, lavorazione]);

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4 z-[130]">
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border-t-8 border-red-600 animate-in zoom-in duration-150 overflow-y-auto max-h-[95vh]">
        <div className="flex justify-between items-start mb-6">
          <div className="text-left">
            <h3 className="text-base font-black text-slate-900 uppercase tracking-tighter leading-none">Chiusura Lavorazione</h3>
            <p className="text-[10px] font-bold text-gray-400 mt-1.5 uppercase">{faseName}</p>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-red-500 transition-colors"><X size={22} /></button>
        </div>

        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-2xl border text-center">
            <label className="block text-[9px] font-black text-gray-400 uppercase mb-1.5">Peso Reale Ottenuto (KG)</label>
            <input autoFocus type="number" value={kg} onChange={(e) => setKg(Number(e.target.value))} className="w-full bg-transparent border-none font-black text-3xl text-center text-red-600 outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 p-3 rounded-xl text-center border"><label className="block text-[8px] font-black text-gray-400 uppercase mb-1">Pezzi</label><input type="number" value={pezzi} onChange={(e) => setPezzi(Number(e.target.value))} className="w-full bg-transparent border-none font-black text-sm text-center outline-none" /></div>
            <div className="bg-gray-50 p-3 rounded-xl text-center border"><label className="block text-[8px] font-black text-gray-400 uppercase mb-1">Nastri</label><input type="number" value={nastri} onChange={(e) => setNastri(Number(e.target.value))} className="w-full bg-transparent border-none font-black text-sm text-center outline-none" /></div>
          </div>
          <div className="p-4 rounded-2xl bg-blue-50 text-center border border-blue-100 flex flex-col items-center shadow-inner">
            <span className="text-[10px] font-black text-blue-400 uppercase mb-1">Sviluppo Metrico</span>
            <div className="text-2xl font-black text-blue-600">{metri} m</div>
          </div>

          {needsMachineSelection && (
            <div className="p-4 rounded-2xl bg-yellow-50 border border-yellow-200">
              <label className="block text-[10px] font-black text-yellow-700 uppercase mb-3 text-center">Invia Scheda a Macchina Succ.</label>
              <div className="grid grid-cols-1 gap-2">
                {filteredMacchine.map((m: any) => (
                  <button key={m.id_macchina} onClick={() => setNextMachine(m.id_macchina)} className={`p-3.5 rounded-xl font-black text-[11px] uppercase border transition-all ${nextMachine === m.id_macchina ? 'bg-yellow-600 text-white border-yellow-700 shadow-md' : 'bg-white text-yellow-800 border-yellow-100 hover:bg-yellow-100'}`}>
                    {m.macchina}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button 
          onClick={() => onConfirm(lavorazione, kg, nastri, pezzi, metri, nextMachine)} 
          disabled={needsMachineSelection && !nextMachine}
          className={`mt-8 w-full py-4 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 ${needsMachineSelection && !nextMachine ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-black'}`}
        >
          {needsMachineSelection ? <ArrowRight size={18} /> : <CheckCircle2 size={18} />}
          {needsMachineSelection ? 'Crea e Chiudi' : 'Conferma Fine Lavoro'}
        </button>
      </div>
    </div>
  );
}

export default Produzione;
