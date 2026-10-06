/**
 * Registro de motores: tipo de ejercicio → componente.
 * Añadir un motor nuevo = crear el componente y una línea aquí.
 */
import Addition from "./Addition.jsx";
import Subtraction from "./Subtraction.jsx";
import Multiplication from "./Multiplication.jsx";
import Division from "./Division.jsx";
import WordProblem from "./WordProblem.jsx";
import MentalCalculation from "./MentalCalculation.jsx";
import Logica from "./Logica.jsx";

export const EXERCISE_COMPONENTS = {
  addition: Addition,
  subtraction: Subtraction,
  multiplication: Multiplication,
  division: Division,
  wordProblem: WordProblem,
  mental: MentalCalculation,
  logica: Logica,
};
