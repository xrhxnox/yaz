"use client";

import { useState } from "react";
import { campo, enlace, etiqueta, numero, tarjeta } from "@/lib/estilos";

function aInputLocal(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const boton = "rounded-full px-4 py-2 text-sm font-medium transition disabled:opacity-30";

export default function Reencuentro({
  fecha,
  ahora,
  alGuardar,
}: {
  fecha: string | null;
  ahora: Date;
  alGuardar: (fecha: string | null) => Promise<void>;
}) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState("");
  const [guardando, setGuardando] = useState(false);

  function abrir() {
    setValor(fecha ? aInputLocal(fecha) : "");
    setEditando(true);
  }

  async function guardar(nueva: string | null) {
    setGuardando(true);
    try {
      await alGuardar(nueva);
      setEditando(false);
    } finally {
      setGuardando(false);
    }
  }

  const restante = fecha ? new Date(fecha).getTime() - ahora.getTime() : null;

  let contenido: React.ReactNode;
  if (editando) {
    contenido = (
      <div className="mt-3 space-y-3">
        <input
          type="datetime-local"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          className={campo}
        />
        <div className="flex items-center gap-2">
          <button onClick={() => setEditando(false)} className={`${boton} border border-borde hover:bg-relleno`}>
            Cancelar
          </button>
          <button disabled={!valor || guardando} onClick={() => guardar(new Date(valor).toISOString())} className={`${boton} bg-acento text-sobre-acento`}>
            {guardando ? "Guardando…" : "Guardar"}
          </button>
          {fecha && (
            <button onClick={() => guardar(null)} className={`${enlace} ml-auto`}>
              Quitar
            </button>
          )}
        </div>
      </div>
    );
  } else if (restante === null) {
    contenido = (
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="font-serif text-lg italic text-suave">Sin fecha todavía.</p>
        <button onClick={abrir} className={`${boton} bg-acento text-sobre-acento`}>
          Poner fecha
        </button>
      </div>
    );
  } else if (restante <= 0) {
    contenido = (
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="font-serif text-2xl italic">Hoy nos vemos.</p>
        <button onClick={abrir} className={enlace}>
          Siguiente fecha
        </button>
      </div>
    );
  } else {
    const s = Math.floor(restante / 1000);
    const bloques = [
      [Math.floor(s / 86400), "días"],
      [Math.floor((s % 86400) / 3600), "horas"],
      [Math.floor((s % 3600) / 60), "min"],
      [s % 60, "seg"],
    ] as const;
    contenido = (
      <>
        <div className="mt-2 grid grid-cols-4 divide-x divide-borde">
          {bloques.map(([n, nombre], i) => (
            <div key={nombre} className={i === 0 ? "pr-3" : "px-3"}>
              <p className={`${numero} ${i === 0 ? "text-5xl" : "text-3xl"} leading-tight`}>{n}</p>
              <p className="text-xs text-suave">{nombre}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="font-serif text-sm italic text-suave first-letter:uppercase">
            {new Date(fecha!).toLocaleString("es-MX", { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" })}
          </p>
          <button onClick={abrir} className={enlace}>
            Cambiar
          </button>
        </div>
      </>
    );
  }

  return (
    <section className={tarjeta}>
      <p className={etiqueta}>Próximo reencuentro</p>
      {contenido}
    </section>
  );
}
