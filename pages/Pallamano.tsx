
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { HandballMatch, UserProfile, HandballStanding, HandballPlayer, PlayerStats } from '../types';
import { 
  Trophy, Calendar, Plus, X, Trash2, RefreshCw, ListOrdered, Users, 
  BarChart3, UserPlus, Pencil, Target, Zap, ChevronDown, Check,
  ChevronRight, CalendarDays, ArrowRight
} from 'lucide-react';

interface Props {
  profile?: UserProfile | null;
}

type TabType = 'CLASSIFICA' | 'CALENDARIO' | 'ROSA' | 'STATS';

const RUOLI_DISPONIBILI = ["Ala", "Centrale", "Terzino", "Pivot", "Portiere"];

const Pallamano: React.FC<Props> = ({ profile }) => {
  const [activeTab, setActiveTab] = useState<TabType>('CLASSIFICA');
  const [matches, setMatches] = useState<HandballMatch[]>([]);
  const [players, setPlayers] = useState<HandballPlayer[]>([]);
  const [stats, setStats] = useState<PlayerStats[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

  const [showAddMatch, setShowAddMatch] = useState(false);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [showAddStat, setShowAddStat] = useState(false);
  
  const [editingMatch, setEditingMatch] = useState<HandballMatch | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<HandballPlayer | null>(null);

  const [matchForm, setMatchForm] = useState({ 
    casa: '', ospite: '', data: new Date().toISOString().split('T')[0], giornata: 1, pCasa: '', pOspite: '' 
  });
  
  const [newPlayer, setNewPlayer] = useState({ 
    nome: '', 
    cognome: '', 
    numero: '', 
    ruoli: [] as string[],
    dataNascita: '',
    categoria: 'U14M'
  });
  
  const [statForm, setStatForm] = useState({ giocatoreId: '', goal: 1 });

  const isAdmin = profile?.role === 'ADMIN';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: mData, error: mError } = await supabase.from('p_partite').select('*').order('data_partita', { ascending: true });
      if (mError) throw mError;
      setMatches(mData || []);

      const { data: pData, error: pError } = await supabase.from('p_giocatori').select('*').order('numero_di_maglia', { ascending: true });
      if (pError) throw pError;
      setPlayers(pData || []);

      const storedStats = localStorage.getItem('h_stats_v3');
      if (storedStats) setStats(JSON.parse(storedStats));
    } catch (e: any) {
      console.error("Errore fetch:", e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const standings = useMemo(() => {
    const teams: { [key: string]: HandballStanding } = {};
    matches.forEach(m => {
      if (m.punti_casa === null || m.punti_ospite === null) return;
      [m.squadra_casa, m.squadra_ospite].forEach(t => {
        if (!teams[t]) teams[t] = { pos: 0, squadra: t, punti: 0, giocate: 0, vinte: 0, nulle: 0, perse: 0, gf: 0, gs: 0, dr: 0, andamento: [] };
      });
      const tCasa = teams[m.squadra_casa];
      const tOspite = teams[m.squadra_ospite];
      tCasa.giocate++; tOspite.giocate++;
      tCasa.gf += m.punti_casa; tCasa.gs += m.punti_ospite;
      tOspite.gf += m.punti_ospite; tOspite.gs += m.punti_casa;
      if (m.punti_casa > m.punti_ospite) {
        tCasa.punti += 2; tCasa.vinte++; tOspite.perse++;
        tCasa.andamento.push('V'); tOspite.andamento.push('P');
      } else if (m.punti_casa < m.punti_ospite) {
        tOspite.punti += 2; tOspite.vinte++; tCasa.perse++;
        tCasa.andamento.push('P'); tOspite.andamento.push('V');
      } else {
        tCasa.punti += 1; tOspite.punti += 1; tCasa.nulle++; tOspite.nulle++;
        tCasa.andamento.push('N'); tOspite.andamento.push('N');
      }
    });
    return Object.values(teams).sort((a, b) => b.punti - a.punti || (b.gf - b.gs) - (a.gf - a.gs)).map((t, i) => ({ ...t, pos: i + 1, dr: t.gf - t.gs }));
  }, [matches]);

  const groupedMatches = useMemo(() => {
    const groups: { [key: number]: HandballMatch[] } = {};
    matches.forEach(m => {
      const g = m.giornata || 1;
      if (!groups[g]) groups[g] = [];
      groups[g].push(m);
    });
    return Object.entries(groups).sort((a, b) => Number(a[0]) - Number(b[0]));
  }, [matches]);

  const handleSavePlayer = async () => {
    if (!newPlayer.nome || !newPlayer.cognome || !newPlayer.numero) return;
    setLoading(true);
    const payload = {
      nome: newPlayer.nome.trim(),
      cognome: newPlayer.cognome.trim(),
      numero_di_maglia: parseInt(newPlayer.numero),
      ruoli: newPlayer.ruoli.join(', '),
      data_di_nascita: newPlayer.dataNascita || null,
      categoria: newPlayer.categoria
    };
    try {
      const { error } = editingPlayer 
        ? await supabase.from('p_giocatori').update(payload).eq('id', editingPlayer.id)
        : await supabase.from('p_giocatori').insert(payload);
      if (error) throw error;
      setShowAddPlayer(false);
      setEditingPlayer(null);
      await fetchData();
    } catch (e: any) { alert(e.message); } finally { setLoading(false); }
  };

  const handleSaveMatch = async () => {
    if (!matchForm.casa || !matchForm.ospite) return;
    setLoading(true);
    const payload = {
      squadra_casa: matchForm.casa,
      squadra_ospite: matchForm.ospite,
      data_partita: matchForm.data,
      giornata: matchForm.giornata,
      punti_casa: matchForm.pCasa === '' ? null : parseInt(matchForm.pCasa),
      punti_ospite: matchForm.pOspite === '' ? null : parseInt(matchForm.pOspite),
      campionato: 'Under 14 Maschile'
    };
    try {
      const { error } = editingMatch
        ? await supabase.from('p_partite').update(payload).eq('id', editingMatch.id)
        : await supabase.from('p_partite').insert(payload);
      if (error) throw error;
      setShowAddMatch(false);
      setEditingMatch(null);
      await fetchData();
    } catch (e: any) { alert(e.message); } finally { setLoading(false); }
  };

  const TabLink = ({ id, label, icon: Icon }: { id: TabType, label: string, icon: any }) => (
    <button 
      onClick={() => setActiveTab(id)}
      className={`flex-1 flex flex-col items-center py-4 transition-all relative ${
        activeTab === id ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'
      }`}
    >
      <Icon size={18} className="mb-1" />
      <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
      {activeTab === id && <div className="absolute bottom-0 left-1/4 right-1/4 h-1 bg-blue-500 rounded-t-full shadow-[0_-4px_10px_rgba(59,130,246,0.5)]"></div>}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20">
      <div className="bg-slate-900 pt-20 pb-28 px-6 text-center relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-900 to-slate-950"></div>
        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-400 px-4 py-1.5 rounded-full border border-blue-500/20 text-[10px] font-black uppercase tracking-[0.2em] mb-6">
            <Zap size={12} className="animate-pulse" /> Live Sport Engine
          </div>
          <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter italic mb-4 leading-none text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-500">
            PALLAMANO <span className="text-blue-500">VIGEVANO</span>
          </h1>
          <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-xs">Under 14 Maschile • Stagione 2025/26</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-16 relative z-20">
        <div className="bg-slate-900/80 backdrop-blur-xl rounded-[2rem] shadow-2xl flex overflow-hidden border border-white/5 mb-8 p-1">
          <TabLink id="CLASSIFICA" label="Classifica" icon={ListOrdered} />
          <TabLink id="CALENDARIO" label="Calendario" icon={Calendar} />
          <TabLink id="ROSA" label="Giocatori" icon={Users} />
          <TabLink id="STATS" label="Marcatori" icon={BarChart3} />
        </div>

        <div className="bg-slate-900/40 backdrop-blur-sm rounded-[3rem] shadow-xl p-6 md:p-10 border border-white/5 min-h-[600px]">
          {activeTab === 'CLASSIFICA' && (
            <div className="animate-in fade-in duration-500">
               <div className="mb-10 text-center">
                 <h3 className="text-4xl font-black text-white uppercase italic tracking-tighter leading-none">CLASSIFICA</h3>
                 <p className="text-blue-500 font-bold uppercase text-[10px] tracking-widest mt-2">girone A</p>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left border-separate border-spacing-y-3">
                   <thead>
                     <tr className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">
                       <th className="px-6 py-2">Pos</th>
                       <th className="px-6 py-2">Squadra</th>
                       <th className="px-6 py-2 text-center">PT</th>
                       <th className="px-6 py-2 text-center">G</th>
                       <th className="px-4 py-2 text-center">V</th>
                       <th className="px-4 py-2 text-center">N</th>
                       <th className="px-4 py-2 text-center">P</th>
                       <th className="px-4 py-2 text-center">GF</th>
                       <th className="px-4 py-2 text-center">GS</th>
                       <th className="px-6 py-2 text-center">DR</th>
                       <th className="px-6 py-2 text-center">And</th>
                     </tr>
                   </thead>
                   <tbody>
                     {standings.map((t, idx) => (
                       <React.Fragment key={idx}>
                         <tr 
                           onClick={() => setExpandedTeam(expandedTeam === t.squadra ? null : t.squadra)}
                           className={`group cursor-pointer transition-all ${expandedTeam === t.squadra ? 'bg-slate-800' : t.squadra.includes('VIGEVANO') ? 'bg-blue-600/20 shadow-[inset_0_0_15px_rgba(59,130,246,0.1)]' : 'bg-slate-900/50'} rounded-2xl hover:bg-slate-800`}
                         >
                           <td className="px-6 py-5 rounded-l-2xl font-black text-xl italic text-slate-500 group-hover:text-white">{t.pos}</td>
                           <td className="px-6 py-5 font-black uppercase tracking-tight text-white flex items-center gap-2">
                             {t.squadra}
                             {expandedTeam === t.squadra ? <ChevronDown size={14} className="text-blue-400" /> : <ChevronRight size={14} className="text-slate-600" />}
                           </td>
                           <td className="px-6 py-5 text-center font-black text-blue-400 text-2xl">{t.punti}</td>
                           <td className="px-6 py-5 text-center font-bold text-slate-400">{t.giocate}</td>
                           <td className="px-4 py-5 text-center text-emerald-500 font-bold">{t.vinte}</td>
                           <td className="px-4 py-5 text-center text-slate-500 font-bold">{t.nulle}</td>
                           <td className="px-4 py-5 text-center text-rose-500 font-bold">{t.perse}</td>
                           <td className="px-4 py-5 text-center text-slate-400 font-bold">{t.gf}</td>
                           <td className="px-4 py-5 text-center text-slate-400 font-bold">{t.gs}</td>
                           <td className="px-6 py-5 text-center font-bold text-slate-300">{t.dr > 0 ? `+${t.dr}` : t.dr}</td>
                           <td className="px-6 py-5 rounded-r-2xl">
                             <div className="flex justify-center gap-1">
                               {t.andamento.slice(-5).map((res, i) => (
                                 <div key={i} className={`w-2.5 h-2.5 rounded-full ${res === 'V' ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]' : res === 'N' ? 'bg-slate-500' : 'bg-rose-500'}`}></div>
                               ))}
                             </div>
                           </td>
                         </tr>
                         {expandedTeam === t.squadra && (
                           <tr>
                             <td colSpan={11} className="px-4 py-6 bg-slate-950/40 rounded-b-3xl border-x border-b border-white/5 animate-in slide-in-from-top-2 duration-300">
                               <div className="space-y-3 max-w-4xl mx-auto">
                                 <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-2 px-4">
                                   <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">Archivio Risultati: {t.squadra}</p>
                                   <span className="text-[9px] font-bold text-slate-600 uppercase">Stagione 2025/26</span>
                                 </div>
                                 {matches.filter(m => (m.squadra_casa === t.squadra || m.squadra_ospite === t.squadra) && m.punti_casa !== null).map(m => {
                                   const isCasa = m.squadra_casa === t.squadra;
                                   const win = isCasa ? (m.punti_casa! > m.punti_ospite!) : (m.punti_ospite! > m.punti_casa!);
                                   const loss = isCasa ? (m.punti_casa! < m.punti_ospite!) : (m.punti_ospite! < m.punti_casa!);
                                   const draw = m.punti_casa === m.punti_ospite;
                                   
                                   return (
                                     <div key={m.id} className="flex items-center gap-4 bg-slate-900/80 p-5 rounded-[1.5rem] border border-white/5 hover:border-blue-500/20 transition-all shadow-lg">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${win ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : loss ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-slate-800 text-slate-500'}`}>
                                          {win ? 'V' : loss ? 'P' : 'N'}
                                        </div>
                                        <div className="text-center w-8 shrink-0">
                                          <p className="text-[10px] font-black text-slate-600 uppercase">G{m.giornata}</p>
                                        </div>
                                        <div className="flex-1 flex items-center justify-center gap-6 px-4">
                                           <p className={`text-xs font-black uppercase text-right flex-1 truncate tracking-tight ${isCasa ? 'text-white' : 'text-slate-500'}`}>{m.squadra_casa}</p>
                                           <div className="bg-slate-950 px-5 py-2 rounded-xl font-black text-base border border-white/10 shadow-inner flex items-center gap-3 min-w-[100px] justify-center text-white">
                                              <span className={isCasa && win ? 'text-emerald-400' : isCasa && loss ? 'text-rose-400' : ''}>{m.punti_casa}</span>
                                              <span className="text-slate-700 text-xs">:</span>
                                              <span className={!isCasa && win ? 'text-emerald-400' : !isCasa && loss ? 'text-rose-400' : ''}>{m.punti_ospite}</span>
                                           </div>
                                           <p className={`text-xs font-black uppercase text-left flex-1 truncate tracking-tight ${!isCasa ? 'text-white' : 'text-slate-500'}`}>{m.squadra_ospite}</p>
                                        </div>
                                     </div>
                                   );
                                 })}
                               </div>
                             </td>
                           </tr>
                         )}
                       </React.Fragment>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
          )}

          {activeTab === 'CALENDARIO' && (
            <div className="animate-in fade-in duration-500">
               <div className="flex justify-between items-end mb-12 px-2">
                 <div>
                   <h3 className="text-4xl font-black text-white uppercase italic tracking-tighter leading-none">Calendario</h3>
                   <p className="text-blue-500 font-bold uppercase text-[9px] tracking-widest mt-2">Raggruppato per Giornata</p>
                 </div>
                 {isAdmin && (
                   <button onClick={() => setShowAddMatch(true)} className="bg-blue-600 text-white px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
                     <Plus size={16} /> Nuova Partita
                   </button>
                 )}
               </div>
               <div className="space-y-12">
                 {groupedMatches.map(([giornata, partite]) => (
                   <div key={giornata} className="relative">
                     <div className="flex items-center gap-4 mb-6">
                        <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent to-slate-800"></div>
                        <h4 className="text-lg font-black text-blue-500 uppercase tracking-widest italic">GIORNATA {giornata}</h4>
                        <div className="h-[2px] flex-1 bg-gradient-to-l from-transparent to-slate-800"></div>
                     </div>
                     <div className="grid grid-cols-1 gap-4">
                        {partite.map(m => (
                          <div key={m.id} className="bg-slate-900/60 border border-white/5 rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center justify-between gap-6 group hover:bg-slate-800 transition-all">
                            <div className="text-center md:text-left min-w-[120px]">
                              <p className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                <CalendarDays size={12} /> {new Date(m.data_partita).toLocaleDateString('it-IT')}
                              </p>
                            </div>
                            <div className="flex items-center gap-4 sm:gap-12 flex-1 justify-center">
                               <div className="text-right flex-1 min-w-0">
                                 <p className={`font-black uppercase tracking-tighter text-sm sm:text-lg truncate ${m.squadra_casa.includes('VIGEVANO') ? 'text-blue-400' : 'text-white'}`}>{m.squadra_casa}</p>
                               </div>
                               <div className="bg-slate-950 px-6 py-3 rounded-2xl border border-white/5 font-black text-2xl flex items-center gap-4 shadow-inner">
                                  <span className={m.punti_casa !== null && m.punti_ospite !== null && m.punti_casa > m.punti_ospite ? 'text-emerald-400' : 'text-white'}>{m.punti_casa ?? '-'}</span>
                                  <span className="text-slate-700 text-xs">VS</span>
                                  <span className={m.punti_casa !== null && m.punti_ospite !== null && m.punti_ospite > m.punti_casa ? 'text-emerald-400' : 'text-white'}>{m.punti_ospite ?? '-'}</span>
                               </div>
                               <div className="text-left flex-1 min-w-0">
                                 <p className={`font-black uppercase tracking-tighter text-sm sm:text-lg truncate ${m.squadra_ospite.includes('VIGEVANO') ? 'text-blue-400' : 'text-white'}`}>{m.squadra_ospite}</p>
                               </div>
                            </div>
                            {isAdmin && (
                               <div className="flex gap-2">
                                  <button onClick={() => { setEditingMatch(m); setMatchForm({ casa: m.squadra_casa, ospite: m.squadra_ospite, data: m.data_partita, giornata: m.giornata || 1, pCasa: m.punti_casa?.toString() || '', pOspite: m.punti_ospite?.toString() || '' }); setShowAddMatch(true); }} className="p-3 bg-slate-800 text-slate-400 hover:text-blue-500 rounded-xl transition-all"><Pencil size={14} /></button>
                                  <button onClick={async () => { if(confirm("Eliminare?")) await supabase.from('p_partite').delete().eq('id', m.id); fetchData(); }} className="p-3 bg-slate-800 text-slate-400 hover:text-rose-500 rounded-xl transition-all"><Trash2 size={14} /></button>
                               </div>
                            )}
                          </div>
                        ))}
                     </div>
                   </div>
                 ))}
               </div>
            </div>
          )}

          {activeTab === 'ROSA' && (
            <div className="animate-in slide-in-from-bottom-10 duration-500">
               <div className="flex justify-between items-end mb-12 px-2">
                 <div>
                   <h3 className="text-4xl font-black text-white uppercase italic tracking-tighter leading-none">Elenco Giocatori</h3>
                   <p className="text-blue-500 font-bold uppercase text-[9px] tracking-widest mt-2">Under 14 Maschile</p>
                 </div>
                 {isAdmin && (
                   <button onClick={() => { setEditingPlayer(null); setNewPlayer({ nome: '', cognome: '', numero: '', ruoli: [], dataNascita: '', categoria: 'U14M' }); setShowAddPlayer(true); }} className="bg-blue-600 text-white px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
                     <UserPlus size={16} /> Aggiungi Giocatore
                   </button>
                 )}
               </div>
               <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                 {players.map(p => (
                   <div key={p.id} className="bg-slate-900/50 border border-white/5 rounded-[3rem] p-8 text-center shadow-sm hover:shadow-2xl transition-all group relative overflow-hidden border-b-4 border-b-transparent hover:border-b-blue-600">
                     <div className="absolute top-4 right-6 text-6xl font-black text-blue-500/10 group-hover:text-blue-500/30 transition-colors pointer-events-none italic">
                       {p.numero_di_maglia}
                     </div>
                     {isAdmin && (
                        <div className="absolute top-4 left-6 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                           <button onClick={() => { setEditingPlayer(p); setNewPlayer({ nome: p.nome, cognome: p.cognome, numero: p.numero_di_maglia.toString(), ruoli: p.ruoli.split(', '), dataNascita: p.data_di_nascita || '', categoria: p.categoria }); setShowAddPlayer(true); }} className="p-2 bg-slate-800 text-slate-400 hover:text-blue-500 rounded-xl transition-all"><Pencil size={12} /></button>
                           <button onClick={async () => { if(confirm("Eliminare?")) await supabase.from('p_giocatori').delete().eq('id', p.id); fetchData(); }} className="p-2 bg-slate-800 text-slate-400 hover:text-rose-500 rounded-xl transition-all"><Trash2 size={12} /></button>
                        </div>
                     )}
                     <div className="w-20 h-20 bg-slate-800 rounded-[2rem] mx-auto mb-6 flex items-center justify-center group-hover:bg-blue-600 transition-all shadow-inner rotate-3 group-hover:rotate-0 overflow-hidden">
                        {p.foto_url ? (
                           <img src={p.foto_url} className="w-full h-full object-cover" alt={p.nome} />
                        ) : (
                           <span className="text-3xl font-black text-blue-500 group-hover:text-white italic">{p.numero_di_maglia}</span>
                        )}
                     </div>
                     <h4 className="font-black text-white uppercase tracking-tighter text-sm mb-1 leading-tight">{p.cognome}<br/>{p.nome}</h4>
                     <div className="flex flex-col gap-1 mt-3">
                        <span className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em]">{p.ruoli}</span>
                        <span className="text-[8px] font-bold text-slate-600 uppercase">{p.categoria}</span>
                     </div>
                   </div>
                 ))}
               </div>
            </div>
          )}

          {activeTab === 'STATS' && (
            <div className="animate-in fade-in duration-500">
               <div className="flex justify-between items-end mb-12 px-2">
                 <div>
                   <h3 className="text-4xl font-black text-white uppercase italic tracking-tighter leading-none">Marcatori</h3>
                   <p className="text-blue-500 font-bold uppercase text-[9px] tracking-widest mt-2">Classifica Top Goal</p>
                 </div>
                 {isAdmin && (
                   <button onClick={() => setShowAddStat(true)} className="bg-blue-600 text-white px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
                     <Target size={16} /> Record Goal
                   </button>
                 )}
               </div>
               <div className="max-w-3xl mx-auto space-y-4">
                  {stats.sort((a,b) => b.goal - a.goal).map((s, idx) => (
                    <div key={idx} className="flex items-center gap-6 bg-slate-900/50 p-6 rounded-[2.5rem] border border-white/5 group hover:bg-slate-800/80 transition-all relative overflow-hidden">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl ${idx === 0 ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]' : 'bg-slate-800 text-slate-500'}`}>{idx+1}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-end mb-2">
                          <p className="text-sm font-black uppercase text-white tracking-tight truncate">{s.nome}</p>
                          <div className="text-right">
                            <span className="text-3xl font-black text-blue-400 leading-none">{s.goal}</span>
                            <span className="text-[8px] font-black text-slate-500 uppercase ml-2">Goal</span>
                          </div>
                        </div>
                        <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                           <div className="h-full bg-blue-500 transition-all duration-1000" style={{width: `${(s.goal / (stats[0]?.goal || 1)) * 100}%`}}></div>
                        </div>
                      </div>
                    </div>
                  ))}
               </div>
            </div>
          )}
        </div>
      </div>

      {showAddPlayer && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6 z-[300]">
          <div className="bg-slate-900 border border-white/5 rounded-[3rem] p-10 w-full max-w-md shadow-2xl animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-8">
               <h3 className="font-black text-2xl text-white uppercase tracking-tighter italic">{editingPlayer ? 'Modifica Atleta' : 'Nuovo Atleta'}</h3>
               <button onClick={() => setShowAddPlayer(false)} className="text-slate-500 hover:text-white transition-colors p-2"><X /></button>
            </div>
            <div className="space-y-5">
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase text-slate-500 ml-2">Cognome</label>
                    <input type="text" value={newPlayer.cognome} onChange={e => setNewPlayer({...newPlayer, cognome: e.target.value})} className="w-full p-4 bg-slate-950 border border-white/5 rounded-2xl font-bold text-white outline-none focus:border-blue-500 uppercase text-xs" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase text-slate-500 ml-2">Nome</label>
                    <input type="text" value={newPlayer.nome} onChange={e => setNewPlayer({...newPlayer, nome: e.target.value})} className="w-full p-4 bg-slate-950 border border-white/5 rounded-2xl font-bold text-white outline-none focus:border-blue-500 uppercase text-xs" />
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase text-slate-500 ml-2">N° Maglia</label>
                    <input type="number" value={newPlayer.numero} onChange={e => setNewPlayer({...newPlayer, numero: e.target.value})} className="w-full p-4 bg-slate-950 border border-white/5 rounded-2xl font-black text-center text-xl text-white outline-none focus:border-blue-500" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase text-slate-500 ml-2">Data Nascita</label>
                    <input type="date" value={newPlayer.dataNascita} onChange={e => setNewPlayer({...newPlayer, dataNascita: e.target.value})} className="w-full p-4 bg-slate-950 border border-white/5 rounded-2xl font-bold text-white outline-none focus:border-blue-500 text-xs" />
                  </div>
               </div>
               <div className="pt-4">
                  <button onClick={handleSavePlayer} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all">
                    {editingPlayer ? 'Salva Modifiche' : 'Registra nel Database'}
                  </button>
               </div>
            </div>
          </div>
        </div>
      )}

      {showAddMatch && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6 z-[300]">
          <div className="bg-slate-900 border border-white/5 rounded-[3rem] p-10 w-full max-w-md shadow-2xl animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-8">
               <h3 className="font-black text-2xl text-white uppercase tracking-tighter italic">{editingMatch ? 'Modifica Match' : 'Nuovo Match'}</h3>
               <button onClick={() => setShowAddMatch(false)} className="text-slate-500 hover:text-white transition-colors p-2"><X /></button>
            </div>
            <div className="space-y-5">
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1"><label className="text-[9px] font-black text-slate-500 uppercase ml-2">Casa</label><input type="text" value={matchForm.casa} onChange={e => setMatchForm({...matchForm, casa: e.target.value})} className="w-full p-4 bg-slate-950 border border-white/5 rounded-2xl font-bold text-white text-xs uppercase" /></div>
                 <div className="space-y-1"><label className="text-[9px] font-black text-slate-500 uppercase ml-2">Ospite</label><input type="text" value={matchForm.ospite} onChange={e => setMatchForm({...matchForm, ospite: e.target.value})} className="w-full p-4 bg-slate-950 border border-white/5 rounded-2xl font-bold text-white text-xs uppercase" /></div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1"><label className="text-[9px] font-black text-slate-500 uppercase ml-2">Punti Casa</label><input type="number" value={matchForm.pCasa} onChange={e => setMatchForm({...matchForm, pCasa: e.target.value})} className="w-full p-4 bg-slate-950 border border-white/5 rounded-2xl font-black text-center text-xl text-white" /></div>
                 <div className="space-y-1"><label className="text-[9px] font-black text-slate-500 uppercase ml-2">Punti Ospite</label><input type="number" value={matchForm.pOspite} onChange={e => setMatchForm({...matchForm, pOspite: e.target.value})} className="w-full p-4 bg-slate-950 border border-white/5 rounded-2xl font-black text-center text-xl text-white" /></div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1"><label className="text-[9px] font-black text-slate-500 uppercase ml-2">Data</label><input type="date" value={matchForm.data} onChange={e => setMatchForm({...matchForm, data: e.target.value})} className="w-full p-4 bg-slate-950 border border-white/5 rounded-2xl font-bold text-white text-xs" /></div>
                 <div className="space-y-1"><label className="text-[9px] font-black text-slate-500 uppercase ml-2">Giornata</label><input type="number" value={matchForm.giornata} onChange={e => setMatchForm({...matchForm, giornata: parseInt(e.target.value)})} className="w-full p-4 bg-slate-950 border border-white/5 rounded-2xl font-black text-center text-xl text-white" /></div>
               </div>
               <button onClick={handleSaveMatch} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl mt-4 active:scale-95 transition-all">Salva Risultato</button>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex flex-col items-center justify-center z-[1000]">
          <RefreshCw className="text-blue-500 animate-spin mb-4" size={50} />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] animate-pulse">Sincronizzazione Dati...</p>
        </div>
      )}
    </div>
  );
};

export default Pallamano;
