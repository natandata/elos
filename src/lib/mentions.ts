/**
 * Marcações (@) no Elogram e no chat do Elo.
 *
 * O texto guardado usa @[Nome](id) pra cada pessoa marcada (assim a marcação continua
 * apontando pra pessoa certa mesmo se ela mudar o nome) e @todos no chat do Elo.
 * Na tela, a pessoa só vê @Nome.
 */

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

export type Mention = { id: string; name: string };

export type MentionPart =
  | { type: "text"; text: string }
  | { type: "mention"; id: string; name: string }
  | { type: "all" };

function tokenRe() {
  return new RegExp(`@\\[([^\\]\\n]{1,60})\\]\\((${UUID})\\)|(?<![\\w@])@todos\\b`, "gi");
}

/** Quebra o texto em pedaços: texto comum, pessoa marcada e @todos. */
export function splitMentions(text: string): MentionPart[] {
  const parts: MentionPart[] = [];
  let last = 0;
  for (const m of text.matchAll(tokenRe())) {
    const at = m.index ?? 0;
    if (at > last) parts.push({ type: "text", text: text.slice(last, at) });
    if (m[2]) parts.push({ type: "mention", id: m[2].toLowerCase(), name: m[1] });
    else parts.push({ type: "all" });
    last = at + m[0].length;
  }
  if (last < text.length) parts.push({ type: "text", text: text.slice(last) });
  return parts;
}

/** Ids das pessoas marcadas (sem repetir). */
export function mentionIds(text: string): string[] {
  const ids = new Set<string>();
  for (const p of splitMentions(text)) if (p.type === "mention") ids.add(p.id);
  return Array.from(ids);
}

export function hasMentionAll(text: string): boolean {
  return splitMentions(text).some((p) => p.type === "all");
}

/** Texto como a pessoa vê (@Nome): serve pra limite de caracteres, push e prévias. */
export function plainMentions(text: string): string {
  return splitMentions(text)
    .map((p) => (p.type === "text" ? p.text : p.type === "mention" ? `@${p.name}` : "@todos"))
    .join("");
}

/** Troca cada "@Nome" digitado (e escolhido na lista) pela marcação guardada. */
export function toMarkup(display: string, mentions: Mention[]): string {
  // nomes mais longos primeiro: "@Ana Paula" não pode virar "@Ana" + " Paula"
  const ordered = [...mentions].sort((a, b) => b.name.length - a.name.length);
  let out = display;
  const placeholders = new Map<string, string>();
  ordered.forEach((m, i) => {
    const key = `\u0000${i}\u0000`;
    const safeName = m.name.replace(/[\]\n]/g, " ").slice(0, 60);
    const needle = `@${m.name}`;
    if (out.includes(needle)) {
      out = out.split(needle).join(key);
      placeholders.set(key, `@[${safeName}](${m.id})`);
    }
  });
  placeholders.forEach((markup, key) => {
    out = out.split(key).join(markup);
  });
  return out;
}
