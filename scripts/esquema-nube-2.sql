-- Cambio sobre esquema-nube.sql: las comidas guardan sus alimentos enteros.
--
-- Cómo se usa: Supabase → SQL Editor → New query → pegar esto → Run.
-- Sin ningún secreto.
--
-- Por qué: la app no guarda una comida como "un texto y unas calorías", sino
-- como la lista de lo que llevaba (arroz, pollo...), con la cantidad y los
-- macros de cada cosa, y eso es lo que enseña y lo que suma. Guardarlo en dos
-- columnas de texto lo perdería.
--
-- Es seguro ejecutarlo: si ya existiera la columna, no hace nada.

alter table comidas add column if not exists alimentos jsonb;
alter table comidas drop column if exists kcal;
alter table comidas drop column if exists texto;

-- La tabla de personas necesita un código corto de recuperación, para poder
-- recuperar los datos desde un móvil nuevo (Ajustes lo enseña).
alter table personas add column if not exists codigo text;
create unique index if not exists idx_personas_codigo on personas (codigo) where codigo is not null;
