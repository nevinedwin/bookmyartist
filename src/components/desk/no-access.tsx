import { Lock } from "lucide-react";
import { EmptyState } from "./empty-state";

/** Rendered when a signed-in user opens a page their role doesn't include. No data is loaded. */
export function NoAccess({ what = "this page" }: { what?: string }) {
  return (
    <EmptyState icon={Lock} title="You don't have access">
      Your role doesn&apos;t include {what}. Ask an admin if you need it.
    </EmptyState>
  );
}
