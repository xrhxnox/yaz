// Cambia de sección (el #hash de la URL); deja la anterior en el historial para el botón "atrás"
export function irA(hash: string) {
  window.location.hash = hash;
}

// Dirección del perfil de alguien: el mío (#perfil) o el de mi pareja (#perfil/pareja)
export function perfilDe(persona: "a" | "b", yo: "a" | "b") {
  return persona === yo ? "perfil" : "perfil/pareja";
}
