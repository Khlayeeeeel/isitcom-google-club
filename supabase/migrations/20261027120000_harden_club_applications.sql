begin;

create table if not exists public.club_applications (
  id bigint generated always as identity primary key,
  full_name text not null,
  email text not null,
  study_year text not null,
  field_of_study text not null,
  department text not null,
  motivation text,
  created_at timestamptz not null default now()
);

alter table public.club_applications
  alter column motivation drop not null;

alter table public.club_applications
  drop constraint if exists club_applications_full_name_length,
  drop constraint if exists club_applications_email_format,
  drop constraint if exists club_applications_study_year_allowed,
  drop constraint if exists club_applications_field_length,
  drop constraint if exists club_applications_department_allowed,
  drop constraint if exists club_applications_motivation_length;

alter table public.club_applications
  add constraint club_applications_full_name_length
    check (char_length(btrim(full_name)) between 1 and 120),
  add constraint club_applications_email_format
    check (
      char_length(email) between 3 and 320
      and email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    ),
  add constraint club_applications_study_year_allowed
    check (study_year in ('First year', 'Second year', 'Third year', 'Master''s')),
  add constraint club_applications_field_length
    check (char_length(btrim(field_of_study)) between 1 and 160),
  add constraint club_applications_department_allowed
    check (department in ('Technical', 'Marketing', 'Communication')),
  add constraint club_applications_motivation_length
    check (
      motivation is null
      or char_length(btrim(motivation)) between 20 and 5000
    );

alter table public.club_applications enable row level security;
revoke all on table public.club_applications from public, anon, authenticated;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.club_application_rate_limits (
  id bigint generated always as identity primary key,
  ip_address inet not null,
  email text not null,
  submitted_at timestamptz not null default now()
);

revoke all on table private.club_application_rate_limits from public, anon, authenticated;

create index if not exists club_application_rate_limits_ip_submitted_idx
  on private.club_application_rate_limits (ip_address, submitted_at desc);

create index if not exists club_application_rate_limits_email_submitted_idx
  on private.club_application_rate_limits (email, submitted_at desc);

-- Install a separate service-only RPC so this migration can be applied before
-- the frontend deployment without interrupting the currently deployed form.
drop function if exists public.submit_club_application_secure(text, text, text, text, text, text, text, text);

create function public.submit_club_application_secure(
  p_full_name text,
  p_email text,
  p_study_year text,
  p_field_of_study text,
  p_department text,
  p_motivation text,
  p_client_ip text,
  p_website text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_ip inet;
  normalized_email text := lower(btrim(p_email));
  normalized_motivation text := nullif(btrim(p_motivation), '');
  recent_ip_count integer;
  daily_ip_count integer;
  recent_email_count integer;
begin
  if nullif(btrim(p_website), '') is not null then
    return jsonb_build_object('accepted', true);
  end if;

  if char_length(btrim(p_full_name)) not between 1 and 120
    or char_length(normalized_email) not between 3 and 320
    or normalized_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or p_study_year not in ('First year', 'Second year', 'Third year', 'Master''s')
    or char_length(btrim(p_field_of_study)) not between 1 and 160
    or p_department not in ('Technical', 'Marketing', 'Communication')
    or (
      normalized_motivation is not null
      and char_length(normalized_motivation) not between 20 and 5000
    )
  then
    raise exception 'Invalid application data' using errcode = '22023';
  end if;

  begin
    request_ip := nullif(btrim(p_client_ip), '')::inet;
  exception
    when invalid_text_representation then
      request_ip := null;
  end;

  if request_ip is null then
    raise exception 'A verified client address is required' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('ip:' || request_ip::text, 0));
  perform pg_advisory_xact_lock(hashtextextended('email:' || normalized_email, 0));

  delete from private.club_application_rate_limits
  where submitted_at < now() - interval '24 hours';

  select count(*) into recent_ip_count
  from private.club_application_rate_limits
  where ip_address = request_ip
    and submitted_at >= now() - interval '10 minutes';

  select count(*) into daily_ip_count
  from private.club_application_rate_limits
  where ip_address = request_ip
    and submitted_at >= now() - interval '24 hours';

  select count(*) into recent_email_count
  from private.club_application_rate_limits
  where email = normalized_email
    and submitted_at >= now() - interval '24 hours';

  if recent_email_count >= 1 then
    raise sqlstate 'PGRST' using
      message = jsonb_build_object(
        'code', 'RATE_LIMITED',
        'message', 'An application from this email was already received recently.',
        'details', null,
        'hint', null
      )::text,
      detail = jsonb_build_object(
        'status', 429,
        'status_text', 'Too Many Requests',
        'headers', jsonb_build_object('Retry-After', '86400')
      )::text;
  end if;

  if recent_ip_count >= 5 then
    raise sqlstate 'PGRST' using
      message = jsonb_build_object(
        'code', 'RATE_LIMITED',
        'message', 'Too many applications were sent from this network.',
        'details', null,
        'hint', null
      )::text,
      detail = jsonb_build_object(
        'status', 429,
        'status_text', 'Too Many Requests',
        'headers', jsonb_build_object('Retry-After', '600')
      )::text;
  end if;

  if daily_ip_count >= 25 then
    raise sqlstate 'PGRST' using
      message = jsonb_build_object(
        'code', 'RATE_LIMITED',
        'message', 'The daily application limit for this network was reached.',
        'details', null,
        'hint', null
      )::text,
      detail = jsonb_build_object(
        'status', 429,
        'status_text', 'Too Many Requests',
        'headers', jsonb_build_object('Retry-After', '86400')
      )::text;
  end if;

  insert into public.club_applications (
    full_name,
    email,
    study_year,
    field_of_study,
    department,
    motivation
  ) values (
    btrim(p_full_name),
    normalized_email,
    p_study_year,
    btrim(p_field_of_study),
    p_department,
    normalized_motivation
  );

  insert into private.club_application_rate_limits (ip_address, email)
  values (request_ip, normalized_email);

  return jsonb_build_object('accepted', true);
end;
$$;

revoke all on function public.submit_club_application_secure(text, text, text, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.submit_club_application_secure(text, text, text, text, text, text, text, text)
  to service_role;

create extension if not exists pg_cron;

do $$
declare
  existing_job_id bigint;
begin
  select jobid into existing_job_id
  from cron.job
  where jobname = 'purge-club-application-rate-limits';

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'purge-club-application-rate-limits',
    '17 * * * *',
    'delete from private.club_application_rate_limits where submitted_at < now() - interval ''24 hours'';'
  );
end;
$$;

notify pgrst, 'reload schema';

commit;
