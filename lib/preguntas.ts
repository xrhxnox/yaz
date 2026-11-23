import { FECHA_INICIO } from "./config";

export const PREGUNTAS = [
  "¿Qué fue lo mejor de tu día?",
  "¿Qué es lo primero que quieres hacer cuando nos volvamos a ver?",
  "¿Cuál es tu recuerdo favorito de nosotros hasta ahora?",
  "Si pudiéramos viajar mañana a cualquier lugar, ¿a dónde iríamos?",
  "¿Qué canción te recuerda a mí?",
  "¿Qué es algo que te hizo reír esta semana?",
  "¿Qué comida te gustaría que cocináramos juntos?",
  "¿Qué es algo que nunca le has contado a nadie (y te animas a contarme)?",
  "¿Cuál fue tu primera impresión de mí?",
  "¿Qué es algo pequeño que hago que te gusta mucho?",
  "¿Qué te gustaría aprender este año?",
  "¿Cómo sería tu día perfecto de principio a fin?",
  "¿Qué película o serie deberíamos ver juntos y por qué?",
  "¿Cuál es tu lugar favorito en tu ciudad?",
  "Si ganáramos la lotería, ¿qué es lo primero que haríamos?",
  "¿Qué es algo que te preocupa últimamente?",
  "¿Qué es algo de lo que te sientes orgulloso u orgullosa este mes?",
  "¿Cuál es tu antojo de hoy?",
  "¿Qué superpoder te gustaría tener?",
  "¿Qué es lo que más extrañas de estar juntos en persona?",
  "¿Qué tradición te gustaría que tuviéramos como pareja?",
  "¿Qué es algo que te gustaría que hiciéramos más seguido?",
  "¿Cuál es tu recuerdo favorito de tu infancia?",
  "Describe tu semana en tres palabras.",
  "¿Qué es algo que te da paz?",
  "¿Qué apodo me pondrías si no pudieras usar mi nombre?",
  "¿Qué tres cosas te llevarías a una isla desierta?",
  "¿Qué es lo más espontáneo que has hecho?",
  "¿Cómo te imaginas nuestra vida en cinco años?",
  "¿Qué es algo que te gustaría que supiera de ti?",
  "¿Cuál es la mejor comida que has probado en tu vida?",
  "¿Qué te gustaría hacer en nuestra próxima videollamada?",
  "¿Qué es algo que te enoja más de lo que debería?",
  "¿Cuál es tu estación del año favorita y por qué?",
  "¿Qué personaje de ficción se parece a ti?",
  "¿Cuál es tu forma favorita de recibir cariño?",
  "¿Qué es algo que te gustaría intentar aunque te dé miedo?",
  "¿Qué fue lo último que te hizo sentir nostalgia?",
  "Si tuviéramos una mascota juntos, ¿cuál sería y cómo se llamaría?",
  "¿Cuál es tu plan ideal para un domingo?",
  "¿Qué consejo le darías a tu yo de hace cinco años?",
  "¿Qué es algo que aprendiste de mí?",
  "¿Cuál es tu canción para cantar a todo volumen?",
  "¿Qué lugar del mundo te gustaría conocer antes de los 40?",
  "¿Qué es algo que siempre te pone de buen humor?",
  "¿Qué detalle mío notaste que nadie más nota?",
  "¿Qué te gustaría que celebráramos aunque no sea una fecha especial?",
  "¿Cuál es tu mayor manía?",
  "¿Cuál fue el mejor regalo que has recibido?",
  "¿Qué te gustaría que hiciéramos en nuestro próximo aniversario?",
  "¿Qué es algo que te hace sentir cerca de mí aunque estemos lejos?",
  "¿Cuál es tu desayuno ideal?",
  "¿Qué es algo que has querido decirme y no has encontrado el momento?",
  "Si escribieras un libro, ¿de qué trataría?",
  "¿Qué tres palabras me describen?",
  "¿Cuál es tu película favorita de la infancia?",
  "¿Qué es lo más valiente que has hecho?",
  "¿Qué hábito te gustaría tener?",
  "¿Qué fue lo que más te gustó de nuestra última vez juntos?",
  "¿Qué es algo que te hace sentir en casa?",
  "¿Qué juego de mesa o videojuego deberíamos jugar juntos?",
  "¿Cuál es tu sueño más loco?",
  "¿Qué te gustaría que recordáramos de este año?",
  "¿Cuál es tu olor favorito?",
  "¿Qué es algo por lo que estás agradecido o agradecida hoy?",
  "¿Qué harías si tuvieras un día libre sin ninguna responsabilidad?",
  "¿Qué te hace sentir querido o querida?",
  "¿Qué es algo que quieres que hagamos antes de que termine el año?",
  "¿Cuál es la mejor decisión que has tomado?",
  "¿Qué te gustaría preguntarme que nunca me has preguntado?",
];

// Quién responde hoy según los números que eligieron (1 o 2):
// distintos → Ric (a), iguales → Yaz (b)
export function quienResponde(numeroA: number, numeroB: number): "a" | "b" {
  return numeroA !== numeroB ? "a" : "b";
}

// Misma pregunta para los dos, cambia cada día
export function preguntaDe(fecha: string): string {
  const dias = Math.round((Date.parse(fecha) - Date.parse(FECHA_INICIO)) / 864e5);
  const n = PREGUNTAS.length;
  return PREGUNTAS[((dias % n) + n) % n];
}
