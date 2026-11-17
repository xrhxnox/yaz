"use client";

import { createContext, useContext } from "react";
import { NOMBRES, TEMA_INICIAL, type Persona } from "./config";

// Datos de los dos que se usan en muchas pantallas: apodo, foto de perfil y cumpleaños
export type Pareja = {
  nombres: Record<Persona, string>;
  avatares: Record<Persona, string | null>;
  cumples: Record<Persona, string | null>;
  // Color de acento que usa cada quien (el original o el que personalizó)
  acentos: Record<Persona, string>;
};

export const PAREJA_INICIAL: Pareja = {
  nombres: NOMBRES,
  avatares: { a: null, b: null },
  cumples: { a: null, b: null },
  acentos: { a: TEMA_INICIAL.a.acento, b: TEMA_INICIAL.b.acento },
};

const Contexto = createContext<Pareja>(PAREJA_INICIAL);

export const ProveedorPareja = Contexto.Provider;

export function usePareja() {
  return useContext(Contexto);
}

export function useNombres() {
  return useContext(Contexto).nombres;
}
