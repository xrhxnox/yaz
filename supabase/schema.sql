-- Pega TODO esto en Supabase > SQL Editor > New query > Run
-- Se puede correr varias veces sin problema: no borra ni duplica nada.
-- Si Supabase muestra una advertencia antes de correrlo, puedes aceptar: este script
-- solo crea cosas y da permisos, no se pierde información.

create table if not exists ajustes (
  id int primary key default 1 check (id = 1),
  proximo_encuentro timestamptz
);
insert into ajustes (id) values (1) on conflict do nothing;

create table if not exists pensamientos (
  id bigserial primary key,
  de text not null check (de in ('a', 'b')),
  mensaje text not null,
  created_at timestamptz not null default now()
);
create index if not exists pensamientos_fecha on pensamientos (created_at desc);

create table if not exists suscripciones (
  endpoint text primary key,
  persona text not null check (persona in ('a', 'b')),
  data jsonb not null,
  created_at timestamptz not null default now()
);

-- Pregunta del día
create table if not exists respuestas (
  fecha date not null,
  persona text not null check (persona in ('a', 'b')),
  respuesta text not null,
  created_at timestamptz not null default now(),
  primary key (fecha, persona)
);

-- Ciudad de cada uno (para hora y clima)
create table if not exists ubicaciones (
  persona text primary key check (persona in ('a', 'b')),
  ciudad text not null,
  lat double precision not null,
  lon double precision not null,
  zona text not null,
  updated_at timestamptz not null default now()
);
insert into ubicaciones (persona, ciudad, lat, lon, zona) values
  ('a', 'Culiacán', 24.8049, -107.3940, 'America/Mazatlan'),
  ('b', 'Hermosillo', 29.0729, -110.9559, 'America/Hermosillo')
on conflict (persona) do nothing;

-- Lista de pendientes
create table if not exists pendientes (
  id bigserial primary key,
  texto text not null,
  categoria text not null default 'otro',
  hecho boolean not null default false,
  creado_por text not null check (creado_por in ('a', 'b')),
  created_at timestamptz not null default now(),
  hecho_at timestamptz
);
-- Imagen opcional (póster de la película, foto del lugar…)
alter table pendientes add column if not exists foto_path text;

-- Foto del día (una por persona por día)
create table if not exists fotos (
  id bigserial primary key,
  fecha date not null,
  persona text not null check (persona in ('a', 'b')),
  path text not null,
  nota text,
  created_at timestamptz not null default now(),
  unique (fecha, persona)
);

-- Línea del tiempo
create table if not exists momentos (
  id bigserial primary key,
  fecha date not null,
  titulo text not null,
  descripcion text,
  foto_path text,
  creado_por text not null check (creado_por in ('a', 'b')),
  created_at timestamptz not null default now()
);
insert into momentos (fecha, titulo, creado_por)
select '2026-02-15', 'Nos hicimos novios', 'a'
where not exists (select 1 from momentos);

-- Perfil de cada uno: tallas y colores de su app
create table if not exists perfiles (
  persona text primary key check (persona in ('a', 'b')),
  tallas jsonb not null default '{}',
  tema jsonb,
  updated_at timestamptz not null default now()
);

-- Wishlist: links de cosas que nos gustan
create table if not exists deseos (
  id bigserial primary key,
  persona text not null check (persona in ('a', 'b')),
  titulo text not null,
  url text not null,
  nota text,
  comprado boolean not null default false,
  created_at timestamptz not null default now()
);

-- Sin políticas: solo el servidor (con la service role key) puede leer y escribir
alter table ajustes enable row level security;
alter table pensamientos enable row level security;
alter table suscripciones enable row level security;
alter table respuestas enable row level security;
alter table ubicaciones enable row level security;
alter table pendientes enable row level security;
alter table fotos enable row level security;
alter table momentos enable row level security;
alter table perfiles enable row level security;
alter table deseos enable row level security;

-- La app solo habla con la base desde el servidor, con la llave secreta (service_role).
-- Se lo damos explícito para no depender de los permisos automáticos de Supabase.
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- Carpeta privada para las fotos: máximo 5 MB y solo imágenes
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
