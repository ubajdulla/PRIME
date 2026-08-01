-- Run this in the Supabase SQL editor.
-- The signup form now collects phone and birth date up front. Capture them
-- straight into the new profile row via raw_user_meta_data, same way "name"
-- already works. (Also go to Authentication -> Providers -> Email and make
-- sure "Confirm email" is enabled, so new users get a confirmation link.)

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, phone, birth_date)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'phone',
    nullif(new.raw_user_meta_data->>'birth_date', '')::date
  );
  return new;
end;
$$;
