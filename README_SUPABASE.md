
# 🛠️ CONFIGURAZIONE DATABASE PALLAMANO

Esegui questo script nel SQL Editor di Supabase.

```sql
-- 1. PULIZIA E CREAZIONE TABELLA STATISTICHE
drop table if exists public.p_statistiche;

create table public.p_statistiche (
  id uuid default gen_random_uuid() primary key,
  player_id uuid references public.p_giocatori(id) on delete cascade,
  presenze int default 0,
  ammonizioni int default 0,
  esclusioni_2m int default 0,
  rosse int default 0,
  blu int default 0,
  goal int default 0,
  tiri_totali int default 0,
  rigori_segnati int default 0,
  rigori_totali int default 0,
  parate int default 0,
  tiri_subiti int default 0,
  assist int default 0,
  created_at timestamp with time zone default now(),
  -- Vincolo fondamentale per permettere l'UPSERT (una riga per giocatore)
  constraint unique_player_stats unique (player_id)
);

-- 2. RLS E POLICY
alter table public.p_statistiche enable row level security;
create policy "Statistiche viewable by everyone" on public.p_statistiche for select using (true);
create policy "Admins can manage stats" on public.p_statistiche for all using ((SELECT role FROM profiles WHERE id = auth.uid()) = 'ADMIN');

-- 3. INSERIMENTO DATI INIZIALI (Dall'immagine fornita)
-- Questo script cerca i giocatori per cognome e numero e inserisce i dati.
-- Se i giocatori non sono ancora nel DB, questo script non farà nulla per quelle righe.

do $$
declare
  pid uuid;
begin
  -- Anastasio Egidio (N. maglia supposto)
  select id into pid from p_giocatori where cognome = 'ANASTASIO' limit 1;
  if pid is not null then insert into p_statistiche (player_id, presenze, goal, tiri_totali) values (pid, 2, 3, 6) on conflict (player_id) do update set presenze=2, goal=3, tiri_totali=6; end if;

  -- Barca Tricolici Nicolas (Portiere)
  select id into pid from p_giocatori where cognome = 'BARCA TRICOLICI' limit 1;
  if pid is not null then insert into p_statistiche (player_id, presenze, goal, parate, tiri_subiti) values (pid, 2, 27, 7, 27) on conflict (player_id) do update set presenze=2, goal=27, parate=7, tiri_subiti=27; end if;

  -- Lombardini Gabriele
  select id into pid from p_giocatori where cognome = 'LOMBARDINI' limit 1;
  if pid is not null then insert into p_statistiche (player_id, presenze, ammonizioni, esclusioni_2m, goal, tiri_totali, assist) values (pid, 2, 1, 1, 13, 30, 2) on conflict (player_id) do update set presenze=2, ammonizioni=1, esclusioni_2m=1, goal=13, tiri_totali=30, assist=2; end if;

  -- Stefani Flavio
  select id into pid from p_giocatori where cognome = 'STEFANI' limit 1;
  if pid is not null then insert into p_statistiche (player_id, presenze, esclusioni_2m, goal, tiri_totali, rigori_segnati, rigori_totali, assist) values (pid, 2, 1, 12, 18, 1, 2, 3) on conflict (player_id) do update set presenze=2, esclusioni_2m=1, goal=12, tiri_totali=18, rigori_segnati=1, rigori_totali=2, assist=3; end if;
end $$;
```
