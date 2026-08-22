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

Entries are shared through the Supabase project configured in `app.js`. In Supabase SQL Editor, create the table and policies below before using the deployed site:

```sql
create table public.logs (
	id uuid primary key,
	type text not null,
	title text not null,
	details text not null,
	values jsonb default '{}'::jsonb,
	color text,
	created_at timestamptz default now()
);

alter table public.logs enable row level security;
create policy "Anyone can read logs" on public.logs for select using (true);
create policy "Anyone can add logs" on public.logs for insert with check (true);
create policy "Anyone can delete logs" on public.logs for delete using (true);
```

The publishable key is safe to use in this browser app. These policies make the log publicly readable and editable, so add Supabase Auth and user-based policies before storing anything private.

## Forward the port in VS Code

With the server running, open the **Ports** panel in VS Code, locate port `3000`, and choose **Forward Port**. Open the forwarded address shown in the panel to view the app remotely.
