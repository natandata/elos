"use client";

/** Maior lado da imagem depois de redimensionar. Suficiente pra tela cheia
 *  de celular (e pra ampliar), sem carregar os 4000px da câmera. */
const MAX_SIDE = 1280;
const QUALITY = 0.82;

/**
 * Reduz a imagem no próprio navegador antes de subir.
 *
 * A câmera do celular gera arquivos de 2–5 MB, mas o app mostra a foto em
 * ~400px de largura. Sem isso, cada visita ao Explorar baixa dezenas de MB
 * — foi o que estourou a cota de tráfego do Supabase. Aqui a mesma foto
 * costuma cair pra 150–300 KB, com qualidade indistinguível na tela.
 */
export async function compressImage(file: File): Promise<File> {
  // GIF perde a animação se passar pelo canvas; deixa como está.
  if (file.type === "image/gif") return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));

    // já é pequena e leve: não recomprime à toa (evita perder qualidade)
    if (scale === 1 && file.size < 400 * 1024) {
      bitmap.close();
      return file;
    }

    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", QUALITY),
    );
    if (!blob || blob.size >= file.size) return file;

    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg" });
  } catch {
    // qualquer falha (formato exótico, navegador antigo): sobe o original
    return file;
  }
}
