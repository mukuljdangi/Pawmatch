-- ============================================================
-- PawMatch — Matching & Meeting Calendar
-- Run this in your Supabase project: SQL Editor → New Query
-- Safe to run on an existing database created from schema.sql
-- ============================================================

-- 1. Pets: richer attributes for matching
alter table public.pets
  add column if not exists category text not null default 'dog'
    check (category in ('dog', 'cat', 'rabbit', 'bird', 'other')),
  add column if not exists size text
    check (size in ('small', 'medium', 'large')),
  add column if not exists energy_level text
    check (energy_level in ('low', 'medium', 'high')),
  add column if not exists good_with_kids boolean,
  add column if not exists good_with_other_pets boolean,
  add column if not exists experience_level text
    check (experience_level in ('first_time', 'some_experience', 'experienced'));


-- 2. Adopter preferences (from the onboarding questionnaire)
create table if not exists public.adopter_preferences (
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

alter table public.adopter_preferences enable row level security;

drop policy if exists "adopter_preferences: owner read"   on public.adopter_preferences;
drop policy if exists "adopter_preferences: owner insert" on public.adopter_preferences;
drop policy if exists "adopter_preferences: owner update" on public.adopter_preferences;

create policy "adopter_preferences: owner read"   on public.adopter_preferences for select using (auth.uid() = adopter_id);
create policy "adopter_preferences: owner insert" on public.adopter_preferences for insert with check (auth.uid() = adopter_id);
create policy "adopter_preferences: owner update" on public.adopter_preferences for update using (auth.uid() = adopter_id);


-- 3. Meeting slots (shelter-defined availability to meet a pet)
create table if not exists public.meeting_slots (
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

alter table public.meeting_slots enable row level security;

drop policy if exists "meeting_slots: read"            on public.meeting_slots;
drop policy if exists "meeting_slots: shelter insert"   on public.meeting_slots;
drop policy if exists "meeting_slots: shelter update"   on public.meeting_slots;
drop policy if exists "meeting_slots: shelter delete"   on public.meeting_slots;

-- Anyone can see open slots; a shelter sees all of its own slots; an adopter sees slots they booked
create policy "meeting_slots: read" on public.meeting_slots for select
  using (status = 'open' or auth.uid() = shelter_id or auth.uid() = adopter_id);

create policy "meeting_slots: shelter insert" on public.meeting_slots for insert
  with check (auth.uid() = shelter_id);

create policy "meeting_slots: shelter update" on public.meeting_slots for update
  using (auth.uid() = shelter_id);

create policy "meeting_slots: shelter delete" on public.meeting_slots for delete
  using (auth.uid() = shelter_id);

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
