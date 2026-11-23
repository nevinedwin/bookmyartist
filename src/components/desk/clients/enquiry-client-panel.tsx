"use client";

import { Link2, Link2Off, Loader2, Search, UserPlus } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClientFromEnquiryAction, linkEnquiryClientAction, searchClientsAction } from "@/server/actions/clients";
import type { ClientMatch, ClientOption } from "@/server/services/admin/clients";
import { useActionRunner } from "../enquiries/use-action";

interface LinkedClient {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  organization: string | null;
}

/**
 * Links an enquiry to a client record. Exact email/phone matches are offered
 * first; otherwise search, or create a client from what the customer sent.
 */
export function EnquiryClientPanel({
  enquiryId,
  client,
  suggestions,
  canLink,
  canCreate,
}: {
  enquiryId: string;
  client: LinkedClient | null;
  suggestions: ClientMatch[];
  canLink: boolean;
  canCreate: boolean;
}) {
  const { pending, run } = useActionRunner();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ClientOption[] | null>(null);
  const [searching, startSearch] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const link = (clientId: string | null, message: string) => run(() => linkEnquiryClientAction({ enquiryId, clientId }), message);

  if (client) {
    return (
      <div className="grid gap-3">
        <div className="text-sm">
          <Link href={`/admin/clients/${client.id}`} className="font-medium text-primary hover:underline">
            {client.name}
          </Link>
          <p className="text-xs text-muted-foreground">{[client.organization, client.email, client.phone].filter(Boolean).join(" · ")}</p>
        </div>
        {canLink ? (
          <div>
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => link(null, "Client unlinked")}>
              {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Link2Off aria-hidden="true" />} Unlink
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  if (!canLink) return <p className="text-sm text-muted-foreground">Not linked to a client.</p>;

  return (
    <div className="grid gap-3">
      {suggestions.length ? (
        <div className="grid gap-2">
          <p className="text-xs font-medium text-muted-foreground uppercase">Same email or phone</p>
          {suggestions.map((s) => (
            <MatchRow key={s.id} name={s.name} detail={`${[s.organization, s.email, s.phone].filter(Boolean).join(" · ")}`} pending={pending} onLink={() => link(s.id, `Linked to ${s.name}`)} />
          ))}
        </div>
      ) : null}

      <label className="relative">
        <span className="sr-only">Search clients to link</span>
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          type="search"
          className="pl-8"
          placeholder="Find a client…"
          value={q}
          onChange={(e) => {
            const value = e.target.value;
            setQ(value);
            clearTimeout(timer.current);
            if (value.trim().length < 2) {
              setResults(null);
              return;
            }
            timer.current = setTimeout(() => {
              startSearch(async () => {
                const r = await searchClientsAction({ q: value.trim() });
                setResults(r.ok ? r.data : []);
              });
            }, 250);
          }}
        />
      </label>
      {searching ? <p className="text-xs text-muted-foreground">Searching…</p> : null}
      {results && !searching ? (
        results.length ? (
          <div className="grid gap-2" aria-live="polite">
            {results.map((c) => (
              <MatchRow key={c.id} name={c.name} detail={[c.organization, c.email, c.phone].filter(Boolean).join(" · ")} pending={pending} onLink={() => link(c.id, `Linked to ${c.name}`)} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground" aria-live="polite">
            No clients match “{q}”.
          </p>
        )
      ) : null}

      {canCreate ? (
        <div>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => run(() => createClientFromEnquiryAction({ enquiryId }), "Client created and linked")}
          >
            {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <UserPlus aria-hidden="true" />} New client from this enquiry
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function MatchRow({ name, detail, pending, onLink }: { name: string; detail: string; pending: boolean; onLink: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
      <div className="min-w-0 flex-1 text-sm">
        <p className="truncate font-medium">{name}</p>
        <p className="truncate text-xs text-muted-foreground">{detail}</p>
      </div>
      <Button size="sm" variant="secondary" disabled={pending} onClick={onLink} aria-label={`Link ${name}`}>
        <Link2 aria-hidden="true" /> Link
      </Button>
    </div>
  );
}
