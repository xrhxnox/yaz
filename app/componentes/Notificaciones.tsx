"use client";

import { useEffect, useState } from "react";
import { otra, type Persona } from "@/lib/config";
import { useNombres } from "@/lib/pareja";
import { api } from "@/lib/cliente";
import { botonPrimario } from "@/lib/estilos";

function base64AUint8(base64: string) {
  const relleno = "=".repeat((4 - (base64.length % 4)) % 4);
  const crudo = atob((base64 + relleno).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(crudo, (c) => c.charCodeAt(0));
}

type Situacion = "cargando" | "activas" | "inactivas" | "bloqueadas" | "instalar-ios" | "sin-soporte";

export default function Notificaciones({ yo, enPerfil }: { yo: Persona; enPerfil?: boolean }) {
  const NOMBRES = useNombres();
  const [situacion, setSituacion] = useState<Situacion>("cargando");
  const [error, setError] = useState("");
  // En Hoy el aviso se puede cerrar (y no vuelve en este dispositivo)
  const claveCerrado = `nosotros:aviso-notificaciones:${yo}`;
  const [cerrado, setCerrado] = useState(() => {
    try {
      return localStorage.getItem(claveCerrado) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    (async () => {
      const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const instalada = window.matchMedia("(display-mode: standalone)").matches || ("standalone" in navigator && navigator.standalone === true);
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setSituacion(ios && !instalada ? "instalar-ios" : "sin-soporte");
        return;
      }
      const registro = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
      if (Notification.permission === "denied") return setSituacion("bloqueadas");
      const sub = await registro.pushManager.getSubscription();
      if (sub && Notification.permission === "granted") {
        // Re-registrar por si la base se reinició o cambió de persona
        api("/api/suscribir", { subscription: sub.toJSON() }).catch(() => {});
        setSituacion("activas");
      } else {
        setSituacion("inactivas");
      }
    })().catch(() => setSituacion("sin-soporte"));
  }, [yo]);

  async function activar() {
    setError("");
    try {
      const clave = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!clave) throw new Error("Falta la llave VAPID pública");
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") return setSituacion(permiso === "denied" ? "bloqueadas" : "inactivas");
      const registro = await navigator.serviceWorker.ready;
      const sub = await registro.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64AUint8(clave) });
      await api("/api/suscribir", { subscription: sub.toJSON() });
      setSituacion("activas");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (situacion === "cargando") return null;
  // En Hoy solo se avisa lo que se puede resolver ahí mismo; lo demás vive en el perfil
  if (!enPerfil && (cerrado || !(situacion === "inactivas" || situacion === "instalar-ios"))) return null;

  return (
    <section className={enPerfil ? "text-sm" : "relative rounded-2xl bg-relleno p-4 pr-10 text-sm"}>
      {!enPerfil && (
        <button
          onClick={() => {
            setCerrado(true);
            try {
              localStorage.setItem(claveCerrado, "1");
            } catch {}
          }}
          aria-label="Cerrar aviso"
          className="absolute top-2 right-2 rounded-full p-1.5 text-suave hover:bg-tarjeta hover:text-texto"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      )}
      {situacion === "activas" && (
        <p className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-acento text-sobre-acento">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
              <path d="M5 12l5 5 9-10" />
            </svg>
          </span>
          Activadas en este dispositivo
        </p>
      )}
      {situacion === "inactivas" && (
        <>
          <p>Activa las notificaciones para enterarte cuando {NOMBRES[otra(yo)]} te mande algo.</p>
          <button onClick={activar} className={`${botonPrimario} mt-3`}>
            Activar notificaciones
          </button>
          {error && <p className="mt-2 text-acento-texto">{error}</p>}
        </>
      )}
      {situacion === "instalar-ios" && (
        <p>
          Para recibir notificaciones en iPhone: toca <b>Compartir</b> y luego <b>Agregar a inicio</b>. Después abre la app desde el ícono.
        </p>
      )}
      {situacion === "bloqueadas" && <p>Las notificaciones están bloqueadas. Actívalas desde los ajustes del navegador para este sitio.</p>}
      {situacion === "sin-soporte" && <p>Este navegador no soporta notificaciones. Prueba con Chrome, Edge o Safari.</p>}
    </section>
  );
}
