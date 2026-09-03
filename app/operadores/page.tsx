import { Suspense } from "react";
import { OperadoresClient } from "@/components/pages/OperadoresClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="text-[13px] text-muted py-6 text-center">Carregando…</div>}>
      <OperadoresClient />
    </Suspense>
  );
}
