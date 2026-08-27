"use client";

type Row = {
  full_name: string;
  role: string;
  gender: string | null;
  age_range: string | null;
  elo_id: string | null;
  xp: number;
  approved: boolean;
  email: string | null;
};

function csvEscape(v: unknown): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function ExportUsersCsv({
  users,
  eloName,
}: {
  users: Row[];
  eloName: Map<string, string>;
}) {
  function handleExport() {
    const header = ["Nome", "E-mail", "Perfil", "Gênero", "Idade", "Elo", "XP", "Aprovado"];
    const lines = users.map((u) =>
      [
        u.full_name,
        u.email,
        u.role,
        u.gender,
        u.age_range,
        u.elo_id ? (eloName.get(u.elo_id) ?? "") : "",
        u.xp,
        u.approved ? "sim" : "não",
      ]
        .map(csvEscape)
        .join(","),
    );
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `usuarios-elos-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <button type="button" className="btn btn-ghost !py-2 !text-sm" onClick={handleExport}>
      Exportar CSV
    </button>
  );
}
