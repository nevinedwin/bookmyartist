"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** Shows a one-time temporary password. It can't be retrieved again after closing. */
export function TempPasswordDialog({ password, who, onClose }: { password: string | null; who: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <Dialog open={!!password} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Temporary password for {who}</DialogTitle>
          <DialogDescription>
            Share it privately (not by email in plain text if you can avoid it). It&apos;s shown only once, and they&apos;ll be
            asked to choose their own password when they sign in.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3">
          <code className="flex-1 font-mono text-base tracking-wide break-all select-all">{password}</code>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              if (!password) return;
              await navigator.clipboard.writeText(password);
              setCopied(true);
            }}
          >
            {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
