import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Persona } from "./config";

// Cliente de Supabase en el navegador: SOLO para iniciar sesión y cambiar contraseña.
// Los datos se leen y escriben siempre a través de /api (el servidor usa la llave secreta).
let cliente: SupabaseClient | null = null;

export function supa(): SupabaseClient {
  if (cliente) return cliente;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const llave = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !llave) throw new Error("Falta configurar NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  cliente = createClient(url, llave, { auth: { persistSession: true, autoRefreshToken: true, storageKey: "nosotros:auth" } });
  return cliente;
}

export async function tokenActual(): Promise<string | null> {
  const { data } = await supa().auth.getSession();
  return data.session?.access_token ?? null;
}

// Traduce los errores de Supabase Auth
function traducir(mensaje: string): string {
  if (/invalid login credentials/i.test(mensaje)) return "Correo o contraseña incorrectos";
  if (/email not confirmed/i.test(mensaje)) return "Falta confirmar el correo de esta cuenta en Supabase";
  if (/should be different/i.test(mensaje)) return "La nueva contraseña debe ser diferente a la actual";
  if (/at least (\d+)/i.test(mensaje)) return `La contraseña debe tener al menos ${mensaje.match(/at least (\d+)/i)![1]} caracteres`;
  if (/weak|pwned|leaked/i.test(mensaje)) return "Esa contraseña es muy débil o apareció en filtraciones; elige otra";
  if (/rate limit|too many/i.test(mensaje)) return "Demasiados intentos; espera un momento";
  if (/fetch|network/i.test(mensaje)) return "Sin conexión; revisa tu internet";
  return mensaje;
}

export async function iniciarSesion(correo: string, contrasena: string, preguntarQuienSoy: () => Promise<Persona>): Promise<Persona> {
  const { error } = await supa().auth.signInWithPassword({ email: correo.trim(), password: contrasena });
  if (error) throw new Error(traducir(error.message));
  try {
    return await preguntarQuienSoy();
  } catch (e) {
    // La cuenta existe pero no es la de Ric ni la de Yaz
    await supa().auth.signOut();
    throw e;
  }
}

export async function cerrarSesion() {
  await supa().auth.signOut().catch(() => {});
}

export async function correoActual(): Promise<string | null> {
  const { data } = await supa().auth.getSession();
  return data.session?.user.email ?? null;
}

// Confirma la contraseña actual antes de cambiarla
export async function cambiarContrasena(actual: string, nueva: string) {
  const correo = await correoActual();
  if (!correo) throw new Error("Tu sesión expiró, vuelve a entrar");
  const { error: e1 } = await supa().auth.signInWithPassword({ email: correo, password: actual });
  if (e1) throw new Error(/invalid login/i.test(e1.message) ? "La contraseña actual no es correcta" : traducir(e1.message));
  const { error: e2 } = await supa().auth.updateUser({ password: nueva });
  if (e2) throw new Error(traducir(e2.message));
}
