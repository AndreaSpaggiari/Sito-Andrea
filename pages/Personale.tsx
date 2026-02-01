
import React from 'react';

const Personale: React.FC = () => {
  const subsections = [
    { title: "Casa", desc: "Gestione spese, manutenzioni e appunti per la casa." },
    { title: "Varie", desc: "Diario personale e memo personali." },
  ];

  return (
    <div className="min-h-screen bg-green-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-black text-green-900 mb-8">PERSONALE</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {subsections.map((sub, idx) => (
            <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-green-100 hover:border-green-300 transition-colors">
              <h3 className="text-xl font-bold text-green-700 mb-2">{sub.title}</h3>
              <p className="text-gray-600">{sub.desc}</p>
              <button className="mt-4 text-green-600 font-semibold hover:underline">Accedi →</button>
            </div>
          ))}
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4">
          <div className="p-12 border-4 border-dashed border-green-200 rounded-3xl flex flex-col items-center justify-center text-green-800 text-center">
            <div className="w-16 h-16 bg-green-200 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">🏠</span>
            </div>
            <p className="text-lg font-medium">Spazio per futuri moduli personali</p>
            <p className="text-sm opacity-60 mt-1">Sincronizzato con il database gqwdspoizoorvpgcutke</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Personale;
