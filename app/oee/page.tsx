import { Suspense } from "react";
import { OeeClient } from "@/components/pages/OeeClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="text-[13px] text-muted py-6 text-center">Carregando…</div>}>
      <OeeClient />
    </Suspense>
  );
}
