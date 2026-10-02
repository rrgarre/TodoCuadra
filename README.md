# Juego de Calcular

Aplicación web **100% frontend** para repasar matemáticas en **4º de Primaria** (España):
operaciones en columna, problemas, cálculo mental y trucos, con corrección paso a paso.

- **Stack**: React + Vite + JavaScript + CSS (sin TypeScript, sin librerías de routing ni estado).
- **Sin backend**: no hay servidor, API, base de datos, usuarios ni IA. El progreso se guarda
  en `localStorage` del navegador y la app se sirve como archivos estáticos.
- **Dependencias en tiempo de ejecución**: solo `react` y `react-dom` (y `vite` + `@vitejs/plugin-react`
  como herramientas de desarrollo).

## Requisitos

- Node.js 18 o superior con `npm`.

## Puesta en marcha

```bash
npm install     # instala dependencias
npm run dev     # servidor de desarrollo con recarga en caliente
```

Abre la URL que imprime Vite en pantalla (normalmente `http://localhost:5173/`; si ese puerto
está ocupado, Vite usa el siguiente y lo indica en la terminal).

## Compilar para publicar

```bash
npm run build   # genera la versión de producción en dist/
npm run preview # sirve dist/ en local para comprobarla
```

El resultado es una carpeta `dist/` estática (HTML + JS + CSS) que funciona en cualquier
hosting estático (GitHub Pages, Netlify, Vercel, un simple servidor de ficheros…).
`vite.config.js` usa `base: "./"`, así que también funciona si se publica dentro de una
subcarpeta.

## Verificación automática

```bash
npm test
```

Ejecuta dos suites sin dependencias adicionales:

1. **`scripts/selftest.mjs`** — comprobaciones puras de lógica: columnas de la retícula,
   desplazamiento de las parciales, cocientes y restos de cada división, textos de las
   explicaciones paso a paso y mensajes de validación, más el sistema de fichas
   (cabecera `titulo`/`tipo`, formatos, `secciones`, paridad de `calculo.json` y
   lectura remota con su caché).
2. **`scripts/rendercheck-entry.jsx`** — renderizado en servidor (`react-dom/server`) de las
   tres pantallas (portada, secciones, resumen) y de los **39 items** de la ficha, más
   pruebas del reducer (guardar casilla, comprobar, avanzar, revelar solución, reiniciar,
   cambiar de ficha) y de la portada por zonas (fichas remotas incluidas).

Ambas suites están en verde en esta versión, y `npm run build` compila sin errores.

## Contenido: ficha "Ejercicios de hoy" (`plantillas/calculo.json`)

Primera ficha de la serie (id `sheet-001`, formato **cálculo**); cualquier JSON nuevo en
`plantillas/` se suma a la portada sin tocar los componentes.

| Sección | Items | Contenido |
| --- | ---: | --- |
| **Operaciones** | 19 | 5 sumas (p. ej. `348 + 276`), 5 restas (p. ej. `532 − 278`), 5 multiplicaciones —2 con multiplicador de una cifra (`236 × 4`, `457 × 6`) y 3 de dos cifras (`236 × 24`, `148 × 35`, `267 × 48`)— y 4 divisiones (`384÷3`, `924÷6`, `1008÷7` con cifra 0 intermedia y `918÷18` con divisor de dos cifras) |
| **Problemas matemáticos** | 4 | 2 problemas de **dos pasos** (estructura de operaciones guiada con resultados vacíos) y 2 de **tres pasos** (la persona elige la operación, escribe los números y el resultado) |
| **Cálculo mental** | 12 | 8 ejercicios de respuesta rápida con pista progresiva + 4 trucos intercalados |
| **Trucos de cálculo mental** | 4 | Los mismos 4 trucos explicados, reunidos en su propia sección |

Total: **39 items** de pantalla = **31 ejercicios con corrección** + **4 trucos**
(los trucos cuentan una vez por cada sección en la que aparecen).

## Cómo se juega

- **Un ejercicio por pantalla** con barra de progreso arriba; se avanza con *Comprobar* /
  *Siguiente*, y siempre desde el principio de cada sección.
- **Reiniciar cada operación**: en sumas, restas, multiplicaciones y divisiones hay un
  botón **Reiniciar** que borra solo ese ejercicio (casillas, paso y avisos) para
  intentarlo de nuevo; no toca el resto del progreso de la hoja.
- **Cálculo en columna como en el papel**: cada operación se rellena con **una casilla por
  cifra** alineadas con CSS Grid —el resultado de sumas y restas en la fila inferior, los
  productos parciales y el total en las multiplicaciones, cociente y resto en las
  divisiones—. La escritura es **de derecha a izquierda** y, en sumas, restas y
  multiplicaciones, **el cursor arranca siempre en la casilla de la derecha de la fila que
  toca resolver** (las unidades); las casillas usan `inputmode="numeric"` para el teclado
  numérico móvil.
- **Multiplicaciones por pasos** (esto es lo central de la hoja):
  - Paso 1: la primera fila parcial.
  - Paso 2: la fila parcial siguiente, **desplazada una columna a la izquierda**.
  - Paso 3: la suma final.
  - Con multiplicador de una cifra: **una sola fila de resultado y una sola comprobación**
    (el producto ya es el resultado: no se piden dos filas iguales).
  - **Sin casillas de llevadas**: las llevadas se calculan mentalmente; el aviso
    *«Y recuerda sumar la llevada»* sigue apareciendo cuando la cifra depende de ella.
  - Las casillas de los pasos futuros se muestran como marcadores sin rellenar, para no
    adelantar respuestas; las filas ya validadas quedan bloqueadas mostrando las cifras
    escritas (los estados se comunican con icono + texto, nunca solo con color).
- **Divisiones con el algoritmo de la escuela**, con la cabecera del propio enunciado
  (**dividendo a la izquierda y divisor a la derecha**: `284 : 3`) y el trabajo justo
  debajo:
  - Las cifras del dividendo **se tocan para seleccionarlas** y quedan marcadas en **azul**
    en la propia cabecera; **la primera selección no se copia abajo**, solo cambia de color.
    A partir del segundo paso, la cifra seleccionada se añade en azul al renglón del resto,
    que es donde nace el parcial siguiente; si el número todavía no llega al divisor, la
    app avisa (*«todavía no llega…: toca la cifra X»*) y se puede seguir seleccionando.
  - El **cociente va debajo del divisor**: su primera cifra queda justo bajo él y sigue
    hacia la derecha (la rejilla se ensancha si hace falta); comparte la primera fila de
    trabajo con el resto del primer paso.
  - El **mismo azul recorre la cadena del resto**, del resto parcial al resto final,
    junto con las cifras seleccionadas del dividendo.
  - Después, cada paso se rellena en orden —**cifra del cociente** (de izquierda a derecha
    a lo largo de la división) y **resto**— y se comprueba de una en una. Cada paso es
    **una sola fila de resto**; **el producto (cifra del cociente × divisor) no se escribe:
    se calcula de cabeza**, y tampoco se pinta el signo `−`. Las casillas **se generan
    cuando les toca**: no se pintan casillas vacías de pasos futuros.
  - Los mensajes apuntan al paso concreto, con lenguaje para niñas y niños:
    *«Piensa: 3 × 9 = 27. ¿Cuánto es 30 − 27?»*, *«Piensa: ¿cuántas veces cabe 18 en 91?»*…
- **Corrección explicativa**: *Comprobar* señala la casilla y el paso con la cifra correcta y
  por qué; distingue entre **procedimiento correcto con fallo de cálculo** y error de paso.
  *Ver solución* aparece solo bajo demanda y marca el ejercicio como *a revisar*.
- **Cálculo mental**: si se falla dos veces, aparece la pista del truco correspondiente.
- **Resumen final**: totales, aciertos, ejercicios a revisar y porcentaje.
- **Progreso guardado** en `localStorage` (`juego-de-calcular:sheet-001:v1`): al volver a
  abrir la página se retoma donde se quedó; el botón **Resetear todo** (portada y resumen,
  con confirmación) borra el progreso y deja la hoja en blanco.
- **Varias fichas por zonas**: la portada agrupa las fichas en **zonas por formato** —
  🧮 *Cálculo* y 🧩 *Lógica*— y, al tocar una ficha, sus **secciones se despliegan justo
  debajo** (si la ficha tiene una sola sección, se abre directa a los ejercicios). Cada
  ficha guarda su progreso por separado (`juego-de-calcular:<ficha>:v1`), la ficha en uso
  queda marcada con *✓ En uso* y al elegir otra se retoma su progreso (o empieza si es la
  primera vez).
- **Accesibilidad**: objetivos táctiles ≥ 44 px, foco visible, etiquetas y `aria-label` en
  las casillas (*«Cifra 1 del cociente»*, *«Llevada de las decenas»*…), estados comunicados
  con icono + texto, contraste alto.
- **Responsive**: la retícula usa tamaños de casilla por media queries; en móvil se usa el
  teclado numérico del sistema.

## Estructura del proyecto

```
index.html
vite.config.js
plantillas/               # TODO lo de las fichas: JSON + la lógica que los entiende
  templates.js            # formatos, parseo/validación, cargador local y lectura remota
  remotas.js              # config de la carpeta remota de GitHub (vacío = desactivada)
  calculo.json            # ficha «Ejercicios de hoy» (sheet-001): 31 ejercicios + 4 trucos
  logica.json             # ficha «Lógica»: 9 retos (series, comparaciones, enigmas)
src/
  main.jsx                # arranque
  App.jsx                 # pantallas: portada → secciones → resumen
  styles/                 # tokens, base, pantallas y ejercicios (CSS plano)
  data/sheets/
    index.js              # registro de fichas + helpers (items por sección, índice)
  state/SheetContext.jsx  # reducer de la app + persistencia en localStorage
  utils/
    calculations.js       # construye la retícula de cada operación y sus pasos
    validation.js         # comprobación paso a paso y mensajes en español
    storage.js            # lectura/escritura versionada de localStorage (+ hoja activa)
  components/
    layout/               # HomeScreen, SectionScreen, SummaryScreen, TopBar
    common/               # ExerciseCard, DigitGrid, DigitCell, Feedback, Progress…
    exercises/            # Addition, Subtraction, Multiplication, Division,
                          # WordProblem, MentalCalculation, MentalTip, Logica
                          # + registry.js
scripts/
  selftest.mjs            # suite de lógica (npm test)
  rendercheck-entry.jsx   # suite de render + reducer (npm test)
```

### Añadir una hoja nueva

1. **Sin tocar código**: crear un JSON en `plantillas/` (ver la sección siguiente).
   La app lo lee al arrancar, lo valida y lo suma a la portada; o subirlo a la carpeta
   remota de GitHub (opcional, ver *Fichas remotas*).

Los tipos de ejercicio disponibles (`addition`, `subtraction`, `multiplication`, `division`,
`wordProblem`, `mental`, `tip`, `logica`) se registran en `src/components/exercises/registry.js`;
nuevos **formatos de ficha** (zonas del menú), en `FORMATOS` de `plantillas/templates.js`.
En ambos casos no hace falta tocar el resto de la aplicación.

## Plantillas (`plantillas/*.json`)

Las fichas permiten añadir hojas de ejercicios **solo con un fichero JSON en español**,
sin tocar código. Todo lo que las entiende vive en la misma carpeta
(`plantillas/templates.js`: formatos, parseo, cargador local y lectura remota), y
`plantillas/remotas.js` guarda la configuración de la carpeta remota.

- La app lee los `.json` al arrancar (`import.meta.glob` de Vite), los valida y los lista
  en la **portada por zonas** (una zona por formato: 🧮 Cálculo, 🧩 Lógica).
- Cada ficha es **una hoja completa** con sus secciones, sus grupos y su **progreso propio**
  (se guarda aparte de las demás).
- Si una ficha no valida, **no se carga ni a medias**: la portada muestra el aviso
  *«⚠ Plantillas no cargadas»* con la ruta del fichero y el error, y el resto de la app
  sigue funcionando con normalidad.
- La ficha que se está usando se recuerda en `juego-de-calcular:hoja-activa`.
- Para añadir una ficha nueva basta con crear `plantillas/mi-ficha.json` y recargar.
- **Ojo**: todo `.json` de `plantillas/` se interpreta como ficha; la configuración va en
  ficheros `.js` (como `remotas.js`).

### Cabecera: `titulo` y `tipo`

Toda ficha empieza con una cabecera obligatoria:

```json
{
  "titulo": "Ejercicios de hoy",
  "tipo": "calculo",
  "id": "sheet-001",
  "nivel": "4º Primaria",
  "icono": "📘",
  "ejercicios": [ ... ],
  "secciones": [ ... ]
}
```

- `titulo` y `tipo` son **obligatorios**; `tipo` decide la zona de la portada y qué tipos de
  ejercicio admite la ficha. `id` (opcional) fija el id propio de la ficha —si no, se genera
  del título—; `nivel`, `descripcion` e `icono` son opcionales.
- Una ficha con un `tipo` desconocido o ejercicios de otro formato **no se carga** y se
  marca como errónea en la portada con su ruta.

### Formatos

| `tipo` | Zona | Ejercicios admitidos | Notas |
| --- | --- | --- | --- |
| `calculo` | 🧮 Cálculo | `suma`, `resta`, `multiplicacion`, `division`, `problema`, `mental`, `truco` | admite además `secciones` personalizadas |
| `logica` | 🧩 Lógica | `logica` | agrupa sola por `grupo`; no admite `secciones` |

Añadir un formato nuevo (p. ej. `quiz`) es una entrada más en el registro `FORMATOS` de
`plantillas/templates.js`.

### Ejercicios

`ejercicios` (obligatorio): lista no vacía. Los **ids se generan solos**
(`logica-1`, `logica-2`…) salvo que cada ejercicio lleve su `id` (único). El `tipo` es
obligatorio en cada ejercicio y debe pertenecer al formato de la ficha. Campos y condiciones
por tipo:

| `tipo` | Campos | Condiciones |
| --- | --- | --- |
| `suma`, `resta`, `multiplicacion`, `division` | `a`, `b` | enteros ≥ 0; en resta `a ≥ b`; en división `b ≥ 1`; en multiplicación `b` de una o dos cifras |
| `problema` | `texto`, `pasos` (`op`: `suma`/`resta`/`multiplicacion`/`division`, `a`, `b`), `modo` opcional (`guiado`/`eleccion`), `respuesta` opcional | los resultados de los pasos **se calculan solos**; si escribes `respuesta` debe coincidir con el último resultado |
| `mental` | `expr`, `resultado`, `pista` opcional, `trucoId` opcional | `trucoId` enlaza con un `truco` de la misma ficha; si no existe, la ficha no se carga |
| `truco` | `titulo`, `gancho`, `resumen`, `ejemplo` (`expr`, `pasos[]`), `explicacion` | todos obligatorios |
| `logica` | `variante`, `enunciado`, `pista`/`explicacion` opcionales + según variante | `serie`: `elementos` (≥ 3 números) y `respuesta` (si la serie es aritmética se comprueba); `comparacion`: `izquierda`, `derecha` y `respuesta` = `mayor`/`menor`/`igual` (se comprueba); `enigma`: `respuesta` numérica |

La agrupación por defecto es por `grupo` (si cada ejercicio lo lleva) o por tipo.

### Secciones personalizadas (solo formato `calculo`)

Con `secciones` describes tú mismo las secciones de la portada; cada una agrupa ids de la
propia ficha (los mismos ids pueden aparecer en varias secciones):

```json
"secciones": [
  {
    "id": "operaciones",
    "titulo": "Operaciones",
    "icono": "🧮",
    "descripcion": "Sumas, restas, multiplicaciones y divisiones",
    "grupos": [
      { "etiqueta": "Sumas", "ids": ["sum-1", "sum-2", "sum-3", "sum-4", "sum-5"] }
    ]
  }
]
```

- `id` opcional (si no, sale del `titulo`), `icono` y `descripcion` opcionales.
- Si un id no corresponde a ningún ejercicio, o algún ejercicio **no aparece en ninguna
  sección**, la ficha entera no se carga y se avisa en la portada.

### Fichas incluidas

- `plantillas/calculo.json` — **Ejercicios de hoy** (🧮, id `sheet-001`): las 4 secciones de
  siempre (19 operaciones, 4 problemas, 12 items de cálculo mental con trucos intercalados
  y los 4 trucos) — **39 items** = 31 ejercicios con corrección + 4 trucos.
- `plantillas/logica.json` — **Lógica** (🧩): **9 retos** de tres grupos: 3 **series**
  numéricas para completar, 3 **comparaciones** (mayor/menor/igual, con botones) y 3
  **enigmas** con respuesta numérica —nivel 4º de Primaria—, todos con pista al segundo
  fallo y explicación en *Ver solución*.

### Fichas remotas (GitHub)

Además de los JSON de esta carpeta, la app puede **leer en vivo** las fichas de una carpeta
`plantillas/` de un **repositorio público de GitHub con un nombre largo y aleatorio** (para
que no la encuentre nadie). Sin dependencias de servidor: la descarga es una petición
estática a `api.github.com` (con CORS permitido).

Para activarla:

1. En GitHub: **New repository** → nombre público aleatorio (p. ej.
   `tc-7f3a9d2b1c8e4f6a8b0d…`) → *Create repository*.
2. **Add file → Upload files** → sube los `.json` dentro de una carpeta llamada
   `plantillas/` (crea la carpeta al subir: `plantillas/mi-ficha.json`).
3. Rellena `plantillas/remotas.js` con tu `usuario` y `repo` (y `carpeta`, si no es
   `plantillas`). Mientras estén vacíos, la lectura remota está **desactivada**.
4. Recarga la app.

Comportamiento:

- Al arrancar se descargan los `.json` de la carpeta remota, cada uno se valida con las
  **mismas reglas** que los locales (cabecera `titulo`/`tipo` incluida) y se lista en su
  zona; **si una ficha no valida, se marca como errónea con su ruta** (`remoto/archivo.json`)
  y la app sigue funcionando.
- Las descargas se guardan en `localStorage`
  (`juego-de-calcular:fichas-remoteas:v1`): sin conexión o si GitHub limita las consultas
  (60/h sin token), se usan las guardadas y, si no hay ninguna, aparece un aviso en la
  portada.
- Si una ficha remota repite el `id` de una local, **gana la local**.

## Lista de verificación (sección 31)

| Comprobación | Estado |
| --- | --- |
| Sumas, restas, multiplicaciones y divisiones se corrigen correctamente | ✅ `npm test` (lógica + render de los 19 items) |
| Cifras alineadas por columna (CSS Grid, sin posicionamiento absoluto) | ✅ retícula verificada por tests de columnas |
| Entrada de cifras de derecha a izquierda con salto de foco | ✅ implementado en `DigitCell`, también en el resultado de sumas y restas (verificación manual en el navegador recomendada) |
| Multiplicaciones de dos cifras con fila parcial desplazada (sin casillas de llevadas) | ✅ `236×24`, `148×35`, `267×48` comprobadas (parciales y columnas) |
| Divisiones con pasos intermedios (selección de cifras tocando el dividendo, cociente y resto — producto de cabeza) | ✅ las 4 divisiones, con cabecera `dividendo : divisor`, selección de cifras y restos verificados |
| Botón **Reiniciar** en cada ejercicio de operaciones (sin tocar el resto) | ✅ acción `RESET_ITEM` + botón en sumas/restas/multiplicaciones/divisiones (tests de reducer y render) |
| Nuevo tipo **Lógica**: series, comparaciones (mayor/menor/igual) y enigmas con pista al segundo fallo | ✅ componente `Logica.jsx` + validación; los 9 retos renderizan y se corrigen |
| **Fichas** en `plantillas/*.json`: cabecera `titulo`/`tipo`, formatos `calculo`/`logica`, ids y grupos automáticos, `secciones` y resultados calculados | ✅ `parseTemplate` + registro `FORMATOS`; decenas de casos válidos/inválidos y paridad 1:1 de `calculo.json` con la antigua hoja en código |
| Ficha rota → **aviso en la portada** con su ruta y el error, sin romper la app | ✅ fichero inválido en el mock de render: se salta y aparece el aviso |
| **Portada por zonas** (🧮 Cálculo, 🧩 Lógica) con las secciones de la ficha activa desplegadas debajo; ficha de una sola sección se abre directa | ✅ render de portada y de la ficha Lógica; `SET_SHEET` queda en la portada con el progreso cargado |
| **Fichas remotas**: lectura en vivo de una carpeta de GitHub, validadas con las mismas reglas, con caché en `localStorage` y aviso de las erróneas | ✅ descarga simulada (listado + base64), fusión local-gana-a-remota, fallo con/sin caché y portada con la ficha remota |
| **Varias fichas**: cambiar de ficha con progreso independiente y ficha activa recordada | ✅ `SET_SHEET` + clave `hoja-activa`; portada, resumen y render de la ficha Lógica comprobados |
| Problemas de 2 pasos guiados y de 3 pasos con elección de operación | ✅ render de los 4 + validación de cada modo |
| Cálculo mental con pista al segundo fallo | ✅ tests de validación |
| Trucos: intercalados en cálculo mental y en su sección | ✅ los 4 trucos renderizan en ambos sitios |
| Progreso guardado en `localStorage` y retomado al recargar | ✅ `storage.js` versionado + tests de persistencia; botón **Resetear todo** en portada y resumen (retomada manual en navegador recomendada) |
| Uso en móvil (teclado numérico, casillas ≥ 44 px, sin scroll horizontal) | ✅ `inputmode="numeric"`, tamaños por media queries (probar en dispositivo recomendado) |
| `npm run build` termina sin errores | ✅ build de producción OK (≈204 kB JS + 19 kB CSS) |
| `npm install`, `npm run dev` y `npm run build` funcionan | ✅ verificado en Node 20 / Windows |

> Las comprobaciones automatizadas cubren la lógica y el renderizado de todos los items;
> la interacción con teclado/táctil conviene revisarla a mano en el navegador con
> `npm run dev`.
