import * as React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "surface" | "elevated";
  hover?: boolean;
}

/**
 * Card component following Vercel design system
 * Uses border and background combinations instead of shadows for elevation
 */
const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", hover = false, ...props }, ref) => {
    const variants = {
      default: "bg-black border-gray-800",
      surface: "bg-gray-900 border-gray-800",
      elevated: "bg-gray-800 border-gray-600",
    };

    const hoverStyles = hover
      ? "transition-all duration-150 hover:bg-gray-800 hover:border-gray-600 hover:scale-[1.02]"
      : "";

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-md border p-6",
          variants[variant],
          hoverStyles,
          className
        )}
        {...props}
      />
    );
  }
);

Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 pb-6", className)}
    {...props}
  />
));

CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("text-h3 font-semibold text-gray-100", className)}
    {...props}
  />
));

CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-body text-gray-400", className)}
    {...props}
  />
));

CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("pt-0", className)} {...props} />
));

CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center pt-6", className)}
    {...props}
  />
));

CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
