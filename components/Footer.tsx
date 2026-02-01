
import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900 text-gray-400 py-6 text-center text-sm">
      <div className="container mx-auto px-4">
        <p>© {new Date().getFullYear()} - SITO WEB di ANDREA SPAGGIARI</p>
        <p className="mt-1">Creato con React, Tailwind e Supabase</p>
        <div className="mt-2 flex justify-center gap-4">
          <span>Hosting Aruba Easy Windows</span>
          <span>•</span>
          <span>Database Supabase</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
