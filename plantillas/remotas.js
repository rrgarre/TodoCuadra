/**
 * Carpeta remota de fichas (GitHub, nombre aleatorio para “ocultarla”).
 *
 * Mientras "usuario" o "repo" estén vacíos, la lectura remota está
 * desactivada y la app solo usa las fichas de esta misma carpeta.
 *
 * Para activarla: crea un repo público con un nombre largo y aleatorio,
 * sube los .json a su carpeta "plantillas" (Add file → Upload files) y
 * rellena aquí usuario y repo. La app los descarga al arrancar, mira el
 * "tipo" de cada ficha y la lista en su zona; si una no valida, avisa.
 */
export default {
  usuario: "",
  repo: "",
  carpeta: "plantillas",
};
