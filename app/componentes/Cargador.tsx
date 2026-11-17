"use client";

import { useEffect, useState } from "react";
import { NOMBRES } from "@/lib/config";
import { cargasPendientes } from "@/lib/cargas";
import Corazon from "./Corazon";

const MAXIMO = 6000; // nunca se queda más de esto, aunque algo no cargue
const ANTES_DE_MOSTRAR = 150; // al cambiar de pestaña: si carga rápido, ni aparece
const REVISAR_CADA = 80;
const REVISIONES_ESTABLES = 3; // seguido "listo" varias veces (da tiempo a que empiecen las cargas)

// Todo listo: hay pantalla, sin llamadas pendientes, letras descargadas e imágenes visibles cargadas
function listo() {
  if (!document.querySelector("main")) return false;
  if (cargasPendientes() > 0) return false;
  if (document.fonts.status !== "loaded") return false;
  for (const img of document.querySelectorAll("main img")) {
    const r = img.getBoundingClientRect();
    const visible = r.width > 0 && r.bottom > 0 && r.top < window.innerHeight;
    if (visible && !(img as HTMLImageElement).complete) return false;
  }
  return true;
}

type Fase = "visible" | "saliendo" | "oculto";

// #inicio, #juegos/gato… (sin hash = inicio)
function pestanaActual() {
  return window.location.hash.slice(1) || "inicio";
}

// Pestañas que ya cargaron una vez en esta visita: al regresar a ellas no sale el cargador
const visitadas = new Set<string>();

// Pantalla de carga: al abrir la app y al entrar por primera vez a una pestaña, hasta que todo aparece
export default function Cargador() {
  const [fase, setFase] = useState<Fase>("visible");

  useEffect(() => {
    let reloj: ReturnType<typeof setTimeout> | undefined;
    let salida: ReturnType<typeof setTimeout> | undefined;

    function vigilar(mostrarYa: boolean) {
      clearTimeout(reloj);
      clearTimeout(salida);
      const inicio = Date.now();
      let estables = 0;
      let mostrado = mostrarYa;
      const paso = () => {
        estables = listo() ? estables + 1 : 0;
        const pasado = Date.now() - inicio;
        if (estables >= REVISIONES_ESTABLES || pasado > MAXIMO) {
          if (document.querySelector("main")) visitadas.add(pestanaActual());
          if (mostrado) {
            setFase("saliendo");
            salida = setTimeout(() => setFase("oculto"), 300);
          }
          return;
        }
        if (!mostrado && pasado >= ANTES_DE_MOSTRAR) {
          mostrado = true;
          setFase("visible");
        }
        reloj = setTimeout(paso, REVISAR_CADA);
      };
      paso();
    }

    vigilar(true);
    const alNavegar = () => {
      if (visitadas.has(pestanaActual())) {
        clearTimeout(reloj);
        return;
      }
      vigilar(false);
    };
    window.addEventListener("hashchange", alNavegar);
    return () => {
      window.removeEventListener("hashchange", alNavegar);
      clearTimeout(reloj);
      clearTimeout(salida);
    };
  }, []);

  if (fase === "oculto") return null;
  return (
    <div
      role="status"
      aria-label="Cargando"
      className={`fixed inset-0 z-[55] flex flex-col items-center justify-center bg-fondo transition-opacity duration-300 ${
        fase === "saliendo" ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <p className="font-serif text-[2.6rem] leading-none tracking-tight lg:text-[4rem]">
        {NOMBRES.b} <span className="text-acento-texto italic">&amp;</span> {NOMBRES.a}
      </p>
      <Corazon size={22} className="latido mt-6 text-acento-texto" />
    </div>
  );
}
