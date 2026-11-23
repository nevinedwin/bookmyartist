"use client";

import { Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { revokeOtherSessionsAction, revokeSessionAction } from "@/server/actions/auth";
import { useActionRunner } from "../enquiries/use-action";

export interface SessionView {
  id: string;
  current: boolean;
  device: string;
  lastSeen: string;
  started: string;
}

export function SessionList({ sessions }: { sessions: SessionView[] }) {
  const { pending, run } = useActionRunner();
  const others = sessions.filter((s) => !s.current).length;
  return (
    <div className="grid gap-3">
      <ul className="divide-y rounded-xl border">
        {sessions.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <Monitor className="size-4 text-muted-foreground" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {s.device}
                {s.current ? <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">This device</span> : null}
              </p>
              <p className="text-xs text-muted-foreground">
                Active {s.lastSeen} · signed in {s.started}
              </p>
            </div>
            {!s.current ? (
              <Button variant="outline" size="sm" disabled={pending} onClick={() => void run(() => revokeSessionAction(s.id), "Session ended")}>
                Sign out
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
      {others > 0 ? (
        <div>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => void run(() => revokeOtherSessionsAction(), (n) => `${n} other session${n === 1 ? "" : "s"} ended`)}
          >
            Sign out all other sessions
          </Button>
        </div>
      ) : null}
    </div>
  );
}
