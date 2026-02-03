
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
  nome: string;
  cognome: string;
  chat_username: string;
  motivo: string;
  created_at?: string;
}

// Tipi Pallamano
export interface HandballMatch {
  id: string;
  created_at: string;
  campionato: string;
  squadra_casa: string;
  squadra_ospite: string;
  punti_casa: number | null;
  punti_ospite: number | null;
  data_partita: string;
  giornata?: number;
  note?: string;
}

export interface HandballStanding {
  pos: number;
  squadra: string;
  punti: number;
  giocate: number;
  vinte: number;
  nulle: number;
  perse: number;
  gf: number;
  gs: number;
  dr: number;
  andamento: ('V' | 'N' | 'P')[];
}

export interface HandballPlayer {
  id: string;
  nome: string;
  cognome: string;
  data_di_nascita?: string;
  categoria: string;
  numero_di_maglia: number;
  ruoli: string;
  foto_url?: string;
}

export interface PlayerStats {
  id?: string;
  player_id: string;
  presenze: number;
  ammonizioni: number;
  esclusioni_2m: number;
  rosse: number;
  blu: number;
  goal: number;
  tiri_totali: number;
  rigori_segnati: number;
  rigori_totali: number;
  parate: number;
  tiri_subiti: number;
  assist: number;
  // Relazioni
  p_giocatori?: HandballPlayer;
}

// Tipi Produzione (Invariati)
export interface Macchina { id_macchina: string; macchina: string; }
export interface FaseLavorazione { id_fase: string; fase_di_lavorazione: string; }
export interface Cliente { id_cliente: string; cliente: string; }
export interface StatoLavorazione { id_stato: string; stato_lavorazione: string; }
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
  l_clienti?: Cliente;
  l_macchine?: Macchina;
  l_fasi_di_lavorazione?: FaseLavorazione;
}

export enum Stati { PRE = 'PRE', ATT = 'ATT', PRO = 'PRO', EXT = 'EXT', TER = 'TER' }
