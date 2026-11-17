"use client";

import { useCallback, useState } from "react";
import { formatearFecha, otra, type Persona } from "@/lib/config";
import { useNombres } from "@/lib/pareja";
import Avatar from "./Avatar";
import { api } from "@/lib/cliente";
import { useCarga } from "@/lib/useCarga";
import { botonPrimario, campo, enlace, etiqueta, junto, tarjeta, titulo } from "@/lib/estilos";

type Datos = {
  fecha: string;
  pregunta: string;
  mia: string | null;
  suya: string | null;
  suyaRespondida: boolean;
  historial: { fecha: string; pregunta: string; a: string; b: string }[];
};

function Respuesta({ quien, persona, texto, destacada }: { quien: string; persona: Persona; texto: string; destacada?: boolean }) {
  return (
    <div className={`border-l-2 pl-3 ${destacada ? "border-acento-texto" : "border-borde"}`}>
      <p className="font-serif text-lg leading-snug whitespace-pre-wrap break-words">{texto}</p>
      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-suave">
        <Avatar persona={persona} size={18} />
        {quien}
      </p>
    </div>
  );
}

export default function Pregunta({ yo }: { yo: Persona }) {
  const NOMBRES = useNombres();
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState("");
  const [texto, setTexto] = useState("");
  const [editando, setEditando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const tu = otra(yo);

  const cargar = useCallback(async () => {
    try {
      setDatos(await api<Datos>("/api/pregunta"));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useCarga(cargar, 30000);

  async function responder(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    setEnviando(true);
    try {
      await api("/api/pregunta", { respuesta: texto });
      setEditando(false);
      await cargar();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  if (!datos) return <p className="py-10 text-center text-sm text-suave">{error || "Cargando…"}</p>;

  const formulario = (
    <form onSubmit={responder} className="mt-4 space-y-2">
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={4}
        maxLength={1000}
        placeholder="Tu respuesta"
        className={`${campo} resize-none`}
      />
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-suave">
          {datos.suyaRespondida ? `${NOMBRES[tu]} ya respondió. Contesta para ver su respuesta.` : `Verás la respuesta de ${NOMBRES[tu]} cuando ambos contesten.`}
        </p>
        <button disabled={!texto.trim() || enviando} className={botonPrimario}>
          {enviando ? "Enviando…" : "Responder"}
        </button>
      </div>
    </form>
  );

  return (
    <div className="space-y-6 lg:grid lg:grid-cols-12 lg:items-start lg:gap-12 lg:space-y-0">
      <section className={`${tarjeta} lg:col-span-7`}>
        <p className={titulo}>
          Pregunta del día<span className={junto}>{formatearFecha(datos.fecha, { day: "numeric", month: "long" })}</span>
        </p>
        <p className="mt-2 font-serif text-[1.85rem] lg:text-5xl leading-tight tracking-tight">{datos.pregunta}</p>

        {!datos.mia || editando ? (
          formulario
        ) : (
          <div className="mt-6 space-y-5">
            <Respuesta quien="Tú" persona={yo} texto={datos.mia} />
            {datos.suya ? (
              <Respuesta quien={NOMBRES[tu]} persona={tu} texto={datos.suya} destacada />
            ) : (
              <p className="font-serif italic text-suave">Esperando la respuesta de {NOMBRES[tu]}…</p>
            )}
            <button
              onClick={() => {
                setTexto(datos.mia ?? "");
                setEditando(true);
              }}
              className={enlace}
            >
              Editar mi respuesta
            </button>
          </div>
        )}
        {error && <p className="mt-2 text-sm text-acento-texto">{error}</p>}
      </section>

      {datos.historial.length > 0 && (
        <div className="space-y-6 lg:col-span-5 lg:border-l lg:border-borde lg:pl-12">
          <p className={`${titulo} pt-2`}>Días anteriores</p>
          {datos.historial.map((h) => (
            <section key={h.fecha} className={tarjeta}>
              <p className={etiqueta}>{formatearFecha(h.fecha)}</p>
              <p className="mt-1 font-serif text-xl leading-snug">{h.pregunta}</p>
              <div className="mt-4 space-y-4">
                <Respuesta quien={yo === "a" ? "Tú" : NOMBRES.a} persona="a" texto={h.a} destacada={yo !== "a"} />
                <Respuesta quien={yo === "b" ? "Tú" : NOMBRES.b} persona="b" texto={h.b} destacada={yo !== "b"} />
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
