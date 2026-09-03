import { Suspense } from "react";
import { ReceitasClient } from "@/components/pages/ReceitasClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="text-[13px] text-muted py-6 text-center">Carregando…</div>}>
      <ReceitasClient />
    </Suspense>
  );
}
