import "server-only";
import { AwsClient } from "aws4fetch";

/** Cloudflare R2 (compatível com S3) — guarda só os vídeos dos stories. Servidor apenas. */

function config() {
  const endpoint = process.env.R2_ENDPOINT;
  const bucket = process.env.R2_BUCKET;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) return null;
  return { endpoint: endpoint.replace(/\/+$/, ""), bucket, accessKeyId, secretAccessKey };
}

export function r2Configured(): boolean {
  return config() !== null;
}

function client(c: NonNullable<ReturnType<typeof config>>) {
  return new AwsClient({
    accessKeyId: c.accessKeyId,
    secretAccessKey: c.secretAccessKey,
    service: "s3",
    region: "auto",
  });
}

function objectUrl(c: NonNullable<ReturnType<typeof config>>, key: string) {
  return `${c.endpoint}/${c.bucket}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

/** URL assinada (PUT) pro celular enviar o vídeo direto ao R2 — vale 15 min. */
export async function presignVideoUpload(key: string, contentType: string): Promise<string | null> {
  const c = config();
  if (!c) return null;
  const url = new URL(objectUrl(c, key));
  url.searchParams.set("X-Amz-Expires", "900");
  const signed = await client(c).sign(url.toString(), {
    method: "PUT",
    headers: { "Content-Type": contentType },
    aws: { signQuery: true },
  });
  return signed.url;
}

const WINDOW_SECONDS = 6 * 60 * 60;
const GET_EXPIRES_SECONDS = 48 * 60 * 60;

function amzDate(sec: number): string {
  return new Date(sec * 1000).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/**
 * URLs de leitura ESTÁVEIS dentro de uma janela de 6h (mesmo truque das fotos):
 * a data da assinatura é fixada no começo da janela, então todo mundo recebe a
 * mesma URL e o navegador reaproveita o vídeo do cache em vez de baixar de novo.
 */
export async function signedVideoUrls(keys: string[]): Promise<Map<string, string | null>> {
  const out = new Map<string, string | null>();
  const c = config();
  if (!c || keys.length === 0) {
    for (const k of keys) out.set(k, null);
    return out;
  }
  const aws = client(c);
  const nowSec = Math.floor(Date.now() / 1000);
  const datetime = amzDate(Math.floor(nowSec / WINDOW_SECONDS) * WINDOW_SECONDS);
  await Promise.all(
    keys.map(async (key) => {
      try {
        const url = new URL(objectUrl(c, key));
        url.searchParams.set("X-Amz-Expires", String(GET_EXPIRES_SECONDS));
        const signed = await aws.sign(url.toString(), { method: "GET", aws: { signQuery: true, datetime } });
        out.set(key, signed.url);
      } catch {
        out.set(key, null);
      }
    }),
  );
  return out;
}

/** Tamanho real do arquivo enviado (ou null se não existe) — o servidor confere isso antes de publicar. */
export async function headVideo(key: string): Promise<{ bytes: number; contentType: string } | null> {
  const c = config();
  if (!c) return null;
  try {
    const res = await client(c).fetch(objectUrl(c, key), { method: "HEAD" });
    if (!res.ok) return null;
    return {
      bytes: Number(res.headers.get("content-length") ?? 0),
      contentType: res.headers.get("content-type") ?? "",
    };
  } catch {
    return null;
  }
}

export async function deleteVideo(key: string): Promise<void> {
  const c = config();
  if (!c) return;
  try {
    await client(c).fetch(objectUrl(c, key), { method: "DELETE" });
  } catch {
    // o bucket também apaga sozinho depois de 1 dia
  }
}
