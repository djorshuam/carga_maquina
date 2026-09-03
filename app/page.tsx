import { Suspense } from "react";
import { HomeClient } from "@/components/pages/HomeClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="text-[13px] text-muted py-6 text-center">Carregando…</div>}>
      <HomeClient />
    </Suspense>
  );
}
