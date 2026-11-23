"use client";

import { CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markNotificationsReadAction } from "@/server/actions/notifications";
import { useActionRunner } from "./enquiries/use-action";

export function MarkAllReadButton() {
  const { pending, run } = useActionRunner();
  return (
    <Button variant="outline" size="sm" disabled={pending} onClick={() => void run(() => markNotificationsReadAction("all"), "All caught up")}>
      <CheckCheck aria-hidden="true" /> Mark all read
    </Button>
  );
}

export function MarkReadButton({ id }: { id: string }) {
  const { pending, run } = useActionRunner();
  return (
    <Button variant="ghost" size="xs" disabled={pending} onClick={() => void run(() => markNotificationsReadAction([id]))}>
      Mark read
    </Button>
  );
}
