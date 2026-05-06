# 🍽️ Dish Diary — Deployment Guide

Full-stack meal tracking app. React + TypeScript frontend, Supabase backend, deploys to Vercel in ~15 minutes.

---

## Stack
- **Frontend**: React 18, TypeScript, Vite
- **Backend/DB**: Supabase (Postgres, Auth, Realtime)
- **Hosting**: Vercel (free tier)

---

## Step 1 — Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign up (free)
2. Click **New project**, give it a name (e.g. `dish-diary`), set a database password, pick a region close to you
3. Wait ~2 minutes for it to provision

---

## Step 2 — Run the database schema

1. In your Supabase dashboard, go to **SQL Editor** → **New query**
2. Copy the entire contents of `supabase/migrations/001_initial_schema.sql`
3. Paste it in and click **Run**
4. You should see "Success" — all tables, policies, views, and triggers are now created

---

## Step 3 — Get your API keys

1. In Supabase dashboard → **Settings** → **API**
2. Copy:
   - **Project URL** (looks like `https://abcdefgh.supabase.co`)
   - **anon / public key** (the long `eyJ...` string)

---

## Step 4 — Configure environment variables locally

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

---

## Step 5 — Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) — create an account and test everything.

---

## Step 6 — Deploy to Vercel

### Option A: Via GitHub (recommended)

1. Push this project to a GitHub repo:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/dish-diary.git
   git push -u origin main
   ```

2. Go to [vercel.com](https://vercel.com) → **New Project** → import your GitHub repo

3. In the **Environment Variables** section, add:
   - `VITE_SUPABASE_URL` = your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = your anon key

4. Click **Deploy** — done! Vercel gives you a live URL instantly.

### Option B: Via Vercel CLI

```bash
npm install -g vercel
vercel
# Follow prompts, then add env vars in Vercel dashboard
```

---

## Step 7 — Configure Supabase Auth (important!)

1. In Supabase dashboard → **Authentication** → **URL Configuration**
2. Set **Site URL** to your Vercel deployment URL (e.g. `https://dish-diary.vercel.app`)
3. Add your Vercel URL to **Redirect URLs**
4. Optionally under **Email Templates**, customize the confirmation email with your branding

---

## Features included

| Feature | Status |
|---|---|
| Email/password auth | ✅ |
| User profiles | ✅ |
| Friend requests (email invite, must accept) | ✅ |
| Restaurant search + manual add | ✅ |
| Menu browsing by category | ✅ |
| Log dishes with star or detailed ratings | ✅ |
| Log on behalf of friends at the table | ✅ |
| Repeat dish averaging + combined notes | ✅ |
| Group dining sessions with shareable code | ✅ |
| Realtime session participant sync | ✅ |
| Wishlist with priority levels | ✅ |
| Clickable restaurant cards → detail view | ✅ |
| Persistent data across devices | ✅ |
| Row-level security (users only see own data) | ✅ |
| Mobile responsive | ✅ |

---

## Optional upgrades (future)

### Real restaurant search
Replace the mock search in `src/lib/helpers.ts` → `searchRestaurants()` with a call to the [Google Places API](https://developers.google.com/maps/documentation/places/web-service/overview). You'll need a Google Cloud API key with Places enabled.

### Email notifications
In Supabase dashboard → **Database** → **Webhooks**, you can trigger emails when friend requests come in using services like Resend or SendGrid.

### Custom domain
In Vercel → your project → **Settings** → **Domains**, add any domain you own.

### Push notifications (mobile PWA)
Add a `manifest.json` and service worker to make the app installable on phones with push support.

---

## Project structure

```
dish-diary/
├── src/
│   ├── components/
│   │   └── Logo.tsx              # SVG logo component
│   ├── hooks/
│   │   ├── useAuth.tsx           # Auth context + hook
│   │   ├── useEntries.ts         # Diary entries CRUD
│   │   ├── useFriends.ts         # Friend requests
│   │   └── useSession.ts         # Group dining sessions
│   ├── lib/
│   │   ├── supabase.ts           # Supabase client
│   │   └── helpers.ts            # Menu data, utilities
│   ├── pages/
│   │   ├── AuthPage.tsx          # Login + signup
│   │   ├── LogPage.tsx           # Main diary feed
│   │   ├── AddMealPage.tsx       # 3-step meal logging
│   │   ├── WishlistPage.tsx      # Want-to-try list
│   │   ├── SessionPage.tsx       # Group dining
│   │   ├── PlacesPage.tsx        # Restaurant browser
│   │   └── ProfilePage.tsx       # Profile + friends
│   ├── types/index.ts            # TypeScript types
│   ├── App.tsx                   # Shell + navigation
│   ├── main.tsx                  # Entry point
│   └── index.css                 # Global styles
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql  # Full DB schema
├── index.html
├── vite.config.ts
├── tsconfig.json
├── vercel.json
└── .env.example
```

---

## Troubleshooting

**"Missing VITE_SUPABASE_URL" error** — Make sure `.env.local` exists and has both variables. Restart `npm run dev` after adding them.

**Auth not redirecting after email confirmation** — Check that your Vercel URL is in Supabase → Authentication → Redirect URLs.

**"Row violates RLS policy" errors** — This means a database operation is being blocked by security rules. Double-check the user is logged in and the `user_id` field is being set correctly.

**Friends can't see each other's data** — Friend requests must be in `accepted` status. Check the `friend_requests` table in Supabase dashboard.
