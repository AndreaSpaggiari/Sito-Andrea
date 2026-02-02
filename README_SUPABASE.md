
# 🚀 FIX PERSISTENZA CHAT

Esegui questo script nel SQL Editor di Supabase per sbloccare il database per la chat.

```sql
-- 1. CREA LA TABELLA SE NON ESISTE (O AGGIORNA)
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    sender_name TEXT NOT NULL,
    recipient_name TEXT DEFAULT 'ALL',
    content TEXT NOT NULL
);

-- 2. ABILITA SICUREZZA
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 3. PERMESSI DI LETTURA (TUTTI)
DROP POLICY IF EXISTS "Anyone can read" ON public.messages;
CREATE POLICY "Anyone can read" ON public.messages 
FOR SELECT USING (true);

-- 4. PERMESSI DI SCRITTURA (TUTTI)
DROP POLICY IF EXISTS "Anyone can insert" ON public.messages;
CREATE POLICY "Anyone can insert" ON public.messages 
FOR INSERT WITH CHECK (true);

-- 5. ABILITA REALTIME
-- Nota: Assicurati di aver attivato 'messages' nella dashboard Supabase -> Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
```
