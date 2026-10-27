begin;

alter table public.club_applications
  alter column motivation drop not null;

alter table public.club_applications
  drop constraint if exists club_applications_motivation_length;

alter table public.club_applications
  add constraint club_applications_motivation_length
  check (
    motivation is null
    or char_length(btrim(motivation)) between 20 and 5000
  );

notify pgrst, 'reload schema';

commit;
