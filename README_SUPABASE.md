
# Script SQL Finale per Supabase (VERSIONE SECURITY)

Copia e incolla questo blocco nel SQL Editor di Supabase e premi "RUN".

## 1. Tabelle Profili e Permessi
```sql
-- Tabella Profili (estende auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  username text,
  role text default 'USER' check (role in ('ADMIN', 'USER')),
  created_at timestamp with time zone default now()
);

-- Tabella Permessi Sezioni
create table if not exists public.l_permessi (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade,
  sezione text not null check (sezione in ('PALLAMANO', 'LAVORO', 'PERSONALE')),
  stato text default 'RICHIESTO' check (stato in ('RICHIESTO', 'AUTORIZZATO', 'NEGATO')),
  created_at timestamp with time zone default now(),
  unique(user_id, sezione)
);

-- RLS per Profili
alter table public.profiles enable row level security;
drop policy if exists "Profili visibili a tutti" on profiles;
drop policy if exists "Utenti possono inserire il proprio profilo" on profiles;
drop policy if exists "Utenti possono aggiornare il proprio profilo" on profiles;

create policy "Profili visibili a tutti" on profiles for select using (true);
create policy "Utenti possono inserire il proprio profilo" on profiles for insert with check (auth.uid() = id);
create policy "Utenti possono aggiornare il proprio profilo" on profiles for update using (auth.uid() = id);

-- RLS per Permessi
alter table public.l_permessi enable row level security;
drop policy if exists "Utenti possono vedere i propri permessi" on l_permessi;
drop policy if exists "Utenti possono richiedere permessi" on l_permessi;
drop policy if exists "Admin può tutto sui permessi" on l_permessi;

create policy "Utenti possono vedere i propri permessi" on l_permessi for select using (auth.uid() = user_id);
create policy "Utenti possono richiedere permessi" on l_permessi for insert with check (auth.uid() = user_id);
create policy "Admin può tutto sui permessi" on l_permessi for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'ADMIN')
);
```

## 2. DIVENTA AMMINISTRATORE (Esegui questo dopo esserti registrato)
```sql
UPDATE profiles SET role = 'ADMIN' WHERE email = 'spaggiariandrea75@gmail.com';
```
