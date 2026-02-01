
# Guida Configurazione Database Supabase

## 1. Esegui lo Script SQL
Vai nella sezione **SQL Editor** di Supabase, incolla questo codice e premi **RUN**:

```sql
-- TABELLE E INDICI ESISTENTI (Profili e Permessi)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  username text,
  role text default 'USER' check (role in ('ADMIN', 'USER')),
  created_at timestamp with time zone default now()
);

create table if not exists public.l_permessi (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  sezione text not null check (sezione in ('PALLAMANO', 'LAVORO', 'PERSONALE')),
  stato text default 'RICHIESTO' check (stato in ('RICHIESTO', 'AUTORIZZATO', 'NEGATO')),
  created_at timestamp with time zone default now(),
  unique(user_id, sezione)
);

-- NUOVA TABELLA PALLAMANO (RISULTATI)
create table if not exists public.p_partite (
  id uuid default gen_random_uuid() primary key,
  campionato text not null default 'Under 14 Maschile',
  squadra_casa text not null,
  squadra_ospite text not null,
  punti_casa integer default 0,
  punti_ospite integer default 0,
  data_partita date default current_date,
  note text,
  created_at timestamp with time zone default now()
);

-- CONFIGURA IL TUO ACCOUNT COME ADMIN
UPDATE profiles SET role = 'ADMIN' WHERE email = 'spaggiaricrotti@gmail.com';

-- TABELLA CHAT
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  sender_name text not null,
  recipient_name text default 'ALL',
  content text not null,
  created_at timestamp with time zone default now()
);

-- ABILITA REAL-TIME (Esegui queste righe se non lo hai fatto da UI)
alter publication supabase_realtime add table l_permessi;
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table p_partite;
```

## 2. Attiva il Real-time (Manualmente dalla Dashboard)
Se lo script sopra non bastasse:
1. Menù **Database** -> **Publications**.
2. Modifica **supabase_realtime**.
3. Aggiungi le tabelle: `l_permessi`, `messages`, `p_partite`.
