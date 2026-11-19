"use client";

import { useEffect, useState } from "react";
import { vibrar } from "@/lib/vibrar";
import { MAX_MENSAJE, MENSAJES, otra, type Persona } from "@/lib/config";
import { usePareja } from "@/lib/pareja";
import Avatar from "./Avatar";
import type { Estado } from "@/lib/cliente";
import Corazon from "./Corazon";
import { campo, enlace, numero } from "@/lib/estilos";

function hace(iso: string, ahora: Date) {
  const min = Math.floor((ahora.getTime() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  return new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

// Mandar un "pensé en ti" en un toque; los números y todos los mensajes se ven en una hoja aparte
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
  const { nombres, acentos } = usePareja();
  const [mensaje, setMensaje] = useState(MENSAJES[0]);
  const [escribiendo, setEscribiendo] = useState(false);
  const [personalizado, setPersonalizado] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [pulso, setPulso] = useState(0);
  const [verTodos, setVerTodos] = useState(false);
  const tu = otra(yo);
  const texto = (escribiendo && personalizado.trim()) || mensaje;
  const ultimoSuyo = estado?.recientes.find((p) => p.de === tu);

  useEffect(() => {
    if (!verTodos) return;
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && setVerTodos(false);
    window.addEventListener("keydown", tecla);
    return () => {
      document.body.style.overflow = antes;
      window.removeEventListener("keydown", tecla);
    };
  }, [verTodos]);

  async function enviar() {
    vibrar([10, 50, 10]);
    setPulso((p) => p + 1);
    setEnviando(true);
    try {
      await alEnviar(texto);
      setPersonalizado("");
      setEscribiendo(false);
    } finally {
      setEnviando(false);
    }
  }

  const chip = (activo: boolean) =>
    `shrink-0 rounded-full border px-3 py-1 text-sm transition active:scale-95 ${activo ? "border-acento bg-acento text-sobre-acento" : "border-borde hover:bg-relleno"}`;

  return (
    <section className="rounded-2xl border border-borde bg-tarjeta p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-serif text-xl leading-tight">Pensé en ti</p>
        {estado && estado.recientes.length > 0 && (
          <button onClick={() => setVerTodos(true)} className={`${enlace} text-xs`}>
            Ver todos
          </button>
        )}
      </div>

      <div className="-mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] lg:flex-wrap">
        {MENSAJES.map((m) => (
          <button
            key={m}
            onClick={() => {
              setMensaje(m);
              setEscribiendo(false);
            }}
            className={chip(mensaje === m && !escribiendo)}
          >
            {m}
          </button>
        ))}
        <button onClick={() => setEscribiendo(true)} className={chip(escribiendo)}>
          Otro…
        </button>
      </div>
      {escribiendo && (
        <input
          value={personalizado}
          onChange={(e) => setPersonalizado(e.target.value)}
          maxLength={MAX_MENSAJE}
          placeholder={`Escríbele algo a ${nombres[tu]}`}
          autoFocus
          className={`${campo} mt-2 text-sm`}
        />
      )}

      <button
        onClick={enviar}
        disabled={enviando}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-acento py-3 font-medium text-sobre-acento transition active:scale-[0.98] disabled:opacity-60"
      >
        <Corazon key={pulso} size={18} className={pulso ? "pulso" : ""} />
        <span className="truncate">Enviar “{texto}”</span>
      </button>

      {ultimoSuyo && (
        <p className="mt-3 flex items-start gap-2 text-sm">
          <Avatar persona={tu} size={20} />
          <span className="min-w-0">
            <span style={{ color: acentos[tu] }}>{nombres[tu]}</span>
            <span className="font-serif italic"> “{ultimoSuyo.mensaje}”</span>
            <span className="text-xs text-suave"> · {hace(ultimoSuyo.created_at, ahora)}</span>
          </span>
        </p>
      )}

      {/* Todos los mensajes, en una hoja desde abajo */}
      {verTodos && estado && (
        <div className="fondo-aparecer fixed inset-0 z-[70] flex items-end justify-center bg-black/45 lg:items-center" onClick={() => setVerTodos(false)} role="presentation">
          <div
            role="dialog"
            aria-label="Mensajes"
            onClick={(e) => e.stopPropagation()}
            className="hoja-subir flex max-h-[80vh] w-full max-w-md flex-col rounded-t-3xl border border-borde bg-tarjeta px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl lg:rounded-3xl"
          >
            <div className="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-borde lg:hidden" />
            <div className="flex items-baseline justify-between">
              <p className="font-serif text-2xl">Pensé en ti</p>
              <button onClick={() => setVerTodos(false)} className="text-sm text-suave hover:text-texto">
                Cerrar
              </button>
            </div>
            <div className="mt-3 grid shrink-0 grid-cols-3 divide-x divide-borde border-y border-borde py-3 text-center">
              <div>
                <p className={`${numero} text-2xl`}>{estado.hoy[yo]}</p>
                <p className="text-[11px] text-suave">enviaste hoy</p>
              </div>
              <div>
                <p className={`${numero} text-2xl text-acento-texto`}>{estado.hoy[tu]}</p>
                <p className="text-[11px] text-suave">de {nombres[tu]} hoy</p>
              </div>
              <div>
                <p className={`${numero} text-2xl`}>{estado.total.a + estado.total.b}</p>
                <p className="text-[11px] text-suave">desde el inicio</p>
              </div>
            </div>
            <ul className="mt-3 min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pb-2" aria-label="Mensajes recientes">
              {estado.recientes.map((p) => (
                <li key={p.id} className={`border-l-2 pl-3 ${p.de === yo ? "border-borde" : "border-acento-texto"}`}>
                  <p className="font-serif text-lg leading-snug break-words">“{p.mensaje}”</p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-suave">
                    <Avatar persona={p.de} size={18} />
                    {p.de === yo ? "Tú" : nombres[p.de]}, {hace(p.created_at, ahora)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
