import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-lg font-display uppercase transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer border-[3px] border-ink",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[6px_6px_0_var(--color-ink)] hover:-translate-y-[2px] hover:-translate-x-[2px] hover:shadow-[10px_10px_0_var(--color-ink)] hover:bg-destructive hover:border-destructive hover:text-white",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "bg-transparent shadow-[4px_4px_0_var(--color-ink)] hover:bg-ink hover:text-canvas hover:-translate-y-[1px] hover:-translate-x-[1px]",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 rounded-full border-2", // Keep one rounded style for contrast if needed? No, user said Exactly. But 'secondary' in snippet had radius.
        ghost:
          "border-transparent shadow-none hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline border-none shadow-none",
      },
      size: {
        default: "h-12 px-8 py-2",
        sm: "h-9 px-4 text-sm",
        lg: "h-14 px-10 text-xl",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? (Slot as React.ElementType) : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
