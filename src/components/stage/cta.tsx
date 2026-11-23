import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const ctaVariants = cva(
  "group/cta relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full font-medium tracking-wide whitespace-nowrap transition-[transform,box-shadow,background-color,color] duration-300 focus-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-to-r from-electric via-[#9b4dff] to-magenta text-white shadow-[0_10px_40px_-10px_rgb(233_53_193/0.6)] hover:shadow-[0_14px_50px_-8px_rgb(233_53_193/0.8)]",
        light: "bg-ink text-midnight-950 hover:bg-white",
        ghost: "border border-white/20 bg-white/5 text-ink backdrop-blur-md hover:border-white/40 hover:bg-white/10",
        link: "rounded-none px-0 text-ink underline-offset-8 hover:underline",
      },
      size: {
        sm: "h-10 px-5 text-sm",
        md: "h-12 px-7 text-sm",
        lg: "h-14 px-9 text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type CtaProps = ComponentProps<typeof Link> & VariantProps<typeof ctaVariants>;

/** Link styled as a Stage call-to-action. */
export function Cta({ className, variant, size, children, ...props }: CtaProps) {
  return (
    <Link className={cn(ctaVariants({ variant, size }), className)} {...props}>
      {children}
    </Link>
  );
}
