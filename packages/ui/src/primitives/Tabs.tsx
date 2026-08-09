"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import { forwardRef } from "react";
import { cn } from "../utils/cn";

export const Tabs = TabsPrimitive.Root;

/**
 * An underline rail rather than a filled pill group — the pill-in-a-tray
 * treatment is the shadcn silhouette (CLAUDE.md Rule 1).
 */
export const TabsList = forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "flex items-center gap-6 border-b border-graphite-700 light:border-paper-200",
      className,
    )}
    {...props}
  />
));
TabsList.displayName = "TabsList";

export const TabsTrigger = forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & {
    accent?: string;
  }
>(({ className, accent, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "relative -mb-px border-b-2 border-transparent pb-2.5 pt-1 text-sm",
      "text-text-muted transition-colors duration-150",
      "hover:text-text-primary-dark light:hover:text-text-primary-light",
      "focus-visible:outline-none focus-visible:text-text-primary-dark",
      "data-[state=active]:text-text-primary-dark light:data-[state=active]:text-text-primary-light",
      accent
        ? `data-[state=active]:border-current data-[state=active]:${accent}`
        : "data-[state=active]:border-text-primary-dark light:data-[state=active]:border-text-primary-light",
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = "TabsTrigger";

export const TabsContent = forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn("focus-visible:outline-none", className)}
    {...props}
  />
));
TabsContent.displayName = "TabsContent";
