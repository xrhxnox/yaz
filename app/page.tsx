"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { PAREJA, esFuente, otra } from "@/lib/config";
import { PAREJA_INICIAL, ProveedorPareja, type Pareja } from "@/lib/pareja";
import { api, guardarSesion, limpiarCache, leerSesion, medianocheLocal, suscribirSesion, type Estado } from "@/lib/cliente";
import { useCarga } from "@/lib/useCarga";
import { aplicarFuente, aplicarMinusculas, aplicarTema } from "@/lib/tema";
import { cerrarSesion } from "@/lib/cuenta";
import Bienvenida from "./componentes/Bienvenida";
import Portada from "./componentes/Portada";
import UnDiaComoHoy from "./componentes/UnDiaComoHoy";
import Historias from "./componentes/Historias";
import PenseEnTi from "./componentes/PenseEnTi";
import Notificaciones from "./componentes/Notificaciones";
import SeccionJuegos from "./componentes/SeccionJuegos";
import AvisoTurno from "./componentes/AvisoTurno";
import Muro from "./componentes/Muro";
import Nosotros from "./componentes/Nosotros";
import Crear from "./componentes/Crear";
import TirarParaActualizar from "./componentes/TirarParaActualizar";
import Buscar from "./componentes/Buscar";
import Animo from "./componentes/Animo";
import Navegacion, { SECCIONES, type Seccion } from "./componentes/Navegacion";
import Perfil from "./componentes/Perfil";
import Cabecera from "./componentes/Cabecera";
import Reproductor, { EspacioReproductor } from "./componentes/Reproductor";
import { ProveedorReproductor } from "@/lib/reproductor";
import Cumpleanos from "./componentes/Cumpleanos";
import Corazones, { crearCorazones, type Particula } from "./componentes/Corazones";

// La sección actual vive en el #hash de la URL (así las notificaciones pueden abrir una sección)
type Vista = Seccion | "perfil" | "buscar";

// Direcciones de antes (avisos y links viejos) → dónde viven ahora
function redireccion(h: string, sub: string): string | null {
  if (h === "pregunta") return "juegos/pregunta";
  if (h === "lista") return "nosotros/pendientes";
  if (h === "fotos") return sub === "diario" ? "nosotros/diario" : "muro";
  if (h === "playlist") return "nosotros/playlist";
  if (h === "buzon") return "nosotros/buzon";
  if (h === "momentos") return `nosotros/${!sub || sub === "linea" ? "historia" : sub}`;
  return null;
}

function leerSeccion(): Vista {
  // #seccion o #seccion/pestaña (ej. #nosotros/playlist)
  const [h, sub = ""] = window.location.hash.slice(1).split("/");
  const nueva = redireccion(h, sub);
  if (nueva) {
    history.replaceState(null, "", `#${nueva}`);
    return nueva.split("/")[0] as Vista;
  }
  return h === "perfil" || h === "buscar" || (SECCIONES as readonly string[]).includes(h) ? (h as Vista) : "inicio";
}

function suscribirSeccion(oyente: () => void) {
  window.addEventListener("hashchange", oyente);
  return () => window.removeEventListener("hashchange", oyente);
}

export default function Inicio() {
  const sesion = useSyncExternalStore(suscribirSesion, leerSesion, () => undefined);
  const seccion = useSyncExternalStore(suscribirSeccion, leerSeccion, () => "inicio" as Vista);
  const [estado, setEstado] = useState<Estado | null>(null);
  const [ahora, setAhora] = useState<Date | null>(null);
  const [corazones, setCorazones] = useState<Particula[]>([]);
  const [aviso, setAviso] = useState("");
  // Hoja de "Crear" (botón + del menú)
  const [creando, setCreando] = useState(false);
  // Como en una app: cada sección nueva empieza hasta arriba
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [seccion]);
  const ultimoVisto = useRef<number | null>(null);

  useEffect(() => {
    const tic = () => setAhora(new Date());
    const t0 = setTimeout(tic, 0);
    const t = setInterval(tic, 1000);
    return () => {
      clearTimeout(t0);
      clearInterval(t);
    };
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [seccion]);

  // Cada quien tiene su tema (Ric oscuro con azul, Yaz claro con rosa), o el que personalizó en su perfil
  // persona: undefined = todavía no se lee la sesión, null = no hay sesión
  const persona = sesion === undefined ? undefined : (sesion?.persona ?? null);
  const temaGuardado = JSON.stringify(persona && estado ? (estado.temas?.[persona] ?? null) : undefined);
  useEffect(() => {
    if (persona === undefined) return;
    if (persona === null) return aplicarTema(null, null);
    // Mientras carga el estado se queda el tema guardado en el dispositivo
    if (temaGuardado === undefined) document.documentElement.dataset.tema = persona;
    else aplicarTema(persona, JSON.parse(temaGuardado));
  }, [persona, temaGuardado]);

  // Apodos, fotos de perfil y cumpleaños que comparten todas las pantallas
  const pareja: Pareja = useMemo(
    () =>
      estado
        ? {
            nombres: estado.nombres,
            avatares: estado.avatares,
            cumples: estado.cumples,
            acentos: {
              a: estado.temas?.a?.acento ?? PAREJA_INICIAL.acentos.a,
              b: estado.temas?.b?.acento ?? PAREJA_INICIAL.acentos.b,
            },
          }
        : PAREJA_INICIAL,
    [estado],
  );
  const titulo = `${pareja.nombres.b}&${pareja.nombres.a}`;
  useEffect(() => {
    document.title = sesion ? titulo : PAREJA;
  }, [titulo, sesion]);

  // Textos normales o todo en minúsculas (preferencia guardada en el perfil)
  const minusculas = !!(persona && estado?.estilos?.[persona]?.minusculas);
  const estiloCargado = !!estado;
  useEffect(() => {
    if (persona === undefined) return;
    if (persona === null) return aplicarMinusculas(null, false);
    // Mientras carga el estado se queda lo guardado en el dispositivo
    if (estiloCargado) aplicarMinusculas(persona, minusculas);
  }, [persona, minusculas, estiloCargado]);

  // Letra elegida en el perfil
  const fuenteGuardada = persona ? estado?.estilos?.[persona]?.fuente : undefined;
  const fuente = esFuente(fuenteGuardada) ? fuenteGuardada : "diario";
  useEffect(() => {
    if (persona === undefined) return;
    if (persona === null) return aplicarFuente(null, "diario");
    if (estiloCargado) aplicarFuente(persona, fuente);
  }, [persona, fuente, estiloCargado]);

  const lanzarCorazones = useCallback(() => {
    const nuevos = crearCorazones();
    setCorazones((c) => [...c, ...nuevos]);
    setTimeout(() => setCorazones((c) => c.filter((x) => !nuevos.includes(x))), 3600);
  }, []);

  const mostrarAviso = useCallback((texto: string) => {
    setAviso(texto);
    setTimeout(() => setAviso(""), 2800);
  }, []);

  const salir = useCallback(() => {
    cerrarSesion();
    limpiarCache();
    guardarSesion(null);
    setEstado(null);
    ultimoVisto.current = null;
  }, []);

  const cargar = useCallback(async () => {
    if (!sesion) return;
    try {
      const e = await api<Estado>(`/api/estado?desde=${encodeURIComponent(medianocheLocal())}`);
      // Si llegó algo nuevo de la otra persona mientras la app está abierta, celebramos
      const ultimoSuyo = e.recientes.find((p) => p.de === otra(sesion.persona))?.id ?? 0;
      if (ultimoVisto.current !== null && ultimoSuyo > ultimoVisto.current) {
        lanzarCorazones();
        mostrarAviso(`${e.nombres[otra(sesion.persona)]} te mandó un mensaje`);
      }
      ultimoVisto.current = ultimoSuyo;
      setEstado(e);
    } catch (err) {
      if ((err as { status?: number }).status === 401) salir();
    }
  }, [sesion, lanzarCorazones, mostrarAviso, salir]);

  useCarga(cargar, 15000);

  if (sesion === undefined) return null;
  if (sesion === null) return <Bienvenida alEntrar={guardarSesion} />;
  if (!ahora) return null;

  const yo = sesion.persona;

  return (
    <ProveedorPareja value={pareja}>
      <ProveedorReproductor>
      <main className="mx-auto w-full max-w-md flex-1 space-y-5 px-5 pt-[env(safe-area-inset-top)] app:pt-[calc(env(safe-area-inset-top)+0.5rem)] pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:max-w-6xl lg:space-y-10 lg:px-10 lg:pt-8 lg:pb-16">
        <Cabecera ahora={ahora} ubicaciones={estado?.ubicaciones} seccion={seccion} yo={yo} alCrear={() => setCreando(true)} />

        {seccion === "inicio" && (
          <>
            <Historias yo={yo} />
            {/* Solo lo que pide algo hoy */}
            <Cumpleanos yo={yo} />
            <AvisoTurno turnos={estado?.turnos} />
            <Notificaciones yo={yo} />
            {/* En escritorio: dos columnas, como la portada de un periódico */}
            <div className="space-y-6 lg:grid lg:grid-cols-12 lg:gap-12 lg:space-y-0">
            <div className="space-y-6 lg:col-span-7 lg:space-y-8">
            <Portada
              yo={yo}
              ahora={ahora}
              estado={estado}
              alCambiar={cargar}
              alGuardarFecha={async (fecha) => {
                await api("/api/proximo", { fecha });
                await cargar();
              }}
            />
            <Animo yo={yo} animos={estado?.animos} alCambiar={cargar} />
            <UnDiaComoHoy />
            </div>
            <div className="lg:col-span-5 lg:border-l lg:border-borde lg:pl-12">
            <PenseEnTi
              yo={yo}
              estado={estado}
              ahora={ahora}
              alEnviar={async (mensaje) => {
                lanzarCorazones();
                try {
                  await api("/api/pensar", { mensaje });
                  mostrarAviso(`Enviado a ${pareja.nombres[otra(yo)]}`);
                  await cargar();
                } catch (e) {
                  mostrarAviso(`No se pudo enviar: ${(e as Error).message}`);
                }
              }}
            />
            </div>
            </div>
          </>
        )}
        {seccion === "muro" && (
          <div className="lg:mx-auto lg:max-w-xl">
            <Muro yo={yo} />
          </div>
        )}
        {seccion === "juegos" && <SeccionJuegos yo={yo} turnos={estado?.turnos} />}
        {seccion === "nosotros" && <Nosotros yo={yo} />}
        {seccion === "buscar" && <Buscar />}
        {seccion === "perfil" && <Perfil
            yo={yo}
            temaActual={estado?.temas?.[yo] ?? null}
            minusculas={minusculas}
            fuente={fuente}
            ubicacion={estado?.ubicaciones?.[yo] ?? null}
            alCambiarTema={cargar}
            alCambiarDatos={cargar}
            alSalir={salir}
          />}
        <EspacioReproductor />
      </main>

      <Navegacion actual={seccion} alCrear={() => setCreando(true)} />
      <Crear abierto={creando} alCerrar={() => setCreando(false)} />
      <TirarParaActualizar />
      <Reproductor />
      <Corazones lista={corazones} />
      {aviso && (
        <div className="fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-4 lg:bottom-8">
          <p className="rounded-full bg-texto px-4 py-2 text-sm font-medium text-fondo shadow-lg">{aviso}</p>
        </div>
      )}
      </ProveedorReproductor>
    </ProveedorPareja>
  );
}
