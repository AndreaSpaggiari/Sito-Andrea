
# 🛠️ FIX DEFINITIVO (Senza Errori)

Copia e incolla questo script. Ho aggiunto un controllo per il Real-time così non avrai più l'errore che hai visto nello screenshot.

```sql
-- 1. ASSICURATI CHE ANDREA SIA ADMIN (Fondamentale per vedere i permessi)
UPDATE public.profiles 
SET role = 'ADMIN' 
WHERE email = 'spaggiaricrotti@gmail.com';

-- 2. ABILITA SICUREZZA
alter table public.profiles enable row level security;
alter table public.l_permessi enable row level security;

-- 3. POLICY PROFILI (Permette a te di vedere le email degli altri)
drop policy if exists "Profiles are viewable by everyone" on public.profiles;
create policy "Profiles are viewable by everyone" on public.profiles
  for select using (true);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- 4. POLICY PERMESSI
drop policy if exists "Users can see own permissions" on public.l_permessi;
create policy "Users can see own permissions" on public.l_permessi
  for select using (auth.uid() = user_id OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'ADMIN');

drop policy if exists "Users can insert own permission requests" on public.l_permessi;
create policy "Users can insert own permission requests" on public.l_permessi
  for insert with check (auth.uid() = user_id);

drop policy if exists "Admins can update permissions" on public.l_permessi;
create policy "Admins can update permissions" on public.l_permessi
  for update using ((SELECT role FROM profiles WHERE id = auth.uid()) = 'ADMIN');

-- 5. ATTIVA REAL-TIME SOLO SE NECESSARIO (Evita l'errore di tabella già presente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'l_permessi'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.l_permessi;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
END $$;
```
