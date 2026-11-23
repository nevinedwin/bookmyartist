"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { NativeSelect } from "@/components/desk/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { EnquiryStatus, LostReason, Priority } from "@/generated/prisma/enums";
import { ENQUIRY_STATUS_LABELS, LOST_REASON_LABELS, PRIORITY_LABELS } from "@/lib/labels";
import {
  assignEnquiryOwnerAction,
  changeEnquiryStatusAction,
  setEnquiryFollowUpAction,
  setEnquiryPriorityAction,
} from "@/server/actions/enquiries";
import { useActionRunner } from "./use-action";

interface Props {
  enquiryId: string;
  status: EnquiryStatus;
  transitions: EnquiryStatus[];
  ownerId: string | null;
  users: { id: string; name: string }[];
  priority: Priority;
  followUpLocal: string | null;
  closed: boolean;
}

export function PipelinePanel(props: Props) {
  return (
    <div className="grid gap-5">
      <StatusControl {...props} />
      <OwnerControl {...props} />
      <PriorityControl {...props} />
      <FollowUpControl {...props} />
    </div>
  );
}

function StatusControl({ enquiryId, status, transitions }: Props) {
  const [to, setTo] = useState<EnquiryStatus | "">("");
  const [lostReason, setLostReason] = useState<LostReason | "">("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { pending, run } = useActionRunner();

  if (transitions.length === 0) {
    return (
      <div className="grid gap-1.5">
        <Label>Status</Label>
        <p className="text-sm text-muted-foreground">
          {status === "CONFIRMED"
            ? "Confirmed enquiries are managed from their booking."
            : "Closed. Re-opening needs the “re-open enquiries” permission."}
        </p>
      </div>
    );
  }

  async function submit() {
    if (!to) return;
    setError(null);
    const result = await run(
      () =>
        changeEnquiryStatusAction({
          enquiryId,
          from: status,
          to,
          lostReason: to === "LOST" ? lostReason || undefined : undefined,
          lostReasonNote: to === "LOST" ? note : undefined,
        }),
      `Moved to ${ENQUIRY_STATUS_LABELS[to]}`,
    );
    if (result.ok) {
      setTo("");
      setLostReason("");
      setNote("");
    } else if (result.error.fieldErrors) {
      setError(result.error.fieldErrors.lostReason?.[0] ?? result.error.message);
    }
  }

  return (
    <div className="grid gap-2">
      <Label htmlFor="status-to">Move to</Label>
      <div className="flex gap-2">
        <NativeSelect id="status-to" className="flex-1" value={to} onChange={(e) => setTo(e.target.value as EnquiryStatus | "")} disabled={pending}>
          <option value="">Choose status…</option>
          {transitions.map((s) => (
            <option key={s} value={s}>
              {ENQUIRY_STATUS_LABELS[s]}
            </option>
          ))}
        </NativeSelect>
        <Button onClick={submit} disabled={!to || pending || (to === "LOST" && !lostReason)}>
          {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          Move
        </Button>
      </div>
      {to === "LOST" ? (
        <div className="grid gap-2 rounded-lg border bg-muted/30 p-3">
          <Label htmlFor="lost-reason">Why was it lost?</Label>
          <NativeSelect id="lost-reason" value={lostReason} onChange={(e) => setLostReason(e.target.value as LostReason | "")} aria-invalid={!!error}>
            <option value="">Choose a reason…</option>
            {Object.entries(LOST_REASON_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
          <Label htmlFor="lost-note" className="mt-1">
            Details <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Textarea id="lost-note" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <p className="text-xs text-muted-foreground">“Confirmed” is set by converting the enquiry to a booking (next release).</p>
    </div>
  );
}

function OwnerControl({ enquiryId, ownerId, users }: Props) {
  const { pending, run } = useActionRunner();
  return (
    <div className="grid gap-2">
      <Label htmlFor="owner">Owner</Label>
      <NativeSelect
        id="owner"
        value={ownerId ?? ""}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value || null;
          void run(() => assignEnquiryOwnerAction({ enquiryId, ownerId: next }), next ? "Owner updated" : "Unassigned");
        }}
      >
        <option value="">Unassigned</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}

function PriorityControl({ enquiryId, priority }: Props) {
  const { pending, run } = useActionRunner();
  return (
    <div className="grid gap-2">
      <Label htmlFor="priority">Priority</Label>
      <NativeSelect
        id="priority"
        value={priority}
        disabled={pending}
        onChange={(e) => void run(() => setEnquiryPriorityAction({ enquiryId, priority: e.target.value }), "Priority updated")}
      >
        {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}

function FollowUpControl({ enquiryId, followUpLocal, closed }: Props) {
  const [value, setValue] = useState(followUpLocal ?? "");
  const { pending, run } = useActionRunner();
  if (closed) return null;
  return (
    <div className="grid gap-2">
      <Label htmlFor="follow-up">Next follow-up (IST)</Label>
      <div className="flex gap-2">
        <Input id="follow-up" type="datetime-local" className="flex-1" value={value} onChange={(e) => setValue(e.target.value)} disabled={pending} />
        <Button
          variant="outline"
          disabled={pending || !value || value === followUpLocal}
          onClick={() => void run(() => setEnquiryFollowUpAction({ enquiryId, at: value }), "Follow-up scheduled")}
        >
          Set
        </Button>
      </div>
      {followUpLocal ? (
        <Button
          variant="link"
          size="sm"
          className="h-auto justify-start p-0 text-muted-foreground"
          disabled={pending}
          onClick={async () => {
            const r = await run(() => setEnquiryFollowUpAction({ enquiryId, at: null }), "Follow-up cleared");
            if (r.ok) setValue("");
          }}
        >
          Clear follow-up
        </Button>
      ) : null}
    </div>
  );
}
