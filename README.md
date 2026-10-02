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
   explicaciones paso a paso y mensajes de validación.
2. **`scripts/rendercheck-entry.jsx`** — renderizado en servidor (`react-dom/server`) de las
   tres pantallas (portada, secciones, resumen) y de los **39 items** de la hoja, más pruebas
   del reducer (guardar casilla, comprobar, avanzar, revelar solución, reiniciar).

Ambas suites están en verde en esta versión, y `npm run build` compila sin errores.

## Contenido: hoja "Ejercicios de hoy" (sheet-001)

Primera hoja de la serie; el registro `src/data/sheets/index.js` permite añadir hojas nuevas
sin tocar los componentes.

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
- **Accesibilidad**: objetivos táctiles ≥ 44 px, foco visible, etiquetas y `aria-label` en
  las casillas (*«Cifra 1 del cociente»*, *«Llevada de las decenas»*…), estados comunicados
  con icono + texto, contraste alto.
- **Responsive**: la retícula usa tamaños de casilla por media queries; en móvil se usa el
  teclado numérico del sistema.

## Estructura del proyecto

```
index.html
vite.config.js
src/
  main.jsx                # arranque
  App.jsx                 # pantallas: portada → secciones → resumen
  styles/                 # tokens, base, pantallas y ejercicios (CSS plano)
  data/sheets/
    sheet-001.js          # TODO el contenido de la hoja (31 ejercicios + 4 trucos)
    index.js              # registro de hojas + helpers (items por sección, índice)
  state/SheetContext.jsx  # reducer de la app + persistencia en localStorage
  utils/
    calculations.js       # construye la retícula de cada operación y sus pasos
    validation.js         # comprobación paso a paso y mensajes en español
    storage.js            # lectura/escritura versionada de localStorage
  components/
    layout/               # HomeScreen, SectionScreen, SummaryScreen, TopBar
    common/               # ExerciseCard, DigitGrid, DigitCell, Feedback, Progress…
    exercises/            # Addition, Subtraction, Multiplication, Division,
                          # WordProblem, MentalCalculation, MentalTip + registry.js
scripts/
  selftest.mjs            # suite de lógica (npm test)
  rendercheck-entry.jsx   # suite de render + reducer (npm test)
```

### Añadir una hoja nueva

1. Cre `src/data/sheets/sheet-002.js` con la misma forma que `sheet-001.js`
   (arrays `additions`, `subtractions`, …, `tips` y `sections` con `groups[].ids`).
2. Importarlo y añadirlo al array `sheets` de `src/data/sheets/index.js`.

Los tipos de ejercicio disponibles (`addition`, `subtraction`, `multiplication`, `division`,
`word-problem`, `mental`, `tip`) se registran en `src/components/exercises/registry.js`;
no hace falta tocar el resto de la aplicación.

## Lista de verificación (sección 31)

| Comprobación | Estado |
| --- | --- |
| Sumas, restas, multiplicaciones y divisiones se corrigen correctamente | ✅ `npm test` (lógica + render de los 19 items) |
| Cifras alineadas por columna (CSS Grid, sin posicionamiento absoluto) | ✅ retícula verificada por tests de columnas |
| Entrada de cifras de derecha a izquierda con salto de foco | ✅ implementado en `DigitCell`, también en el resultado de sumas y restas (verificación manual en el navegador recomendada) |
| Multiplicaciones de dos cifras con fila parcial desplazada (sin casillas de llevadas) | ✅ `236×24`, `148×35`, `267×48` comprobadas (parciales y columnas) |
| Divisiones con pasos intermedios (selección de cifras tocando el dividendo, cociente y resto — producto de cabeza) | ✅ las 4 divisiones, con cabecera `dividendo : divisor`, selección de cifras y restos verificados |
| Problemas de 2 pasos guiados y de 3 pasos con elección de operación | ✅ render de los 4 + validación de cada modo |
| Cálculo mental con pista al segundo fallo | ✅ tests de validación |
| Trucos: intercalados en cálculo mental y en su sección | ✅ los 4 trucos renderizan en ambos sitios |
| Progreso guardado en `localStorage` y retomado al recargar | ✅ `storage.js` versionado + tests de persistencia; botón **Resetear todo** en portada y resumen (retomada manual en navegador recomendada) |
| Uso en móvil (teclado numérico, casillas ≥ 44 px, sin scroll horizontal) | ✅ `inputmode="numeric"`, tamaños por media queries (probar en dispositivo recomendado) |
| `npm run build` termina sin errores | ✅ build de producción OK (≈187 kB JS + 17 kB CSS) |
| `npm install`, `npm run dev` y `npm run build` funcionan | ✅ verificado en Node 20 / Windows |

> Las comprobaciones automatizadas cubren la lógica y el renderizado de todos los items;
> la interacción con teclado/táctil conviene revisarla a mano en el navegador con
> `npm run dev`.
