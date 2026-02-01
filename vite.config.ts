
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Rimosso process.env.API_KEY da qui. 
    // Ora la chiave è accessibile solo lato server (Vercel Functions).
    'process.env': {} 
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
