import { PlaylistPage } from "@/components/spotcria/Pages";

export default async function Playlist({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PlaylistPage id={id} />;
}
