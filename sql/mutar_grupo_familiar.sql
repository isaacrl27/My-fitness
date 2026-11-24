-- sql/mutar_grupo_familiar.sql
-- Mutación atómica con bloqueo de fila (FOR UPDATE) sobre la tabla secretos
CREATE OR REPLACE FUNCTION operar_grupo_familiar(
  p_clave text,
  p_accion text,
  p_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_texto text;
  v_grupo jsonb;
  v_miembros jsonb;
  v_compra jsonb;
  v_reacciones jsonb;
  v_nuevos jsonb;
  v_ahora text := to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
BEGIN
  -- 1. Restringir explícitamente las claves permitidas con validación estricta de formato
  IF NOT (p_clave ~ '^grupo:[A-Za-z0-9_-]{3,30}$' OR p_clave ~ '^hogar:[A-Za-z0-9_-]{3,30}$') THEN
    RAISE EXCEPTION 'Clave no permitida o formato inválido: %', p_clave;
  END IF;

  -- 2. Bloqueo exclusivo de la fila del grupo/hogar hasta terminar la transacción
  SELECT valor INTO v_texto
  FROM public.secretos
  WHERE nombre = p_clave
  FOR UPDATE;

  IF v_texto IS NULL THEN
    RETURN NULL;
  END IF;

  v_grupo := v_texto::jsonb;

  -- 3. Sincronizar o unir miembro sin tocar la lista de la compra ni reacciones (Tope 50 miembros)
  IF p_accion = 'upsertear_miembro' OR p_accion = 'hogar_unirse' THEN
    v_miembros := COALESCE(v_grupo->'miembros', '[]'::jsonb);
    IF EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_miembros) elem
      WHERE elem->>'codigo' = p_payload->>'codigo'
    ) THEN
      SELECT jsonb_agg(
        CASE
          WHEN elem->>'codigo' = p_payload->>'codigo' THEN elem || p_payload
          ELSE elem
        END
      ) INTO v_miembros
      FROM jsonb_array_elements(v_miembros) elem;
    ELSE
      -- Solo añadir si no hemos superado el tope de 50 miembros
      IF jsonb_array_length(v_miembros) < 50 THEN
        v_miembros := v_miembros || jsonb_build_array(p_payload);
      END IF;
    END IF;
    v_grupo := jsonb_set(v_grupo, '{miembros}', COALESCE(v_miembros, '[]'::jsonb));

  -- 4. Salir del grupo o del hogar
  ELSIF p_accion = 'salir' THEN
    SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb) INTO v_miembros
    FROM jsonb_array_elements(COALESCE(v_grupo->'miembros', '[]'::jsonb)) elem
    WHERE elem->>'codigo' <> p_payload->>'miembroCodigo';
    v_grupo := jsonb_set(v_grupo, '{miembros}', COALESCE(v_miembros, '[]'::jsonb));

  -- 5. Añadir 1 producto o lote de productos a la compra / despensa (Tope 200 items para evitar bloat)
  ELSIF p_accion = 'compra_anadir' THEN
    IF p_payload ? 'nuevos' AND jsonb_typeof(p_payload->'nuevos') = 'array' THEN
      v_nuevos := p_payload->'nuevos';
    ELSIF p_payload ? 'item' AND (p_payload->'item') IS NOT NULL AND jsonb_typeof(p_payload->'item') = 'object' THEN
      v_nuevos := jsonb_build_array(p_payload->'item');
    ELSE
      v_nuevos := '[]'::jsonb;
    END IF;

    IF v_grupo ? 'items' THEN
      SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb) INTO v_compra
      FROM (
        SELECT elem
        FROM jsonb_array_elements(v_nuevos || COALESCE(v_grupo->'items', '[]'::jsonb)) elem
        LIMIT 200
      ) sub;
      v_grupo := jsonb_set(v_grupo, '{items}', v_compra);
    ELSE
      SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb) INTO v_compra
      FROM (
        SELECT elem
        FROM jsonb_array_elements(v_nuevos || COALESCE(v_grupo->'compra', '[]'::jsonb)) elem
        LIMIT 200
      ) sub;
      v_grupo := jsonb_set(v_grupo, '{compra}', v_compra);
    END IF;

  -- 6. Tachado/destachado atómico de 1 producto en el supermercado
  ELSIF p_accion = 'compra_alternar' THEN
    IF v_grupo ? 'items' THEN
      SELECT COALESCE(jsonb_agg(
        CASE
          WHEN elem->>'id' = p_payload->>'itemId' THEN
            elem || jsonb_build_object(
              'comprado', NOT COALESCE((elem->>'comprado')::boolean, false),
              'compradoPor', CASE
                WHEN NOT COALESCE((elem->>'comprado')::boolean, false) THEN p_payload->'personaNombre'
                ELSE 'null'::jsonb
              END,
              'fecha', to_jsonb(v_ahora)
            )
          ELSE elem
        END
      ), '[]'::jsonb) INTO v_compra
      FROM jsonb_array_elements(COALESCE(v_grupo->'items', '[]'::jsonb)) elem;
      v_grupo := jsonb_set(v_grupo, '{items}', v_compra);
    ELSE
      SELECT COALESCE(jsonb_agg(
        CASE
          WHEN elem->>'id' = p_payload->>'itemId' THEN
            elem || jsonb_build_object(
              'comprado', NOT COALESCE((elem->>'comprado')::boolean, false),
              'compradoPor', CASE
                WHEN NOT COALESCE((elem->>'comprado')::boolean, false) THEN p_payload->'personaNombre'
                ELSE 'null'::jsonb
              END,
              'fecha', to_jsonb(v_ahora)
            )
          ELSE elem
        END
      ), '[]'::jsonb) INTO v_compra
      FROM jsonb_array_elements(COALESCE(v_grupo->'compra', '[]'::jsonb)) elem;
      v_grupo := jsonb_set(v_grupo, '{compra}', v_compra);
    END IF;

  -- 7. Borrar 1 producto de la compra
  ELSIF p_accion = 'compra_borrar' THEN
    IF v_grupo ? 'items' THEN
      SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb) INTO v_compra
      FROM jsonb_array_elements(COALESCE(v_grupo->'items', '[]'::jsonb)) elem
      WHERE elem->>'id' <> p_payload->>'itemId';
      v_grupo := jsonb_set(v_grupo, '{items}', v_compra);
    ELSE
      SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb) INTO v_compra
      FROM jsonb_array_elements(COALESCE(v_grupo->'compra', '[]'::jsonb)) elem
      WHERE elem->>'id' <> p_payload->>'itemId';
      v_grupo := jsonb_set(v_grupo, '{compra}', v_compra);
    END IF;

  -- 8. Limpiar comprados
  ELSIF p_accion = 'compra_limpiar' THEN
    IF v_grupo ? 'items' THEN
      SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb) INTO v_compra
      FROM jsonb_array_elements(COALESCE(v_grupo->'items', '[]'::jsonb)) elem
      WHERE COALESCE((elem->>'comprado')::boolean, false) = false;
      v_grupo := jsonb_set(v_grupo, '{items}', v_compra);
    ELSE
      SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb) INTO v_compra
      FROM jsonb_array_elements(COALESCE(v_grupo->'compra', '[]'::jsonb)) elem
      WHERE COALESCE((elem->>'comprado')::boolean, false) = false;
      v_grupo := jsonb_set(v_grupo, '{compra}', v_compra);
    END IF;

  -- 9. Añadir reacción social (tope 30)
  ELSIF p_accion = 'reaccion' THEN
    SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb) INTO v_reacciones
    FROM (
      SELECT elem
      FROM jsonb_array_elements(
        jsonb_build_array(p_payload) || COALESCE(v_grupo->'reacciones', '[]'::jsonb)
      ) elem
      LIMIT 30
    ) sub;
    v_grupo := jsonb_set(v_grupo, '{reacciones}', v_reacciones);
  END IF;

  v_grupo := jsonb_set(v_grupo, '{actualizado}', to_jsonb(v_ahora));

  UPDATE public.secretos
  SET valor = v_grupo::text
  WHERE nombre = p_clave;

  RETURN v_grupo;
END;
$$;

-- Restricción de permisos: solo ejecutable por el servidor backend (service_role)
REVOKE ALL ON FUNCTION public.operar_grupo_familiar(text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.operar_grupo_familiar(text, text, jsonb) TO service_role;
