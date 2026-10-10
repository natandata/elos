"use client";

/** Limites que o botão de vídeo confere antes de enviar (o banco confere de novo — esta parte só poupa tempo). */
export const VIDEO_MAX_BYTES = 70 * 1024 * 1024;
export const VIDEO_MAX_SECONDS = 15;
export const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

/** Duração do vídeo e uma imagem de capa (usada no lugar do vídeo se o aparelho não tocar). */
export async function readVideo(file: File): Promise<{ seconds: number; poster: Blob }> {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.src = url;

    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("unreadable"));
    });
    const seconds = video.duration;
    if (!Number.isFinite(seconds) || seconds <= 0) throw new Error("unreadable");

    // a capa sai de um quadro logo no começo
    await new Promise<void>((resolve, reject) => {
      video.onseeked = () => resolve();
      video.onerror = () => reject(new Error("unreadable"));
      video.currentTime = Math.min(0.3, seconds / 2);
    });

    const scale = Math.min(1, 720 / Math.max(video.videoWidth || 720, video.videoHeight || 720));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round((video.videoWidth || 720) * scale));
    canvas.height = Math.max(1, Math.round((video.videoHeight || 720) * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("unreadable");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const poster = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.8));
    if (!poster) throw new Error("unreadable");
    return { seconds, poster };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Envia o arquivo direto pro R2 (endereço assinado), mostrando o andamento. */
export function putWithProgress(
  url: string,
  file: File,
  contentType: string,
  onProgress: (fraction: number) => void,
): Promise<boolean> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300);
    xhr.onerror = () => resolve(false);
    xhr.onabort = () => resolve(false);
    xhr.send(file);
  });
}
