import type { Achievement } from "@/lib/types";

export function AchievementsList({
  achievements,
  earnedKeys,
}: {
  achievements: Achievement[];
  earnedKeys: Set<string>;
}) {
  if (achievements.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {achievements.map((a) => {
        const earned = earnedKeys.has(a.key);
        return (
          <div
            key={a.key}
            className={`rounded-xl border p-3 text-center ${
              earned
                ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                : "border-[var(--line)] opacity-40 grayscale"
            }`}
            title={a.description}
          >
            <p className="text-2xl">{a.icon}</p>
            <p className="mt-1 text-xs font-bold">{a.title}</p>
          </div>
        );
      })}
    </div>
  );
}
