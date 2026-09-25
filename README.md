# Acervo

Base de conhecimento multi-tenant. Cada empresa envia documentos e conversa com um assistente que responde só com o acervo daquela organização. O isolamento fica no Postgres, com Row Level Security.

## Stack

- Next.js (App Router) e TypeScript
- Supabase: Auth, Postgres, Storage e pgvector
- Gemini, via Vercel AI SDK (`gemini-2.5-flash` e `gemini-embedding-001`)
- Tailwind CSS

## O que já funciona

- Login e cadastro por e-mail
- Organizações com foto, banner, descrição e local
- Visão geral no estilo de perfil, com participantes
- Dono adiciona membros, edita a organização ou apaga; participante sai
- Upload de PDF, TXT e Markdown, com fatiamento e embeddings
- Chat em streaming, restrito aos trechos da organização atual
- Apagar arquivos já enviados
- Perfil com nome, e-mail, foto e organizações

## Começar

1. Crie um projeto no [Supabase](https://supabase.com).
2. No SQL Editor, rode nesta ordem:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_profiles_and_org_details.sql`
3. Copie `.env.example` para `.env.local` e preencha:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
GEMINI_API_KEY=
```

A chave do Gemini sai do [Google AI Studio](https://aistudio.google.com/apikey). `GOOGLE_GENERATIVE_AI_API_KEY` também é aceita.

4. Instale e suba o app:

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`, crie a conta e a primeira organização.

## Isolamento

Toda tabela exposta tem RLS. As políticas usam a associação em `organization_users`, não metadados editáveis do usuário. A busca `match_document_chunks` recebe o `org_id` da organização selecionada e continua como `security invoker`, então o RLS ainda se aplica.

Arquivos ficam no bucket `documents`, no caminho `{org_id}/{document_id}/{arquivo}`. Fotos e banners ficam no bucket público `media`.

## Rotas

| Caminho | Uso |
| --- | --- |
| `/login` | Entrar ou criar conta |
| `/dashboard` | Visão geral da organização atual |
| `/dashboard/organizations/new` | Nova organização |
| `/dashboard/documents` | Enviar e apagar arquivos |
| `/dashboard/chat` | Perguntar ao acervo |
| `/dashboard/profile` | Perfil, organizações e sair da conta |

## Limites desta versão

- PDF só de imagem não tem texto extraível.
- Um participante só entra se já tiver conta com aquele e-mail.
