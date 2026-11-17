import { CLAVE_FUENTE, CLAVE_MINUSCULAS, CLAVE_SESION, CLAVE_TEMA, type Fuente, type Persona } from "./config";
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

  const estilos = getComputedStyle(raiz);
  const fondo = estilos.getPropertyValue("--fondo").trim();
  const acento = estilos.getPropertyValue("--acento").trim();
  // Como app, arriba va la franja de acento: la barra del sistema toma ese mismo color
  const comoApp = matchMedia("(display-mode: standalone)").matches;
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", comoApp ? acento : fondo));
  refrescarFranja(acento);
}

// iPhone guarda el color de lo que está detrás de la barra de estado y no lo actualiza
// cuando solo cambia el color: se oculta la franja un par de cuadros para que lo vuelva a tomar
function refrescarFranja(acento: string) {
  const franja = document.querySelector<HTMLElement>(".franja-app");
  if (!franja) return;
  franja.style.background = acento;
  franja.style.visibility = "hidden";
  requestAnimationFrame(() => requestAnimationFrame(() => franja.style.removeProperty("visibility")));
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

// Estilo de letra (preferencia de cada quien); "diario" es el original
export function aplicarFuente(persona: Persona | null, fuente: Fuente, guardar = true) {
  const raiz = document.documentElement;
  const activa = persona && fuente !== "diario";
  if (activa) raiz.dataset.fuente = fuente;
  else delete raiz.dataset.fuente;
  if (!guardar) return;
  try {
    if (activa) localStorage.setItem(CLAVE_FUENTE, JSON.stringify({ persona, fuente }));
    else localStorage.removeItem(CLAVE_FUENTE);
  } catch {}
}

// Se ejecuta en <head> antes de pintar, para que no parpadee el tema
export const SCRIPT_TEMA = `try{var s=JSON.parse(localStorage.getItem(${JSON.stringify(CLAVE_SESION)})||"null");if(s&&(s.persona==="a"||s.persona==="b")){var r=document.documentElement;r.dataset.tema=s.persona;var t=JSON.parse(localStorage.getItem(${JSON.stringify(CLAVE_TEMA)})||"null");if(t&&t.persona===s.persona)for(var k in t.vars)r.style.setProperty(k,t.vars[k]);if(localStorage.getItem(${JSON.stringify(CLAVE_MINUSCULAS)})===s.persona)r.dataset.minusculas="";var f=JSON.parse(localStorage.getItem(${JSON.stringify(CLAVE_FUENTE)})||"null");if(f&&f.persona===s.persona)r.dataset.fuente=f.fuente}}catch(e){}`;
