"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { motion, useReducedMotion } from "motion/react";
import { publicNav, siteConfig } from "@/config/site";
import { Logo } from "@/components/shared/logo";
import { Cta } from "./cta";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  // The menu is "open" only for the path it was opened on, so any navigation closes it.
  const [openOnPath, setOpenOnPath] = useState<string | null>(null);
  const open = openOnPath === pathname;
  const setOpen = (value: boolean) => setOpenOnPath(value ? pathname : null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-[background-color,border-color,backdrop-filter] duration-500",
        scrolled
          ? "border-b border-white/10 bg-midnight-950/70 backdrop-blur-xl"
          : "border-b border-transparent bg-gradient-to-b from-midnight-950/70 to-transparent",
      )}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-midnight-950"
      >
        Skip to content
      </a>
      <div className="mx-auto flex h-18 max-w-[1440px] items-center justify-between gap-6 px-5 sm:px-8 lg:px-12">
        <Link href="/" className="focus-ring rounded-md" aria-label={`${siteConfig.name} — home`}>
          <Logo />
        </Link>

        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {publicNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={cn(
                    "focus-ring relative rounded-full px-4 py-2 text-sm text-haze transition-colors hover:text-ink",
                    isActive(item.href) && "text-ink",
                  )}
                >
                  {item.label}
                  {isActive(item.href) && (
                    <motion.span
                      layoutId="nav-dot"
                      className="absolute bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-magenta"
                      transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-3">
          <Cta href="/book-an-artist" size="sm" className="hidden sm:inline-flex">
            Book an artist
          </Cta>

          <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
            <DialogPrimitive.Trigger
              className="focus-ring inline-flex size-11 items-center justify-center rounded-full border border-white/15 bg-white/5 text-ink lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="size-5" />
            </DialogPrimitive.Trigger>
            <DialogPrimitive.Portal>
              <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-midnight-950/80 backdrop-blur-sm" />
              <DialogPrimitive.Content className="stage fixed inset-0 z-50 flex flex-col overflow-y-auto bg-midnight-950 px-6 pt-5 pb-10">
                <DialogPrimitive.Title className="sr-only">Menu</DialogPrimitive.Title>
                <DialogPrimitive.Description className="sr-only">Site navigation</DialogPrimitive.Description>
                <div className="pointer-events-none absolute -top-32 -right-32 size-96 rounded-full bg-electric/40 blur-[120px]" />
                <div className="relative flex items-center justify-between">
                  <Logo />
                  <DialogPrimitive.Close
                    className="focus-ring inline-flex size-11 items-center justify-center rounded-full border border-white/15 bg-white/5"
                    aria-label="Close menu"
                  >
                    <X className="size-5" />
                  </DialogPrimitive.Close>
                </div>
                <nav aria-label="Mobile" className="relative mt-12 flex-1">
                  <ul className="space-y-1">
                    {[{ href: "/", label: "Home" }, ...publicNav].map((item, i) => (
                      <motion.li
                        key={item.href}
                        initial={reduce ? false : { opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 * i, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                      >
                        <Link
                          href={item.href}
                          className={cn(
                            "focus-ring block rounded-lg py-2 font-display text-4xl font-semibold tracking-tight",
                            (item.href === "/" ? pathname === "/" : isActive(item.href)) ? "text-gradient" : "text-ink",
                          )}
                        >
                          {item.label}
                        </Link>
                      </motion.li>
                    ))}
                  </ul>
                </nav>
                <div className="relative mt-10 space-y-4">
                  <Cta href="/book-an-artist" size="lg" className="w-full">
                    Book an artist
                  </Cta>
                  <p className="text-center text-sm text-haze">{siteConfig.contact.hours}</p>
                </div>
              </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
          </DialogPrimitive.Root>
        </div>
      </div>
    </header>
  );
}
