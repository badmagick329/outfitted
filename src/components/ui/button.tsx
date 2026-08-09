import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-berry text-canvas shadow-[3px_3px_0_var(--color-citrus)] hover:bg-berry-dark",
        secondary: "bg-teal text-canvas hover:bg-teal-dark",
        outline: "border border-ink/20 bg-transparent text-ink hover:bg-mist",
        ghost: "bg-transparent text-ink hover:bg-mist",
        destructive: "bg-red-600 text-white hover:bg-red-700",
      },
      size: { default: "h-11", sm: "h-9 px-3 text-xs", lg: "h-12 px-6 text-base" },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  ),
);
Button.displayName = "Button";

export { Button, buttonVariants };
