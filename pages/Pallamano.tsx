
import React from 'react';

const Pallamano: React.FC = () => {
  const subsections = [
    { title: "Under 14 Maschile", desc: "Dettagli sulla squadra giovanile maschile." },
    { title: "Risultati e Classifiche", desc: "Aggiornamenti in tempo reale sui tornei." },
    { title: "Pallamano Vigevano", desc: "Tutto sulla realtà della pallamano a Vigevano." },
    { title: "Varie", desc: "Altre informazioni e news sul mondo handball." },
  ];

  return (
    <div className="min-h-screen bg-blue-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <h1 className="text-4xl font-black text-blue-900">PALLAMANO</h1>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {subsections.map((sub, idx) => (
            <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-blue-100 hover:border-blue-300 transition-colors">
              <h3 className="text-xl font-bold text-blue-700 mb-2">{sub.title}</h3>
              <p className="text-gray-600">{sub.desc}</p>
              <button className="mt-4 text-blue-600 font-semibold hover:underline">Vedi dettagli →</button>
            </div>
          ))}
        </div>

        <div className="mt-12 p-8 bg-blue-600 rounded-3xl text-white shadow-lg">
          <h2 className="text-2xl font-bold mb-2">Area Contenuti Futuri</h2>
          <p className="opacity-90">Qui inseriremo pian piano tutti i contenuti dinamici estratti dal database Supabase.</p>
        </div>
      </div>
    </div>
  );
};

export default Pallamano;
