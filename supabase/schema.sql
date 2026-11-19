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

-- Fotos del día (varias por persona por día)
create table if not exists fotos (
  id bigserial primary key,
  fecha date not null,
  persona text not null check (persona in ('a', 'b')),
  path text not null,
  nota text,
  created_at timestamptz not null default now()
);
-- Antes solo se permitía una foto por persona por día: quitamos esa restricción
do $$
declare r record;
begin
  for r in select conname from pg_constraint where conrelid = 'public.fotos'::regclass and contype = 'u' loop
    execute format('alter table fotos drop constraint %I', r.conname);
  end loop;
end $$;
create index if not exists fotos_fecha on fotos (fecha desc, persona);

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

-- Fotos de cada momento (varias por momento)
create table if not exists momento_fotos (
  id bigserial primary key,
  momento_id bigint not null references momentos (id) on delete cascade,
  path text not null,
  created_at timestamptz not null default now()
);
create index if not exists momento_fotos_momento on momento_fotos (momento_id);
-- Antes cada momento tenía una sola foto en momentos.foto_path: la pasamos a la tabla nueva
insert into momento_fotos (momento_id, path) select id, foto_path from momentos where foto_path is not null;
update momentos set foto_path = null where foto_path is not null;

-- Perfil de cada uno: tallas y colores de su app
create table if not exists perfiles (
  persona text primary key check (persona in ('a', 'b')),
  tallas jsonb not null default '{}',
  tema jsonb,
  updated_at timestamptz not null default now()
);
-- Apodo (nombre que se muestra), cumpleaños sin año (MM-DD) y foto de perfil
alter table perfiles add column if not exists apodo text;
alter table perfiles add column if not exists cumple text;
alter table perfiles add column if not exists avatar_path text;
-- Favoritos: lista de { titulo, valor } (ej. "Equipo de fútbol" → "Real Madrid")
alter table perfiles add column if not exists favoritos jsonb not null default '[]';
-- Preferencias de cómo se ve la app para cada quien (ej. { "minusculas": true })
alter table perfiles add column if not exists estilo jsonb not null default '{}';

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
-- Orden elegido por el dueño (los nuevos, sin orden, salen primero)
alter table deseos add column if not exists orden int;

-- Estado o ánimo de cada quien ("cansado", "libre para llamada"…)
create table if not exists animos (
  persona text primary key check (persona in ('a', 'b')),
  texto text not null,
  updated_at timestamptz not null default now()
);

-- Pendientes marcados para hacer en el próximo reencuentro
alter table pendientes add column if not exists para_reencuentro boolean not null default false;

-- Historial de visitas (cada vez que se vieron en persona)
create table if not exists visitas (
  id bigserial primary key,
  inicio date not null,
  fin date not null,
  ciudad text,
  nota text,
  creado_por text not null check (creado_por in ('a', 'b')),
  created_at timestamptz not null default now(),
  check (fin >= inicio)
);

-- Cartas que se abren en una fecha o en una situación
create table if not exists cartas (
  id bigserial primary key,
  de text not null check (de in ('a', 'b')),
  para text not null check (para in ('a', 'b')),
  titulo text not null,
  contenido text not null,
  abrir_desde date,
  condicion text,
  abierta_at timestamptz,
  created_at timestamptz not null default now()
);

-- Diario: qué hizo, comió, vio o escuchó cada quien en el día
create table if not exists diario (
  id bigserial primary key,
  persona text not null check (persona in ('a', 'b')),
  fecha date not null,
  tipo text not null check (tipo in ('hice', 'comi', 'vi', 'escuche', 'otro')),
  texto text not null,
  link text,
  created_at timestamptz not null default now()
);
create index if not exists diario_fecha on diario (fecha, created_at);

-- Playlist compartida: link de la canción, datos leídos del link y por qué la agregaron
create table if not exists canciones (
  id bigserial primary key,
  persona text not null check (persona in ('a', 'b')),
  url text not null,
  titulo text not null,
  artista text,
  portada text,
  nota text,
  corazon_a boolean not null default false,
  corazon_b boolean not null default false,
  destacada boolean not null default false,
  created_at timestamptz not null default now()
);

-- Reacciones a fotos y al diario de la otra persona: corazón y comentario cortito
create table if not exists reacciones (
  id bigserial primary key,
  tipo text not null check (tipo in ('foto', 'diario')),
  objeto bigint not null,
  persona text not null check (persona in ('a', 'b')),
  corazon boolean not null default false,
  comentario text,
  updated_at timestamptz not null default now(),
  unique (tipo, objeto, persona)
);

-- Muro (tipo Instagram): publicaciones con una o varias fotos, me gusta y comentarios
create table if not exists publicaciones (
  id bigserial primary key,
  persona text not null check (persona in ('a', 'b')),
  fecha date not null,
  texto text,
  -- Para no repetir la migración de las fotos del día (ej. 'fotos:a:2026-11-17')
  origen text unique,
  created_at timestamptz not null default now()
);
create index if not exists publicaciones_fecha on publicaciones (fecha desc, created_at desc);

create table if not exists publicacion_fotos (
  id bigserial primary key,
  publicacion_id bigint not null references publicaciones (id) on delete cascade,
  path text not null,
  orden int not null default 0
);
create index if not exists publicacion_fotos_pub on publicacion_fotos (publicacion_id, orden);
-- Versión chica (~400 px) para las cuadrículas
alter table publicacion_fotos add column if not exists miniatura text;

create table if not exists publicacion_likes (
  publicacion_id bigint not null references publicaciones (id) on delete cascade,
  persona text not null check (persona in ('a', 'b')),
  created_at timestamptz not null default now(),
  primary key (publicacion_id, persona)
);

create table if not exists comentarios (
  id bigserial primary key,
  publicacion_id bigint not null references publicaciones (id) on delete cascade,
  persona text not null check (persona in ('a', 'b')),
  texto text not null,
  created_at timestamptz not null default now()
);
create index if not exists comentarios_pub on comentarios (publicacion_id, created_at);

-- Las fotos del día pasan al muro: una publicación por persona por día (solo la primera vez)
insert into publicaciones (persona, fecha, texto, origen, created_at)
select persona, fecha,
       nullif(string_agg(nullif(trim(nota), ''), ' · ' order by created_at), ''),
       'fotos:' || persona || ':' || fecha, min(created_at)
from fotos
group by persona, fecha
on conflict (origen) do nothing;

insert into publicacion_fotos (publicacion_id, path, orden)
select p.id, f.path, (row_number() over (partition by f.persona, f.fecha order by f.created_at, f.id) - 1)::int
from fotos f
join publicaciones p on p.origen = 'fotos:' || f.persona || ':' || f.fecha
where not exists (select 1 from publicacion_fotos pf where pf.path = f.path);

-- Los corazones y comentarios que ya tenían las fotos también pasan
do $$
begin
  if to_regclass('public.reacciones') is not null then
    insert into publicacion_likes (publicacion_id, persona)
    select distinct pf.publicacion_id, r.persona
    from reacciones r
    join fotos f on r.tipo = 'foto' and r.objeto = f.id
    join publicacion_fotos pf on pf.path = f.path
    where r.corazon
    on conflict do nothing;

    insert into comentarios (publicacion_id, persona, texto, created_at)
    select pf.publicacion_id, r.persona, r.comentario, r.updated_at
    from reacciones r
    join fotos f on r.tipo = 'foto' and r.objeto = f.id
    join publicacion_fotos pf on pf.path = f.path
    where r.comentario is not null
      and not exists (
        select 1 from comentarios c
        where c.publicacion_id = pf.publicacion_id and c.persona = r.persona and c.texto = r.comentario
      );
  end if;
end $$;

-- Historias: fotos que duran 24 horas (vista_at = cuándo la vio la otra persona)
create table if not exists historias (
  id bigserial primary key,
  persona text not null check (persona in ('a', 'b')),
  path text not null,
  texto text,
  vista_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists historias_creada on historias (created_at desc);
-- Dónde va el texto sobre la foto (0 a 1, desde la esquina de arriba a la izquierda)
alter table historias add column if not exists texto_x real;
alter table historias add column if not exists texto_y real;

-- Respuestas a una historia: corazón o mensajito
create table if not exists historia_respuestas (
  id bigserial primary key,
  historia_id bigint not null references historias (id) on delete cascade,
  persona text not null check (persona in ('a', 'b')),
  corazon boolean not null default false,
  texto text,
  created_at timestamptz not null default now()
);

-- Juegos por turnos: gato y conecta 4
create table if not exists partidas (
  id bigserial primary key,
  tipo text not null check (tipo in ('gato', 'conecta4')),
  tablero jsonb not null,
  empieza text not null check (empieza in ('a', 'b')),
  turno text check (turno in ('a', 'b')),
  ganador text check (ganador in ('a', 'b', 'empate')),
  linea jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists partidas_tipo on partidas (tipo, created_at desc);
-- Casilla del último movimiento (para destacarlo)
alter table partidas add column if not exists ultima int;

-- Sin políticas: solo el servidor (con la service role key) puede leer y escribir
alter table ajustes enable row level security;
alter table pensamientos enable row level security;
alter table suscripciones enable row level security;
alter table respuestas enable row level security;
alter table ubicaciones enable row level security;
alter table pendientes enable row level security;
alter table fotos enable row level security;
alter table momentos enable row level security;
alter table momento_fotos enable row level security;
alter table perfiles enable row level security;
alter table deseos enable row level security;
alter table animos enable row level security;
alter table visitas enable row level security;
alter table cartas enable row level security;
alter table partidas enable row level security;
alter table diario enable row level security;
alter table canciones enable row level security;
alter table reacciones enable row level security;
alter table publicaciones enable row level security;
alter table publicacion_fotos enable row level security;
alter table publicacion_likes enable row level security;
alter table comentarios enable row level security;
alter table historias enable row level security;
alter table historia_respuestas enable row level security;

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

-- Que la API de Supabase vuelva a leer las tablas y relaciones nuevas
notify pgrst, 'reload schema';
