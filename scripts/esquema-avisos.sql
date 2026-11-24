-- Avisos de la app de peso.
--
-- Cómo se usa: Supabase → SQL Editor → New query → pegar esto → Run.
--
-- No lleva ningún secreto escrito. La clave que autoriza al programador a
-- llamar a la app se genera aquí dentro, con números aleatorios, y no sale
-- de la base de datos: ni aparece en un fichero, ni en el chat, ni en el
-- repositorio. Solo la pueden leer este servidor y el propio programador.
--
-- Lo que hace:
--  1. Guarda la clave de los avisos (una sola vez).
--  2. Añade un hueco en los móviles para recordar qué avisos ya salieron.
--  3. Enciende el programador, que cada 10 minutos le da la patadita a la
--     app, y la app mira la hora y avisa solo si falta algo.

-- =====================================================================
-- 1. La caja de las claves.
-- =====================================================================
create table if not exists secretos (
  nombre text primary key,
  valor  text not null
);

-- Igual que las demás tablas: cerrada por dentro. Quien accede lo hace con
-- la llave de mando, que la ignora.
alter table secretos enable row level security;

-- La clave de los avisos, generada aquí y en ninguna parte más.
-- `on conflict do nothing` hace que se pueda pegar este SQL mil veces sin
-- cambiar la clave ni romper a nadie.
insert into secretos (nombre, valor)
values ('avisos', encode(gen_random_bytes(32), 'hex'))
on conflict (nombre) do nothing;

-- =====================================================================
-- 2. El hueco para no repetir avisos.
-- =====================================================================
alter table dispositivos add column if not exists avisos jsonb;

-- =====================================================================
-- 3. El programador.
--
-- pg_cron es el reloj (pone horarios) y pg_net es el teléfono (manda la
-- llamada). Los dos son de Supabase y están en el plan gratis.
-- =====================================================================
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- La función que le da la patadita a la app. Es `security definer` para que
-- corra con permisos de administrador, que es lo que necesita pg_net.
create or replace function lanzar_avisos() returns void
language plpgsql security definer set search_path = extensions, public as $$
begin
  perform net.http_post(
    url     := 'https://example.com/api/avisos/enviar',
    headers := jsonb_build_object(
      'content-type',  'application/json',
      -- La clave se lee de la base en el momento: no está escrita aquí.
      'x-clave-avisos', (select valor from secretos where nombre = 'avisos')
    ),
    body    := '{}'::jsonb
  );
end;
$$;

-- Solo la puede llamar el programador interno (postgres) o service_role, nunca desde fuera.
revoke all on function public.lanzar_avisos() from public, anon, authenticated;
grant execute on function public.lanzar_avisos() to service_role;

-- Si ya había un programador de antes, se quita y se vuelve a poner.
-- (Si no había, el error se traga y seguimos.)
do $$
begin
  perform cron.unschedule('avisos');
exception when others then
  null;
end $$;

-- Cada 10 minutos, de 6:00 a 23:59 UTC, que es de 8:00 a 1:59 en España
-- (el horario de verano se mueve una hora, y aun así sobra margen: el
-- último aviso de siempre es a las 21:00 y solo se puede retrasar una hora).
select cron.schedule('avisos', '*/10 6-23 * * *', 'select lanzar_avisos();');

-- =====================================================================
-- Comprobaciones: al final debería salir una tabla con una fila.
-- =====================================================================
select jobname, schedule, active from cron.job where jobname = 'avisos';
select count(*) as hay_clave from secretos where nombre = 'avisos';
