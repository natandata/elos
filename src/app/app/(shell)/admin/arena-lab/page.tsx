import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { ArenaLab } from "@/components/arena/ArenaLab";

export default async function ArenaLabPage() {
  await requireRole("admin");
  return (
    <div>
      <PageHeader title="Laboratório da Arena" subtitle="Cada herói em todos os estados de animação: parado, andando, golpe em 3 tempos e tranco." />
      <ArenaLab />
    </div>
  );
}
