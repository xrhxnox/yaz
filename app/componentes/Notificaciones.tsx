"use client";

import { useEffect, useState } from "react";
import { NOMBRES, otra, type Persona } from "@/lib/config";
import { api } from "@/lib/cliente";

function base64AUint8(base64: string) {
  const relleno = "=".repeat((4 - (base64.length % 4)) % 4);
  const crudo = atob((base64 + relleno).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(crudo, (c) => c.charCodeAt(0));
}

type Situacion = "cargando" | "activas" | "inactivas" | "bloqueadas" | "instalar-ios" | "sin-soporte";

export default function Notificaciones({ yo }: { yo: Persona }) {
  const [situacion, setSituacion] = useState<Situacion>("cargando");
  const [error, setError] = useState("");

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

  if (situacion === "cargando" || situacion === "activas") return null;

  return (
    <section className="rounded-xl bg-relleno p-4 text-sm">
      {situacion === "inactivas" && (
        <>
          <p>Activa las notificaciones para enterarte cuando {NOMBRES[otra(yo)]} te mande algo.</p>
          <button onClick={activar} className="mt-3 rounded-full bg-acento px-4 py-2 font-medium text-sobre-acento">
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
