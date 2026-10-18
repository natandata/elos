import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { ArenaSfxTester } from "@/components/arena/ArenaSfxTester";

export default async function ArenaSonsPage() {
  await requireRole("admin");
  return (
    <div>
      <PageHeader title="Sons da Arena" subtitle="Ouça cada efeito da Arena dos Heróis e me diga qual trocar." />
      <ArenaSfxTester />
    </div>
  );
}
