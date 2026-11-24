-- sql/uso-ia-global.sql
-- Tabla y función atómica para la banda diaria GLOBAL de la IA (una fila por fecha).
--
-- La app reparte cuotas por persona (30 textos y 10 fotos al día), pero toda
-- la familia comparte UNA clave gratuita de Google. Esta tabla lleva la
-- cuenta total del día: si llega al tope (250), la IA descansa hasta mañana
-- y la app avisa amablemente.
--
-- Pegar esto en el SQL Editor del panel de Supabase. Es seguro repetirlo.

create table if not exists public.uso_ia_global (
  fecha text primary key,
  usadas integer not null default 0,
  actualizada timestamptz not null default now()
);

-- Cerrada por dentro como el resto de tablas: nadie lee ni toca esto con la clave pública.
alter table public.uso_ia_global enable row level security;

-- Función atómica para incrementar el uso global sin condiciones de carrera
create or replace function public.incrementar_uso_ia_global(p_fecha text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usadas integer;
begin
  insert into public.uso_ia_global (fecha, usadas, actualizada)
  values (p_fecha, 1, now())
  on conflict (fecha)
  do update set
    usadas = uso_ia_global.usadas + 1,
    actualizada = now()
  returning usadas into v_usadas;

  return v_usadas;
end;
$$;

revoke all on function public.incrementar_uso_ia_global(text) from public, anon, authenticated;
grant execute on function public.incrementar_uso_ia_global(text) to service_role;
