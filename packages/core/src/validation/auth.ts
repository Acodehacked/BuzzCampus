import { z } from "zod";

/**
 * Campus-email restriction. Configured via CAMPUS_EMAIL_DOMAINS (comma
 * separated); defaults to a permissive `.edu`-style check so a fresh clone
 * still runs. Enforced on the server in the register procedure and again in
 * the Auth.js signIn callback — never only in the browser.
 */
export function allowedDomains(): string[] {
  return (process.env.CAMPUS_EMAIL_DOMAINS ?? "")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
}

export function isCampusEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  const domain = normalized.split("@")[1];
  if (!domain) return false;

  const configured = allowedDomains();
  if (configured.length > 0) {
    return configured.some((d) => domain === d || domain.endsWith(`.${d}`));
  }
  // Sensible default: any academic-looking domain.
  return /(\.edu|\.edu\.[a-z]{2}|\.ac\.[a-z]{2})$/.test(domain);
}

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("That isn't a valid email")
  .max(160)
  .refine(isCampusEmail, {
    message: "Buzz is campus-only — use your institutional email address",
  });

export const registerSchema = z.object({
  name: z.string().trim().min(2, "What should people call you?").max(80),
  email: emailSchema,
  password: z
    .string()
    .min(8, "At least 8 characters")
    .max(128)
    .regex(/[a-zA-Z]/, "Needs at least one letter")
    .regex(/[0-9]/, "Needs at least one number"),
  department: z.string().trim().max(80).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(160),
  password: z.string().min(1, "Enter your password").max(128),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  department: z.string().trim().max(80).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
