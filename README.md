# logs

## Run locally

This is a static web app. Start a local server from the project directory:

```bash
python3 -m http.server 3000
```

Open http://localhost:3000 in your browser.

## Customize log prompts

Each log type has its own editable `fields` section near the top of `app.js` in `logTypeConfig`. Add, remove, or change fields in the relevant topic section to make its entry form ask for completely different information. Supported field types are regular inputs, `textarea`, and `select` with `options`.

The access code is requested once when the website is first opened in a browser tab. The unlocked state is kept for that tab's session while you move between log types and views.

## Supabase database

Entries are shared through the Supabase project configured in `app.js`. The app now normalizes restored or legacy rows before rendering so a Supabase backup/restore or a re-created table is easier to recover without changing the website experience.

In Supabase SQL Editor, create the table and policies below before using the deployed site:

```sql
create table if not exists public.logs (
  id uuid primary key,
  type text not null default 'Software',
  title text not null,
  details text not null,
  values jsonb not null default '{}'::jsonb,
  color text,
  created_at timestamptz not null default now()
);

alter table public.logs enable row level security;
create policy "Anyone can read logs" on public.logs for select using (true);
create policy "Anyone can add logs" on public.logs for insert with check (true);
create policy "Anyone can delete logs" on public.logs for delete using (true);
```

If the table already exists, run this migration to ensure the schema matches the app's restore-safe expectations:

```sql
alter table public.logs add column if not exists color text;
alter table public.logs alter column values set default '{}'::jsonb;
alter table public.logs alter column values set not null;
alter table public.logs alter column created_at set default now();
alter table public.logs alter column created_at set not null;
```

This app treats `values` as the canonical JSON payload for per-entry metadata such as `context` and `time`, and it normalizes any legacy or restored row shape before displaying it. That keeps the web UI unchanged while making database restoration and table recreation much easier to recover from.

If an insert returns `new row violates row-level security policy`, run this in the Supabase SQL Editor. It safely replaces the public demo policies required by this unauthenticated app:

```sql
alter table public.logs enable row level security;
drop policy if exists "Anyone can read logs" on public.logs;
drop policy if exists "Anyone can add logs" on public.logs;
drop policy if exists "Anyone can delete logs" on public.logs;
create policy "Anyone can read logs" on public.logs for select using (true);
create policy "Anyone can add logs" on public.logs for insert with check (true);
create policy "Anyone can delete logs" on public.logs for delete using (true);
```

The publishable key is safe to use in this browser app. These policies make the log publicly readable and editable, so add Supabase Auth and user-based policies before storing anything private.

## Forward the port in VS Code

With the server running, open the **Ports** panel in VS Code, locate port `3000`, and choose **Forward Port**. Open the forwarded address shown in the panel to view the app remotely.
