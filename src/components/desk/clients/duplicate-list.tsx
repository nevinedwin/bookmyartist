import Link from "next/link";
import type { ClientMatch } from "@/server/services/admin/clients";

export function DuplicateList({ matches, linkTarget }: { matches: ClientMatch[]; linkTarget?: "_blank" }) {
  return (
    <ul className="grid gap-2">
      {matches.map((m) => (
        <li key={m.id} className="rounded-lg border bg-background px-3 py-2 text-sm">
          <Link href={`/admin/clients/${m.id}`} target={linkTarget} className="font-medium hover:underline">
            {m.name}
          </Link>
          {m.archived ? <span className="ml-1.5 text-xs text-muted-foreground">(archived)</span> : null}
          <p className="text-xs text-muted-foreground">
            {[m.organization, m.email, m.phone].filter(Boolean).join(" · ")} — same {m.matchedOn.join(" and ")}
          </p>
        </li>
      ))}
    </ul>
  );
}
