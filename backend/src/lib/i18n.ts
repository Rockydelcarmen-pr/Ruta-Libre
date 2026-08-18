export type Lang = "en" | "es";

export function normalizeLang(value: unknown): Lang {
  return value === "es" ? "es" : "en";
}
