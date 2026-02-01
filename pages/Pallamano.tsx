
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { HandballMatch, UserProfile, HandballStanding, HandballPlayer, PlayerStats } from '../types';
import { 
  Trophy, Calendar, Plus, X, Trash2, RefreshCw, ListOrdered, Users, 
  UserPlus, Pencil, Zap, ChevronDown, Check,
  ChevronRight, CalendarDays, Save, TrendingUp, ShieldAlert, Percent, Activity
} from 'lucide-react';

interface Props {
  profile?: UserProfile | null;
}

type TabType = 'CLASSIFICA' | 'CALENDARIO' | 'ROSA' | 'STATS';

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
  const [editingStat, setEditingStat] = useState<PlayerStats | null>(null);

  const [matchForm, setMatchForm] = useState({ 
    casa: '', ospite: '', data: new Date().toISOString().split('T')[0], giornata: 1, pCasa: '', pOspite: '' 
  });
  
  const [newPlayer, setNewPlayer] = useState({ 
    nome: '', cognome: '', numero: '', ruoli: [] as string[], dataNascita: '', categoria: 'U14M'
  });
  
  const initialStatState: Partial<PlayerStats> = {
    player_id: '', presenze: 0, ammonizioni: 0, esclusioni_2m: 0, rosse: 0, blu: 0,
    goal: 0, tiri_totali: 0, rigori_segnati: 0, rigori_totali: 0,
    parate: 0, tiri_subiti: 0, assist: 0
  };

  const [statForm, setStatForm] = useState<Partial<PlayerStats>>(initialStatState);

  const isAdmin = profile?.role === 'ADMIN';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: mData } = await supabase.from('p_partite').select('*').order('data_partita', { ascending: true });
      setMatches(mData || []);

      const { data: pData } = await supabase.from('p_giocatori').select('*').order('numero_di_maglia', { ascending: true });
      setPlayers(pData || []);

      const { data: sData } = await supabase.from('p_statistiche').select('*, p_giocatori(*)');
      setStats(sData || []);
    } catch (e: any) {
      console.error("Errore fetch:", e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const loadPlayerInForm = (playerId: string) => {
    const existing = stats.find(s => s.player_id === playerId);
    if (existing) {
      setEditingStat(existing);
      setStatForm(existing);
    } else {
      setEditingStat(null);
      setStatForm({ ...initialStatState, player_id: playerId });
    }
  };

  const handleSaveStat = async () => {
    if (!statForm.player_id) return;
    setLoading(true);
    try {
      const { p_giocatori, ...payload } = statForm as any;
      const { error } = await supabase.from('p_statistiche').upsert({
        ...payload,
        id: editingStat?.id 
      }, { onConflict: 'player_id' });
      
      if (error) throw error;
      setShowAddStat(false);
      setEditingStat(null);
      await fetchData();
    } catch (e: any) { 
      alert("Errore salvataggio: " + e.message); 
    } finally { 
      setLoading(false); 
    }
  };

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
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20 overflow-x-hidden">
      <div className="bg-slate-900 pt-20 pb-28 px-6 text-center relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-900 to-slate-950"></div>
        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-400 px-4 py-1.5 rounded-full border border-blue-500/20 text-[10px] font-black uppercase tracking-[0.2em] mb-6">
            <Zap size={12} className="animate-pulse" /> Live Sport Engine
          </div>
          <h1 className="text-5xl md:text-8xl font-black uppercase tracking-tighter italic mb-4 leading-none text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-500">
            PALLAMANO <span className="text-blue-500">VIGEVANO</span>
          </h1>
          <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] sm:text-xs">Under 14 Maschile • Stagione 2025/26</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-2 sm:px-4 -mt-16 relative z-20">
        <div className="bg-slate-900/80 backdrop-blur-xl rounded-[2rem] shadow-2xl flex overflow-hidden border border-white/5 mb-8 p-1">
          <TabLink id="CLASSIFICA" label="Classifica" icon={ListOrdered} />
          <TabLink id="CALENDARIO" label="Calendario" icon={Calendar} />
          <TabLink id="ROSA" label="Giocatori" icon={Users} />
          <TabLink id="STATS" label="Statistiche" icon={TrendingUp} />
        </div>

        <div className="bg-slate-900/40 backdrop-blur-sm rounded-[3rem] shadow-xl p-2 sm:p-10 border border-white/5 min-h-[600px]">
          {activeTab === 'CLASSIFICA' && (
            <div className="animate-in fade-in duration-500">
               <div className="mb-10 text-center">
                 <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter leading-none">CLASSIFICA</h3>
                 <p className="text-blue-500 font-bold uppercase text-[10px] tracking-widest mt-2">Girone Unico</p>
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
                           className={`transition-all cursor-pointer group ${expandedTeam === t.squadra ? 'bg-slate-800' : t.squadra.includes('VIGEVANO') ? 'bg-blue-600/20 shadow-[inset_0_0_15px_rgba(59,130,246,0.1)]' : 'bg-slate-900/50'} rounded-2xl hover:bg-slate-800`}
                         >
                           <td className="px-6 py-5 rounded-l-2xl font-black text-xl italic text-slate-500">{t.pos}</td>
                           <td className="px-6 py-5 font-black uppercase tracking-tight text-white flex items-center gap-3">
                             {t.squadra}
                             {expandedTeam === t.squadra ? <ChevronDown size={14} className="text-blue-400" /> : <ChevronRight size={14} className="text-slate-600 group-hover:text-blue-500" />}
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
                                 <div key={i} className={`w-2.5 h-2.5 rounded-full ${res === 'V' ? 'bg-emerald-500' : res === 'N' ? 'bg-slate-500' : 'bg-rose-500'}`}></div>
                               ))}
                             </div>
                           </td>
                         </tr>
                         
                         {/* Dettaglio Risultati Squadra Espansa */}
                         {expandedTeam === t.squadra && (
                           <tr className="bg-transparent">
                             <td colSpan={11} className="px-4 py-2">
                               <div className="bg-slate-900/80 backdrop-blur-md rounded-[2rem] border border-blue-500/20 p-6 animate-in slide-in-from-top-4 duration-300">
                                 <div className="flex items-center gap-3 mb-6">
                                   <Activity size={18} className="text-blue-500" />
                                   <h4 className="font-black text-white uppercase italic tracking-widest text-sm">Risultati: {t.squadra}</h4>
                                 </div>
                                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                   {matches.filter(m => m.squadra_casa === t.squadra || m.squadra_ospite === t.squadra).map(m => {
                                     const isCasa = m.squadra_casa === t.squadra;
                                     const puntiNoi = isCasa ? m.punti_casa : m.punti_ospite;
                                     const puntiLoro = isCasa ? m.punti_ospite : m.punti_casa;
                                     const status = puntiNoi === null || puntiLoro === null ? 'F' : puntiNoi > puntiLoro ? 'V' : puntiNoi < puntiLoro ? 'P' : 'N';
                                     
                                     return (
                                       <div key={m.id} className="flex items-center justify-between bg-slate-950/50 p-4 rounded-2xl border border-white/5 group hover:border-blue-500/30 transition-all">
                                          <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase">{new Date(m.data_partita).toLocaleDateString('it-IT')}</span>
                                            <div className="flex items-center gap-2 mt-1">
                                               <span className={`text-xs font-black uppercase tracking-tight ${isCasa ? 'text-blue-400' : 'text-white/60'}`}>{m.squadra_casa}</span>
                                               <span className="text-[10px] text-slate-700">vs</span>
                                               <span className={`text-xs font-black uppercase tracking-tight ${!isCasa ? 'text-blue-400' : 'text-white/60'}`}>{m.squadra_ospite}</span>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-4">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${
                                              status === 'V' ? 'bg-emerald-500/20 text-emerald-500' : 
                                              status === 'P' ? 'bg-rose-500/20 text-rose-500' : 
                                              status === 'N' ? 'bg-slate-500/20 text-slate-500' : 'bg-slate-800 text-slate-600'
                                            }`}>
                                              {status}
                                            </div>
                                            <div className="font-black text-lg text-white tabular-nums">
                                              {m.punti_casa ?? '-'}:{m.punti_ospite ?? '-'}
                                            </div>
                                          </div>
                                       </div>
                                     );
                                   })}
                                 </div>
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
                   <p className="text-blue-500 font-bold uppercase text-[9px] tracking-widest mt-2 italic">Stagione 2025/26</p>
                 </div>
                 {isAdmin && (
                   <button onClick={() => setShowAddMatch(true)} className="bg-blue-600 text-white px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
                     <Plus size={16} /> Nuova Partita
                   </button>
                 )}
               </div>
               <div className="space-y-12">
                 {groupedMatches.map(([giornata, partite]) => (
                   <div key={giornata}>
                     <div className="flex items-center gap-4 mb-6">
                        <h4 className="text-lg font-black text-blue-500 uppercase tracking-widest italic">GIORNATA {giornata}</h4>
                        <div className="h-[2px] flex-1 bg-gradient-to-r from-slate-800 to-transparent"></div>
                     </div>
                     <div className="grid grid-cols-1 gap-4">
                        {partite.map(m => (
                          <div key={m.id} className="bg-slate-900/60 border border-white/5 rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center justify-between gap-6 group hover:bg-slate-800 transition-all">
                            <div className="text-center md:text-left min-w-[120px]">
                              <p className="text-xs font-bold text-slate-500 uppercase">{new Date(m.data_partita).toLocaleDateString('it-IT')}</p>
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
                   <h3 className="text-4xl font-black text-white uppercase italic tracking-tighter leading-none">Giocatori</h3>
                   <p className="text-blue-500 font-bold uppercase text-[9px] tracking-widest mt-2">Under 14 Maschile</p>
                 </div>
                 {isAdmin && (
                   <button onClick={() => { setEditingPlayer(null); setNewPlayer({ nome: '', cognome: '', numero: '', ruoli: [], dataNascita: '', categoria: 'U14M' }); setShowAddPlayer(true); }} className="bg-blue-600 text-white px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
                     <UserPlus size={16} /> Aggiungi Atleta
                   </button>
                 )}
               </div>
               <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                 {players.map(p => (
                   <div key={p.id} className="bg-slate-900/50 border border-white/5 rounded-[3rem] p-8 text-center shadow-sm hover:shadow-2xl transition-all group relative overflow-hidden border-b-4 border-b-transparent hover:border-b-blue-600">
                     <div className="absolute top-4 right-6 text-6xl font-black text-blue-500/10 group-hover:text-blue-500/30 transition-colors pointer-events-none italic">{p.numero_di_maglia}</div>
                     {isAdmin && (
                        <div className="absolute top-4 left-6 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                           <button onClick={() => { setEditingPlayer(p); setNewPlayer({ nome: p.nome, cognome: p.cognome, numero: p.numero_di_maglia.toString(), ruoli: p.ruoli.split(', '), dataNascita: p.data_di_nascita || '', categoria: p.categoria }); setShowAddPlayer(true); }} className="p-2 bg-slate-800 text-slate-400 hover:text-blue-500 rounded-xl transition-all"><Pencil size={12} /></button>
                           <button onClick={async () => { if(confirm("Eliminare?")) await supabase.from('p_giocatori').delete().eq('id', p.id); fetchData(); }} className="p-2 bg-slate-800 text-slate-400 hover:text-rose-500 rounded-xl transition-all"><Trash2 size={12} /></button>
                        </div>
                     )}
                     <div className="w-20 h-20 bg-slate-800 rounded-[2rem] mx-auto mb-6 flex items-center justify-center group-hover:bg-blue-600 transition-all shadow-inner overflow-hidden">
                        {p.foto_url ? (
                           <img src={p.foto_url} className="w-full h-full object-cover" alt={p.nome} />
                        ) : (
                           <span className="text-3xl font-black text-blue-500 group-hover:text-white italic">{p.numero_di_maglia}</span>
                        )}
                     </div>
                     <h4 className="font-black text-white uppercase tracking-tighter text-sm mb-1 leading-tight">{p.cognome}<br/>{p.nome}</h4>
                     <div className="flex flex-col gap-1 mt-3">
                        <span className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em]">{p.ruoli}</span>
                     </div>
                   </div>
                 ))}
               </div>
            </div>
          )}

          {activeTab === 'STATS' && (
            <div className="animate-in fade-in duration-500">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 px-2 gap-6">
                 <div>
                   <h3 className="text-3xl sm:text-4xl font-black text-white uppercase italic tracking-tighter leading-none">STATISTICHE STAGIONE <span className="text-blue-500">2025/2026</span></h3>
                   <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-2 italic">Under 14 maschile</p>
                 </div>
                 {isAdmin && (
                   <button onClick={() => { setEditingStat(null); setStatForm(initialStatState); setShowAddStat(true); }} className="bg-blue-600 text-white px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
                     <TrendingUp size={16} /> Aggiorna Dati
                   </button>
                 )}
               </div>
               
               <div className="overflow-x-auto pb-4">
                 <table className="w-full text-center border-separate border-spacing-y-2 min-w-[1000px]">
                   <thead className="sticky top-0 z-30">
                     <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-900/80 backdrop-blur-md">
                       <th className="px-4 py-4 text-left rounded-l-2xl">Giocatore</th>
                       <th className="px-2 py-4">PRES</th>
                       <th className="px-2 py-4 text-yellow-500">A</th>
                       <th className="px-2 py-4 text-rose-500">R</th>
                       <th className="px-2 py-2 text-blue-500">B</th>
                       <th className="px-2 py-4">2'</th>
                       <th className="px-4 py-4 bg-slate-800/50 text-white italic">G</th>
                       <th className="px-4 py-4">7m</th>
                       <th className="px-4 py-4 text-blue-400">% ATT</th>
                       <th className="px-4 py-4 bg-slate-800/50 text-white italic">PAR</th>
                       <th className="px-4 py-4 text-blue-400">% PAR</th>
                       <th className="px-4 py-4 rounded-r-2xl">ASSIST</th>
                     </tr>
                   </thead>
                   <tbody>
                     {players.map((p) => {
                       const s = stats.find(st => st.player_id === p.id);
                       const isGoalie = p.ruoli.toUpperCase().includes('PORTIERE');
                       const attEff = s && s.tiri_totali > 0 ? Math.round((s.goal / s.tiri_totali) * 100) : 0;
                       const parEff = s && s.tiri_subiti > 0 ? Math.round((s.parate / s.tiri_subiti) * 100) : 0;
                       
                       return (
                         <tr key={p.id} className={`transition-all rounded-2xl group ${isGoalie ? 'bg-blue-600/10' : 'bg-slate-900/50 hover:bg-slate-800'}`}>
                           <td className="px-4 py-5 text-left rounded-l-2xl font-black text-white uppercase tracking-tight text-xs flex items-center gap-3">
                              <span className="text-slate-500 italic w-4">{p.numero_di_maglia}</span>
                              <span className="truncate">{p.cognome} {p.nome}</span>
                           </td>
                           <td className="px-2 py-5 font-bold text-slate-400">{s?.presenze || 0}</td>
                           <td className="px-2 py-5">
                             {(s?.ammonizioni || 0) > 0 && <div className="w-4 h-6 bg-yellow-500 rounded-sm mx-auto shadow-lg shadow-yellow-500/20"></div>}
                           </td>
                           <td className="px-2 py-5">
                             {(s?.rosse || 0) > 0 && <div className="w-4 h-6 bg-rose-600 rounded-sm mx-auto shadow-lg shadow-rose-600/20"></div>}
                           </td>
                           <td className="px-2 py-5">
                             {(s?.blu || 0) > 0 && <div className="w-4 h-6 bg-blue-600 rounded-sm mx-auto shadow-lg shadow-blue-600/20"></div>}
                           </td>
                           <td className="px-2 py-5 font-black text-white">{s?.esclusioni_2m || 0}</td>
                           <td className="px-4 py-5 bg-slate-800/30 font-black text-white text-sm italic">
                             {s ? `${s.goal} (${s.tiri_totali})` : '-'}
                           </td>
                           <td className="px-4 py-5 font-bold text-slate-400">
                             {s ? `${s.rigori_segnati} (${s.rigori_totali})` : '-'}
                           </td>
                           <td className={`px-4 py-5 font-black text-[11px] ${attEff >= 60 ? 'text-emerald-500' : attEff >= 40 ? 'text-yellow-500' : 'text-slate-500'}`}>
                             {attEff > 0 ? `${attEff}%` : '--'}
                           </td>
                           <td className="px-4 py-5 bg-slate-800/30 font-black text-white text-sm italic">
                             {s && isGoalie ? `${s.parate} (${s.tiri_subiti})` : '-'}
                           </td>
                           <td className="px-4 py-5 font-black text-[11px] text-blue-400">
                             {parEff > 0 ? `${parEff}%` : '--'}
                           </td>
                           <td className="px-4 py-5 rounded-r-2xl font-black text-emerald-500 text-sm">
                              <div className="flex items-center justify-center gap-2">
                                 {s?.assist || 0}
                                 {isAdmin && (
                                   <button 
                                     onClick={() => { loadPlayerInForm(p.id); setShowAddStat(true); }} 
                                     className="opacity-0 group-hover:opacity-100 p-1.5 bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-all"
                                   >
                                     <Pencil size={10} />
                                   </button>
                                 )}
                              </div>
                           </td>
                         </tr>
                       );
                     })}
                   </tbody>
                 </table>
               </div>
            </div>
          )}
        </div>
      </div>

      {/* Modale Statistiche */}
      {showAddStat && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 z-[300] overflow-y-auto">
          <div className="bg-slate-900 border border-white/5 rounded-[3rem] p-6 sm:p-8 w-full max-w-2xl shadow-2xl animate-in zoom-in duration-200 my-auto">
            <div className="flex justify-between items-center mb-8">
               <div className="flex items-center gap-3">
                 <div className="p-3 bg-blue-600/20 text-blue-400 rounded-2xl"><TrendingUp size={24} /></div>
                 <h3 className="font-black text-xl sm:text-2xl text-white uppercase tracking-tighter italic">Dati Atleta</h3>
               </div>
               <button onClick={() => setShowAddStat(false)} className="text-slate-500 hover:text-white transition-colors p-2"><X /></button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-500 ml-2">Giocatore</label>
                  <select 
                    value={statForm.player_id} 
                    onChange={e => loadPlayerInForm(e.target.value)}
                    className="w-full p-4 bg-slate-950 border border-white/5 rounded-2xl font-bold text-white outline-none focus:border-blue-500 uppercase text-xs"
                  >
                    <option value="">-- Seleziona Atleta --</option>
                    {players.map(p => <option key={p.id} value={p.id}>{p.numero_di_maglia} - {p.cognome} {p.nome}</option>)}
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><label className="text-[9px] font-black text-slate-500 uppercase ml-2">Presenze</label><input type="number" value={statForm.presenze ?? 0} onChange={e => setStatForm({...statForm, presenze: parseInt(e.target.value)})} className="w-full p-3 bg-slate-950 border border-white/5 rounded-xl font-bold text-center text-white" /></div>
                  <div className="space-y-1"><label className="text-[9px] font-black text-slate-500 uppercase ml-2">Assist</label><input type="number" value={statForm.assist ?? 0} onChange={e => setStatForm({...statForm, assist: parseInt(e.target.value)})} className="w-full p-3 bg-slate-950 border border-white/5 rounded-xl font-bold text-center text-white" /></div>
                </div>

                <div className="p-5 bg-slate-950/50 rounded-3xl border border-white/5 space-y-4">
                  <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest text-center">Attacco (GOL)</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><label className="text-[9px] font-black text-slate-500 uppercase ml-1">Goal</label><input type="number" value={statForm.goal ?? 0} onChange={e => setStatForm({...statForm, goal: parseInt(e.target.value)})} className="w-full p-3 bg-slate-800 border border-white/5 rounded-xl font-bold text-center text-white" /></div>
                    <div className="space-y-1"><label className="text-[9px] font-black text-slate-500 uppercase ml-1">Tiri Tot.</label><input type="number" value={statForm.tiri_totali ?? 0} onChange={e => setStatForm({...statForm, tiri_totali: parseInt(e.target.value)})} className="w-full p-3 bg-slate-800 border border-white/5 rounded-xl font-bold text-center text-white" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><label className="text-[9px] font-black text-slate-500 uppercase ml-1">Rigori Segn.</label><input type="number" value={statForm.rigori_segnati ?? 0} onChange={e => setStatForm({...statForm, rigori_segnati: parseInt(e.target.value)})} className="w-full p-3 bg-slate-800 border border-white/5 rounded-xl font-bold text-center text-white" /></div>
                    <div className="space-y-1"><label className="text-[9px] font-black text-slate-500 uppercase ml-1">Rigori Tot.</label><input type="number" value={statForm.rigori_totali ?? 0} onChange={e => setStatForm({...statForm, rigori_totali: parseInt(e.target.value)})} className="w-full p-3 bg-slate-800 border border-white/5 rounded-xl font-bold text-center text-white" /></div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="p-5 bg-slate-950/50 rounded-3xl border border-white/5 space-y-4">
                  <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest text-center">Difesa / Portiere</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><label className="text-[9px] font-black text-slate-500 uppercase ml-1">Parate</label><input type="number" value={statForm.parate ?? 0} onChange={e => setStatForm({...statForm, parate: parseInt(e.target.value)})} className="w-full p-3 bg-slate-800 border border-white/5 rounded-xl font-bold text-center text-white" /></div>
                    <div className="space-y-1"><label className="text-[9px] font-black text-slate-500 uppercase ml-1">Tiri Subiti</label><input type="number" value={statForm.tiri_subiti ?? 0} onChange={e => setStatForm({...statForm, tiri_subiti: parseInt(e.target.value)})} className="w-full p-3 bg-slate-800 border border-white/5 rounded-xl font-bold text-center text-white" /></div>
                  </div>
                </div>

                <div className="p-5 bg-slate-950/50 rounded-3xl border border-white/5 space-y-4">
                  <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest text-center">Disciplina</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><label className="text-[9px] font-black text-slate-500 uppercase ml-1">Gialli</label><input type="number" value={statForm.ammonizioni ?? 0} onChange={e => setStatForm({...statForm, ammonizioni: parseInt(e.target.value)})} className="w-full p-3 bg-slate-800 border border-white/5 rounded-xl font-bold text-center text-white" /></div>
                    <div className="space-y-1"><label className="text-[9px] font-black text-slate-500 uppercase ml-1">2 Minuti</label><input type="number" value={statForm.esclusioni_2m ?? 0} onChange={e => setStatForm({...statForm, esclusioni_2m: parseInt(e.target.value)})} className="w-full p-3 bg-slate-800 border border-white/5 rounded-xl font-bold text-center text-white" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><label className="text-[9px] font-black text-slate-500 uppercase ml-1">Rossi</label><input type="number" value={statForm.rosse ?? 0} onChange={e => setStatForm({...statForm, rosse: parseInt(e.target.value)})} className="w-full p-3 bg-slate-800 border border-white/5 rounded-xl font-bold text-center text-white" /></div>
                    <div className="space-y-1"><label className="text-[9px] font-black text-slate-500 uppercase ml-1">Blu</label><input type="number" value={statForm.blu ?? 0} onChange={e => setStatForm({...statForm, blu: parseInt(e.target.value)})} className="w-full p-3 bg-slate-800 border border-white/5 rounded-xl font-bold text-center text-white" /></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 sm:mt-10 flex gap-4">
               <button onClick={() => setShowAddStat(false)} className="flex-1 py-5 bg-slate-800 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:text-white transition-all">Annulla</button>
               <button onClick={handleSaveStat} className="flex-[2] py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-3">
                 <Save size={18} /> Registra
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale Partite */}
      {showAddMatch && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6 z-[300]">
          <div className="bg-slate-900 border border-white/5 rounded-[3rem] p-10 w-full max-w-md shadow-2xl animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-8">
               <h3 className="font-black text-2xl text-white uppercase tracking-tighter italic">{editingMatch ? 'Modifica Risultato' : 'Nuovo Match'}</h3>
               <button onClick={() => setShowAddMatch(false)} className="text-slate-500 hover:text-white transition-colors p-2"><X /></button>
            </div>
            <div className="space-y-5">
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1"><label className="text-[9px] font-black text-slate-500 uppercase ml-2">Casa</label><input type="text" value={matchForm.casa} onChange={e => setMatchForm({...matchForm, casa: e.target.value})} className="w-full p-4 bg-slate-950 border border-white/5 rounded-2xl font-bold text-white text-xs uppercase outline-none focus:border-blue-500" /></div>
                 <div className="space-y-1"><label className="text-[9px] font-black text-slate-500 uppercase ml-2">Ospite</label><input type="text" value={matchForm.ospite} onChange={e => setMatchForm({...matchForm, ospite: e.target.value})} className="w-full p-4 bg-slate-950 border border-white/5 rounded-2xl font-bold text-white text-xs uppercase outline-none focus:border-blue-500" /></div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1"><label className="text-[9px] font-black text-slate-500 uppercase ml-2">G Casa</label><input type="number" value={matchForm.pCasa} onChange={e => setMatchForm({...matchForm, pCasa: e.target.value})} className="w-full p-4 bg-slate-950 border border-white/5 rounded-2xl font-black text-center text-xl text-white outline-none focus:border-blue-500" /></div>
                 <div className="space-y-1"><label className="text-[9px] font-black text-slate-500 uppercase ml-2">G Ospite</label><input type="number" value={matchForm.pOspite} onChange={e => setMatchForm({...matchForm, pOspite: e.target.value})} className="w-full p-4 bg-slate-950 border border-white/5 rounded-2xl font-black text-center text-xl text-white outline-none focus:border-blue-500" /></div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1"><label className="text-[9px] font-black text-slate-500 uppercase ml-2">Data</label><input type="date" value={matchForm.data} onChange={e => setMatchForm({...matchForm, data: e.target.value})} className="w-full p-4 bg-slate-950 border border-white/5 rounded-2xl font-bold text-white text-xs outline-none focus:border-blue-500" /></div>
                 <div className="space-y-1"><label className="text-[9px] font-black text-slate-500 uppercase ml-2">Giornata</label><input type="number" value={matchForm.giornata} onChange={e => setMatchForm({...matchForm, giornata: parseInt(e.target.value)})} className="w-full p-4 bg-slate-950 border border-white/5 rounded-2xl font-black text-center text-xl text-white outline-none focus:border-blue-500" /></div>
               </div>
               <button onClick={handleSaveMatch} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl mt-4 active:scale-95 transition-all">Registra Partita</button>
            </div>
          </div>
        </div>
      )}

      {/* Modale Giocatori */}
      {showAddPlayer && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6 z-[300]">
          <div className="bg-slate-900 border border-white/5 rounded-[3rem] p-10 w-full max-w-md shadow-2xl animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-8">
               <h3 className="font-black text-2xl text-white uppercase tracking-tighter italic">{editingPlayer ? 'Modifica' : 'Nuovo Atleta'}</h3>
               <button onClick={() => setShowAddPlayer(false)} className="text-slate-500 hover:text-white transition-colors p-2"><X /></button>
            </div>
            <div className="space-y-5">
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-500 ml-2">Cognome</label>
                    <input type="text" value={newPlayer.cognome} onChange={e => setNewPlayer({...newPlayer, cognome: e.target.value})} className="w-full p-4 bg-slate-950 border border-white/5 rounded-2xl font-bold text-white outline-none focus:border-blue-500 uppercase text-xs" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-500 ml-2">Nome</label>
                    <input type="text" value={newPlayer.nome} onChange={e => setNewPlayer({...newPlayer, nome: e.target.value})} className="w-full p-4 bg-slate-950 border border-white/5 rounded-2xl font-bold text-white outline-none focus:border-blue-500 uppercase text-xs" />
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-500 ml-2">N° Maglia</label>
                    <input type="number" value={newPlayer.numero} onChange={e => setNewPlayer({...newPlayer, numero: e.target.value})} className="w-full p-4 bg-slate-950 border border-white/5 rounded-2xl font-black text-center text-xl text-white outline-none focus:border-blue-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-500 ml-2">Ruoli</label>
                    <input type="text" value={newPlayer.ruoli.join(', ')} onChange={e => setNewPlayer({...newPlayer, ruoli: e.target.value.split(', ')})} placeholder="Es: Portiere, Terzino" className="w-full p-4 bg-slate-950 border border-white/5 rounded-2xl font-bold text-white outline-none focus:border-blue-500 text-xs" />
                  </div>
               </div>
               <button onClick={handleSavePlayer} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl mt-4 active:scale-95 transition-all">Salva Atleta</button>
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
