begin;

-- Run this after the Vercel deployment uses submit_club_application_secure.
drop function if exists public.submit_club_application(text, text, text, text, text, text, text);

notify pgrst, 'reload schema';

commit;
