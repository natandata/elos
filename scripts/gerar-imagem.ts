// Gera uma imagem com o Nano Banana Pro (Gemini 3 Pro Image) e salva em arquivo.
//
//   npx tsx scripts/gerar-imagem.ts "descrição da imagem" --out public/arena/teste.png --ratio 5:4 --size 2K
//   npx tsx scripts/gerar-imagem.ts "mesma torre, mas vermelha" --ref public/arena/campo/torre-azul.webp --out torre.png
//
// Precisa de GEMINI_API_KEY no .env.local (nunca vai para o navegador nem para o git).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, extname } from "node:path";

const MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-3-pro-image-preview";

function loadEnvLocal() {
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

async function main() {
  loadEnvLocal();
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.error("Falta GEMINI_API_KEY no .env.local (veja scripts/gerar-imagem.ts).");
    process.exit(1);
  }
  const prompt = process.argv[2];
  if (!prompt || prompt.startsWith("--")) {
    console.error('Uso: npx tsx scripts/gerar-imagem.ts "descrição" [--out arquivo.png] [--ratio 1:1|5:4|3:2|16:9|9:16] [--size 1K|2K|4K] [--ref imagem]');
    process.exit(1);
  }
  const out = arg("out", `gerada-${Date.now()}.png`)!;
  const parts: unknown[] = [{ text: prompt }];
  const ref = arg("ref");
  if (ref) {
    const mime = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" }[extname(ref).toLowerCase()] ?? "image/png";
    parts.push({ inlineData: { mimeType: mime, data: readFileSync(ref).toString("base64") } });
  }
  const body = {
    contents: [{ role: "user", parts }],
    generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: arg("ratio", "1:1"), imageSize: arg("size", "2K") } },
  };
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { error?: { message?: string }; candidates?: { content?: { parts?: { inlineData?: { data: string }; text?: string }[] } }[] };
  if (!res.ok) {
    console.error("Erro da API:", json.error?.message ?? res.status);
    process.exit(1);
  }
  const img = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData;
  if (!img) {
    console.error("A API não devolveu imagem:", JSON.stringify(json).slice(0, 400));
    process.exit(1);
  }
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, Buffer.from(img.data, "base64"));
  console.log("Imagem salva em", out);
}

void main();
