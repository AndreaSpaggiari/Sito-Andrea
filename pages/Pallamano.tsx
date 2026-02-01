
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { HandballMatch, UserProfile } from '../types';
import { Trophy, Calendar, Plus, X, Trash2, ShieldCheck, Info, Award } from 'lucide-react';

interface Props {
  profile?: UserProfile | null;
}

const Pallamano: React.FC<Props> = ({ profile }) => {
  const [matches, setMatches] = useState<HandballMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // State per nuova partita
  const [newMatch, setNewMatch] = useState({
    campionato: 'Under 14 Maschile',
    squadra_casa: '',
    squadra_ospite: '',
    punti_casa: 0,
    punti_ospite: 0,
    data_partita: new Date().toISOString().split('T')[0],
    note: ''
  });

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('p_partite')
      .select('*')
      .order('data_partita', { ascending: false });
    
    if (data) setMatches(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMatches();

    const channel = supabase
      .channel('pallamano-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'p_partite' }, () => {
        fetchMatches();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMatches]);

  const handleAddMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('p_partite').insert([newMatch]);
    if (!error) {
      setShowAddModal(false);
      setNewMatch({
        campionato: 'Under 14 Maschile',
        squadra_casa: '',
        squadra_ospite: '',
        punti_casa: 0,
        punti_ospite: 0,
        data_partita: new Date().toISOString().split('T')[0],
        note: ''
      });
    } else {
      alert("Errore salvataggio partita");
    }
  };

  const handleDeleteMatch = async (id: string) => {
    if (!confirm("Eliminare definitivamente questo risultato?")) return;
    await supabase.from('p_partite').delete().eq('id', id);
  };

  return (
    <div className="min-h-screen bg-blue-50/50 pb-24">
      {/* Hero Section */}
      <div className="bg-blue-600 pt-12 pb-20 px-6 text-center text-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-10 left-10 transform -rotate-12"><Trophy size={120} /></div>
          <div className="absolute bottom-10 right-10 transform rotate-12"><Award size={120} /></div>
        </div>
        <div className="max-w-4xl mx-auto relative z-10">
          <h1 className="text-5xl font-black uppercase tracking-tighter mb-4">Pallamano <span className="text-blue-200">Vigevano</span></h1>
          <p className="text-lg font-medium opacity-90 max-w-2xl mx-auto">Risultati, news e aggiornamenti per l'Under 14 e tutto il mondo handball locale.</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 -mt-10">
        <div className="flex flex-col md:flex-row gap-8">
          
          {/* Main Content: Risultati */}
          <div className="flex-1 space-y-6">
            <div className="flex justify-between items-end px-2">
              <div>
                <h2 className="text-xs font-black text-blue-600 uppercase tracking-[0.2em] mb-1">Live Feed</h2>
                <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Ultimi Risultati</h3>
              </div>
              {profile?.role === 'ADMIN' && (
                <button 
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-all active:scale-95"
                >
                  <Plus size={16} /> Aggiungi Match
                </button>
              )}
            </div>

            {loading ? (
              <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : matches.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {matches.map((match) => (
                  <div key={match.id} className="bg-white rounded-3xl p-6 shadow-sm border border-blue-100 hover:shadow-md transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-1 bg-blue-600 h-full group-hover:w-2 transition-all"></div>
                    
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
                      <div className="flex-1 flex justify-end items-center gap-4 w-full">
                        <span className="font-black text-slate-800 text-sm sm:text-base text-right uppercase tracking-tight truncate max-w-[150px]">{match.squadra_casa}</span>
                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl shadow-inner shrink-0">🏠</div>
                      </div>

                      <div className="flex flex-col items-center shrink-0">
                        <div className="bg-slate-900 text-white rounded-2xl px-6 py-2 flex items-center gap-4 shadow-xl border-2 border-slate-800">
                          <span className="text-3xl font-black tabular-nums">{match.punti_casa}</span>
                          <span className="text-xs font-black opacity-30">—</span>
                          <span className="text-3xl font-black tabular-nums">{match.punti_ospite}</span>
                        </div>
                        <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-2">{match.campionato}</span>
                      </div>

                      <div className="flex-1 flex justify-start items-center gap-4 w-full">
                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl shadow-inner shrink-0">🚌</div>
                        <span className="font-black text-slate-800 text-sm sm:text-base text-left uppercase tracking-tight truncate max-w-[150px]">{match.squadra_ospite}</span>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-50 flex justify-between items-center">
                      <div className="flex items-center gap-3 text-slate-400">
                        <Calendar size={14} />
                        <span className="text-[10px] font-bold uppercase">{new Date(match.data_partita).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                      </div>
                      {match.note && (
                        <div className="flex items-center gap-2 text-blue-400 group-hover:text-blue-600 transition-colors">
                          <Info size={14} />
                          <span className="text-[10px] font-bold italic truncate max-w-[150px]">{match.note}</span>
                        </div>
                      )}
                      {profile?.role === 'ADMIN' && (
                        <button onClick={() => handleDeleteMatch(match.id)} className="text-slate-200 hover:text-red-500 transition-colors p-1"><Trash2 size={16} /></button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-[2.5rem] border-2 border-dashed border-blue-100 p-20 text-center flex flex-col items-center">
                <Trophy size={48} className="text-blue-100 mb-4" />
                <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Nessun match registrato</p>
                <p className="text-[10px] text-slate-300 italic mt-1">Sincronizzazione real-time attiva.</p>
              </div>
            )}
          </div>

          {/* Sidebar: News & Info */}
          <div className="w-full md:w-80 space-y-6">
            <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-blue-100">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                <ShieldCheck size={18} className="text-blue-600" /> Società
              </h4>
              <ul className="space-y-4">
                <li className="flex gap-4">
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 shrink-0 font-black text-[10px]">U14</div>
                  <div>
                    <p className="text-[11px] font-black text-slate-800 uppercase leading-none">Under 14 Maschile</p>
                    <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase">Allenamenti Mar-Gio</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 shrink-0 font-black text-[10px]">PV</div>
                  <div>
                    <p className="text-[11px] font-black text-slate-800 uppercase leading-none">Pallamano Vigevano</p>
                    <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase">Serie B Regionale</p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="bg-blue-600 rounded-[2rem] p-8 text-white shadow-xl relative overflow-hidden group">
              <Trophy size={100} className="absolute -bottom-4 -right-4 opacity-10 group-hover:scale-110 transition-transform" />
              <h4 className="text-[11px] font-black uppercase tracking-[0.2em] mb-4">Prossima Sfida</h4>
              <p className="text-2xl font-black leading-tight mb-2">VIGEVANO <br/> vs <br/> DERTHONA</p>
              <p className="text-[10px] font-bold uppercase opacity-60">Sabato 15 Marzo - Ore 16:30</p>
            </div>
          </div>

        </div>
      </div>

      {/* Modal Aggiunta Match (Admin) */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 z-[100] overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl animate-in zoom-in duration-200 border-t-8 border-blue-600 my-auto">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Nuovo Risultato</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-300 hover:text-red-500 transition-colors"><X size={24} /></button>
            </div>

            <form onSubmit={handleAddMatch} className="space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Campionato</label>
                <input type="text" value={newMatch.campionato} onChange={e => setNewMatch({...newMatch, campionato: e.target.value})} className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 font-bold text-sm outline-none focus:ring-4 focus:ring-blue-500/10" required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Squadra Casa</label>
                  <input type="text" value={newMatch.squadra_casa} onChange={e => setNewMatch({...newMatch, squadra_casa: e.target.value})} className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 font-bold text-sm outline-none focus:ring-4 focus:ring-blue-500/10" required />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Squadra Ospite</label>
                  <input type="text" value={newMatch.squadra_ospite} onChange={e => setNewMatch({...newMatch, squadra_ospite: e.target.value})} className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 font-bold text-sm outline-none focus:ring-4 focus:ring-blue-500/10" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Punti Casa</label>
                  <input type="number" value={newMatch.punti_casa} onChange={e => setNewMatch({...newMatch, punti_casa: parseInt(e.target.value) || 0})} className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 font-black text-2xl text-center outline-none focus:ring-4 focus:ring-blue-500/10" required />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Punti Ospite</label>
                  <input type="number" value={newMatch.punti_ospite} onChange={e => setNewMatch({...newMatch, punti_ospite: parseInt(e.target.value) || 0})} className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 font-black text-2xl text-center outline-none focus:ring-4 focus:ring-blue-500/10" required />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Data Partita</label>
                <input type="date" value={newMatch.data_partita} onChange={e => setNewMatch({...newMatch, data_partita: e.target.value})} className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 font-bold text-sm outline-none" required />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Note / Marcatori</label>
                <textarea value={newMatch.note} onChange={e => setNewMatch({...newMatch, note: e.target.value})} className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 font-bold text-sm outline-none h-24 resize-none" placeholder="Es: MVP Andrea Rossi, 10 parate..." />
              </div>

              <button className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3">
                <Plus size={20} /> Salva Risultato
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pallamano;
