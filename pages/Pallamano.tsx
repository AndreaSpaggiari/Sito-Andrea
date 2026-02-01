
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { HandballMatch, UserProfile, HandballStanding, HandballPlayer, PlayerStats } from '../types';
import { 
  Trophy, Calendar, Plus, X, Trash2, RefreshCw, ListOrdered, Users, 
  BarChart3, UserPlus, Save, Camera, Pencil, AlertTriangle, Clock, ChevronDown, 
  Target, Shield, Zap, ChevronRight, Activity
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
  
  // Stato per la riga espansa in classifica
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

  const [showAddMatch, setShowAddMatch] = useState(false);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [showAddStat, setShowAddStat] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [editingMatch, setEditingMatch] = useState<HandballMatch | null>(null);

  const [matchForm, setMatchForm] = useState({ 
    casa: '', ospite: '', data: new Date().toISOString().split('T')[0], giornata: 1, pCasa: '', pOspite: '' 
  });
  const [newPlayer, setNewPlayer] = useState({ nome: '', numero: '', ruolo: 'Centrale' });
  const [statForm, setStatForm] = useState({ giocatoreId: '', goal: 1 });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAdmin = profile?.role === 'ADMIN';

  const knownTeams = useMemo(() => {
    const teams = new Set<string>();
    matches.forEach(m => {
      if (m.squadra_casa) teams.add(m.squadra_casa);
      if (m.squadra_ospite) teams.add(m.squadra_ospite);
    });
    return Array.from(teams).sort();
  }, [matches]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: mData, error: mError } = await supabase.from('p_partite').select('*').order('data_partita', { ascending: true });
      if (mError) throw mError;
      if (mData) setMatches(mData);

      const { data: pData, error: pError } = await supabase.from('p_giocatori').select('*').order('numero', { ascending: true });
      if (pError) throw pError;
      if (pData) setPlayers(pData);

      const storedStats = localStorage.getItem('h_stats_v3');
      if (storedStats) setStats(JSON.parse(storedStats));
    } catch (e: any) {
      console.error("Errore fetch:", e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleOpenAdd = () => {
    setEditingMatch(null);
    setMatchForm({ casa: '', ospite: '', data: new Date().toISOString().split('T')[0], giornata: 1, pCasa: '', pOspite: '' });
    setShowAddMatch(true);
  };

  const handleOpenEdit = (m: HandballMatch) => {
    setEditingMatch(m);
    setMatchForm({
      casa: m.squadra_casa,
      ospite: m.squadra_ospite,
      data: m.data_partita,
      giornata: m.giornata || 1,
      pCasa: m.punti_casa !== null ? m.punti_casa.toString() : '',
      pOspite: m.punti_ospite !== null ? m.punti_ospite.toString() : ''
    });
    setShowAddMatch(true);
  };

  const handleSaveMatch = async () => {
    if (!matchForm.casa || !matchForm.ospite) return;
    setLoading(true);
    const payload = {
      squadra_casa: matchForm.casa.trim(),
      squadra_ospite: matchForm.ospite.trim(),
      data_partita: matchForm.data,
      giornata: matchForm.giornata,
      punti_casa: matchForm.pCasa === '' ? null : parseInt(matchForm.pCasa),
      punti_ospite: matchForm.pOspite === '' ? null : parseInt(matchForm.pOspite),
      campionato: 'U14 AREA 2'
    };
    let error;
    if (editingMatch) {
      const { error: updateError } = await supabase.from('p_partite').update(payload).eq('id', editingMatch.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('p_partite').insert(payload);
      error = insertError;
    }
    if (!error) { setShowAddMatch(false); fetchData(); } else { alert("ERRORE: " + error.message); }
    setLoading(false);
  };

  const handleDeleteMatch = async (id: string) => {
    if(!confirm("ELIMINARE DEFINITIVAMENTE QUESTA PARTITA?")) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('p_partite').delete().eq('id', id);
      if (error) throw error;
      await fetchData();
    } catch (e: any) { alert("ERRORE: " + e.message); } finally { setLoading(false); }
  };

  const handleSavePlayer = async () => {
    if (!newPlayer.nome || !newPlayer.numero) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('p_giocatori').insert({
        nome: newPlayer.nome.trim(),
        numero: parseInt(newPlayer.numero as string),
        ruolo: newPlayer.ruolo
      });
      if (error) throw error;
      setShowAddPlayer(false);
      setNewPlayer({ nome: '', numero: '', ruolo: 'Centrale' });
      await fetchData();
    } catch (e: any) { alert("ERRORE: " + e.message); } finally { setLoading(false); }
  };

  const handleSaveStat = () => {
    if (!statForm.giocatoreId) return;
    const player = players.find(p => p.id === statForm.giocatoreId);
    if (!player) return;
    const newStats = [...stats];
    const existingIdx = newStats.findIndex(s => s.nome === player.nome);
    if (existingIdx >= 0) { newStats[existingIdx].goal += Number(statForm.goal); } 
    else { newStats.push({ nome: player.nome, goal: Number(statForm.goal), partite: 0, ammonizioni: 0, esclusioni: 0 }); }
    setStats(newStats);
    localStorage.setItem('h_stats_v3', JSON.stringify(newStats));
    setShowAddStat(false);
    setStatForm({ giocatoreId: '', goal: 1 });
  };

  const handleScreenshotSync = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isAdmin) return;
    setSyncing(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = (error) => reject(error);
      });
      const res = await fetch('/api/handball-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 })
      });
      if (!res.ok) throw new Error("Errore API");
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        await supabase.from('p_partite').insert(data.map(m => ({ ...m, campionato: 'U14 AREA 2' })));
        await fetchData();
      }
    } catch (err: any) { alert("Sincronizzazione fallita."); } finally { setSyncing(false); }
  };

  const standings = useMemo(() => {
    const teams: Record<string, HandballStanding> = {};
    const initTeam = (name: string) => {
      if (!teams[name]) {
        teams[name] = { pos: 0, squadra: name, punti: 0, giocate: 0, vinte: 0, nulle: 0, perse: 0, gf: 0, gs: 0, dr: 0, andamento: [] };
      }
    };
    matches.forEach(m => {
      if (m.punti_casa === null || m.punti_ospite === null) return;
      initTeam(m.squadra_casa);
      initTeam(m.squadra_ospite);
      const casa = teams[m.squadra_casa];
      const ospite = teams[m.squadra_ospite];
      casa.giocate++; ospite.giocate++;
      casa.gf += m.punti_casa; casa.gs += m.punti_ospite;
      ospite.gf += m.punti_ospite; ospite.gs += m.punti_casa;
      if (m.punti_casa > m.punti_ospite) {
        casa.punti += 2; casa.vinte++; casa.andamento.push('V');
        ospite.perse++; ospite.andamento.push('P');
      } else if (m.punti_casa < m.punti_ospite) {
        ospite.punti += 2; ospite.vinte++; ospite.andamento.push('V');
        casa.perse++; casa.andamento.push('P');
      } else {
        casa.punti += 1; ospite.punti += 1;
        casa.nulle++; ospite.nulle++;
        casa.andamento.push('N'); ospite.andamento.push('N');
      }
    });
    return Object.values(teams)
      .map(t => ({ ...t, dr: t.gf - t.gs }))
      .sort((a, b) => b.punti - a.punti || b.dr - a.dr)
      .map((t, i) => ({ ...t, pos: i + 1 }));
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
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20">
      <div className="bg-slate-900 pt-20 pb-28 px-6 text-center relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-900 to-slate-950"></div>
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-400 px-4 py-1.5 rounded-full border border-blue-500/20 text-[10px] font-black uppercase tracking-[0.2em] mb-6 animate-pulse">
            <Zap size={12} /> Live Updates Active
          </div>
          <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter italic mb-4 leading-none text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-500">
            PALLAMANO <span className="text-blue-500">VIGEVANO</span>
          </h1>
          <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-xs">Under 14 Maschile • Stagione 2025/26</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-16 relative z-20">
        <div className="bg-slate-900/80 backdrop-blur-xl rounded-[2rem] shadow-2xl flex overflow-hidden border border-white/5 mb-8 p-1">
          <TabLink id="CLASSIFICA" label="Standings" icon={ListOrdered} />
          <TabLink id="CALENDARIO" label="Matches" icon={Calendar} />
          <TabLink id="ROSA" label="Roster" icon={Users} />
          <TabLink id="STATS" label="Scorers" icon={BarChart3} />
        </div>

        <div className="bg-slate-900/40 backdrop-blur-sm rounded-[3rem] shadow-xl p-6 md:p-10 border border-white/5 min-h-[600px]">
          {activeTab === 'CLASSIFICA' && (
            <div className="animate-in fade-in duration-500">
              <div className="flex justify-between items-end mb-10 px-2">
                <div>
                  <h3 className="text-4xl font-black text-white uppercase italic tracking-tighter leading-none">Classifica</h3>
                  <p className="text-blue-500 font-black uppercase text-[10px] tracking-[0.2em] mt-2">UNDER 14M - GIRONE A</p>
                </div>
                <div className="text-right flex items-center gap-3">
                  <Activity className="text-blue-500 animate-pulse" size={16} />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Seleziona squadra per dettagli</span>
                </div>
              </div>
              
              <div className="overflow-x-auto rounded-[2rem] border border-white/10 bg-slate-900/60 shadow-2xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950/80 text-slate-300 uppercase text-[10px] font-black tracking-widest border-b border-white/10">
                      <th className="px-6 py-5 text-center">#</th>
                      <th className="px-4 py-5">Squadra</th>
                      <th className="px-4 py-5 text-center text-blue-400">PT</th>
                      <th className="px-4 py-5 text-center text-slate-200">G</th>
                      <th className="px-4 py-5 text-center text-slate-200">V</th>
                      <th className="px-4 py-5 text-center text-slate-200">N</th>
                      <th className="px-4 py-5 text-center text-slate-200">P</th>
                      <th className="px-4 py-5 text-center text-green-400">GF</th>
                      <th className="px-4 py-5 text-center text-orange-400">GS</th>
                      <th className="px-4 py-5 text-center text-blue-300">DR</th>
                      <th className="px-6 py-5 text-center">Form</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {standings.map((s) => {
                      const isVigevano = s.squadra.toUpperCase().includes('VIGEVANO');
                      const isExpanded = expandedTeam === s.squadra;
                      const teamMatches = matches.filter(m => m.squadra_casa === s.squadra || m.squadra_ospite === s.squadra);

                      return (
                        <React.Fragment key={s.squadra}>
                          <tr 
                            onClick={() => setExpandedTeam(isExpanded ? null : s.squadra)}
                            className={`group cursor-pointer transition-all ${isVigevano ? 'bg-blue-600/20' : 'hover:bg-white/5'} ${isExpanded ? 'bg-white/5' : ''}`}
                          >
                            <td className="px-6 py-6 text-center font-black text-slate-500 text-xs">
                              {isExpanded ? <ChevronDown size={14} className="text-blue-500 mx-auto" /> : s.pos}
                            </td>
                            <td className="px-4 py-6">
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs ${isVigevano ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-slate-800 text-slate-400'}`}>
                                  {s.squadra.charAt(0).toUpperCase()}
                                </div>
                                <span className="font-black uppercase text-xs tracking-tight text-white group-hover:text-blue-400 transition-colors">{s.squadra}</span>
                              </div>
                            </td>
                            <td className={`px-4 py-6 text-center font-black text-xl ${isVigevano ? 'text-blue-400' : 'text-white'}`}>{s.punti}</td>
                            <td className="px-4 py-6 text-center font-bold text-sm text-slate-300">{s.giocate}</td>
                            <td className="px-4 py-6 text-center font-bold text-sm text-green-500">{s.vinte}</td>
                            <td className="px-4 py-6 text-center font-bold text-sm text-slate-400">{s.nulle}</td>
                            <td className="px-4 py-6 text-center font-bold text-sm text-red-500">{s.perse}</td>
                            <td className="px-4 py-6 text-center font-black text-sm text-green-400">{s.gf}</td>
                            <td className="px-4 py-6 text-center font-black text-sm text-orange-400">{s.gs}</td>
                            <td className={`px-4 py-6 text-center font-black text-sm ${s.dr >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                              {s.dr > 0 ? `+${s.dr}` : s.dr}
                            </td>
                            <td className="px-6 py-6">
                              <div className="flex justify-center gap-1.5">
                                {s.andamento.slice(-5).map((res, i) => (
                                  <div key={i} className={`w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-black text-white ${res === 'V' ? 'bg-green-500' : res === 'N' ? 'bg-slate-600' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]'}`}>{res}</div>
                                ))}
                              </div>
                            </td>
                          </tr>
                          
                          {/* AREA ESPANSA CON RISULTATI DETTAGLIATI */}
                          {isExpanded && (
                            <tr className="bg-slate-950/40 animate-in slide-in-from-top-2 duration-300 border-x border-blue-500/30 shadow-[inset_0_0_20px_rgba(59,130,246,0.1)]">
                              <td colSpan={11} className="px-8 py-8">
                                <div className="flex flex-col gap-6">
                                   <div className="flex items-center justify-between border-b border-white/5 pb-4">
                                      <h4 className="text-xs font-black uppercase tracking-[0.3em] text-blue-400 flex items-center gap-2">
                                        <Activity size={14} /> Risultati Recenti: {s.squadra}
                                      </h4>
                                      <span className="text-[9px] font-bold text-slate-500 uppercase">{teamMatches.length} Gare Registrate</span>
                                   </div>
                                   
                                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                      {teamMatches.length > 0 ? teamMatches.map((m, idx) => {
                                        const isHome = m.squadra_casa === s.squadra;
                                        const opponent = isHome ? m.squadra_ospite : m.squadra_casa;
                                        const isPlayed = m.punti_casa !== null;
                                        
                                        let resultColor = 'bg-slate-800';
                                        let resultText = 'P';
                                        if (isPlayed) {
                                          const myScore = isHome ? m.punti_casa! : m.punti_ospite!;
                                          const oppScore = isHome ? m.punti_ospite! : m.punti_casa!;
                                          if (myScore > oppScore) { resultColor = 'bg-green-600'; resultText = 'V'; }
                                          else if (myScore < oppScore) { resultColor = 'bg-red-600'; resultText = 'P'; }
                                          else { resultColor = 'bg-slate-500'; resultText = 'N'; }
                                        }

                                        return (
                                          <div key={idx} className="bg-slate-900/80 border border-white/5 rounded-2xl p-4 flex items-center justify-between group/match hover:border-blue-500/30 transition-all">
                                            <div className="flex flex-col min-w-0">
                                              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">{new Date(m.data_partita).toLocaleDateString('it-IT')}</span>
                                              <div className="flex items-center gap-2">
                                                <div className={`w-1.5 h-1.5 rounded-full ${isHome ? 'bg-blue-500' : 'bg-slate-600'}`}></div>
                                                <span className="text-[11px] font-black uppercase text-white truncate max-w-[160px]">{opponent}</span>
                                              </div>
                                              <span className="text-[8px] font-bold text-slate-600 mt-1 uppercase">{isHome ? 'In Casa' : 'Trasferta'}</span>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0">
                                              <div className="text-right">
                                                <p className="text-lg font-black text-white leading-none tracking-tighter">
                                                  {isPlayed ? `${m.punti_casa} - ${m.punti_ospite}` : 'VS'}
                                                </p>
                                              </div>
                                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] text-white ${resultColor}`}>
                                                {isPlayed ? resultText : '-'}
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      }) : (
                                        <div className="col-span-full py-8 text-center text-slate-600 font-bold uppercase text-[10px]">Nessuna gara trovata per questa squadra.</div>
                                      )}
                                   </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'CALENDARIO' && (
            <div className="animate-in fade-in duration-500">
               <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 mb-12">
                  <div>
                    <h3 className="text-4xl font-black text-white uppercase italic tracking-tighter leading-none">Calendario</h3>
                    <p className="text-blue-500 font-bold uppercase text-[9px] tracking-widest mt-2">Programmazione Gare 2025</p>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-2">
                       <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleScreenshotSync} />
                       <button onClick={() => fileInputRef.current?.click()} className="bg-slate-800 text-white px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-slate-700 transition-all border border-white/5">
                          <Camera size={14} /> Sync Screenshot
                       </button>
                       <button onClick={handleOpenAdd} className="bg-blue-600 text-white px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20">
                          <Plus size={16} /> Add Match
                       </button>
                    </div>
                  )}
               </div>

               <div className="space-y-16">
                  {Array.from(new Set(matches.map(m => m.giornata || 1))).sort((a, b) => a - b).map(giornata => (
                    <div key={giornata} className="relative">
                      <div className="absolute left-0 top-1 bottom-0 w-px bg-slate-800"></div>
                      <div className="pl-10">
                        <div className="flex items-center gap-4 mb-8">
                           <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center font-black text-blue-500 border border-white/5 shadow-xl">G{giornata}</div>
                           <h4 className="text-lg font-black text-white uppercase tracking-tighter">Giornata {giornata}</h4>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {matches.filter(m => (m.giornata || 1) === giornata).map(m => (
                            <div key={m.id} className="bg-slate-900/50 border border-white/5 rounded-[2.5rem] p-6 group relative overflow-hidden transition-all hover:bg-slate-800/80">
                              <div className="flex justify-between items-center mb-6">
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                  <Clock size={12} className="text-blue-500" />
                                  {new Date(m.data_partita).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}
                                </span>
                                {isAdmin && (
                                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleOpenEdit(m)} className="text-slate-400 hover:text-blue-500 p-2"><Pencil size={14} /></button>
                                    <button onClick={() => handleDeleteMatch(m.id)} className="text-slate-400 hover:text-red-500 p-2"><Trash2 size={14} /></button>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex-1 text-right min-w-0">
                                   <p className="font-black uppercase text-sm text-white truncate break-words">{m.squadra_casa}</p>
                                </div>
                                <div className={`px-6 py-3 rounded-2xl font-black text-2xl flex items-center gap-4 shrink-0 ${m.punti_casa !== null ? 'bg-slate-950 text-white shadow-inner border border-white/5' : 'bg-slate-800/50 text-slate-600'}`}>
                                  <span>{m.punti_casa ?? '-'}</span>
                                  <div className="w-px h-6 bg-white/5"></div>
                                  <span>{m.punti_ospite ?? '-'}</span>
                                </div>
                                <div className="flex-1 text-left min-w-0">
                                   <p className="font-black uppercase text-sm text-white truncate break-words">{m.squadra_ospite}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {activeTab === 'ROSA' && (
            <div className="animate-in slide-in-from-bottom-10 duration-500">
               <div className="flex justify-between items-end mb-12">
                 <div>
                   <h3 className="text-4xl font-black text-white uppercase italic tracking-tighter leading-none">Roster</h3>
                   <p className="text-blue-500 font-bold uppercase text-[9px] tracking-widest mt-2">I Protagonisti del Vigevano</p>
                 </div>
                 {isAdmin && (
                   <button onClick={() => setShowAddPlayer(true)} className="bg-blue-600 text-white px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-blue-500/20">
                     <UserPlus size={16} /> Add Athlete
                   </button>
                 )}
               </div>
               <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                 {players.map(p => (
                   <div key={p.id} className="bg-slate-900/50 border border-white/5 rounded-[3rem] p-8 text-center shadow-sm hover:shadow-2xl transition-all group relative overflow-hidden border-b-4 border-b-transparent hover:border-b-blue-600">
                     <div className="absolute top-4 right-6 text-5xl font-black text-white/5 group-hover:text-blue-500/10 transition-colors">#{p.numero}</div>
                     <div className="w-20 h-20 bg-slate-800 rounded-[2rem] mx-auto mb-6 flex items-center justify-center text-slate-600 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner rotate-3 group-hover:rotate-0">
                        <Users size={32} />
                     </div>
                     <h4 className="font-black text-white uppercase tracking-tighter text-sm mb-1">{p.nome}</h4>
                     <span className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em]">{p.ruolo}</span>
                   </div>
                 ))}
               </div>
            </div>
          )}

          {activeTab === 'STATS' && (
            <div className="animate-in fade-in duration-500">
               <div className="flex justify-between items-end mb-12">
                 <div>
                   <h3 className="text-4xl font-black text-white uppercase italic tracking-tighter leading-none">Marcatori</h3>
                   <p className="text-blue-500 font-bold uppercase text-[9px] tracking-widest mt-2">Classifica Top Scorer</p>
                 </div>
                 {isAdmin && (
                   <button onClick={() => setShowAddStat(true)} className="bg-blue-600 text-white px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-blue-500/20">
                     <Target size={16} /> Record Goal
                   </button>
                 )}
               </div>
               
               <div className="max-w-3xl mx-auto grid grid-cols-1 gap-4">
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
                           <div className="h-full bg-blue-500 transition-all duration-1000 shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{width: `${(s.goal / (stats[0]?.goal || 1)) * 100}%`}}></div>
                        </div>
                      </div>
                    </div>
                  ))}
               </div>
            </div>
          )}
        </div>
      </div>

      {/* MODALS */}
      {showAddMatch && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6 z-[300]">
          <div className="bg-slate-900 border border-white/5 rounded-[3rem] p-10 w-full max-w-md shadow-2xl animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-8">
               <h3 className="font-black text-2xl text-white uppercase tracking-tighter">Match Setup</h3>
               <button onClick={() => setShowAddMatch(false)} className="text-slate-500 hover:text-white transition-colors"><X /></button>
            </div>
            <datalist id="teams-list">
              {knownTeams.map(t => <option key={t} value={t} />)}
            </datalist>
            <div className="space-y-5">
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase text-slate-500 ml-2">Squadra Casa</label>
                    <input list="teams-list" type="text" value={matchForm.casa} onChange={e => setMatchForm({...matchForm, casa: e.target.value})} className="w-full p-4 bg-slate-950 border border-white/5 rounded-2xl font-bold uppercase text-xs text-white outline-none focus:border-blue-500 transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase text-slate-500 ml-2">Squadra Ospite</label>
                    <input list="teams-list" type="text" value={matchForm.ospite} onChange={e => setMatchForm({...matchForm, ospite: e.target.value})} className="w-full p-4 bg-slate-950 border border-white/5 rounded-2xl font-bold uppercase text-xs text-white outline-none focus:border-blue-500 transition-all" />
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase text-slate-500 ml-2">Punti Casa</label>
                    <input type="number" value={matchForm.pCasa} onChange={e => setMatchForm({...matchForm, pCasa: e.target.value})} className="w-full p-4 bg-slate-950 border border-white/5 rounded-2xl font-black text-center text-xl text-white outline-none focus:border-blue-500 transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase text-slate-500 ml-2">Punti Ospite</label>
                    <input type="number" value={matchForm.pOspite} onChange={e => setMatchForm({...matchForm, pOspite: e.target.value})} className="w-full p-4 bg-slate-950 border border-white/5 rounded-2xl font-black text-center text-xl text-white outline-none focus:border-blue-500 transition-all" />
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase text-slate-500 ml-2">Data</label>
                    <input type="date" value={matchForm.data} onChange={e => setMatchForm({...matchForm, data: e.target.value})} className="w-full p-4 bg-slate-950 border border-white/5 rounded-2xl font-bold text-xs text-white outline-none focus:border-blue-500 transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase text-slate-500 ml-2">Giornata</label>
                    <input type="number" value={matchForm.giornata} onChange={e => setMatchForm({...matchForm, giornata: parseInt(e.target.value)})} className="w-full p-4 bg-slate-950 border border-white/5 rounded-2xl font-bold text-center text-white outline-none focus:border-blue-500 transition-all" />
                  </div>
               </div>
               <button onClick={handleSaveMatch} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-600/20 active:scale-95 transition-all mt-4">
                  {editingMatch ? 'Update Match Result' : 'Save To Calendar'}
               </button>
            </div>
          </div>
        </div>
      )}

      {showAddStat && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6 z-[300]">
          <div className="bg-slate-900 border border-white/5 rounded-[3rem] p-10 w-full max-w-sm shadow-2xl animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-8">
               <h3 className="font-black text-2xl text-white uppercase tracking-tighter">Record Goal</h3>
               <button onClick={() => setShowAddStat(false)} className="text-slate-500 hover:text-white transition-colors"><X /></button>
            </div>
            <div className="space-y-6">
               <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-500 ml-2">Atleta</label>
                  <div className="relative">
                    <select value={statForm.giocatoreId} onChange={e => setStatForm({...statForm, giocatoreId: e.target.value})} className="w-full p-4 bg-slate-950 border border-white/5 rounded-2xl font-bold text-white outline-none focus:border-blue-500 appearance-none uppercase text-xs">
                       <option value="">Seleziona Atleta</option>
                       {players.map(p => <option key={p.id} value={p.id}>{p.nome} (#{p.numero})</option>)}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                  </div>
               </div>
               <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-500 ml-2">Goal Segnati</label>
                  <input type="number" value={statForm.goal} onChange={e => setStatForm({...statForm, goal: parseInt(e.target.value)})} className="w-full p-4 bg-slate-950 border border-white/5 rounded-2xl font-black text-center text-3xl text-white outline-none focus:border-blue-500 transition-all" />
               </div>
               <button onClick={handleSaveStat} disabled={!statForm.giocatoreId} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-600/20 active:scale-95 transition-all mt-4 disabled:opacity-50">
                  Confirm Statistics
               </button>
            </div>
          </div>
        </div>
      )}

      {showAddPlayer && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6 z-[300]">
          <div className="bg-slate-900 border border-white/5 rounded-[3rem] p-10 w-full max-w-sm shadow-2xl animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-8">
               <h3 className="font-black text-2xl text-white uppercase tracking-tighter">New Athlete</h3>
               <button onClick={() => setShowAddPlayer(false)} className="text-slate-500 hover:text-white transition-colors"><X /></button>
            </div>
            <div className="space-y-5">
               <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-500 ml-2">Nome Atleta</label>
                  <input type="text" value={newPlayer.nome} onChange={e => setNewPlayer({...newPlayer, nome: e.target.value})} className="w-full p-4 bg-slate-950 border border-white/5 rounded-2xl font-bold text-white outline-none focus:border-blue-500" placeholder="Nome Cognome" />
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase text-slate-500 ml-2">Numero</label>
                    <input type="number" value={newPlayer.numero} onChange={e => setNewPlayer({...newPlayer, numero: e.target.value})} className="w-full p-4 bg-slate-950 border border-white/5 rounded-2xl font-black text-center text-white outline-none focus:border-blue-500" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase text-slate-500 ml-2">Ruolo</label>
                    <select value={newPlayer.ruolo} onChange={e => setNewPlayer({...newPlayer, ruolo: e.target.value})} className="w-full p-4 bg-slate-950 border border-white/5 rounded-2xl font-bold text-white outline-none focus:border-blue-500 uppercase text-[10px]">
                       <option>Ala</option><option>Centrale</option><option>Terzino</option><option>Pivot</option><option>Portiere</option>
                    </select>
                  </div>
               </div>
               <button onClick={handleSavePlayer} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl mt-4">Save Athlete</button>
            </div>
          </div>
        </div>
      )}

      {(loading || syncing) && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex flex-col items-center justify-center z-[1000]">
          <RefreshCw className="text-blue-500 animate-spin mb-4" size={50} />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] animate-pulse">Syncing Sport Engine...</p>
        </div>
      )}
    </div>
  );
};

export default Pallamano;
