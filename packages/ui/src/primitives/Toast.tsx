"use client";

import * as ToastPrimitive from "@radix-ui/react-toast";
import { X } from "lucide-react";
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { cn } from "../utils/cn";

export const ToastProvider = ToastPrimitive.Provider;

export const ToastViewport = forwardRef<
  React.ElementRef<typeof ToastPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Viewport
    ref={ref}
    className={cn(
      "fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4",
      "sm:bottom-4 sm:right-4 sm:max-w-sm sm:p-0",
      className,
    )}
    {...props}
  />
));
ToastViewport.displayName = "ToastViewport";

type ToastTone = "neutral" | "success" | "danger";

const TONE: Record<ToastTone, string> = {
  neutral: "border-graphite-700",
  success: "border-success-500/50",
  danger: "border-danger-500/50",
};

export const Toast = forwardRef<
  React.ElementRef<typeof ToastPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Root> & {
    tone?: ToastTone;
  }
>(({ className, tone = "neutral", ...props }, ref) => (
  <ToastPrimitive.Root
    ref={ref}
    className={cn(
      "group pointer-events-auto relative flex items-start gap-3 rounded-md border",
      "bg-graphite-800 p-3.5 pr-9 text-sm shadow-tight",
      "data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-2",
      "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
      "data-[swipe=end]:animate-out",
      TONE[tone],
      className,
    )}
    {...props}
  />
));
Toast.displayName = "Toast";

export const ToastTitle = forwardRef<
  React.ElementRef<typeof ToastPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Title
    ref={ref}
    className={cn("text-sm font-medium text-text-primary-dark", className)}
    {...props}
  />
));
ToastTitle.displayName = "ToastTitle";

export const ToastDescription = forwardRef<
  React.ElementRef<typeof ToastPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Description
    ref={ref}
    className={cn("mt-0.5 text-xs leading-relaxed text-text-muted", className)}
    {...props}
  />
));
ToastDescription.displayName = "ToastDescription";

export const ToastClose = forwardRef<
  React.ElementRef<typeof ToastPrimitive.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Close
    ref={ref}
    className={cn(
      "absolute right-2 top-2 rounded-sm p-1 text-text-muted opacity-60",
      "transition-opacity hover:opacity-100 focus:outline-none focus:ring-1 focus:ring-text-muted",
      className,
    )}
    {...props}
  >
    <X className="h-3.5 w-3.5" />
  </ToastPrimitive.Close>
));
ToastClose.displayName = "ToastClose";

// ── the imperative hook the app actually uses ─────────────────────────

type ToastMessage = {
  id: number;
  title: string;
  description?: string;
  tone?: ToastTone;
};

type ToastContextValue = {
  toast: (message: Omit<ToastMessage, "id">) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function Toaster({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const toast = useCallback((message: Omit<ToastMessage, "id">) => {
    setMessages((current) => [
      ...current.slice(-3),
      { ...message, id: Date.now() + Math.random() },
    ]);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      <ToastProvider swipeDirection="right" duration={4500}>
        {children}
        {messages.map((message) => (
          <Toast
            key={message.id}
            tone={message.tone}
            onOpenChange={(open) => {
              if (!open) {
                setMessages((current) =>
                  current.filter((m) => m.id !== message.id),
                );
              }
            }}
          >
            <div className="min-w-0 flex-1">
              <ToastTitle>{message.title}</ToastTitle>
              {message.description ? (
                <ToastDescription>{message.description}</ToastDescription>
              ) : null}
            </div>
            <ToastClose />
          </Toast>
        ))}
        <ToastViewport />
      </ToastProvider>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // A missing provider shouldn't crash a page over a notification.
    return { toast: () => {} };
  }
  return context;
}
