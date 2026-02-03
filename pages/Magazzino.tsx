
import React from 'react';
import { Link } from 'react-router-dom';
// Aggiunta l'icona Plus agli import di lucide-react
import { ArrowLeft, Inbox, Box, BarChart3, Search, Layers, Plus } from 'lucide-react';

const Magazzino: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-20">
      <div className="bg-slate-900 pt-16 pb-24 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-amber-600/10"></div>
        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-4 mb-6">
            <Link to="/lavoro" className="p-2 bg-white/10 rounded-lg text-white hover:bg-white/20 transition-all">
              <ArrowLeft size={20} />
            </Link>
            <div className="inline-flex items-center gap-2 bg-amber-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em]">
              LOGISTICA INTERNA
            </div>
          </div>
          <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter italic mb-4 text-white">
            MAGAZZINO <span className="text-amber-500">& STOCK</span>
          </h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-12 relative z-20">
        <div className="bg-white rounded-[3rem] p-12 shadow-2xl border border-slate-200">
           <div className="flex flex-col md:flex-row gap-12 items-center">
              <div className="flex-1 text-center md:text-left">
                <div className="inline-flex p-4 bg-amber-50 text-amber-600 rounded-2xl mb-6">
                   <Box size={32} />
                </div>
                <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-4 leading-none">Gestione <span className="text-amber-600">Inventario</span></h2>
                <p className="text-slate-600 font-bold text-sm leading-relaxed mb-8 uppercase tracking-tight">Modulo per il tracciamento dei Master Coil e dei prodotti semilavorati in attesa di produzione o spedizione.</p>
                <div className="grid grid-cols-2 gap-4">
                   <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Totale Pezzi</p>
                      <p className="text-xl font-black text-slate-900">---</p>
                   </div>
                   <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">In Transito</p>
                      <p className="text-xl font-black text-amber-600">---</p>
                   </div>
                </div>
              </div>
              <div className="w-full md:w-1/3 flex flex-col gap-3">
                 <div className="p-6 bg-slate-950 text-white rounded-3xl flex items-center justify-between group cursor-default">
                    <span className="font-black text-[10px] uppercase tracking-widest">Scarico Materiale</span>
                    <Layers size={18} className="text-amber-500" />
                 </div>
                 <div className="p-6 bg-slate-100 text-slate-400 rounded-3xl flex items-center justify-between border-2 border-dashed border-slate-200 italic">
                    <span className="font-black text-[10px] uppercase tracking-widest">Nuovo Carico</span>
                    <Plus size={18} />
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Magazzino;
