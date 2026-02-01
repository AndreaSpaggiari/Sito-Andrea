
# 🛠️ CONFIGURAZIONE DATABASE PALLAMANO

Esegui questo script nel SQL Editor di Supabase per permettere la gestione dei dati.
Senza queste policy, le operazioni di eliminazione falliranno silenziosamente.

```sql
-- 1. ABILITA RLS SULLE TABELLE PALLAMANO E PROFILI
alter table public.p_partite enable row level security;
alter table public.p_giocatori enable row level security;
alter table public.profiles enable row level security;

-- 2. POLICY PER LA TABELLA PROFILES (CRITICA PER IL FUNZIONAMENTO DELLE ALTRE)
-- Permette agli utenti di leggere il proprio profilo e agli admin di leggere tutti (necessario per le subquery)
drop policy if exists "Profiles are viewable by everyone" on public.profiles;
create policy "Profiles are viewable by everyone" on public.profiles for select using (true);

-- 3. POLICY PER LE PARTITE (Lettura pubblica, Scrittura Admin)
drop policy if exists "Partite viewable by everyone" on public.p_partite;
create policy "Partite viewable by everyone" on public.p_partite for select using (true);

drop policy if exists "Admins can insert matches" on public.p_partite;
create policy "Admins can insert matches" on public.p_partite 
  for insert with check ((SELECT role FROM profiles WHERE id = auth.uid()) = 'ADMIN');

drop policy if exists "Admins can update matches" on public.p_partite;
create policy "Admins can update matches" on public.p_partite 
  for update using ((SELECT role FROM profiles WHERE id = auth.uid()) = 'ADMIN');

drop policy if exists "Admins can delete matches" on public.p_partite;
create policy "Admins can delete matches" on public.p_partite 
  for delete using ((SELECT role FROM profiles WHERE id = auth.uid()) = 'ADMIN');

-- 4. POLICY PER I GIOCATORI
drop policy if exists "Giocatori viewable by everyone" on public.p_giocatori;
create policy "Giocatori viewable by everyone" on public.p_giocatori for select using (true);

drop policy if exists "Admins can manage players" on public.p_giocatori;
create policy "Admins can manage players" on public.p_giocatori 
  for all using ((SELECT role FROM profiles WHERE id = auth.uid()) = 'ADMIN');
```
