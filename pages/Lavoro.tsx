
import React from 'react';
import { Link } from 'react-router-dom';
import Chat from '../components/Chat';

const Lavoro: React.FC = () => {
  const subsections = [
    { 
      title: "Produzione", 
      desc: "Gestione e monitoraggio dei flussi produttivi in tempo reale.",
      link: "/lavoro/produzione"
    },
    { 
      title: "Utilità varie", 
      desc: "Strumenti rapidi per il lavoro quotidiano.",
      link: "#"
    },
    { 
      title: "Combinazioni", 
      desc: "Calcoli e logiche di combinazione specifiche.",
      link: "#"
    },
  ];

  return (
    <div className="min-h-screen bg-yellow-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
        
        {/* Main Content */}
        <div className="flex-1">
          <h1 className="text-4xl font-black text-yellow-900 mb-8 uppercase tracking-widest">LAVORO</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {subsections.map((sub, idx) => (
              <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-yellow-100 hover:border-yellow-300 transition-colors flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-bold text-yellow-700 mb-2">{sub.title}</h3>
                  <p className="text-gray-600">{sub.desc}</p>
                </div>
                <Link 
                  to={sub.link} 
                  className="mt-4 inline-block text-yellow-600 font-semibold hover:underline"
                >
                  Apri strumento →
                </Link>
              </div>
            ))}
          </div>

          <div className="bg-white p-8 rounded-3xl border border-yellow-200 shadow-sm">
            <h2 className="text-2xl font-bold text-yellow-800 mb-4">Dashboard di Riepilogo</h2>
            <p className="text-gray-500 italic">I dati aggregati del database verranno visualizzati qui.</p>
          </div>
        </div>

        {/* Chat Sidebar */}
        <div className="w-full lg:w-96 flex-shrink-0">
          <div className="sticky top-8">
            <Chat />
          </div>
        </div>

      </div>
    </div>
  );
};

export default Lavoro;
