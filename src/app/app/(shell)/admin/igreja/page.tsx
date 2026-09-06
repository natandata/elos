import { Card, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { Church3D } from "@/components/church/Church3D";

export default async function IgrejaPage() {
  await requireRole("admin");

  return (
    <>
      <PageHeader title="Igreja 3D" subtitle="Primeira Igreja Batista de Madureira." />

      <Card>
        <Church3D />
        <p className="mt-4 border-t border-[var(--line)] pt-3 text-xs text-[var(--muted)]">
          Praça do Patriarca, 28 — Madureira, Rio de Janeiro. Modelo ilustrativo desenhado à mão a
          partir de fotos da fachada; não é uma planta técnica nem uma medição do prédio.
        </p>
      </Card>
    </>
  );
}
