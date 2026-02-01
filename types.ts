
export type SectionType = 'PALLAMANO' | 'LAVORO' | 'PERSONALE';

export interface ChatMessage {
  id?: string;
  created_at?: string;
  sender_name: string;
  recipient_name: string | 'ALL';
  content: string;
}

export interface OnlineUser {
  presence_ref: string;
  username: string;
  online_at: string;
}

// Tipi Auth e Permessi
export type UserRole = 'ADMIN' | 'USER';
export type PermissionStatus = 'RICHIESTO' | 'AUTORIZZATO' | 'NEGATO';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  username: string;
}

export interface UserPermission {
  id: string;
  user_id: string;
  sezione: SectionType;
  stato: PermissionStatus;
}

// Tipi Pallamano
export interface HandballMatch {
  id: string;
  created_at: string;
  campionato: string;
  squadra_casa: string;
  squadra_ospite: string;
  punti_casa: number;
  punti_ospite: number;
  data_partita: string;
  note?: string;
}

// Tipi Produzione
export interface Macchina {
  id_macchina: string;
  macchina: string;
}

export interface FaseLavorazione {
  id_fase: string;
  fase_di_lavorazione: string;
}

export interface Cliente {
  id_cliente: string;
  cliente: string;
}

export interface StatoLavorazione {
  id_stato: string;
  stato_lavorazione: string;
}

export interface Lavorazione {
  id_lavorazione: string; 
  id_macchina: string;
  id_fase: string;
  id_stato: string;
  scheda: number;
  mcoil: string;
  mcoil_kg: number;
  spessore: number;
  mcoil_larghezza: number;
  mcoil_lega: string;
  mcoil_stato_fisico: string;
  conferma_voce: string;
  id_cliente: string;
  ordine_kg_lavorato: number | null;
  ordine_kg_richiesto: number | null;
  misura: number;
  inizio_lavorazione: string | null;
  fine_lavorazione: string | null;
  attesa_lavorazione: string | null;
  numero_passate: number | null;
  numero_pezzi: number | null;
  metri_avvolti: number | null;
  data_consegna: string | null;
  
  // Joined fields
  l_clienti?: Cliente;
  l_macchine?: Macchina;
  l_fasi_di_lavorazione?: FaseLavorazione;
}

export enum Stati {
  ATT = 'ATT', // In Attesa
  PRO = 'PRO', // In Produzione
  EXT = 'EXT', // In Uscita
  TER = 'TER'  // Terminata
}
