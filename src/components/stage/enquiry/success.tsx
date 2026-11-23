"use client";

import Link from "next/link";
import { Check, Copy } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Equalizer } from "../equalizer";

/** Confirmation shown after a successful enquiry submission. */
export function EnquirySuccess({ reference, name, email }: { reference: string; name: string; email: string }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLHeadingElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => ref.current?.focus(), []);

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-electric/20 via-midnight-900 to-magenta/15 p-8 text-center sm:p-14"
      role="status"
    >
      <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-electric to-magenta">
        <Check className="size-8 text-white" aria-hidden="true" />
      </div>
      <h2 ref={ref} tabIndex={-1} className="mt-8 font-display text-3xl font-semibold tracking-tight text-ink outline-none sm:text-4xl">
        Thank you, {name.split(" ")[0]}. We&apos;re on it.
      </h2>
      <p className="mx-auto mt-4 max-w-lg text-haze">
        Your enquiry has been received. Our team will get back to you within one business day with availability and options.
        A confirmation will be sent to <span className="text-ink">{email}</span>.
      </p>
      <div className="mx-auto mt-8 inline-flex items-center gap-3 rounded-full border border-white/15 bg-midnight-950/60 py-2 pr-2 pl-6">
        <span className="text-sm text-haze">Reference</span>
        <span className="font-display text-lg font-semibold tracking-wider text-ink">{reference}</span>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(reference);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 2000);
            } catch {
              /* clipboard unavailable */
            }
          }}
          className="focus-ring flex size-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
          aria-label={copied ? "Reference copied" : "Copy reference"}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </button>
      </div>
      <div className="mt-10 flex justify-center">
        <Equalizer bars={16} />
      </div>
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Link href="/artists" className="focus-ring rounded-full border border-white/15 px-6 py-3 text-sm text-ink hover:bg-white/5">
          Keep browsing artists
        </Link>
        <Link href="/" className="focus-ring rounded-full px-6 py-3 text-sm text-haze hover:text-ink">
          Back to home
        </Link>
      </div>
    </motion.div>
  );
}
