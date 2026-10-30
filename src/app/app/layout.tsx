import { SpotPlayerRoot } from "@/components/spotcria/SpotPlayerRoot";
import { EventProvider } from "@/components/event/EventProvider";
import { getEventState, getTribeMap } from "@/lib/event/server";

/** O player do Spot Cria mora aqui, acima de todas as telas do app (inclusive Elogram e as telas fora do menu), para a música não parar ao navegar. */
export default async function AppRootLayout({ children }: { children: React.ReactNode }) {
  // evento das tribos: o estado e a lista "pessoa -> tribo" chegam a todas as telas (o banco decide se a pessoa pode ver)
  const [state, map] = await Promise.all([getEventState(), getTribeMap()]);
  return (
    <EventProvider state={state} map={map}>
      <SpotPlayerRoot>{children}</SpotPlayerRoot>
    </EventProvider>
  );
}
