import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const dataIso = searchParams.get("data");
  if (!dataIso) return NextResponse.json({ disponibilidade: [] });
  const data = new Date(dataIso + "T00:00:00Z");
  const disp = await prisma.disponibilidadeOperadores.findMany({ where: { data } });
  return NextResponse.json({ disponibilidade: disp.map((d) => ({ turno: d.turno, quantidade: d.quantidade })) });
}
