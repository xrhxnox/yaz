import { CLAVE_MINUSCULAS, CLAVE_SESION, CLAVE_TEMA, type Persona } from "./config";
import { derivarTema, type Tema } from "./colores";

// Variables que pusimos en <html style> la última vez, para poder quitarlas
const PROPIEDADES = ["color-scheme", "--fondo", "--tarjeta", "--texto", "--suave", "--borde", "--relleno", "--acento", "--sobre-acento", "--acento-texto", "--acento-suave"];

/**
 * Aplica el tema de quien está usando la app.
 * - persona null: tema neutro de la pantalla de entrada
 * - tema null: colores originales de esa persona (globals.css)
 * - tema: colores personalizados, calculados a partir de fondo y acento
 */
export function aplicarTema(persona: Persona | null, tema: Tema | null, guardar = true) {
  const raiz = document.documentElement;
  if (persona) raiz.dataset.tema = persona;
  else delete raiz.dataset.tema;

  for (const p of PROPIEDADES) raiz.style.removeProperty(p);
  const vars = persona && tema ? derivarTema(tema) : null;
  if (vars) for (const [k, v] of Object.entries(vars)) raiz.style.setProperty(k, v);

  if (guardar) {
    try {
      if (persona && vars) localStorage.setItem(CLAVE_TEMA, JSON.stringify({ persona, vars }));
      else localStorage.removeItem(CLAVE_TEMA);
    } catch {}
  }

  const fondo = getComputedStyle(raiz).getPropertyValue("--fondo").trim();
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", fondo));
}

// Mostrar todos los textos en minúsculas (preferencia de cada quien)
export function aplicarMinusculas(persona: Persona | null, activo: boolean, guardar = true) {
  const raiz = document.documentElement;
  if (persona && activo) raiz.dataset.minusculas = "";
  else delete raiz.dataset.minusculas;
  if (!guardar) return;
  try {
    if (persona && activo) localStorage.setItem(CLAVE_MINUSCULAS, persona);
    else localStorage.removeItem(CLAVE_MINUSCULAS);
  } catch {}
}

// Se ejecuta en <head> antes de pintar, para que no parpadee el tema
export const SCRIPT_TEMA = `try{var s=JSON.parse(localStorage.getItem(${JSON.stringify(CLAVE_SESION)})||"null");if(s&&(s.persona==="a"||s.persona==="b")){var r=document.documentElement;r.dataset.tema=s.persona;var t=JSON.parse(localStorage.getItem(${JSON.stringify(CLAVE_TEMA)})||"null");if(t&&t.persona===s.persona)for(var k in t.vars)r.style.setProperty(k,t.vars[k]);if(localStorage.getItem(${JSON.stringify(CLAVE_MINUSCULAS)})===s.persona)r.dataset.minusculas=""}}catch(e){}`;
