-- Esquema de la nube para la app de peso.
--
-- Cómo se usa: Supabase → SQL Editor → New query → pegar esto → Run.
-- No lleva ningún secreto, se puede pegar sin miedo.
--
-- Notas de diseño:
--  * Cada móvil se registra con una marca suya (`dispositivos.id`) y se le
--    asigna una persona. Así cada uno lleva su cuenta y no hay que inventar
--    usuarios ni contraseñas.
--  * Todas las tablas llevan `persona_id`: nunca se guarda nada sin decir de
--    quién es.
--  * Se crea una fila `personas` por cada persona que use la app (Isaac, su
--    novia...), y cada una tiene su perfil y sus registros aparte.
--  * El RLS está activo y sin políticas: desde fuera no se puede leer nada.
--    Se accede siempre desde el servidor con la clave de mando, que lo ignora.

-- =====================================================================
-- Personas: una fila por quien usa la app.
-- =====================================================================
create table if not exists personas (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  creada      timestamptz not null default now(),
  actualizada timestamptz not null default now()
);

-- =====================================================================
-- Dispositivos: cada móvil, y más adelante su suscripción de avisos.
-- =====================================================================
create table if not exists dispositivos (
  -- Marca que genera el propio navegador; no es un usuario ni una contraseña.
  id            text primary key,
  persona_id    uuid references personas (id) on delete cascade,
  -- La suscripción de notificaciones del navegador (la rellena la app luego).
  suscripcion   jsonb,
  creada        timestamptz not null default now(),
  ultima_vez    timestamptz not null default now()
);

-- =====================================================================
-- Perfiles: los datos del cuestionario, tal cual los guarda la app.
-- =====================================================================
create table if not exists perfiles (
  persona_id   uuid primary key references personas (id) on delete cascade,
  datos        jsonb not null,
  actualizada  timestamptz not null default now()
);

-- =====================================================================
-- Pesadas: una por día y persona.
-- =====================================================================
create table if not exists pesadas (
  persona_id uuid references personas (id) on delete cascade,
  fecha      date not null,
  kg         double precision not null,
  anotada    timestamptz not null default now(),
  primary key (persona_id, fecha)
);

-- =====================================================================
-- Comidas: lo que se anota en la pantalla de Hoy.
-- =====================================================================
create table if not exists comidas (
  persona_id uuid references personas (id) on delete cascade,
  -- Identificador que le pone el móvil, para que dos anotaciones distintas
  -- de la misma hora no se confundan.
  id         text not null,
  fecha      date not null,
  tipo       text not null,
  texto      text not null,
  kcal       double precision,
  anotada    timestamptz not null default now(),
  primary key (persona_id, id)
);

-- =====================================================================
-- Agua: los litros de cada día.
-- =====================================================================
create table if not exists agua (
  persona_id uuid references personas (id) on delete cascade,
  fecha      date not null,
  litros     double precision not null,
  anotada    timestamptz not null default now(),
  primary key (persona_id, fecha)
);

-- =====================================================================
-- Gustos: la lista roja y lo que gusta.
-- =====================================================================
create table if not exists gustos (
  persona_id  uuid references personas (id) on delete cascade,
  ingrediente text not null,
  -- "si" (me gusta), "no" (no me gusta), "dejar" (ya no se vuelve a preguntar)
  valor       text not null,
  anotada     timestamptz not null default now(),
  primary key (persona_id, ingrediente)
);

-- =====================================================================
-- La trampilla: todo queda cerrado por dentro. Sin políticas, nadie que
-- entre desde fuera con la clave pública puede leer ni escribir.
-- =====================================================================
alter table personas     enable row level security;
alter table dispositivos enable row level security;
alter table perfiles     enable row level security;
alter table pesadas      enable row level security;
alter table comidas      enable row level security;
alter table agua         enable row level security;
alter table gustos       enable row level security;

-- =====================================================================
-- Un índice por tabla, para que las consultas de la semana no se traguen
-- la base entera.
-- =====================================================================
create index if not exists idx_pesadas_persona_fecha on pesadas (persona_id, fecha desc);
create index if not exists idx_comidas_persona_fecha on comidas (persona_id, fecha desc);
create index if not exists idx_agua_persona_fecha    on agua    (persona_id, fecha desc);
create index if not exists idx_dispositivos_persona  on dispositivos (persona_id);
