import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { BookList } from "@/components/bible/BookList";

export const metadata = { title: "Bíblia" };

export default async function BibliaPage() {
  await requireRole("cria", "leader", "admin");
  return (
    <>
      <PageHeader title="Bíblia" subtitle="Nova Versão Internacional (NVI): os 66 livros, do Gênesis ao Apocalipse." />
      <BookList />
    </>
  );
}
