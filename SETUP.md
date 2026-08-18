# PawMatch — Setup Guide 🐾

A Tinder-style pet adoption app. Shelters post pets, adopters swipe to find their match.

---

## Tech Stack

- **React + Vite** — frontend
- **Supabase** — database, auth, file storage (free tier works)
- **Tailwind CSS** — styling
- **Vercel** — deployment (free)

---

## Step 1: Clone & Install

```bash
# In your terminal, navigate to this folder then:
npm install
```

---

## Step 2: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Click **New Project** and give it a name (e.g. `pawmatch`)
3. Once created, go to **SQL Editor → New Query**
4. Paste the entire contents of `supabase/schema.sql` and click **Run**
5. Go to **Storage** → create a bucket named `pet-photos`, set it to **Public**

> **Already have a PawMatch database from before?** Run `supabase/migrations/002_matching_and_calendar.sql` in the SQL Editor too — it adds the pet match attributes, adopter preferences, and meeting-slot tables/RPCs without touching your existing data.

---

## Step 3: Add Your Environment Variables

1. Copy the example file:
   ```bash
   cp .env.example .env
   ```
2. In Supabase: go to **Settings → API**
3. Copy **Project URL** → paste as `VITE_SUPABASE_URL`
4. Copy **anon public** key → paste as `VITE_SUPABASE_ANON_KEY`

---

## Step 4: Run Locally

```bash
npm run dev
```

Visit [http://localhost:5173](http://localhost:5173)

**Test the flow:**
- Register as a **Shelter** → add some pets (with category/size/energy/etc.) → add meeting times under **📅 Meeting times**
- Register as an **Adopter** → answer the match questionnaire → swipe on pets (best matches first)
- Check **Matches** to see connections, and book a meet-and-greet time from a match card
- Back in the shelter view, **📅 Meeting times** and **❤️ Interested adopters** show who booked

---

## Step 5: Deploy to Vercel (make it live!)

```bash
npm install -g vercel
vercel
```

Follow the prompts. When asked about environment variables, add your two `VITE_SUPABASE_*` values.

Or connect your GitHub repo at [vercel.com](https://vercel.com) for automatic deploys on every push.

---

## Project Structure

```
pawmatch/
├── src/
│   ├── components/
│   │   ├── Navbar.jsx           # Shared nav, shelter/adopter accent themes
│   │   ├── SwipeCard.jsx        # Draggable swipe card (tags + match badge)
│   │   └── MeetingScheduler.jsx # Book a meet-and-greet slot
│   ├── context/
│   │   └── AuthContext.jsx      # Auth state + profile + adopter preferences
│   ├── lib/
│   │   ├── supabase.js          # Supabase client
│   │   ├── constants.js         # Shared category/size/energy/etc. option lists
│   │   └── matching.js          # Species hard-filter + match scoring
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Register.jsx         # Role selection (shelter / adopter)
│   │   ├── Onboarding.jsx       # Adopter match questionnaire
│   │   ├── AdopterFeed.jsx      # Swipe UI, filtered + ranked by preferences
│   │   ├── ShelterDashboard.jsx # Post & manage pets
│   │   ├── ShelterMeetings.jsx  # Manage meet-and-greet availability
│   │   └── Matches.jsx          # View matches / book or see meetings
│   ├── App.jsx                  # Router + auth guards
│   └── main.jsx
├── supabase/
│   ├── schema.sql               # Full DB schema + RLS policies (fresh installs)
│   └── migrations/
│       └── 002_matching_and_calendar.sql  # Additive migration for existing DBs
└── .env.example
```

---

## What's Next (good resume talking points)

- **Messaging** — real-time chat between shelter and adopter using Supabase Realtime
- **Shelter-side approval** — let a shelter confirm/decline a booking instead of instant-book
- **Email notifications** — notify shelters when they get a new match or booking (Supabase Edge Functions + Resend)
- **Map view** — show shelters near you (Google Maps API)
- **Mobile app** — wrap in Expo/React Native with the same Supabase backend

---

## Common Issues

| Problem | Fix |
|---|---|
| `Missing Supabase env vars` | Make sure `.env` exists with your keys |
| Photos not uploading | Check the `pet-photos` storage bucket exists and is public |
| Auth not working | Confirm the `handle_new_user` trigger ran in the SQL editor |
| Blank page on deploy | Add env vars in Vercel project settings |
