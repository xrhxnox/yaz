"use client";

import { createContext, useContext } from "react";
import { NOMBRES, type Persona } from "./config";

// Datos de los dos que se usan en muchas pantallas: apodo, foto de perfil y cumpleaños
export type Pareja = {
  nombres: Record<Persona, string>;
  avatares: Record<Persona, string | null>;
  cumples: Record<Persona, string | null>;
};

export const PAREJA_INICIAL: Pareja = {
  nombres: NOMBRES,
  avatares: { a: null, b: null },
  cumples: { a: null, b: null },
};

const Contexto = createContext<Pareja>(PAREJA_INICIAL);

export const ProveedorPareja = Contexto.Provider;

export function usePareja() {
  return useContext(Contexto);
}

export function useNombres() {
  return useContext(Contexto).nombres;
}
