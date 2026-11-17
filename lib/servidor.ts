import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { NOMBRES, type Persona } from "./config";

let cliente: SupabaseClient | null = null;

export function db(): SupabaseClient {
  if (cliente) return cliente;
  const url = process.env.SUPABASE_URL;
  const llave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !llave) throw new Error("Falta configurar SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY");
  cliente = createClient(url, llave, { auth: { persistSession: false } });
  return cliente;
}

// Qué correo es de quién (CORREO_A = Ric, CORREO_B = Yaz). Cualquier otra cuenta no tiene acceso.
function personaDeCorreo(correo: string): Persona | null {
  const c = correo.trim().toLowerCase();
  if (c === process.env.CORREO_A?.trim().toLowerCase()) return "a";
  if (c === process.env.CORREO_B?.trim().toLowerCase()) return "b";
  return null;
}

// Guardamos un minuto qué token es de quién, para no preguntarle a Supabase en cada petición
const sesiones = new Map<string, { persona: Persona; vence: number }>();

/**
 * Revisa la sesión de Supabase que manda el navegador y devuelve quién es.
 * Si no hay sesión válida devuelve la respuesta de error para regresarla tal cual.
 */
export async function autenticar(req: Request): Promise<Persona | Response> {
  const token = req.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return Response.json({ error: "Inicia sesión" }, { status: 401 });

  const guardada = sesiones.get(token);
  if (guardada && guardada.vence > Date.now()) return guardada.persona;

  if (!process.env.CORREO_A || !process.env.CORREO_B) {
    return Response.json({ error: "Falta configurar CORREO_A y CORREO_B" }, { status: 500 });
  }

  try {
    const { data, error: e } = await db().auth.getUser(token);
    if (e || !data.user?.email) return Response.json({ error: "Tu sesión expiró, vuelve a entrar" }, { status: 401 });

    const persona = personaDeCorreo(data.user.email);
    if (!persona) return Response.json({ error: "Esta cuenta no tiene acceso" }, { status: 403 });

    if (sesiones.size > 50) sesiones.clear();
    sesiones.set(token, { persona, vence: Date.now() + 60_000 });
    return persona;
  } catch (e) {
    return error(e);
  }
}

export function error(e: unknown): Response {
  const mensaje = e instanceof Error ? e.message : "Algo salió mal";
  const status = (e as { status?: number }).status ?? 500;
  if (status >= 500) console.error(e);
  return Response.json({ error: mensaje }, { status });
}

export function invalido(mensaje = "Datos inválidos"): Response {
  return Response.json({ error: mensaje }, { status: 400 });
}

// Lanza si la consulta de Supabase falló; si no, devuelve los datos
export function revisar<T>(r: { data: T; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data;
}

let vapidListo = false;

function push(): typeof webpush {
  if (!vapidListo) {
    const publica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privada = process.env.VAPID_PRIVATE_KEY;
    if (!publica || !privada) throw new Error("Faltan las llaves VAPID");
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:nosotros@example.com", publica, privada);
    vapidListo = true;
  }
  return webpush;
}

// Manda una notificación push a todos los dispositivos de una persona
export async function notificar(para: Persona, title: string, body: string, url = "/"): Promise<number> {
  const subs = revisar(await db().from("suscripciones").select("endpoint, data").eq("persona", para)) ?? [];
  const aviso = JSON.stringify({ title, body, url });
  let enviadas = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await push().sendNotification(s.data, aviso);
        enviadas++;
      } catch (err) {
        const codigo = (err as { statusCode?: number }).statusCode;
        // La suscripción ya no existe (desinstaló la app o revocó el permiso)
        if (codigo === 404 || codigo === 410) await db().from("suscripciones").delete().eq("endpoint", s.endpoint);
        else console.error(err);
      }
    }),
  );
  return enviadas;
}

const BUCKET = "fotos";
const TIPOS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_BYTES = 4 * 1024 * 1024;

export async function subirImagen(archivo: FormDataEntryValue | null, carpeta: string): Promise<string> {
  if (!(archivo instanceof File) || !TIPOS[archivo.type]) throw Object.assign(new Error("La imagen no es válida"), { status: 400 });
  if (archivo.size > MAX_BYTES) throw Object.assign(new Error("La imagen es muy pesada"), { status: 400 });
  const path = `${carpeta}/${crypto.randomUUID()}.${TIPOS[archivo.type]}`;
  revisar(await db().storage.from(BUCKET).upload(path, archivo, { contentType: archivo.type }));
  return path;
}

export async function borrarImagenes(paths: string[]) {
  if (paths.length) await db().storage.from(BUCKET).remove(paths);
}

// Las fotos son privadas: generamos links temporales para verlas
// Guardamos los links unas horas: si cambiaran en cada consulta, el navegador volvería a descargar las fotos
const firmados = new Map<string, { url: string; vence: number }>();
const DURACION = 60 * 60 * 6; // segundos

export async function firmar(paths: (string | null | undefined)[]): Promise<Record<string, string>> {
  const unicos = [...new Set(paths.filter((p): p is string => !!p))];
  const ahora = Date.now();
  const resultado: Record<string, string> = {};
  const faltan: string[] = [];
  for (const p of unicos) {
    const c = firmados.get(p);
    // Se renueva si le queda menos de una hora
    if (c && c.vence - ahora > 60 * 60 * 1000) resultado[p] = c.url;
    else faltan.push(p);
  }
  if (faltan.length) {
    const nuevos = revisar(await db().storage.from(BUCKET).createSignedUrls(faltan, DURACION)) ?? [];
    if (firmados.size > 2000) firmados.clear();
    for (const f of nuevos) {
      if (!f.signedUrl || !f.path) continue;
      resultado[f.path] = f.signedUrl;
      firmados.set(f.path, { url: f.signedUrl, vence: ahora + DURACION * 1000 });
    }
  }
  return resultado;
}

// Nombre que se muestra de cada quien: su apodo si lo puso, o el de la configuración
export async function nombresActuales(): Promise<Record<Persona, string>> {
  const filas: { persona: Persona; apodo: string | null }[] = revisar(await db().from("perfiles").select("persona, apodo")) ?? [];
  const nombres = { ...NOMBRES };
  for (const f of filas) if (f.apodo) nombres[f.persona] = f.apodo;
  return nombres;
}
