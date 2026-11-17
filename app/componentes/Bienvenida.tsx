"use client";

import { useState } from "react";
import { FECHA_INICIO, NOMBRES, formatearFecha, type Persona } from "@/lib/config";
import { api, type Sesion } from "@/lib/cliente";
import { iniciarSesion } from "@/lib/cuenta";
import { campo } from "@/lib/estilos";

export default function Bienvenida({ alEntrar }: { alEntrar: (s: Sesion) => void }) {
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    if (!correo.trim() || !contrasena) return;
    setCargando(true);
    setError("");
    try {
      const persona = await iniciarSesion(correo, contrasena, async () => (await api<{ persona: Persona }>("/api/yo")).persona);
      alEntrar({ persona });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <form onSubmit={entrar} className="w-full max-w-sm">
        <p className="text-center text-[11px] tracking-wide text-suave">Desde el {formatearFecha(FECHA_INICIO)}</p>
        <h1 className="mt-1 text-center font-serif text-5xl leading-none tracking-tight">
          {NOMBRES.a} <span className="text-acento-texto italic">&amp;</span> {NOMBRES.b}
        </h1>
        <p className="mt-4 border-y border-borde py-1.5 text-center font-serif text-sm italic text-suave">Nuestro diario a distancia</p>

        <input
          type="email"
          autoComplete="email"
          inputMode="email"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          placeholder="Correo"
          className={`${campo} mt-6`}
        />
        <input
          type="password"
          autoComplete="current-password"
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
          placeholder="Contraseña"
          className={`${campo} mt-2`}
        />

        {error && <p className="mt-3 text-sm text-acento-texto">{error}</p>}

        <button
          disabled={!correo.trim() || !contrasena || cargando}
          className="mt-4 w-full rounded-full bg-acento py-2.5 font-medium text-sobre-acento transition disabled:opacity-30"
        >
          {cargando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
