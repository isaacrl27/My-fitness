-- sql/contadores-perfil.sql
-- Dos funciones atómicas para no pisar el resto del perfil cuando la app
-- apunta algo dentro de `perfiles.datos`:
--
--   1. `incrementar_uso_ia_perfil`: suma una consulta de texto o foto al
--      contador de la persona sin reescribir el jsonb entero.
--   2. `fusionar_salud_widget`: guarda los pasos y el sueño de un día
--      conservando el valor mayor, sin tocar el perfil ni los demás días.
--
-- Pegar esto en el SQL Editor del panel de Supabase. Es seguro repetirlo.

-- ---------------------------------------------------------------------
-- 1. Contador personal de la IA
-- ---------------------------------------------------------------------
create or replace function public.incrementar_uso_ia_perfil(
  p_persona_id uuid,
  p_clase text,
  p_fecha text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campo text;
begin
  if p_clase not in ('texto', 'foto') then
    raise exception 'Clase de IA no permitida: %', p_clase;
  end if;

  v_campo := case p_clase when 'texto' then 'usoIAtexto' else 'usoIAfoto' end;

  insert into public.perfiles (persona_id, datos)
  values (
    p_persona_id,
    jsonb_build_object(v_campo, jsonb_build_object('fecha', p_fecha, 'usadas', 1))
  )
  on conflict (persona_id) do update
  set datos = jsonb_set(
        coalesce(perfiles.datos, '{}'::jsonb),
        array[v_campo],
        jsonb_build_object(
          'fecha', p_fecha,
          'usadas',
          case
            when perfiles.datos -> v_campo ->> 'fecha' = p_fecha
              and (perfiles.datos -> v_campo ->> 'usadas') ~ '^[0-9]+$'
              then (perfiles.datos -> v_campo ->> 'usadas')::integer + 1
            else 1
          end
        ),
        true
      ),
      actualizada = now();
end;
$$;

revoke all on function public.incrementar_uso_ia_perfil(uuid, text, text) from public, anon, authenticated;
grant execute on function public.incrementar_uso_ia_perfil(uuid, text, text) to service_role;

-- ---------------------------------------------------------------------
-- 2. Pasos y sueño del Atajo de iOS
-- ---------------------------------------------------------------------
create or replace function public.fusionar_salud_widget(
  p_persona_id uuid,
  p_fecha text,
  p_pasos integer default null,
  p_sueno numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dia jsonb;
begin
  insert into public.perfiles (persona_id, datos)
  values (
    p_persona_id,
    jsonb_build_object(
      'saludDiaria',
      jsonb_build_object(
        p_fecha,
        jsonb_strip_nulls(jsonb_build_object(
          'pasos', p_pasos,
          'suenoHoras', p_sueno
        ))
      )
    )
  )
  on conflict (persona_id) do update
  set datos = jsonb_set(
        case
          when jsonb_typeof(perfiles.datos -> 'borrados') = 'array' then
            jsonb_set(
              coalesce(perfiles.datos, '{}'::jsonb),
              '{borrados}',
              coalesce(
                (
                  select jsonb_agg(elem)
                  from jsonb_array_elements(perfiles.datos -> 'borrados') as elem
                  where not (elem ->> 'tipo' = 'salud' and elem ->> 'clave' = p_fecha)
                ),
                '[]'::jsonb
              ),
              true
            )
          else coalesce(perfiles.datos, '{}'::jsonb)
        end,
        '{saludDiaria}',
        coalesce(perfiles.datos -> 'saludDiaria', '{}'::jsonb) ||
        jsonb_build_object(
          p_fecha,
          coalesce(perfiles.datos -> 'saludDiaria' -> p_fecha, '{}'::jsonb) ||
          jsonb_strip_nulls(jsonb_build_object(
            'pasos', greatest(
              (perfiles.datos -> 'saludDiaria' -> p_fecha ->> 'pasos')::integer,
              p_pasos
            ),
            'suenoHoras', greatest(
              (perfiles.datos -> 'saludDiaria' -> p_fecha ->> 'suenoHoras')::numeric,
              p_sueno
            )
          ))
        ),
        true
      ),
      actualizada = now()
  returning datos -> 'saludDiaria' -> p_fecha into v_dia;

  if v_dia is null then
    v_dia := jsonb_strip_nulls(jsonb_build_object(
      'pasos', p_pasos,
      'suenoHoras', p_sueno
    ));
  end if;

  return v_dia;
end;
$$;

revoke all on function public.fusionar_salud_widget(uuid, text, integer, numeric) from public, anon, authenticated;
grant execute on function public.fusionar_salud_widget(uuid, text, integer, numeric) to service_role;
