import { Suspense } from "react";
import { TurnosClient } from "@/components/pages/TurnosClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="text-[13px] text-muted py-6 text-center">Carregando…</div>}>
      <TurnosClient />
    </Suspense>
  );
}
