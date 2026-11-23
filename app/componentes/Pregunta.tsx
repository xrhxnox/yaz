"use client";

import { useCallback, useState } from "react";
import { formatearFecha, otra, type Persona } from "@/lib/config";
import { usePareja } from "@/lib/pareja";
import Avatar from "./Avatar";
import { api, enCache } from "@/lib/cliente";
import { useCarga } from "@/lib/useCarga";
import { vibrar } from "@/lib/vibrar";
import { botonPrimario, campo, enlace } from "@/lib/estilos";
import Esqueleto from "./Esqueleto";

type Dia = { fecha: string; pregunta: string; a: string | null; b: string | null; numeros?: { a: number; b: number } | null };

type Datos =
  | {
      modo: "numeros";
      fecha: string;
      pregunta: string | null;
      miNumero: number | null;
      suyoElegido: boolean;
      suyoNumero: number | null;
      responde: Persona | null;
      respuesta: string | null;
      historial: Dia[];
    }
  | {
      modo: "clasico";
      fecha: string;
      pregunta: string;
      mia: string | null;
      suya: string | null;
      suyaRespondida: boolean;
      historial: Dia[];
    };

const caja = "rounded-2xl border border-borde bg-tarjeta p-4";

function Respuesta({ persona, quien, texto }: { persona: Persona; quien: string; texto: string }) {
  const { acentos } = usePareja();
  return (
    <div className="rounded-xl bg-relleno p-3">
      <p className="flex items-center gap-1.5 text-xs" style={{ color: acentos[persona] }}>
        <Avatar persona={persona} size={18} />
        {quien}
      </p>
      <p className="mt-1.5 font-serif text-lg leading-snug whitespace-pre-wrap break-words">{texto}</p>
    </div>
  );
}

export default function Pregunta({ yo }: { yo: Persona }) {
  const { nombres, acentos } = usePareja();
  const [datos, setDatos] = useState<Datos | null>(() => enCache("/api/pregunta"));
  const [error, setError] = useState("");
  const [texto, setTexto] = useState("");
  const [editando, setEditando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [diaVisto, setDiaVisto] = useState(0);
  const tu = otra(yo);
  const quien = (p: Persona) => (p === yo ? "Tú" : nombres[p]);

  const cargar = useCallback(async () => {
    try {
      setDatos(await api<Datos>("/api/pregunta"));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useCarga(cargar, 30000);

  async function elegir(numero: 1 | 2) {
    setEnviando(true);
    setError("");
    try {
      vibrar();
      await api("/api/pregunta", { numero });
      await cargar();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEnviando(false);
    }
  }

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

  if (!datos) return error ? <p className="py-10 text-center text-sm text-suave">{error}</p> : <Esqueleto filas={2} />;

  const formulario = (nota: string) => (
    <form onSubmit={responder} className="mt-4 space-y-2">
      <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={4} maxLength={1000} placeholder="Tu respuesta" className={`${campo} resize-none`} />
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-suave">{nota}</p>
        <button disabled={!texto.trim() || enviando} className={`${botonPrimario} shrink-0`}>
          {enviando ? "Enviando…" : "Responder"}
        </button>
      </div>
    </form>
  );

  const editar = (actual: string) => (
    <button
      onClick={() => {
        setTexto(actual);
        setEditando(true);
      }}
      className={`${enlace} mt-3 text-xs`}
    >
      Editar mi respuesta
    </button>
  );

  const encabezado = (
    <p className="text-xs tracking-wide text-acento-texto">
      Pregunta del día · {formatearFecha(datos.fecha, { day: "numeric", month: "long" })}
    </p>
  );

  // ---------- Hoy ----------
  let hoy: React.ReactNode;
  if (datos.modo === "numeros") {
    const { miNumero, suyoElegido, suyoNumero, responde, respuesta, pregunta } = datos;
    if (miNumero === null) {
      // 1) Elegir número a ciegas
      hoy = (
        <section className={caja}>
          {encabezado}
          <p className="mt-2 font-serif text-2xl leading-tight">Elige un número</p>
          <p className="mt-1 text-sm text-suave">
            Si eligen distinto, responde <span style={{ color: acentos.a }}>{nombres.a}</span>. Si eligen el mismo, responde{" "}
            <span style={{ color: acentos.b }}>{nombres.b}</span>.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {([1, 2] as const).map((n) => (
              <button
                key={n}
                onClick={() => elegir(n)}
                disabled={enviando}
                className="aspect-[4/3] rounded-2xl bg-acento font-serif text-6xl text-sobre-acento shadow-sm transition active:scale-95 disabled:opacity-60"
              >
                {n}
              </button>
            ))}
          </div>
          {suyoElegido && <p className="mt-3 text-center text-xs text-suave">{nombres[tu]} ya eligió el suyo</p>}
        </section>
      );
    } else if (!suyoElegido || !responde || !pregunta) {
      // 2) Esperando a la otra persona
      hoy = (
        <section className={`${caja} text-center`}>
          {encabezado}
          <div className="mx-auto mt-4 flex h-24 w-24 items-center justify-center rounded-2xl bg-acento font-serif text-6xl text-sobre-acento">{miNumero}</div>
          <p className="mt-3 font-serif text-xl">Elegiste el {miNumero}</p>
          <p className="mt-1 text-sm text-suave">La pregunta aparece cuando {nombres[tu]} elija su número…</p>
        </section>
      );
    } else {
      // 3) Ya eligieron los dos: se revela la pregunta y a quién le toca
      const meToca = responde === yo;
      hoy = (
        <section className={`${caja} entrar-seccion`}>
          {encabezado}
          <div className="mt-3 flex items-center justify-center gap-3 text-sm">
            {([yo, tu] as Persona[]).map((p) => (
              <span key={p} className="flex items-center gap-1.5 rounded-full bg-relleno px-3 py-1">
                <span style={{ color: acentos[p] }}>{quien(p)}</span>
                <span className="font-serif text-lg leading-none">{p === yo ? miNumero : suyoNumero}</span>
              </span>
            ))}
          </div>
          <p className="mt-2 text-center text-xs text-suave">
            {miNumero === suyoNumero ? "Iguales" : "Distintos"} →{" "}
            {meToca ? <span style={{ color: acentos[yo] }}>te toca responder a ti</span> : <>responde <span style={{ color: acentos[responde] }}>{nombres[responde]}</span></>}
          </p>
          <p className="mt-4 font-serif text-[1.7rem] leading-tight tracking-tight lg:text-4xl">{pregunta}</p>
          {meToca ? (
            !respuesta || editando ? (
              formulario(`${nombres[tu]} la verá en cuanto respondas.`)
            ) : (
              <div className="mt-4">
                <Respuesta persona={yo} quien="Tu respuesta" texto={respuesta} />
                {editar(respuesta)}
              </div>
            )
          ) : respuesta ? (
            <div className="mt-4">
              <Respuesta persona={tu} quien={nombres[tu]} texto={respuesta} />
            </div>
          ) : (
            <p className="mt-4 font-serif text-suave italic">Esperando la respuesta de {nombres[tu]}…</p>
          )}
        </section>
      );
    }
  } else {
    // Como antes (si todavía no existe la tabla de números): responden los dos
    const { mia, suya, suyaRespondida, pregunta } = datos;
    hoy = (
      <section className={caja}>
        {encabezado}
        <p className="mt-2 font-serif text-[1.7rem] leading-tight tracking-tight lg:text-4xl">{pregunta}</p>
        {!mia || editando ? (
          formulario(suyaRespondida ? `${nombres[tu]} ya respondió. Contesta para ver su respuesta.` : `Verás la respuesta de ${nombres[tu]} cuando ambos contesten.`)
        ) : (
          <div className="mt-4 space-y-2">
            <Respuesta persona={yo} quien="Tú" texto={mia} />
            {suya ? <Respuesta persona={tu} quien={nombres[tu]} texto={suya} /> : <p className="font-serif text-suave italic">Esperando la respuesta de {nombres[tu]}…</p>}
            {editar(mia)}
          </div>
        )}
      </section>
    );
  }

  // ---------- Días anteriores: uno a la vez, deslizando ----------
  const historial = datos.historial;

  return (
    <div className="space-y-6 lg:grid lg:grid-cols-12 lg:items-start lg:gap-10 lg:space-y-0">
      <div className="lg:col-span-7">
        {hoy}
        {error && <p className="mt-2 text-sm text-acento-texto">{error}</p>}
      </div>

      {historial.length > 0 && (
        <section className="lg:col-span-5">
          <div className="mb-2 flex items-baseline justify-between">
            <p className="font-serif text-xl">Días anteriores</p>
            {historial.length > 1 && (
              <p className="text-xs text-suave">
                {diaVisto + 1} de {historial.length} · desliza
              </p>
            )}
          </div>
          <div
            className="-mx-5 flex items-start snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none] lg:mx-0 lg:px-0"
            onScroll={(e) => {
              const c = e.currentTarget;
              const ancho = (c.firstElementChild as HTMLElement | null)?.offsetWidth ?? c.clientWidth;
              setDiaVisto(Math.min(historial.length - 1, Math.round(c.scrollLeft / (ancho + 12))));
            }}
          >
            {historial.map((h) => (
              <article key={h.fecha} className={`${caja} w-[88%] shrink-0 snap-center lg:w-full`}>
                <p className="text-xs tracking-wide text-acento-texto">{formatearFecha(h.fecha)}</p>
                <p className="mt-1 font-serif text-xl leading-snug">{h.pregunta}</p>
                {h.numeros && (
                  <p className="mt-1 text-[11px] text-suave">
                    {nombres.a} {h.numeros.a} · {nombres.b} {h.numeros.b}
                  </p>
                )}
                <div className="mt-3 space-y-2">
                  {(["a", "b"] as Persona[]).map((p) => {
                    const t = h[p];
                    return t ? <Respuesta key={p} persona={p} quien={quien(p)} texto={t} /> : null;
                  })}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
