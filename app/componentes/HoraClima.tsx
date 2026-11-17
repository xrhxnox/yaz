"use client";

import { useCallback, useState } from "react";
import { NOMBRES, type Persona } from "@/lib/config";
import { api, type Ubicacion } from "@/lib/cliente";
import { useCarga } from "@/lib/useCarga";
import { botonPrimario, botonSecundario, campo, enlace, etiqueta, tarjeta } from "@/lib/estilos";

type Clima = { temp: number; codigo: number };
type Resultado = { name: string; admin1?: string; country?: string; latitude: number; longitude: number; timezone: string };

// Códigos WMO que usa Open-Meteo
function describir(codigo: number): string {
  if (codigo === 0) return "Despejado";
  if (codigo <= 2) return "Algo nublado";
  if (codigo === 3) return "Nublado";
  if (codigo <= 48) return "Niebla";
  if (codigo <= 57) return "Llovizna";
  if (codigo <= 67) return "Lluvia";
  if (codigo <= 77) return "Nieve";
  if (codigo <= 82) return "Chubascos";
  if (codigo <= 86) return "Nieve";
  return "Tormenta";
}

function horaEn(zona: string, ahora: Date) {
  const hora = ahora.toLocaleTimeString("es-MX", { timeZone: zona, hour: "numeric", minute: "2-digit" });
  const h = Number(new Intl.DateTimeFormat("en-US", { timeZone: zona, hour: "numeric", hourCycle: "h23" }).format(ahora));
  const dia = ahora.toLocaleDateString("es-MX", { timeZone: zona, weekday: "long" });
  return { hora, dia, deNoche: h >= 23 || h < 7 };
}

function BuscarCiudad({ alElegir, alCancelar }: { alElegir: (r: Resultado) => Promise<void>; alCancelar: () => void }) {
  const [texto, setTexto] = useState("");
  const [resultados, setResultados] = useState<Resultado[] | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function buscar(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    setOcupado(true);
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(texto.trim())}&count=6&language=es`,
      );
      const datos = await res.json();
      setResultados(datos.results ?? []);
    } catch {
      setResultados([]);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="mt-4 border-t border-borde pt-4">
      <form onSubmit={buscar} className="flex gap-2">
        <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Tu ciudad" className={campo} autoFocus />
        <button disabled={ocupado} className={botonPrimario}>
          Buscar
        </button>
      </form>
      {resultados && (
        <ul className="mt-2 divide-y divide-borde">
          {resultados.length === 0 && <li className="py-2 text-sm text-suave">No encontré esa ciudad.</li>}
          {resultados.map((r) => (
            <li key={`${r.latitude},${r.longitude}`}>
              <button
                onClick={async () => {
                  setOcupado(true);
                  await alElegir(r).finally(() => setOcupado(false));
                }}
                disabled={ocupado}
                className="w-full py-2 text-left text-sm hover:text-suave"
              >
                {r.name}
                <span className="text-suave"> · {[r.admin1, r.country].filter(Boolean).join(", ")}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <button onClick={alCancelar} className={`${botonSecundario} mt-2`}>
        Cancelar
      </button>
    </div>
  );
}

export default function HoraClima({
  yo,
  ubicaciones,
  ahora,
  alCambiar,
}: {
  yo: Persona;
  ubicaciones: Record<Persona, Ubicacion | null> | undefined;
  ahora: Date;
  alCambiar: () => Promise<void>;
}) {
  const [clima, setClima] = useState<Partial<Record<Persona, Clima>>>({});
  const [editando, setEditando] = useState(false);
  const a = ubicaciones?.a;
  const b = ubicaciones?.b;

  const cargarClima = useCallback(async () => {
    const lugares = { a, b };
    const nuevos: Partial<Record<Persona, Clima>> = {};
    await Promise.all(
      (["a", "b"] as Persona[]).map(async (p) => {
        const u = lugares[p];
        if (!u) return;
        try {
          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${u.lat}&longitude=${u.lon}&current=temperature_2m,weather_code`,
          );
          const d = await res.json();
          nuevos[p] = { temp: Math.round(d.current.temperature_2m), codigo: d.current.weather_code };
        } catch {}
      }),
    );
    setClima(nuevos);
  }, [a, b]);

  useCarga(cargarClima, 15 * 60 * 1000);

  return (
    <section className={tarjeta}>
      <div className="grid grid-cols-2 divide-x divide-borde">
        {(["a", "b"] as Persona[]).map((p) => {
          const u = ubicaciones?.[p];
          const h = u ? horaEn(u.zona, ahora) : null;
          const c = clima[p];
          return (
            <div key={p} className={p === "a" ? "pr-4" : "pl-4"}>
              <p className={etiqueta}>{NOMBRES[p]}</p>
              {u && h ? (
                <>
                  <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">{h.hora}</p>
                  <p className="truncate text-sm">{u.ciudad}</p>
                  <p className="text-sm text-suave">{c ? `${c.temp}° · ${describir(c.codigo)}` : "…"}</p>
                  {h.deNoche && p !== yo && <p className="mt-1 text-xs text-suave">Probablemente durmiendo</p>}
                </>
              ) : (
                <p className="mt-1 text-sm text-suave">{p === yo ? "Agrega tu ciudad" : "Sin ciudad todavía"}</p>
              )}
            </div>
          );
        })}
      </div>
      {editando ? (
        <BuscarCiudad
          alCancelar={() => setEditando(false)}
          alElegir={async (r) => {
            await api("/api/ubicacion", {
              ciudad: r.name,
              lat: r.latitude,
              lon: r.longitude,
              zona: r.timezone,
            });
            await alCambiar();
            setEditando(false);
          }}
        />
      ) : (
        <button onClick={() => setEditando(true)} className={`${enlace} mt-3`}>
          {ubicaciones?.[yo] ? "Cambiar mi ciudad" : "Poner mi ciudad"}
        </button>
      )}
    </section>
  );
}
