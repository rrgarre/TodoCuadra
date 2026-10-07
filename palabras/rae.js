/**
 * Diccionario de la RAE para el juego Lingo (https://rae-api.com):
 * un intento solo cuenta si la palabra existe.
 *
 * - La clave es **de cliente**: va en el bundle y no hay backend que
 *   la oculte; la API admite CORS (`Access-Control-Allow-Origin: *`)
 *   y limita a 60 consultas/minuto y 5000/día.
 * - Consulta: `GET https://rae-api.com/api/words/<palabra>?api_key=…`
 *   → `200 {"ok":true,…}` si existe; `404 {"ok":false,
 *   "suggestions":[…]}` si no.
 * - Nuestro teclado no escribe tildes, así que si la API no encuentra
 *   la palabra pero entre sus sugerencias hay una grafía que
 *   normaliza igual («arbol» → «árbol»), cuenta como existente.
 */

import { normalizarPalabra } from "./loader.js";

export const RAE = {
  base: "https://rae-api.com/api",
  apiKey:
    "rae_live_110b68e15e275b2bda8f657082306b41f50152997a0570c9bea6950bf109c2b6",
};

/**
 * ¿Existe la palabra en el diccionario? Resuelve `true`/`false` y
 * **lanza** si no hay red o la API falla (el llamante decide el
 * aviso). `fetchFn` y `api` se inyectan para las pruebas.
 */
export async function palabraExiste(
  palabra,
  { fetchFn = globalThis.fetch, api = RAE } = {}
) {
  const consulta = String(palabra ?? "").trim().toLowerCase();
  if (!consulta) return false;
  const url = `${api.base}/words/${encodeURIComponent(consulta)}?api_key=${encodeURIComponent(api.apiKey)}`;
  const res = await fetchFn(url, { headers: { Accept: "application/json" } });
  if (res.status === 404) {
    const cuerpo = await res.json().catch(() => null);
    const sugerencias = Array.isArray(cuerpo?.suggestions) ? cuerpo.suggestions : [];
    const normalizada = normalizarPalabra(consulta);
    return sugerencias.some((s) => normalizarPalabra(s) === normalizada);
  }
  if (!res.ok) throw new Error(`RAE API: HTTP ${res.status}`);
  const cuerpo = await res.json().catch(() => null);
  return Boolean(cuerpo?.ok);
}

/**
 * ¿Se puede intentar esta palabra?
 *
 * - `ok: true` si la API la confirma (o su sugerencia normalizada),
 *   o si ya está en la lista local (`enLista`): respaldo sin red y
 *   para las palabras acentuadas que se escriben sin tilde.
 * - `ok: false` si la API dice que no existe → «Palabra no existe».
 * - `ok: false, error: "red"` si no se pudo consultar ni estaba en
 *   la lista → aviso de conexión.
 */
export async function verificarIntento(palabra, { enLista = false, ...resto } = {}) {
  try {
    const existe = await palabraExiste(palabra, resto);
    return { ok: existe || enLista };
  } catch {
    if (enLista) return { ok: true };
    return { ok: false, error: "red" };
  }
}
