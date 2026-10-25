"use server";

import { revalidatePath } from "next/cache";
import { logGameActivity } from "@/lib/games/activity";
import { youtubeId } from "@/lib/actions/praise";
import { createClient } from "@/lib/supabase/server";
import type { SpotPlaylist, SpotTrack } from "@/lib/spotcria/types";

async function me() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/** Adiciona uma música à biblioteca: só link do YouTube; título e canal vêm do próprio YouTube (que também recusa vídeos que não podem ser tocados fora do site). */
export async function addSpotTrack(link: string): Promise<{ error?: string; track?: { id: string; title: string }; existed?: boolean }> {
  const id = await youtubeId(link);
  if (!id) return { error: "Cole um link do YouTube (youtube.com ou youtu.be)." };
  const { supabase, user } = await me();
  if (!user) return { error: "Entre na sua conta." };

  const { data: existing } = await supabase.from("spot_tracks").select("id, title").eq("video_id", id).maybeSingle<{ id: string; title: string }>();
  if (existing) return { track: existing, existed: true };

  let title = "";
  let channel = "";
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`, { signal: AbortSignal.timeout(6000) });
    if (res.status === 401 || res.status === 403) return { error: "Esse vídeo não pode ser tocado fora do YouTube. Escolha outro." };
    if (!res.ok) return { error: "Não achei esse vídeo no YouTube. Confira o link." };
    const j = (await res.json()) as { title?: string; author_name?: string };
    title = String(j.title ?? "").slice(0, 140);
    channel = String(j.author_name ?? "").slice(0, 80);
  } catch {
    return { error: "Não consegui consultar o YouTube agora. Tente de novo." };
  }
  if (!title) return { error: "Não achei esse vídeo no YouTube. Confira o link." };

  const { data, error } = await supabase.from("spot_tracks").insert({ video_id: id, title, channel, added_by: user.id }).select("id, title").single<{ id: string; title: string }>();
  if (error || !data) return { error: "Não foi possível salvar. Tente de novo." };
  void logGameActivity(user.id, "spotcria", "add", `Adicionou · ${title}`, 5);
  revalidatePath("/app/spotcria", "layout");
  return { track: data };
}

export async function removeSpotTrack(trackId: string): Promise<{ error?: string }> {
  const { supabase, user } = await me();
  if (!user) return { error: "Entre na sua conta." };
  const { error } = await supabase.from("spot_tracks").delete().eq("id", trackId);
  if (error) return { error: "Não foi possível remover." };
  revalidatePath("/app/spotcria", "layout");
  return {};
}

export async function toggleSpotLike(trackId: string): Promise<boolean> {
  const { supabase, user } = await me();
  if (!user) return false;
  const { data } = await supabase.from("spot_likes").select("track_id").eq("track_id", trackId).eq("user_id", user.id).maybeSingle();
  if (data) {
    await supabase.from("spot_likes").delete().eq("track_id", trackId).eq("user_id", user.id);
    return false;
  }
  await supabase.from("spot_likes").insert({ track_id: trackId, user_id: user.id });
  return true;
}

export async function recordSpotPlay(trackId: string, title: string): Promise<void> {
  const { supabase, user } = await me();
  if (!user) return;
  await supabase.rpc("spot_play", { p_track: trackId });
  void logGameActivity(user.id, "spotcria", "play", `Ouviu · ${String(title).slice(0, 120)}`, 30);
}

export async function searchSpot(mode: "recent" | "played" | "liked_top" | "mine_liked" | "added_by_me", q = "", limit = 40): Promise<SpotTrack[]> {
  const { supabase, user } = await me();
  if (!user) return [];
  const { data } = await supabase.rpc("spot_list_tracks", { p_mode: mode, p_q: q, p_limit: limit });
  return (data ?? []) as SpotTrack[];
}

export async function myPlaylists(): Promise<SpotPlaylist[]> {
  const { supabase, user } = await me();
  if (!user) return [];
  const { data } = await supabase.rpc("spot_my_playlists");
  return (data ?? []) as SpotPlaylist[];
}

export async function createSpotPlaylist(name: string, firstTrackId?: string): Promise<{ error?: string; id?: string }> {
  const clean = String(name ?? "").trim().slice(0, 60);
  if (!clean) return { error: "Dê um nome para a playlist." };
  const { supabase, user } = await me();
  if (!user) return { error: "Entre na sua conta." };
  const { data, error } = await supabase.from("spot_playlists").insert({ owner_id: user.id, name: clean }).select("id").single<{ id: string }>();
  if (error || !data) return { error: "Não foi possível criar a playlist." };
  if (firstTrackId) await supabase.from("spot_playlist_tracks").insert({ playlist_id: data.id, track_id: firstTrackId });
  revalidatePath("/app/spotcria", "layout");
  return { id: data.id };
}

export async function renameSpotPlaylist(id: string, name: string): Promise<{ error?: string }> {
  const clean = String(name ?? "").trim().slice(0, 60);
  if (!clean) return { error: "Dê um nome para a playlist." };
  const { supabase } = await me();
  const { error } = await supabase.from("spot_playlists").update({ name: clean }).eq("id", id);
  if (error) return { error: "Não foi possível renomear." };
  revalidatePath("/app/spotcria", "layout");
  return {};
}

export async function deleteSpotPlaylist(id: string): Promise<void> {
  const { supabase } = await me();
  await supabase.from("spot_playlists").delete().eq("id", id);
  revalidatePath("/app/spotcria", "layout");
}

export async function addToSpotPlaylist(playlistId: string, trackId: string): Promise<{ error?: string; already?: boolean }> {
  const { supabase } = await me();
  const { error } = await supabase.from("spot_playlist_tracks").insert({ playlist_id: playlistId, track_id: trackId });
  if (error) {
    if (error.code === "23505") return { already: true };
    return { error: "Não foi possível adicionar." };
  }
  revalidatePath("/app/spotcria", "layout");
  return {};
}

export async function removeFromSpotPlaylist(playlistId: string, trackId: string): Promise<void> {
  const { supabase } = await me();
  await supabase.from("spot_playlist_tracks").delete().eq("playlist_id", playlistId).eq("track_id", trackId);
  revalidatePath("/app/spotcria", "layout");
}

// ---- leitura (as telas buscam por aqui e guardam em cache no aparelho) ----

export type SpotHomeData = { recent: SpotTrack[]; played: SpotTrack[]; liked: SpotTrack[]; myRecent: SpotTrack[]; playlists: SpotPlaylist[] };

/** Tudo que o Início precisa numa única chamada (ações do servidor são enfileiradas, então uma só é mais rápida). */
export async function spotHome(): Promise<SpotHomeData> {
  const { supabase, user } = await me();
  if (!user) return { recent: [], played: [], liked: [], myRecent: [], playlists: [] };
  const [recent, played, liked, mine, lists] = await Promise.all([
    supabase.rpc("spot_list_tracks", { p_mode: "recent", p_limit: 20 }),
    supabase.rpc("spot_list_tracks", { p_mode: "played", p_limit: 12 }),
    supabase.rpc("spot_list_tracks", { p_mode: "liked_top", p_limit: 12 }),
    supabase.rpc("spot_list_tracks", { p_mode: "my_recent", p_limit: 12 }),
    supabase.rpc("spot_my_playlists"),
  ]);
  return {
    recent: (recent.data ?? []) as SpotTrack[],
    played: ((played.data ?? []) as SpotTrack[]).filter((t) => t.play_count > 0),
    liked: ((liked.data ?? []) as SpotTrack[]).filter((t) => t.like_count > 0),
    myRecent: (mine.data ?? []) as SpotTrack[],
    playlists: (lists.data ?? []) as SpotPlaylist[],
  };
}

export type SpotLibraryData = { playlists: SpotPlaylist[]; tracks: SpotTrack[] };

export async function spotLibrary(): Promise<SpotLibraryData> {
  const { supabase, user } = await me();
  if (!user) return { playlists: [], tracks: [] };
  const [lists, all] = await Promise.all([supabase.rpc("spot_my_playlists"), supabase.rpc("spot_list_tracks", { p_mode: "recent", p_limit: 200 })]);
  return { playlists: (lists.data ?? []) as SpotPlaylist[], tracks: (all.data ?? []) as SpotTrack[] };
}

export async function spotListMode(mode: "recent" | "played" | "liked_top" | "my_recent" | "mine_liked" | "added_by_me", limit = 100): Promise<SpotTrack[]> {
  const { supabase, user } = await me();
  if (!user) return [];
  const { data } = await supabase.rpc("spot_list_tracks", { p_mode: mode, p_limit: limit });
  let tracks = (data ?? []) as SpotTrack[];
  if (mode === "played") tracks = tracks.filter((t) => t.play_count > 0);
  if (mode === "liked_top") tracks = tracks.filter((t) => t.like_count > 0);
  return tracks;
}

export async function spotPlaylistData(id: string): Promise<{ id: string; name: string; tracks: SpotTrack[] } | null> {
  const { supabase, user } = await me();
  if (!user) return null;
  const { data: pl } = await supabase.from("spot_playlists").select("id, name").eq("id", id).maybeSingle<{ id: string; name: string }>();
  if (!pl) return null;
  const { data } = await supabase.rpc("spot_playlist_items", { p_playlist: id });
  return { id: pl.id, name: pl.name, tracks: (data ?? []) as SpotTrack[] };
}
