import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-lg font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-fuchsia-600 text-white hover:bg-fuchsia-700 dark:bg-fuchsia-600 dark:hover:bg-fuchsia-700 focus-visible:ring-fuchsia-500",
        secondary: "bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 focus-visible:ring-blue-500",
        danger: "bg-red-500 text-white hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 focus-visible:ring-red-500",
        success: "bg-green-500 text-white hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 focus-visible:ring-green-500",
        warning: "bg-yellow-500 text-white hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700 focus-visible:ring-yellow-500",
        outline: "border-2 border-fuchsia-600 text-fuchsia-600 hover:bg-fuchsia-50 dark:border-fuchsia-400 dark:text-fuchsia-400 dark:hover:bg-fuchsia-900/20 focus-visible:ring-fuchsia-500",
        ghost: "hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-50",
      },

      size: {
        default: "h-10 px-4 py-2 text-base",
        sm: "h-8 rounded-md px-3 text-sm",
        lg: "h-12 rounded-lg px-8 text-lg",
      },
    },

    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({
  className,
  variant,
  size,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        buttonVariants({ variant, size, className })
      )}
      {...props}
    />
  );
}