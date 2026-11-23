"use client";

import { Loader2, Pin, PinOff } from "lucide-react";
import { useState } from "react";
import { NativeSelect } from "@/components/desk/native-select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CONTACT_LOG_TYPES } from "@/lib/validation/admin-enquiry";
import { addEnquiryNoteAction, logEnquiryContactAction, setNotePinnedAction } from "@/server/actions/enquiries";
import { useActionRunner } from "./use-action";

const CONTACT_LABELS: Record<(typeof CONTACT_LOG_TYPES)[number], string> = {
  CALL: "Phone call",
  EMAIL: "Email",
  WHATSAPP: "WhatsApp",
  MEETING: "Meeting",
};

export function NoteForm({ enquiryId }: { enquiryId: string }) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { pending, run } = useActionRunner();
  return (
    <form
      className="grid gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        const r = await run(() => addEnquiryNoteAction({ enquiryId, body }), "Note added");
        if (r.ok) setBody("");
        else if (r.error.fieldErrors) setError(r.error.fieldErrors.body?.[0] ?? r.error.message);
      }}
    >
      <Label htmlFor="note-body" className="sr-only">
        Add an internal note
      </Label>
      <Textarea
        id="note-body"
        rows={3}
        maxLength={5000}
        placeholder="Internal note — never shown to the customer"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        aria-invalid={!!error}
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div>
        <Button type="submit" size="sm" disabled={pending || !body.trim()}>
          {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          Add note
        </Button>
      </div>
    </form>
  );
}

export function ContactLogForm({ enquiryId, isNew }: { enquiryId: string; isNew: boolean }) {
  const [type, setType] = useState<(typeof CONTACT_LOG_TYPES)[number]>("CALL");
  const [summary, setSummary] = useState("");
  const { pending, run } = useActionRunner();
  return (
    <form
      className="grid gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await run(
          () => logEnquiryContactAction({ enquiryId, type, summary }),
          (d) => (d.movedToContacted ? "Logged · moved to Contacted" : "Conversation logged"),
        );
        if (r.ok) setSummary("");
      }}
    >
      <Label htmlFor="contact-type">Log a conversation</Label>
      <NativeSelect id="contact-type" value={type} onChange={(e) => setType(e.target.value as typeof type)}>
        {CONTACT_LOG_TYPES.map((t) => (
          <option key={t} value={t}>
            {CONTACT_LABELS[t]}
          </option>
        ))}
      </NativeSelect>
      <Label htmlFor="contact-summary" className="sr-only">
        Summary
      </Label>
      <Textarea id="contact-summary" rows={2} maxLength={2000} placeholder="What was discussed?" value={summary} onChange={(e) => setSummary(e.target.value)} />
      {isNew ? <p className="text-xs text-muted-foreground">The first logged conversation moves a new enquiry to “Contacted”.</p> : null}
      <div>
        <Button type="submit" size="sm" variant="outline" disabled={pending || !summary.trim()}>
          {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          Log
        </Button>
      </div>
    </form>
  );
}

export function PinNoteButton({ noteId, pinned }: { noteId: string; pinned: boolean }) {
  const { pending, run } = useActionRunner();
  return (
    <Button
      variant="ghost"
      size="icon-xs"
      disabled={pending}
      aria-label={pinned ? "Unpin note" : "Pin note"}
      title={pinned ? "Unpin" : "Pin to top"}
      onClick={() => void run(() => setNotePinnedAction({ noteId, pinned: !pinned }))}
    >
      {pinned ? <PinOff aria-hidden="true" /> : <Pin aria-hidden="true" />}
    </Button>
  );
}
