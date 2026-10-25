export type SpotTrack = {
  id: string;
  video_id: string;
  title: string;
  channel: string;
  added_by_name: string | null;
  created_at: string;
  play_count: number;
  like_count: number;
  liked: boolean;
  mine: boolean;
};

export type SpotPlaylist = { id: string; name: string; track_count: number; covers: string[] };

export const thumb = (videoId: string, q: "mq" | "hq" = "mq") => `https://i.ytimg.com/vi/${videoId}/${q}default.jpg`;
