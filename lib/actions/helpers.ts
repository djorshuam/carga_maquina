import { z } from "zod";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

export function num(v: FormDataEntryValue | null, fallback = 0): number {
  if (v == null || v === "") return fallback;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
}

export function str(v: FormDataEntryValue | null): string {
  return v == null ? "" : String(v).trim();
}

export function optStr(v: FormDataEntryValue | null): string | null {
  const s = str(v);
  return s === "" ? null : s;
}

export function optNum(v: FormDataEntryValue | null): number | null {
  const s = str(v);
  if (s === "") return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function fail(e: unknown): ActionResult {
  if (e instanceof z.ZodError) return { ok: false, error: e.issues.map((i) => i.message).join("; ") };
  if (e && typeof e === "object" && "code" in e && (e as { code: string }).code === "P2002") return { ok: false, error: "Já existe um registro com esse código." };
  if (e instanceof Error) return { ok: false, error: e.message };
  return { ok: false, error: "Erro inesperado." };
}
