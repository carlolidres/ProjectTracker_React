-- AI Assistant conversations (owner-only) plus Access Matrix menu key.

CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New chat',
  context_type text CHECK (context_type IS NULL OR context_type = ANY (ARRAY['project', 'support', 'task']::text[])),
  context_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_conversations_user_updated_idx
  ON public.ai_conversations (user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role = ANY (ARRAY['user', 'assistant', 'error']::text[])),
  content text NOT NULL DEFAULT '',
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  follow_ups jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_messages_conversation_idx
  ON public.ai_messages (conversation_id, created_at);

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_conversations_select ON public.ai_conversations;
CREATE POLICY ai_conversations_select
  ON public.ai_conversations FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND public.is_active_user());

DROP POLICY IF EXISTS ai_conversations_insert ON public.ai_conversations;
CREATE POLICY ai_conversations_insert
  ON public.ai_conversations FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_active_user());

DROP POLICY IF EXISTS ai_conversations_update ON public.ai_conversations;
CREATE POLICY ai_conversations_update
  ON public.ai_conversations FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND public.is_active_user())
  WITH CHECK (user_id = auth.uid() AND public.is_active_user());

DROP POLICY IF EXISTS ai_conversations_delete ON public.ai_conversations;
CREATE POLICY ai_conversations_delete
  ON public.ai_conversations FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND public.is_active_user());

DROP POLICY IF EXISTS ai_messages_select ON public.ai_messages;
CREATE POLICY ai_messages_select
  ON public.ai_messages FOR SELECT TO authenticated
  USING (
    public.is_active_user()
    AND EXISTS (
      SELECT 1 FROM public.ai_conversations c
      WHERE c.id = ai_messages.conversation_id AND c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS ai_messages_insert ON public.ai_messages;
CREATE POLICY ai_messages_insert
  ON public.ai_messages FOR INSERT TO authenticated
  WITH CHECK (
    public.is_active_user()
    AND EXISTS (
      SELECT 1 FROM public.ai_conversations c
      WHERE c.id = ai_messages.conversation_id AND c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS ai_messages_delete ON public.ai_messages;
CREATE POLICY ai_messages_delete
  ON public.ai_messages FOR DELETE TO authenticated
  USING (
    public.is_active_user()
    AND EXISTS (
      SELECT 1 FROM public.ai_conversations c
      WHERE c.id = ai_messages.conversation_id AND c.user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_conversations TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.ai_messages TO authenticated;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'menu_permission_overrides'
  ) THEN
    ALTER TABLE public.menu_permission_overrides
      DROP CONSTRAINT IF EXISTS menu_permission_overrides_menu_key_check;
    ALTER TABLE public.menu_permission_overrides
      ADD CONSTRAINT menu_permission_overrides_menu_key_check CHECK (
        menu_key = ANY (ARRAY[
          'dashboard',
          'project_management',
          'ai_assistant',
          'projects_entry',
          'projects_database',
          'support_activities',
          'cnf_tracker',
          'endorsement_tracker',
          'lessons_learned',
          'audit_trail',
          'archived',
          'registry',
          'admin_users',
          'admin_access',
          'admin_data_map'
        ]::text[])
      );
  END IF;
END $$;
