# Supabase Setup

This is the step-by-step for wiring the Top Rated site up to a real Supabase project — replacing the mock auth and the JSON file with Postgres + Supabase Auth.

The site keeps running in "mock mode" until the steps below are done, so you can do it without any pressure: every step is safely reversible by just deleting the env vars.

Total time: about **20 minutes**, most of which is waiting for the Supabase dashboard to provision.

---

## 1. Create the Supabase project (5 min)

1. Go to [supabase.com](https://supabase.com) and sign in (or sign up — the free tier is enough).
2. Click **New project**. Pick a name (e.g. `top-rated-prod`), set a strong database password, and pick the region closest to your store.
3. Wait for the project to finish provisioning. The little spinner top-left turns green when it's ready.
4. Once it's up, open **Project Settings → API** in the sidebar. You'll need three values from this page:
   - **Project URL** — looks like `https://abcdwxyz.supabase.co`
   - **anon / public key** — long string starting with `eyJ...`
   - **service_role key** — also starts with `eyJ...`. **Keep this one secret.** Don't commit it. Don't paste it in the browser.

---

## 2. Apply the database migration (5 min)

The schema, RLS policies, and category seed data live in **`supabase/migrations/0001_init.sql`**.

Pick whichever option is easier for you:

### Option A — paste into the SQL editor (no CLI required)

1. In the Supabase dashboard, open **SQL Editor** → **New query**.
2. Open `supabase/migrations/0001_init.sql` in your code editor, copy the whole file.
3. Paste it into the SQL Editor and click **Run**.
4. You should see "Success. No rows returned." Tables now show up under **Table Editor**.

### Option B — Supabase CLI (if you'll be doing this more than once)

```bash
# one-time:
brew install supabase/tap/supabase    # or follow instructions for your OS
supabase login

# from the project root:
supabase link --project-ref <your-project-ref>
supabase db push
```

The migration is idempotent — re-running it on an existing project is safe.

---

## 3. Wire up your local `.env.local` (1 min)

Create a file called `.env.local` in the project root (alongside `package.json`):

```bash
# Required for everything below to switch on
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your_anon_key...
```

Restart `next dev` after creating this file — Next reads env vars at startup.

You should now see the **"Demo mode"** banner disappear from `/login` and `/signup`.

---

## 4. Push your inventory into Postgres (2 min)

The 432 products from `data/db.json` need to land in the `products` table. Use the migration script:

```bash
# one-time per shell session — DO NOT commit these
export SUPABASE_URL='https://YOUR_PROJECT.supabase.co'
export SUPABASE_SERVICE_ROLE_KEY='eyJ...your_service_role_key...'

python3 scripts/migrate_to_supabase.py
```

Expected output:

```
Upserted 12 categories.
Upserted products 1-100 of 432
Upserted products 101-200 of 432
...
Done. 432 products live in Supabase.
```

The script is idempotent — re-running it after editing `Downloaded_File.xlsx` and running `scripts/ingest_inventory.py` pushes the updated rows.

---

## 5. Create your admin user (2 min)

1. Go to your site at `http://localhost:3000/signup` and create an account. (Or use the Supabase dashboard's **Authentication → Users → Add user**.)
2. Confirm the email — Supabase sends a verification link automatically.
3. In the SQL Editor, promote your user to admin:

   ```sql
   update public.profiles
   set role = 'admin'
   where email = 'you@example.com';
   ```

4. Sign in at `/login` and verify `/admin` is reachable. Open `/admin/inventory` — toggling a flag now writes to Postgres instead of `db.json`.

---

## 6. (Optional) Disable email confirmation for local dev

If you're iterating fast and don't want to verify every test signup:

1. Dashboard → **Authentication → Providers → Email**
2. Toggle **Confirm email** off.
3. Save.

Toggle it back **on** before going to production.

---

## What's wired up vs what's still TODO

After the steps above:

✅ Sign-in / sign-up against Supabase
✅ Email verification flow
✅ Session cookies refreshed automatically on each navigation (`proxy.ts`)
✅ Admin route gated server-side
✅ Inventory reads from Postgres
✅ Admin inventory edits write to Postgres
✅ RLS policies enforce the auth boundary at the database level

⏳ Order persistence (Tier 1 §1.4 in `PRODUCTION_AUDIT.md`)
⏳ Cart and want-list moved to `public.carts` / `public.want_lists`
⏳ Real customer/order data in `/admin/customers` and `/admin/orders`
⏳ Clover payment integration (Tier 1 §1.3)
⏳ Transactional email (Tier 1 §1.5)

---

## Troubleshooting

**The site won't boot, says "Could not find database 'auth.users'"**
You skipped step 2 — go run the SQL migration first.

**Sign-up works but my profile row never appears**
The `handle_new_user` trigger creates the profile. Check **Authentication → Hooks** in the dashboard to make sure the trigger is active. The migration sets it up by default.

**Email confirmation link 404s**
Check `Project Settings → Auth → Site URL`. It needs to be `http://localhost:3000` for local dev (or your prod URL in production). The auth callback expects `/auth/callback`.

**`/admin/inventory` toggles say "Not authorized"**
You didn't promote your user. Re-run the SQL from step 5.

**My `getProducts` call is empty after the migration**
The site is still falling back to `db.json` because env vars aren't picked up. Make sure `.env.local` is in the project root (not in `app/` or anywhere else), and **restart `next dev`** after editing it.

**ESLint complains about `proxy.ts` not being callable**
That's fine — `proxy.ts` is a Next.js convention file. `next dev` and `next build` both pick it up automatically.

---

## Sources

- `supabase/migrations/0001_init.sql` — the schema
- `scripts/migrate_to_supabase.py` — the data push
- `PRODUCTION_AUDIT.md` — what comes after Tier 1.1/1.2
