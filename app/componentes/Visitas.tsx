"use client";

import { useCallback, useState } from "react";
import { formatearFecha, hoyCompartido, type Persona } from "@/lib/config";
import { api, enCache } from "@/lib/cliente";
import { useCarga } from "@/lib/useCarga";
import Vacio, { ICONOS_VACIO } from "./Vacio";
import { usePareja } from "@/lib/pareja";
import { botonPrimario, botonSecundario, caja, campo, enlace, etiqueta, numero, tarjeta, titulo as tituloSeccion } from "@/lib/estilos";

type Visita = { id: number; inicio: string; fin: string; ciudad: string | null; nota: string | null; creado_por: Persona };
type Datos = { inicio: string; fin: string; ciudad: string; nota: string };

function dias(v: { inicio: string; fin: string }) {
  return Math.round((Date.parse(v.fin) - Date.parse(v.inicio)) / 864e5) + 1;
}

function rango(v: { inicio: string; fin: string }) {
  if (v.inicio === v.fin) return formatearFecha(v.inicio);
  const corto = { day: "numeric", month: "short" } as const;
  return `${formatearFecha(v.inicio, corto)} – ${formatearFecha(v.fin, { ...corto, year: "numeric" })}`;
}

function FormVisita({ inicial, boton, alGuardar, alCancelar }: { inicial: Datos; boton: string; alGuardar: (d: Datos) => Promise<void>; alCancelar: () => void }) {
  const [d, setD] = useState(inicial);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (d.fin < d.inicio) return setError("La fecha de regreso no puede ser antes de la llegada");
    setGuardando(true);
    setError("");
    try {
      await alGuardar(d);
    } catch (err) {
      setError((err as Error).message);
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={guardar} className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className={etiqueta}>Llegada</span>
          <input type="date" value={d.inicio} onChange={(e) => setD({ ...d, inicio: e.target.value })} className={`${campo} mt-1`} />
        </label>
        <label className="block">
          <span className={etiqueta}>Regreso</span>
          <input type="date" value={d.fin} onChange={(e) => setD({ ...d, fin: e.target.value })} className={`${campo} mt-1`} />
        </label>
      </div>
      <input value={d.ciudad} onChange={(e) => setD({ ...d, ciudad: e.target.value })} maxLength={80} placeholder="Ciudad (ej. Hermosillo)" className={campo} />
      <textarea
        value={d.nota}
        onChange={(e) => setD({ ...d, nota: e.target.value })}
        maxLength={500}
        rows={2}
        placeholder="¿Qué hicieron? (opcional)"
        className={`${campo} resize-none`}
      />
      {error && <p className="text-sm text-acento-texto">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={alCancelar} className={botonSecundario}>
          Cancelar
        </button>
        <button disabled={!d.inicio || !d.fin || guardando} className={`${botonPrimario} flex-1`}>
          {guardando ? "Guardando…" : boton}
        </button>
      </div>
    </form>
  );
}

// Cada vez que se vieron en persona
export default function Visitas() {
  const { acentos } = usePareja();
  const [visitas, setVisitas] = useState<Visita[] | null>(() => enCache<{ visitas: Visita[] }>("/api/visitas")?.visitas ?? null);
  const [error, setError] = useState("");
  const [agregando, setAgregando] = useState(false);
  const [editando, setEditando] = useState<number | null>(null);

  const cargar = useCallback(async () => {
    try {
      setVisitas((await api<{ visitas: Visita[] }>("/api/visitas")).visitas);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useCarga(cargar);

  async function borrar(v: Visita) {
    if (!confirm(`¿Borrar la visita del ${rango(v)}?`)) return;
    try {
      await api(`/api/visitas?id=${v.id}`, undefined, "DELETE");
    } catch (e) {
      setError((e as Error).message);
    }
    await cargar();
  }

  const total = (visitas ?? []).reduce((t, v) => t + dias(v), 0);
  const hoy = hoyCompartido();

  return (
    <div className="space-y-6">
      {visitas && visitas.length > 0 && (
        <section className="grid grid-cols-2 divide-x divide-borde border-y border-borde py-3">
          <div className="pr-4">
            <p className={`${numero} text-4xl text-acento-texto`}>{visitas.length}</p>
            <p className="text-xs text-suave">{visitas.length === 1 ? "vez" : "veces"} que nos hemos visto</p>
          </div>
          <div className="pl-4">
            <p className={`${numero} text-4xl text-acento-texto`}>{total}</p>
            <p className="text-xs text-suave">{total === 1 ? "día" : "días"} juntos en persona</p>
          </div>
        </section>
      )}

      {agregando ? (
        <div className={caja}>
          <p className={tituloSeccion}>Nueva visita</p>
          <div className="mt-3">
            <FormVisita
              inicial={{ inicio: hoy, fin: hoy, ciudad: "", nota: "" }}
              boton="Guardar visita"
              alCancelar={() => setAgregando(false)}
              alGuardar={async (d) => {
                await api("/api/visitas", d);
                setAgregando(false);
                await cargar();
              }}
            />
          </div>
        </div>
      ) : (
        <button onClick={() => setAgregando(true)} className={`${botonPrimario} w-full py-2.5`}>
          Registrar una visita
        </button>
      )}

      {error && <p className="text-sm text-acento-texto">{error}</p>}
      {!visitas && !error && <p className="py-10 text-center text-sm text-suave">Cargando…</p>}
      {visitas && visitas.length === 0 && !agregando && (
        <Vacio icono={ICONOS_VACIO.lugar} texto="Todavía no registran visitas. Agreguen cada vez que se vean." />
      )}

      {visitas && visitas.length > 0 && (
        <ul className={`${tarjeta} divide-y divide-borde`}>
          {visitas.map((v) => (
            <li key={v.id} className="py-3">
              {editando === v.id ? (
                <FormVisita
                  inicial={{ inicio: v.inicio, fin: v.fin, ciudad: v.ciudad ?? "", nota: v.nota ?? "" }}
                  boton="Guardar"
                  alCancelar={() => setEditando(null)}
                  alGuardar={async (d) => {
                    await api("/api/visitas", { id: v.id, ...d }, "PATCH");
                    setEditando(null);
                    await cargar();
                  }}
                />
              ) : (
                <div className="flex items-start gap-3">
                  <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: acentos[v.creado_por] }} />
                  <div className="min-w-0 flex-1">
                    <p className="font-serif text-xl leading-tight">{v.ciudad ?? "Visita"}</p>
                    <p className="text-xs text-suave">
                      {rango(v)} · {dias(v)} {dias(v) === 1 ? "día" : "días"}
                    </p>
                    {v.nota && <p className="mt-1 text-sm whitespace-pre-wrap text-suave">{v.nota}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button onClick={() => setEditando(v.id)} className={`${enlace} text-xs`}>
                      Editar
                    </button>
                    <button onClick={() => borrar(v)} aria-label="Borrar visita" className="text-suave hover:text-acento-texto">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                        <path d="M6 6l12 12M18 6L6 18" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
