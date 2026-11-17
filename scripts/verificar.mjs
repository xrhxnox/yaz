// Revisa que todo esté listo para usar la app: variables, Supabase, fotos y notificaciones.
// Uso: npm run verificar   (lee .env.local; nunca imprime las llaves)

import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

const TABLAS = ["ajustes", "pensamientos", "suscripciones", "respuestas", "ubicaciones", "pendientes", "fotos", "momentos", "momento_fotos", "perfiles", "deseos"];

let fallas = 0;
const ok = (m) => console.log(`  ✓ ${m}`);
const mal = (m, arreglo) => {
  fallas++;
  console.log(`  ✗ ${m}`);
  if (arreglo) console.log(`    → ${arreglo}`);
};
const aviso = (m) => console.log(`  ! ${m}`);
const titulo = (m) => console.log(`\n${m}`);

const env = process.env;

// ---------- Variables ----------
titulo("Variables en .env.local");

for (const n of ["NEXT_PUBLIC_NOMBRE_A", "NEXT_PUBLIC_NOMBRE_B", "NEXT_PUBLIC_FECHA_INICIO", "NEXT_PUBLIC_ZONA_HORARIA"]) {
  if (env[n]) ok(`${n} = ${env[n]}`);
  else mal(`Falta ${n}`, "Cópiala de .env.example");
}

const correos = { a: env.CORREO_A?.trim().toLowerCase(), b: env.CORREO_B?.trim().toLowerCase() };
for (const [p, n] of [["a", "CORREO_A"], ["b", "CORREO_B"]]) {
  if (!correos[p]) mal(`Falta ${n}`, "Pon el correo de la cuenta de Supabase de cada quien");
  else ok(`${n} = ${correos[p]}`);
}
if (correos.a && correos.a === correos.b) mal("CORREO_A y CORREO_B son iguales");

const url = env.SUPABASE_URL?.trim();
const llave = env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url) mal("Falta SUPABASE_URL", "Supabase → Project Settings → Data API → Project URL");
else if (!/^https:\/\/[a-z0-9-]+\.supabase\.(co|in)\/?$/.test(url)) aviso(`SUPABASE_URL tiene un formato raro: ${url} (debería ser https://xxxx.supabase.co)`);
else ok(`SUPABASE_URL = ${url}`);

// La app necesita la llave SECRETA (service_role o sb_secret_…), no la pública
function tipoDeLlave(k) {
  if (k.startsWith("sb_secret_")) return "secreta";
  if (k.startsWith("sb_publishable_")) return "publica";
  if (k.startsWith("eyJ")) {
    try {
      const datos = JSON.parse(Buffer.from(k.split(".")[1], "base64url").toString());
      return datos.role === "service_role" ? "secreta" : datos.role === "anon" ? "publica" : "desconocida";
    } catch {
      return "desconocida";
    }
  }
  return "desconocida";
}

let llaveOk = false;
if (!llave) mal("Falta SUPABASE_SERVICE_ROLE_KEY", "Supabase → Project Settings → API Keys → Secret key (o la legacy service_role)");
else {
  const tipo = tipoDeLlave(llave);
  if (tipo === "publica") mal("SUPABASE_SERVICE_ROLE_KEY es la llave PÚBLICA (anon / publishable)", "Usa la Secret key (sb_secret_…) o la legacy service_role");
  else if (tipo === "desconocida") aviso("No reconozco el formato de SUPABASE_SERVICE_ROLE_KEY; lo probaré de todos modos");
  else ok("SUPABASE_SERVICE_ROLE_KEY es una llave secreta");
  llaveOk = tipo !== "publica";
}

const urlPublica = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const llavePublica = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
if (!urlPublica) mal("Falta NEXT_PUBLIC_SUPABASE_URL", "Es la misma que SUPABASE_URL");
else if (url && urlPublica.replace(/\/$/, "") !== url.replace(/\/$/, "")) mal("NEXT_PUBLIC_SUPABASE_URL no es igual a SUPABASE_URL");
else ok("NEXT_PUBLIC_SUPABASE_URL configurada");
if (!llavePublica) mal("Falta NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "Supabase → Project Settings → API Keys → Publishable key (sb_publishable_…) o la legacy anon");
else if (tipoDeLlave(llavePublica) === "secreta") mal("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY es la llave SECRETA: ¡no la pongas ahí, se vería en el navegador!", "Usa la Publishable key (sb_publishable_…)");
else ok("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY es una llave pública");

// ---------- Notificaciones ----------
titulo("Notificaciones (VAPID)");
try {
  webpush.setVapidDetails(env.VAPID_SUBJECT || "mailto:nosotros@example.com", env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "", env.VAPID_PRIVATE_KEY ?? "");
  ok("Llaves VAPID válidas");
  if (!env.VAPID_SUBJECT || env.VAPID_SUBJECT.includes("ejemplo.com") || env.VAPID_SUBJECT.includes("example.com")) {
    aviso("VAPID_SUBJECT sigue con el correo de ejemplo; pon mailto:tu-correo (recomendado, no obligatorio)");
  }
} catch (e) {
  mal(`Llaves VAPID inválidas: ${e.message}`, "Genera nuevas con: npx web-push generate-vapid-keys");
}

// ---------- Supabase ----------
if (url && llave && llaveOk) {
  const db = createClient(url, llave, { auth: { persistSession: false } });

  titulo("Tablas en Supabase");
  let faltantes = 0;
  let conectado = true;
  for (const t of TABLAS) {
    // Sin head: las consultas head no reportan cuando falta la tabla
    const { error, count } = await db.from(t).select("*", { count: "exact" }).limit(1);
    if (!error) ok(`${t} (${count ?? 0} filas)`);
    else if (/does not exist|schema cache|PGRST205|42P01/i.test(`${error.code} ${error.message}`)) {
      faltantes++;
      mal(`No existe la tabla ${t}`);
    } else if (/Invalid API key|JWT|apikey/i.test(error.message)) {
      mal(`La llave no funciona: ${error.message}`, "Revisa que copiaste la llave completa y que es del mismo proyecto que la URL");
      conectado = false;
      break;
    } else if (/fetch failed|ENOTFOUND|ECONNREFUSED/i.test(error.message)) {
      mal(`No me pude conectar a ${url}`, "Revisa SUPABASE_URL y tu conexión a internet");
      conectado = false;
      break;
    } else mal(`${t}: ${error.message}`);
  }
  if (faltantes) console.log("    → Corre supabase/schema.sql en Supabase → SQL Editor");

  // Columnas que se agregaron después de crear las tablas
  if (conectado) {
    for (const [tabla, columna] of [["pendientes", "foto_path"], ["perfiles", "apodo"], ["perfiles", "cumple"], ["perfiles", "avatar_path"], ["perfiles", "favoritos"]]) {
      const { error } = await db.from(tabla).select(columna).limit(1);
      if (error) mal(`Falta la columna ${tabla}.${columna}`, "Corre de nuevo supabase/schema.sql (o solo la línea alter table de esa columna)");
    }
  }

  titulo("Cuentas");
  if (!conectado) aviso("Me las salto hasta que funcione la conexión");
  else {
    const { data: lista, error: eUsuarios } = await db.auth.admin.listUsers({ perPage: 200 });
    if (eUsuarios) mal(`No pude leer las cuentas: ${eUsuarios.message}`);
    else {
      for (const [p, n] of [["a", "Ric"], ["b", "Yaz"]]) {
        if (!correos[p]) continue;
        const u = lista.users.find((x) => x.email?.toLowerCase() === correos[p]);
        if (!u) mal(`No existe la cuenta de ${n} (${correos[p]})`, "Créala en Supabase → Authentication → Users → Add user (marca Auto Confirm)");
        else if (!u.email_confirmed_at) mal(`La cuenta de ${n} no está confirmada`, "En Authentication → Users, abre la cuenta y confírmala, o créala de nuevo con Auto Confirm");
        else ok(`Cuenta de ${n} lista (${correos[p]})`);
      }
      const otras = lista.users.filter((x) => !Object.values(correos).includes(x.email?.toLowerCase()));
      if (otras.length) aviso(`Hay ${otras.length} cuenta(s) más en Supabase; no tienen acceso a la app, pero puedes borrarlas`);
    }
  }

  titulo("Carpeta de fotos");
  const { data: bucket, error: eBucket } = conectado ? await db.storage.getBucket("fotos") : { data: null, error: null };
  if (!conectado) aviso("Me la salto hasta que funcione la conexión");
  else if (eBucket || !bucket) mal("No existe la carpeta 'fotos'", "Corre supabase/schema.sql (al final la crea)");
  else {
    if (bucket.public) mal("La carpeta 'fotos' es pública; debería ser privada", "Corre de nuevo supabase/schema.sql");
    else ok("La carpeta 'fotos' existe y es privada");

    // Sube y borra un archivo diminuto para confirmar que se puede escribir
    const ruta = `verificacion/${Date.now()}.png`;
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
    const { error: eSubir } = await db.storage.from("fotos").upload(ruta, png, { contentType: "image/png" });
    if (eSubir) mal(`No se pudo subir una foto de prueba: ${eSubir.message}`);
    else {
      await db.storage.from("fotos").remove([ruta]);
      ok("Se pueden subir y borrar fotos");
    }
  }
}

// ---------- Resultado ----------
console.log(fallas ? `\n✗ Hay ${fallas} cosa(s) por arreglar.\n` : "\n✓ Todo listo. Corre: npm run dev\n");
process.exit(fallas ? 1 : 0);
