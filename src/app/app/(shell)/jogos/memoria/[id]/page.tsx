import { notFound } from "next/navigation";
import { MemoryDuelGame } from "@/components/games/MemoryDuelGame";
import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type Row = {
  id: string;
  challenger_id: string;
  opponent_id: string;
  seed: number;
  pairs: number;
  status: "open" | "finished" | "expired";
  c_started_at: string | null;
  o_started_at: string | null;
  c_ms: number | null;
  o_ms: number | null;
  winner_id: string | null;
  created_at: string;
};

const nowMs = () => Date.now();

export default async function MemoriaDuelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profile } = await requireRole("cria", "leader");
  const supabase = await createClient();

  const { data: d } = await supabase
    .from("memory_duels")
    .select("id, challenger_id, opponent_id, seed, pairs, status, c_started_at, o_started_at, c_ms, o_ms, winner_id, created_at")
    .eq("id", id)
    .maybeSingle<Row>();
  if (!d || (d.challenger_id !== profile.id && d.opponent_id !== profile.id)) notFound();

  const mine = d.challenger_id === profile.id;
  const otherId = mine ? d.opponent_id : d.challenger_id;
  const { data: other } = await supabase.from("profiles").select("full_name").eq("id", otherId).maybeSingle<{ full_name: string }>();
  const otherName = other?.full_name || "seu colega";
  const expired = d.status === "open" && nowMs() - new Date(d.created_at).getTime() > 24 * 3_600_000;

  return (
    <>
      <PageHeader title={`🃏 Memória vs ${otherName}`} subtitle="Mesmo tabuleiro pros dois: vence quem terminar primeiro." />
      <MemoryDuelGame
        id={d.id}
        seed={d.seed}
        pairs={d.pairs}
        myId={profile.id}
        otherName={otherName}
        startedAt={mine ? d.c_started_at : d.o_started_at}
        myMs={mine ? d.c_ms : d.o_ms}
        theirMs={mine ? d.o_ms : d.c_ms}
        status={expired ? "expired" : d.status}
        winnerId={d.winner_id}
      />
    </>
  );
}
