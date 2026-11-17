"use client";

import { useState } from "react";
import { NOMBRES, type Persona } from "@/lib/config";
import { api, type Sesion } from "@/lib/cliente";
import { iniciarSesion } from "@/lib/cuenta";
import { campo } from "@/lib/estilos";
import Corazon from "./Corazon";

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
      <form onSubmit={entrar} className="w-full max-w-sm rounded-2xl border border-borde bg-tarjeta p-6">
        <Corazon className="text-acento-texto" size={28} />
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">
          {NOMBRES.a} & {NOMBRES.b}
        </h1>
        <p className="mt-1 text-sm text-suave">Entra con tu cuenta.</p>

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
          className="mt-4 w-full rounded-xl bg-acento py-2.5 font-medium text-sobre-acento transition disabled:opacity-30"
        >
          {cargando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
