begin;

-- Keep the public registration flow simple: the browser may execute only this
-- validated, rate-limited RPC. Direct table access remains denied.
create or replace function public.submit_club_application(
  p_full_name text,
  p_email text,
  p_study_year text,
  p_field_of_study text,
  p_department text,
  p_motivation text,
  p_website text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_headers jsonb;
  raw_ip text;
  request_ip inet;
  normalized_email text := lower(btrim(p_email));
  normalized_motivation text := nullif(btrim(p_motivation), '');
  recent_ip_count integer;
  daily_ip_count integer;
  recent_email_count integer;
begin
  -- Bots commonly fill hidden fields. Pretend to accept without storing data.
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

  request_headers := coalesce(
    nullif(current_setting('request.headers', true), ''),
    '{}'
  )::jsonb;

  raw_ip := btrim(split_part(coalesce(
    request_headers ->> 'cf-connecting-ip',
    request_headers ->> 'x-forwarded-for',
    request_headers ->> 'x-real-ip',
    ''
  ), ',', 1));

  begin
    request_ip := nullif(raw_ip, '')::inet;
  exception
    when invalid_text_representation then
      request_ip := null;
  end;

  if request_ip is null then
    raise exception 'The request could not be verified' using errcode = '22023';
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

revoke all on table public.club_applications from public, anon, authenticated;
revoke all on function public.submit_club_application(text, text, text, text, text, text, text)
  from public;
grant execute on function public.submit_club_application(text, text, text, text, text, text, text)
  to anon, authenticated;

-- Remove the more complicated service-only endpoint if it was installed.
drop function if exists public.submit_club_application_secure(text, text, text, text, text, text, text, text);

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
