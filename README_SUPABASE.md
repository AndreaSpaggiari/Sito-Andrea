
# 🛠️ FIX DEFINITIVO CHAT SUPABASE

Se la chat non invia messaggi, incolla ed esegui questo script nel SQL Editor di Supabase.

```sql
-- 1. SBLOCCA TABELLA MESSAGGI PER TUTTI (ANONIMI E AUTENTICATI)
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Cancella vecchie policy se esistono
DROP POLICY IF EXISTS "Anyone can read messages" ON public.messages;
DROP POLICY IF EXISTS "Anyone can insert messages" ON public.messages;

-- Crea nuove policy aperte
CREATE POLICY "Anyone can read messages" ON public.messages 
FOR SELECT USING (true);

CREATE POLICY "Anyone can insert messages" ON public.messages 
FOR INSERT WITH CHECK (true);

-- 2. ABILITA IL REALTIME (IMPORTANTE PER VEDERE I MESSAGGI SUBITO)
-- Controlla se la pubblicazione esiste, altrimenti creala
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

-- Aggiungi la tabella messages alla pubblicazione realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
```
