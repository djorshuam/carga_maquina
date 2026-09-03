import { Suspense } from "react";
import { PedidosClient } from "@/components/pages/PedidosClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="text-[13px] text-muted py-6 text-center">Carregando…</div>}>
      <PedidosClient />
    </Suspense>
  );
}
