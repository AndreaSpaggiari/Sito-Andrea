
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, CheckCircle2, Circle, Compass, Shield, Heart, Search, Trophy, 
  ChevronDown, ChevronUp, Star, Save, Trash2, Info, Sparkles, Map, Swords, Flame
} from 'lucide-react';

interface ChecklistItem {
  id: string;
  text: string;
  category: string;
}

interface ChecklistSection {
  title: string;
  items: ChecklistItem[];
  subsections: {
    title: string;
    icon: any;
    items: string[];
  }[];
  strategicNotes: string[];
}

const ACT1_DATA: ChecklistSection[] = [
  {
    title: "Prolo: Il Nautiloide",
    items: [],
    subsections: [
      {
        title: "ORDINE DI ESPLORAZIONE",
        icon: Compass,
        items: [
          "Vano di Rigenerazione: Appena svegli, sali sulla piattaforma sopraelevata per trovare uno scrigno.",
          "Vano di Rigenerazione: Interagisci con la Vasca Salmastra al centro della stanza (prova di Arcano) per analizzare il parassita.",
          "Seconda Stanza (Elevatore): Saccheggia i cadaveri dei Goblin a terra prima di proseguire.",
          "Piattaforma Superiore: Prendi l'elevatore per raggiungere Myrnath. Interagisci con il cervello esposto.",
          "Piattaforma Superiore: Usa l'opzione [INDAGARE] e poi [MEDICINA] per estrarre il divoratore di intelletto Noi (Us) senza danneggiarlo.",
          "Ponte Esterno: Incontra Lae'zel e affronta il primo combattimento contro gli Imp.",
          "Sala dei Prigionieri: Interagisci con la console centrale. Usa la leva centrale per liberare i cultisti (combattimento per XP extra).",
          "Sala di Cuorescuro: Interagisci con la capsula di Cuorescuro (Shadowheart) per tentare di liberarla.",
          "Stanza Est (Laterale): Esplora la stanza a destra della capsula per trovare la Runa Mistica e i vasi cerebrali.",
          "Ponte di Comando: Scontro finale. Dirigiti verso il transponditore per concludere il prologo."
        ]
      },
      {
        title: "ISPIRAZIONI (INSPIRATIONS)",
        icon: Star,
        items: [
          "Nobile/Eroe del Popolo: Salvare Cuorescuro dalla capsula nel Nautiloide.",
          "Soldato: Sconfiggere i comandanti sul ponte (Zalk)."
        ]
      },
      {
        title: "APPROVAZIONI (APPROVALS)",
        icon: Heart,
        items: [
          "Lae'zel: Accettare subito di collaborare e concentrarsi sul raggiungimento del timone.",
          "Cuorescuro: Usare le opzioni di dialogo per liberarla dalla capsula e accettarla nel gruppo."
        ]
      },
      {
        title: "OGGETTI DA TROVARE (ITEMS)",
        icon: Search,
        items: [
          "Tavoletta Runica: Sul tavolo nella prima stanza.",
          "Onice: Dentro lo scrigno sulla piattaforma nella prima stanza.",
          "Mente Oscura (Dark Mind): Su un tavolo nella stanza di Cuorescuro (utile nell'Atto 2).",
          "Mente Schiavizzata (Slave Mind): Su un tavolo nella stanza di Cuorescuro (utile nell'Atto 2).",
          "Runa Mistica: Addosso alla Schiava Morta nella stanza a est (serve per liberare Cuorescuro).",
          "Chiave d'Oro: Addosso a un cadavere nella stanza laterale est (apre il Reliquiario Decorato).",
          "Reliquiario Decorato: Scrigno nella stanza di Cuorescuro, contiene oro e oggetti preziosi.",
          "Lama della Fiamma Eterna (Everburn Blade): Arma rarissima droppata dal Comandante Zhalk.",
          "Bulbo Corrosivo / Bulbo del Vuoto: Raccolti vicino al transponditore nel ponte di comando."
        ]
      }
    ],
    strategicNotes: [
      "Trofeo 'Il diavolo sta nei dettagli': Devi uccidere il Comandante Zhalk sul ponte di comando.",
      "Strategia Zhalk: Usa Cuorescuro per lanciare l'incantesimo Comando: Lascia sul Comandante Zhalk. Se fallisce, ricarica il salvataggio finché non lascia cadere la sua spada. Raccogli l'arma con un tuo personaggio per depotenziarlo drasticamente.",
      "Nota 100%: Assicurati di aver raccolto entrambi i vasi cerebrali (Mente Oscura e Mente Schiavizzata) prima di attivare il transponditore, poiché non potrai più tornare qui.",
      "Gestione Difficoltà: Se giochi a modalità Tattica, usa le stazioni di ristoro (tentacoli blu) per recuperare slot incantesimo prima del combattimento finale."
    ]
  },
  {
    title: "Spiaggia Devastata e Reclutamento",
    items: [],
    subsections: [
      {
        title: "ORDINE DI ESPLORAZIONE",
        icon: Map,
        items: [
          "Spiaggia Devastata: Risveglio e raccolta materiali base (Conchiglie, monete).",
          "Cuorescuro: Trova Cuorescuro svenuta sulla sabbia e reclutala immediatamente.",
          "Relitto del Nautiloide: Esplora la zona a nord del punto di schianto.",
          "Astarion: Incontra e recluta Astarion sulla collina vicino al relitto.",
          "Cinghiale Impaurito: Interagisci con il cinghiale vicino ad Astarion prima che scappi.",
          "Roccia Graffiata: Salta sulla scogliera a sud del relitto per trovare la zona segreta degli Arpisti.",
          "Circolo di Sigilli Antico: Interagisci con il portale instabile per incontrare Gale.",
          "Lae'zel: Dirigiti a nord del portale per liberare Lae'zel dalla gabbia dei Tiefling.",
          "Entrata della Cappella: Dirigiti a est per affrontare i briganti guidati da Gimblebock.",
          "Accampamento: Esegui il primo Riposo Lungo per far avanzare le quest dei compagni."
        ]
      },
      {
        title: "ISPIRAZIONI",
        icon: Star,
        items: [
          "Cedi ai tuoi appetiti: (Oscura Pulsione / Perseguitato) - Taglia la mano a Gale durante il primo incontro.",
          "Dormire, forse sognare sogni tentacolosi: (Oscura Pulsione / Perseguitato) - Uccidi il Mind Flayer ferito tra i rottami del Nautiloide."
        ]
      },
      {
        title: "APPROVAZIONI",
        icon: Heart,
        items: [
          "Cuorescuro: Ringraziala per averti aiutato sul Nautiloide.",
          "Cuorescuro: Supera il check [ADDESTRARE ANIMALI] con il Cinghiale Impaurito.",
          "Cuorescuro / Astarion: Accetta le scuse di Astarion dopo il tentativo di aggressione.",
          "Cuorescuro / Astarion: Chiedi a Lae'zel di dire 'per favore' prima di liberarla.",
          "Gale: Recluta Lae'zel nel gruppo.",
          "Cuorescuro / Gale: All'accampamento, dì che trovare un guaritore è la priorità assoluta.",
          "Cuorescuro: Rispetta la sua privacy dicendole che non insisterai se non vuole parlare di sé.",
          "Astarion: Ringrazialo quando si offre di fare la guardia per la notte."
        ]
      },
      {
        title: "OGGETTI DA TROVARE",
        icon: Search,
        items: [
          "Arnesi da Scasso: In un barile sulla spiaggia (coordinate X:200 Y:240).",
          "Taccuino dell'Arpista / Mappa: Sotto la Roccia Graffiata (richiede check Percezione).",
          "Pala: Vicino a un mucchio di terra a nord del portale di Gale.",
          "Maschera Mutaforma: Nel Forziere del Viaggiatore (Edizione Deluxe).",
          "Cappa del Principe Rosso: Nel Forziere del Viaggiatore (Edizione Deluxe).",
          "Ago della Principessa Fuorilegge: Spada corta trovata nel forziere all'accampamento.",
          "Liuto della Merryweather / Bicorno della Bestia Marina: Strumenti musicali nel forziere."
        ]
      }
    ],
    strategicNotes: [
      "Trofeo 'Topo da biblioteca': Inizia a leggere ogni libro o lettera che trovi (ne servono 100).",
      "Trofeo 'Uscita d'emergenza': Usa l'azione [SPINGERE] per far cadere un brigante dalla balaustra alla Cappella.",
      "Nota Trofeo 'Nessuno è escluso': Per salvare tutti i Tiefling, convinci Damays e Nymessa ad andarsene con inganno o carisma.",
      "Strategia Stregone: Al livello 2, Metamagia: Incantesimo Distante e Raddoppiato. Sostituisci dardo incantato con Globo Cromatico."
    ]
  },
  {
    title: "La Cappella e la Cripta Umida",
    items: [],
    subsections: [
      {
        title: "ORDINE DI ESPLORAZIONE",
        icon: Compass,
        items: [
          "Entrata della Cappella: Colpisci la Corda Arrotolata per sfondare il pavimento.",
          "Mensa: Salta nel buco creato. Fai esplodere il Barile d'Olio.",
          "Corridoio Nord: Elimina il brigante Haseid.",
          "Stanza della Statua: Supera un check di percezione dietro la statua per trovare una Leva.",
          "Cripta Umida (Stanza Trappole): Saccheggia i sarcofagi laterali prima di quello centrale.",
          "Cripta Umida: Attiva la Modalità a Turni e scatta fuori prima delle trappole di fuoco.",
          "Stanza del Libro: Interagisci con il Libro dei Morti (richiede check Arcano/Religione).",
          "Antico Tempio di Jergal: Saccheggia i cadaveri degli Scriba Sepolti (togli le armi) prima dello scontro.",
          "Antico Tempio: Premi il Pulsante nella nicchia nord-ovest per svelare la tomba segreta.",
          "Tomba Segreta: Apri il sarcofago per incontrare L'Avvizzito (Withers).",
          "Uscita Secondaria: Usa la leva dietro il sarcofago per uscire vicino alla scogliera."
        ]
      }
    ],
    strategicNotes: [
      "Nota Withers: Permette di resuscitare i compagni e cambiare classe (Respec).",
      "Strategia Scheletri: Saccheggia i loro equipaggiamenti prima di premere il pulsante per farli risvegliare disarmati.",
      "Trofeo 'Topo da biblioteca': Leggere il Libro dei Morti e le pergamene accelera il progresso."
    ]
  },
  {
    title: "Il Boschetto e la fuga di Sazza",
    items: [],
    subsections: [
      {
        title: "ESPLORAZIONE CHIAVE",
        icon: Map,
        items: [
          "Cancello del Boschetto: Affronta la battaglia contro i Goblin dall'alto (collina a sinistra).",
          "Ingresso Boschetto: Parla con Zevlor e calma la rissa con Aradin via Persuasione.",
          "Nadira: Salva la Tiefling dal sicario Bugbear sulla collina a est.",
          "Alloggi della Servitù: Scassina il Forziere di Kagha per prove di corruzione.",
          "Alfira: Aiutala con la canzone per ottenere la competenza negli strumenti musicali.",
          "Prigione: Salva la Goblin Sazza e falla uscire dal retro della cella.",
          "Passaggio Sotterraneo: Scorta Sazza. Usa Mano Magica per spegnere le rune delle statue.",
          "Uscita Nord: Incontra Raphael subito fuori dal passaggio sotterraneo."
        ]
      }
    ],
    strategicNotes: [
      "Trofeo 'Nessuno è escluso': Salva Arabella da Kagha, salva Mirkon dalle arpie e convinci Rolan a restare.",
      "Nota Alfira: La competenza musicale è vitale per il trofeo delle 100 monete con l'azione 'Intrattenere'.",
      "Strategia Mano Magica: Spegni i raggi di fuoco delle statue interagendo con le rune a distanza."
    ]
  },
  {
    title: "La Necromanzia di Thay",
    items: [],
    subsections: [
      {
        title: "STEP PRINCIPALI",
        icon: Swords,
        items: [
          "Tana dell'Orsogufo: Sconfiggi la madre ma risparmia assolutamente il Cucciolo.",
          "Tana dell'Orsogufo: Altare di Selûne. Salta dietro la statua per la pergamena di sblocco.",
          "Villaggio in Rovina: Seminterrato dello speziale. Accedi al laboratorio via Specchio Decorato.",
          "Laboratorio Segreto: Recupera il libro La Necromanzia del Thay.",
          "Profondità Sussurranti: Scendi nel pozzo ed elimina la Matriarca Ragno-Fase.",
          "Strada Rialzata: Prosegui a nord per trovare e reclutare Karlach."
        ]
      }
    ],
    strategicNotes: [
      "Trofeo 'Solo un morsicino': Lascia che Astarion ti morda all'accampamento.",
      "Uso del Libro: Inserisci l'Ametista Oscura (trovata vicino alla matriarca) e supera i tre check di Saggezza.",
      "Strategia Matriarca Ragno: Colpisci le ragnatele per infliggerle danni da caduta massicci."
    ]
  },
  {
    title: "Underdark e il salvataggio al Mulino",
    items: [],
    subsections: [
      {
        title: "STEP PRINCIPALI",
        icon: Map,
        items: [
          "Underdark: Salta nel buco delle Profondità Sussurranti con Caduta Morbida.",
          "Underdark: Individua la spada Phalar Aluve nella roccia e usa Karlach per estrarla.",
          "Tana del Bulette: Affronta il Bulette usando barili esplosivi.",
          "Grotta sul Lago: Persuadi i Miconidi e cura Thulla dal veleno.",
          "Villaggio in Rovina (Mulino): Attiva la Leva del Freno (NON quella del rilascio) per salvare Barcus."
        ]
      }
    ],
    strategicNotes: [
      "Trofeo 'Libera e bella': Salva Barcus al mulino usando la leva del freno. La leva del rilascio lo uccide.",
      "Nota Riposo di Waukeen: NON riposare una volta raggiunta la zona finché non completi il salvataggio degli intrappolati."
    ]
  },
  {
    title: "Underdark: Torre Arcana e BOOOAL",
    items: [],
    subsections: [
      {
        title: "STEP PRINCIPALI",
        icon: Search,
        items: [
          "Prato dei Bibberbang: Salva Baelen e raccogli il Gambonobile.",
          "Torre Arcana: Inserisci un Fiore di Sussur nel generatore al piano terra.",
          "Torre Arcana: Risolvi l'enigma di Bernard usando i versi dei libri trovati nella torre.",
          "Ansa Futrescente: Trova l'ingresso segreto per smascherare il falso dio BOOOAL."
        ]
      }
    ],
    strategicNotes: [
      "Arma di Sussur: Consigliato lo Spadone per silenziare i nemici magici.",
      "Lamento Glaciale: Combina Metallo, Manico e Cristallo di Ghiaccio dai drow nell'Underdark.",
      "Trucco Gambonobile: Puoi darlo a Cuorescuro per i ricordi e poi consegnarlo via trucco inventario a Derryth."
    ]
  }
];

const BG3Act1Checklist: React.FC = () => {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('bg3_act1_checklist');
    return saved ? JSON.parse(saved) : {};
  });

  const [expandedSections, setExpandedSections] = useState<Record<number, boolean>>({ 0: true });

  useEffect(() => {
    localStorage.setItem('bg3_act1_checklist', JSON.stringify(checkedItems));
  }, [checkedItems]);

  const toggleItem = (sectionIdx: number, subIdx: number, itemIdx: number) => {
    const id = `${sectionIdx}-${subIdx}-${itemIdx}`;
    setCheckedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSection = (idx: number) => {
    setExpandedSections(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const calculateProgress = (sectionIdx: number) => {
    const section = ACT1_DATA[sectionIdx];
    let total = 0;
    let checked = 0;
    section.subsections.forEach((sub, subIdx) => {
      sub.items.forEach((_, itemIdx) => {
        total++;
        if (checkedItems[`${sectionIdx}-${subIdx}-${itemIdx}`]) checked++;
      });
    });
    return total === 0 ? 0 : Math.round((checked / total) * 100);
  };

  const resetAll = () => {
    if (confirm("Sei sicuro di voler azzerare tutti i progressi della checklist?")) {
      setCheckedItems({});
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-100 pb-20">
      {/* Header Fisso */}
      <div className="bg-[#0f172a] border-b border-purple-500/20 sticky top-0 z-[100] px-6 py-4 backdrop-blur-md bg-opacity-80">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <Link to="/personale/bg3" className="flex items-center gap-2 text-purple-400 font-black text-[10px] uppercase tracking-widest hover:text-white transition-all">
            <ArrowLeft size={16} /> BG3 Hub
          </Link>
          <div className="flex items-center gap-4">
             <div className="flex flex-col items-end">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">Progresso Atto 1</span>
                <span className="text-sm font-black text-purple-400 italic">
                  {Math.round((Object.values(checkedItems).filter(Boolean).length / ACT1_DATA.reduce((acc, s) => acc + s.subsections.reduce((a, sub) => a + sub.items.length, 0), 0)) * 100)}%
                </span>
             </div>
             <button onClick={resetAll} className="p-2 text-slate-500 hover:text-rose-500 transition-colors" title="Reset Totale">
                <Trash2 size={18} />
             </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-12">
        <div className="text-center mb-16">
           <div className="inline-flex items-center gap-2 bg-purple-500/10 px-4 py-1.5 rounded-full border border-purple-500/20 text-purple-400 text-[10px] font-black uppercase tracking-[0.2em] mb-6">
              <Sparkles size={12} /> The Perfect Run Checklist
           </div>
           <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter italic text-white mb-4">
             ATTO 1: <span className="text-purple-500">GUIDA COMPLETA</span>
           </h1>
           <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.3em]">Nautiloide, Underdark & Passo Montano</p>
        </div>

        <div className="space-y-6">
          {ACT1_DATA.map((section, sIdx) => (
            <div key={sIdx} className="bg-slate-900/40 border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl transition-all hover:border-purple-500/20">
              <button 
                onClick={() => toggleSection(sIdx)}
                className="w-full px-8 py-6 flex items-center justify-between group"
              >
                <div className="flex items-center gap-6">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg transition-all ${calculateProgress(sIdx) === 100 ? 'bg-emerald-600' : 'bg-purple-600 group-hover:scale-110'}`}>
                    {calculateProgress(sIdx) === 100 ? <CheckCircle2 size={24} /> : <Compass size={24} />}
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-black uppercase italic tracking-tighter text-white leading-none">{section.title}</h3>
                    <div className="flex items-center gap-2 mt-2">
                       <div className="w-24 h-1 bg-slate-800 rounded-full overflow-hidden">
                          <div className={`h-full transition-all duration-500 ${calculateProgress(sIdx) === 100 ? 'bg-emerald-500' : 'bg-purple-500'}`} style={{ width: `${calculateProgress(sIdx)}%` }}></div>
                       </div>
                       <span className="text-[9px] font-black text-slate-500 uppercase">{calculateProgress(sIdx)}%</span>
                    </div>
                  </div>
                </div>
                {expandedSections[sIdx] ? <ChevronUp className="text-slate-500" /> : <ChevronDown className="text-slate-500" />}
              </button>

              {expandedSections[sIdx] && (
                <div className="px-8 pb-10 pt-4 animate-in slide-in-from-top-2 duration-300">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div className="space-y-10">
                      {section.subsections.map((sub, subIdx) => (
                        <div key={subIdx}>
                          <div className="flex items-center gap-3 mb-6">
                             <sub.icon size={16} className="text-purple-500" />
                             <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">{sub.title}</h4>
                          </div>
                          <div className="space-y-4">
                            {sub.items.map((item, iIdx) => {
                              const isChecked = checkedItems[`${sIdx}-${subIdx}-${iIdx}`];
                              return (
                                <div 
                                  key={iIdx} 
                                  onClick={() => toggleItem(sIdx, subIdx, iIdx)}
                                  className={`flex items-start gap-4 p-4 rounded-2xl cursor-pointer transition-all border ${isChecked ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/5 border-transparent hover:bg-white/10'}`}
                                >
                                  {isChecked ? (
                                    <CheckCircle2 size={20} className="text-emerald-500 shrink-0 mt-0.5" />
                                  ) : (
                                    <Circle size={20} className="text-slate-700 shrink-0 mt-0.5" />
                                  )}
                                  <p className={`text-sm font-medium leading-relaxed ${isChecked ? 'text-emerald-100/60 line-through' : 'text-slate-200'}`}>
                                    {item}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-6">
                       <div className="bg-purple-900/10 border border-purple-500/20 rounded-[2rem] p-8">
                          <div className="flex items-center gap-3 mb-6">
                             <Flame size={20} className="text-amber-500" />
                             <h4 className="text-xs font-black text-white uppercase tracking-[0.2em]">Strategia & Note</h4>
                          </div>
                          <div className="space-y-6">
                             {section.strategicNotes.map((note, nIdx) => (
                               <div key={nIdx} className="flex gap-4">
                                  <div className="w-1 h-auto bg-amber-500/40 rounded-full shrink-0"></div>
                                  <p className="text-[13px] text-slate-400 leading-relaxed italic">
                                     {note}
                                  </p>
                               </div>
                             ))}
                          </div>
                       </div>
                       
                       <div className="bg-slate-950/50 border border-white/5 rounded-[2rem] p-8 flex flex-col items-center text-center">
                          <Info size={32} className="text-slate-700 mb-4" />
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-relaxed">
                             Tutti i progressi vengono salvati localmente sul browser.
                          </p>
                       </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-20 text-center">
           <Link to="/personale/bg3" className="inline-flex items-center gap-3 bg-white text-slate-950 px-10 py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all hover:bg-purple-500 hover:text-white">
              <Swords size={20} /> Torna al BG3 Hub
           </Link>
        </div>
      </div>
    </div>
  );
};

export default BG3Act1Checklist;
