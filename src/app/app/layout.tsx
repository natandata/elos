import { SpotPlayerRoot } from "@/components/spotcria/SpotPlayerRoot";

/** O player do Spot Cria mora aqui, acima de todas as telas do app (inclusive Elogram e as telas fora do menu), para a música não parar ao navegar. */
export default function AppRootLayout({ children }: { children: React.ReactNode }) {
  return <SpotPlayerRoot>{children}</SpotPlayerRoot>;
}
