-- ============================================================
-- PawMatch Database Schema
-- Run this in your Supabase project: SQL Editor → New Query
-- ============================================================

-- 1. Profiles (extends Supabase auth.users)
create table public.profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  role        text not null check (role in ('shelter', 'adopter')),
  name        text not null,
  email       text not null,
  avatar_url  text,
  created_at  timestamptz default now()
);

-- Auto-create a profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, role, name, email)
  values (
    new.id,
    new.raw_user_meta_data->>'role',
    new.raw_user_meta_data->>'name',
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. Pets
create table public.pets (
  id                    uuid default gen_random_uuid() primary key,
  shelter_id            uuid references public.profiles(id) on delete cascade not null,
  name                  text not null,
  breed                 text,
  age_years             numeric(4,1),
  bio                   text,
  photo_url             text,
  status                text not null default 'available' check (status in ('available', 'adopted')),
  category              text not null default 'dog' check (category in ('dog', 'cat', 'rabbit', 'bird', 'other')),
  size                  text check (size in ('small', 'medium', 'large')),
  energy_level          text check (energy_level in ('low', 'medium', 'high')),
  good_with_kids        boolean,
  good_with_other_pets  boolean,
  experience_level      text check (experience_level in ('first_time', 'some_experience', 'experienced')),
  created_at            timestamptz default now()
);


-- 3. Swipes (adopter swiped on a pet)
create table public.swipes (
  id          uuid default gen_random_uuid() primary key,
  adopter_id  uuid references public.profiles(id) on delete cascade not null,
  pet_id      uuid references public.pets(id) on delete cascade not null,
  direction   text not null check (direction in ('left', 'right')),
  created_at  timestamptz default now(),
  unique (adopter_id, pet_id)
);


-- 4. Matches (right swipe confirmed)
create table public.matches (
  id          uuid default gen_random_uuid() primary key,
  adopter_id  uuid references public.profiles(id) on delete cascade not null,
  pet_id      uuid references public.pets(id) on delete cascade not null,
  shelter_id  uuid references public.profiles(id) on delete cascade not null,
  created_at  timestamptz default now(),
  unique (adopter_id, pet_id)
);

-- Auto-create a match when a right swipe is inserted
create or replace function public.handle_right_swipe()
returns trigger as $$
declare
  v_shelter_id uuid;
begin
  if new.direction = 'right' then
    select shelter_id into v_shelter_id from public.pets where id = new.pet_id;
    insert into public.matches (adopter_id, pet_id, shelter_id)
    values (new.adopter_id, new.pet_id, v_shelter_id)
    on conflict do nothing;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_right_swipe
  after insert on public.swipes
  for each row execute procedure public.handle_right_swipe();


-- 5. Adopter preferences (from the onboarding questionnaire)
create table public.adopter_preferences (
  adopter_id        uuid references public.profiles(id) on delete cascade primary key,
  species           text[] not null default '{}',
  size              text[] not null default '{}',
  energy_level      text check (energy_level in ('low', 'medium', 'high', 'any')),
  experience_level  text check (experience_level in ('first_time', 'some_experience', 'experienced')),
  has_kids          boolean,
  has_other_pets    boolean,
  home_type         text check (home_type in ('apartment', 'house_no_yard', 'house_with_yard')),
  updated_at        timestamptz default now()
);


-- 6. Meeting slots (shelter-defined availability to meet a pet)
create table public.meeting_slots (
  id          uuid default gen_random_uuid() primary key,
  shelter_id  uuid references public.profiles(id) on delete cascade not null,
  pet_id      uuid references public.pets(id) on delete cascade not null,
  start_time  timestamptz not null,
  end_time    timestamptz not null,
  status      text not null default 'open' check (status in ('open', 'booked', 'cancelled')),
  adopter_id  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz default now(),
  check (end_time > start_time)
);

-- Booking/cancelling go through security-definer RPCs so two adopters can't race for the same slot
create or replace function public.book_meeting_slot(p_slot_id uuid)
returns public.meeting_slots as $$
declare
  v_slot public.meeting_slots;
begin
  update public.meeting_slots
  set status = 'booked', adopter_id = auth.uid()
  where id = p_slot_id and status = 'open'
  returning * into v_slot;

  if v_slot is null then
    raise exception 'This time slot is no longer available.';
  end if;

  return v_slot;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.book_meeting_slot(uuid) to authenticated;

create or replace function public.cancel_meeting_slot(p_slot_id uuid)
returns public.meeting_slots as $$
declare
  v_slot public.meeting_slots;
begin
  update public.meeting_slots
  set status = 'open', adopter_id = null
  where id = p_slot_id
    and status = 'booked'
    and (auth.uid() = adopter_id or auth.uid() = shelter_id)
  returning * into v_slot;

  if v_slot is null then
    raise exception 'Slot not found or not cancellable.';
  end if;

  return v_slot;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.cancel_meeting_slot(uuid) to authenticated;


-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

alter table public.profiles            enable row level security;
alter table public.pets                enable row level security;
alter table public.swipes              enable row level security;
alter table public.matches             enable row level security;
alter table public.adopter_preferences enable row level security;
alter table public.meeting_slots       enable row level security;

-- Profiles: anyone can read, only owner can update
create policy "profiles: public read"   on public.profiles for select using (true);
create policy "profiles: owner update"  on public.profiles for update using (auth.uid() = id);

-- Pets: anyone can read available pets; only the shelter that owns them can insert/update/delete
create policy "pets: public read"       on public.pets for select using (status = 'available');
create policy "pets: shelter insert"    on public.pets for insert with check (auth.uid() = shelter_id);
create policy "pets: shelter update"    on public.pets for update using (auth.uid() = shelter_id);
create policy "pets: shelter delete"    on public.pets for delete using (auth.uid() = shelter_id);

-- Swipes: adopters can read/write their own swipes
create policy "swipes: adopter read"    on public.swipes for select using (auth.uid() = adopter_id);
create policy "swipes: adopter insert"  on public.swipes for insert with check (auth.uid() = adopter_id);

-- Matches: visible to the adopter or the shelter
create policy "matches: involved read"  on public.matches for select
  using (auth.uid() = adopter_id or auth.uid() = shelter_id);

-- Adopter preferences: only the owning adopter can read/write
create policy "adopter_preferences: owner read"   on public.adopter_preferences for select using (auth.uid() = adopter_id);
create policy "adopter_preferences: owner insert" on public.adopter_preferences for insert with check (auth.uid() = adopter_id);
create policy "adopter_preferences: owner update" on public.adopter_preferences for update using (auth.uid() = adopter_id);

-- Meeting slots: anyone can see open slots; a shelter sees all its own; an adopter sees ones they booked
create policy "meeting_slots: read" on public.meeting_slots for select
  using (status = 'open' or auth.uid() = shelter_id or auth.uid() = adopter_id);
create policy "meeting_slots: shelter insert" on public.meeting_slots for insert with check (auth.uid() = shelter_id);
create policy "meeting_slots: shelter update" on public.meeting_slots for update using (auth.uid() = shelter_id);
create policy "meeting_slots: shelter delete" on public.meeting_slots for delete using (auth.uid() = shelter_id);


-- ============================================================
-- Storage bucket for pet photos
-- Run this separately in Supabase Storage settings or via:
-- ============================================================
-- insert into storage.buckets (id, name, public) values ('pet-photos', 'pet-photos', true);
-- create policy "pet-photos: public read" on storage.objects for select using (bucket_id = 'pet-photos');
-- create policy "pet-photos: auth upload" on storage.objects for insert with check (bucket_id = 'pet-photos' and auth.role() = 'authenticated');
-- create policy "pet-photos: owner delete" on storage.objects for delete using (bucket_id = 'pet-photos' and auth.uid()::text = (storage.foldername(name))[1]);
