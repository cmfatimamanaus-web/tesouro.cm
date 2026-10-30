CREATE TABLE public.push_inscricoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  user_id uuid,
  numero text,
  plataforma text,
  categorias text[] NOT NULL DEFAULT ARRAY['geral','missas','reunioes','formacao','eventos','urgente'],
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.push_inscricoes TO service_role;
ALTER TABLE public.push_inscricoes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.notificacoes_enviadas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  corpo text NOT NULL,
  url text NOT NULL DEFAULT '/',
  categoria text NOT NULL DEFAULT 'geral',
  chave_envio text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'enviando',
  total int NOT NULL DEFAULT 0,
  sucesso int NOT NULL DEFAULT 0,
  falhas int NOT NULL DEFAULT 0,
  tokens_removidos int NOT NULL DEFAULT 0,
  erro text,
  enviado_em timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.notificacoes_enviadas TO service_role;
ALTER TABLE public.notificacoes_enviadas ENABLE ROW LEVEL SECURITY;