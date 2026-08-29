import { clsx, type ClassValue } from "clsx";

/** Junta classes condicionalmente — convenção padrão dos componentes shadcn. */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
