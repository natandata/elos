# ELOS

Plataforma de acompanhamento, discipulado e gamificação dos grupos de adolescentes (ELOS).

Next.js 16 (App Router) + TypeScript + Tailwind 4 + Supabase (Postgres, Auth, RLS, Realtime).

---

## Como rodar

```bash
npm install
cp .env.example .env.local   # preencha com os dados do seu projeto Supabase
npm run dev
```

Outros comandos:

```bash
npm run build
npm run lint
```

## Variáveis de ambiente

| Variável | Onde vive | Para quê |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | público | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | público | chave anônima (protegida por RLS) |
| `ADMIN_EMAIL` | **servidor** | conta usada pela tela "Acesso Administrativo" |

Não existe senha administrativa no código nem no bundle: a tela envia o que foi
digitado para uma Server Action, e quem valida é o Supabase Auth.

## Banco de dados

As migrations ficam em `supabase/migrations/`, na ordem:

1. `0001_init.sql` — tipos, tabelas, índices, triggers (perfil no cadastro, Elo
   automático, trava de XP/role/Elo para o próprio usuário).
2. `0002_rls_rpc.sql` — políticas RLS, RPCs `submit_assignment`,
   `review_assignment`, `elo_rankings`, `public_stats`, notificações e o seed dos
   seis ELOS.
3. `0003_seed_admin.sql` — cria `admin@elos.app` com a senha inicial `cria2024`.

Rode na ordem pelo SQL Editor do Supabase (ou `supabase db push` com a CLI).

**Depois de rodar, no painel do Supabase:**

- Authentication → Providers → desative "Confirm email" (ou os cadastros ficam
  pendentes de confirmação) e configure o provider Google, se for usar.
- Authentication → URL Configuration → adicione a URL de produção e
  `http://localhost:3000/auth/callback` em Redirect URLs.
- Troque a senha de `admin@elos.app` em Authentication → Users.

## Deploy na Vercel (plano Hobby, sem custo)

O projeto já roda no free tier: Vercel Hobby + Supabase Free.

```bash
npx vercel login
npx vercel        # preview
npx vercel --prod # produção
```

Na primeira execução a Vercel pergunta o diretório (`.`) e detecta Next.js
sozinha. Depois, cadastre as três variáveis de ambiente em
Project → Settings → Environment Variables (Production **e** Preview):

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
ADMIN_EMAIL
```

Os valores são os mesmos do `.env.local`. Depois do primeiro deploy, volte ao
Supabase em Authentication → URL Configuration e adicione a URL da Vercel em
**Site URL** e `https://SEU-APP.vercel.app/auth/callback` em **Redirect URLs**,
senão o login com Google volta para o endereço errado.

Alternativa: suba o repositório para o GitHub e use "Import Project" na Vercel —
aí cada push vira deploy automático.

## Regras de negócio garantidas no banco

- XP só é creditado quando a missão é **aprovada** (`review_assignment`).
- Uma missão aprovada não credita XP duas vezes: `xp_transactions.assignment_id`
  é único e o status precisa estar em `awaiting_approval`.
- O cria não altera o próprio XP, Elo ou perfil — trigger `guard_profile_update`.
- O líder só aprova missões dos crias vinculados a ele (`is_leader_of`).
- Cada cria vê apenas o próprio status; o líder vê o dos seus crias; o admin vê tudo.
- O Elo inicial vem de gênero + faixa etária; só o admin muda depois.

## Estrutura

```
src/
  app/
    page.tsx                 login (contadores em tempo real, tema dinâmico)
    admin-access/            acesso administrativo (Server Action)
    auth/callback/           troca do código OAuth por sessão
    app/
      status/                pesquisa diária de status (líder e cria)
      completar-perfil/      onboarding de quem entrou pelo Google
      (shell)/               área logada com menu por perfil
        admin/ lider/ cria/ ranking/ agenda/ perfil/ notificacoes/
  components/                UI, formulários, missões, shell
  lib/
    supabase/                clients (browser, server) 
    actions/                 Server Actions (missões, admin, status, perfil)
    auth.ts types.ts
supabase/migrations/         schema, RLS, RPCs e seed
```

## Temas

O tema segue o gênero do usuário: masculino (amarelo + preto), feminino (rosa +
branco), administração (roxo). Durante o cadastro ele muda ao vivo conforme a
seleção. As cores são variáveis CSS em `src/app/globals.css`.

## Fora do MVP

Chat, push notifications, badges, feed social, upload de comprovação e app nativo
ficaram para versões futuras, conforme o PRD.
