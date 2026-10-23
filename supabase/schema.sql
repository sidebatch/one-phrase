-- One Phrase 커뮤니티(진도 공유) 스키마
-- Supabase 대시보드 > SQL Editor 에 붙여넣고 Run 한 번이면 됩니다. 다시 실행해도 안전합니다.
-- 설계: 공개되는 것은 닉네임과 진도뿐. 이메일은 auth 쪽에만 있고 이 테이블들에 없습니다.
--       내 행은 나만 쓰고, 읽기는 로그인한 참여자만 가능합니다.
-- 진도는 언어별로 한 행씩 보관합니다: 기본 키 (user_id, lang). lang은 fr/en/es.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null unique check (char_length(nickname) between 1 and 20),
  created_at timestamptz not null default now()
);

create table if not exists public.progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  lang text not null default 'fr',
  completed jsonb not null default '{}'::jsonb,      -- {문장 id: 완료 날짜}
  review_correct jsonb not null default '[]'::jsonb,  -- 복습 퀴즈에서 맞힌 문장 id 목록
  updated_at timestamptz not null default now(),
  primary key (user_id, lang)
);

-- 기존 DB 이전 (v1.31.x 이전에 만든 DB만): 기본 키를 (user_id, lang)으로 바꾼다.
-- create table if not exists 는 기존 테이블을 건드리지 않으므로, 이미 progress 테이블이
-- 있으면 아래 두 줄을 한 번 실행해야 언어별 행을 따로 저장할 수 있다.
-- 이미 바꾼 뒤에 다시 실행하면 오류가 나지만 데이터에는 영향이 없다.
-- alter table public.progress drop constraint if exists progress_pkey;
-- alter table public.progress add primary key (user_id, lang);

alter table public.profiles enable row level security;
alter table public.progress enable row level security;

-- 권한: 프로젝트에서 자동 노출을 껐으므로 필요한 것만 직접 연다
grant select on public.profiles to authenticated;
grant insert, update on public.profiles to authenticated;
grant select on public.progress to authenticated;
grant insert, update, delete on public.progress to authenticated;

-- profiles 정책
drop policy if exists "profiles readable by members" on public.profiles;
create policy "profiles readable by members" on public.profiles
  for select to authenticated using (true);

drop policy if exists "own profile insert" on public.profiles;
create policy "own profile insert" on public.profiles
  for insert to authenticated with check (id = auth.uid());

drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- progress 정책
drop policy if exists "progress readable by members" on public.progress;
create policy "progress readable by members" on public.progress
  for select to authenticated using (true);

drop policy if exists "own progress write" on public.progress;
create policy "own progress write" on public.progress
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
