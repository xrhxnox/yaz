"use client";

import { useState } from "react";
import { vibrar } from "@/lib/vibrar";
import { MAX_MENSAJE, MENSAJES, otra, type Persona } from "@/lib/config";
import { useNombres } from "@/lib/pareja";
import Avatar from "./Avatar";
import type { Estado } from "@/lib/cliente";
import Corazon from "./Corazon";
import { campo, enlace, numero, tarjeta, titulo } from "@/lib/estilos";

// Mensajes recientes que se ven sin abrir la lista completa
const VISIBLES = 5;

function hace(iso: string, ahora: Date) {
  const min = Math.floor((ahora.getTime() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  return new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

export default function PenseEnTi({
  yo,
  estado,
  ahora,
  alEnviar,
}: {
  yo: Persona;
  estado: Estado | null;
  ahora: Date;
  alEnviar: (mensaje: string) => Promise<void>;
}) {
  const NOMBRES = useNombres();
  const [mensaje, setMensaje] = useState(MENSAJES[0]);
  const [personalizado, setPersonalizado] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [pulso, setPulso] = useState(0);
  const [verTodos, setVerTodos] = useState(false);
  const tu = otra(yo);
  const texto = personalizado.trim() || mensaje;

  async function enviar() {
    vibrar([10, 50, 10]);
    setPulso((p) => p + 1);
    setEnviando(true);
    try {
      await alEnviar(texto);
      setPersonalizado("");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className={tarjeta}>
      <p className={titulo}>Para {NOMBRES[tu]}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {MENSAJES.map((m) => (
          <button
            key={m}
            onClick={() => {
              setMensaje(m);
              setPersonalizado("");
            }}
            className={`rounded-full border px-3 py-1 text-sm transition ${
              mensaje === m && !personalizado.trim() ? "border-acento bg-acento text-sobre-acento" : "border-borde hover:bg-relleno"
            }`}
          >
            {m}
          </button>
        ))}
      </div>
      <input
        value={personalizado}
        onChange={(e) => setPersonalizado(e.target.value)}
        maxLength={MAX_MENSAJE}
        placeholder="O escribe tu propio mensaje"
        className={`${campo} mt-2 text-sm`}
      />

      <button
        onClick={enviar}
        disabled={enviando}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-acento py-3 font-medium text-sobre-acento transition active:scale-[0.98] disabled:opacity-60"
      >
        <Corazon key={pulso} size={18} className={pulso ? "pulso" : ""} />
        Enviar “{texto}”
      </button>

      {estado && (
        <>
          <div className="mt-6 grid grid-cols-2 divide-x divide-borde border-y border-borde py-3">
            <div className="pr-4">
              <p className={`${numero} text-3xl`}>{estado.hoy[yo]}</p>
              <p className="text-xs text-suave">enviados hoy</p>
            </div>
            <div className="pl-4">
              <p className={`${numero} text-3xl text-acento-texto`}>{estado.hoy[tu]}</p>
              <p className="text-xs text-suave">recibidos de {NOMBRES[tu]}</p>
            </div>
          </div>

          {estado.recientes.length > 0 && (
            <ul
              className={`mt-5 space-y-4 ${verTodos ? "-mr-2 max-h-80 overflow-y-auto overscroll-contain pr-2" : ""}`}
              aria-label="Mensajes recientes"
            >
              {(verTodos ? estado.recientes : estado.recientes.slice(0, VISIBLES)).map((p) => (
                <li key={p.id} className={`border-l-2 pl-3 ${p.de === yo ? "border-borde" : "border-acento-texto"}`}>
                  <p className="font-serif text-lg leading-snug break-words">“{p.mensaje}”</p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-suave">
                    <Avatar persona={p.de} size={18} />
                    {p.de === yo ? "Tú" : NOMBRES[p.de]}, {hace(p.created_at, ahora)}
                  </p>
                </li>
              ))}
            </ul>
          )}
          {estado.recientes.length > VISIBLES && (
            <button onClick={() => setVerTodos((v) => !v)} className={`${enlace} mt-4 text-xs`}>
              {verTodos ? "Ver menos" : `Ver más (${estado.recientes.length - VISIBLES})`}
            </button>
          )}
          <p className="mt-5 text-xs text-suave">{estado.total.a + estado.total.b} mensajes desde el principio</p>
        </>
      )}
    </section>
  );
}
