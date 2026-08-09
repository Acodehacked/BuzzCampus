import { z } from "zod";

/**
 * ── The campus email restriction ──────────────────────────────────────
 *
 * There is no syntactic rule that recognises "a university" worldwide.
 * `.edu` is largely American; `.ac.<cc>` covers India, the UK, Japan and
 * much of Asia and Africa — but ETH Zürich is `ethz.ch`, TU Delft is
 * `tudelft.nl`, McGill is `mcgill.ca`, Bologna is `unibo.it`, KTH is
 * `kth.se`. None of those carry an academic marker at all. Any pattern
 * loose enough to accept them also accepts `gmail.com`.
 *
 * So the check works in three layers, most specific first:
 *
 *   1. CAMPUS_EMAIL_DOMAINS — an explicit allowlist. Subdomains count, so
 *      `sjcetpalai.ac.in` admits `abin2028@es.sjcetpalai.ac.in`. This is
 *      the right setting for a real deployment: Buzz serves one campus,
 *      and the operator knows its domain.
 *
 *   2. CAMPUS_EMAIL_MODE=academic — no allowlist, but only domains
 *      carrying an academic marker. Useful for a multi-college consortium
 *      where enumerating every member is impractical.
 *
 *   3. Default — reject known consumer and disposable mail providers,
 *      accept everything else. This is what makes a fresh clone work for
 *      ANY college on earth, including the ones with no academic marker.
 *      The trade-off is real and worth stating: it also accepts a company
 *      or personal domain. Set CAMPUS_EMAIL_DOMAINS in production.
 *
 * Enforced on the server in the register procedure and again in the
 * Auth.js signIn callback — never only in the browser.
 */

export type CampusEmailMode = "allowlist" | "academic" | "non-consumer";

export function allowedDomains(): string[] {
  return (process.env.CAMPUS_EMAIL_DOMAINS ?? "")
    .split(",")
    .map((d) => d.trim().toLowerCase().replace(/^@/, ""))
    .filter(Boolean);
}

export function campusEmailMode(): CampusEmailMode {
  if (allowedDomains().length > 0) return "allowlist";
  return process.env.CAMPUS_EMAIL_MODE?.trim().toLowerCase() === "academic"
    ? "academic"
    : "non-consumer";
}

/**
 * Labels that mark a domain as academic somewhere in the world. Checked as
 * whole labels, so `ac` matches `sjcetpalai.ac.in` but not `blackacre.com`.
 */
const ACADEMIC_LABELS = new Set([
  "edu", // harvard.edu, iiit.edu.in
  "ac", // sjcetpalai.ac.in, ox.ac.uk, u-tokyo.ac.jp
  "sch", // sch.uk, sch.id — schools
  "uni", // uni.lu, uni.edu
  "univ",
  "univer",
  "college",
  "school",
  "institute",
  "campus",
  "student",
  "students",
  "alumni",
  "res", // res.in — research institutes
  "ernet", // ernet.in — India's education & research network
  "academy",
]);

/** Prefix conventions used by continental European universities. */
const ACADEMIC_LABEL_PREFIXES = ["uni-", "univ-", "u-", "esc-", "iut-"];

/**
 * A domain carrying an academic marker. Deliberately generous — this is
 * only consulted in `academic` mode, where a false negative locks a real
 * student out and a false positive just lets an odd domain in.
 */
export function isAcademicDomain(domain: string): boolean {
  const labels = domain.toLowerCase().split(".").filter(Boolean);
  if (labels.length < 2) return false;

  return labels.some(
    (label) =>
      ACADEMIC_LABELS.has(label) ||
      ACADEMIC_LABEL_PREFIXES.some((prefix) => label.startsWith(prefix)),
  );
}

/**
 * Consumer mailbox providers, matched on the whole domain.
 *
 * Whole-domain matching matters: a naive "starts with mail" check would
 * reject `mail.sjcetpalai.ac.in`, which is a real university mail host.
 */
const CONSUMER_DOMAINS = new Set([
  "aol.com",
  "bluewin.ch",
  "comcast.net",
  "daum.net",
  "email.com",
  "fastmail.com",
  "free.fr",
  "freenet.de",
  "gmx.at",
  "gmx.ch",
  "gmx.com",
  "gmx.de",
  "gmx.net",
  "hanmail.net",
  "hey.com",
  "hushmail.com",
  "icloud.com",
  "inbox.com",
  "interia.pl",
  "laposte.net",
  "libero.it",
  "mac.com",
  "mail.com",
  "mail.ru",
  "me.com",
  "naver.com",
  "o2.pl",
  "onet.pl",
  "op.pl",
  "orange.fr",
  "pm.me",
  "proton.me",
  "protonmail.ch",
  "protonmail.com",
  "qq.com",
  "rediffmail.com",
  "seznam.cz",
  "sfr.fr",
  "sina.com",
  "sina.cn",
  "t-online.de",
  "telenet.be",
  "tiscali.it",
  "tuta.io",
  "tutanota.com",
  "tutanota.de",
  "verizon.net",
  "virgilio.it",
  "wanadoo.fr",
  "web.de",
  "wp.pl",
  "xs4all.nl",
  "yandex.by",
  "yandex.com",
  "yandex.kz",
  "yandex.ru",
  "zoho.com",
  "zoho.eu",
  "163.com",
  "126.com",
  "139.com",
  "21cn.com",
]);

/**
 * The big providers ship dozens of country variants — yahoo.co.in,
 * hotmail.co.uk, outlook.com.br, live.com.au. Matching the first label
 * covers them all without enumerating every ccTLD.
 *
 * Safe because no institution puts its mail on `yahoo.ac.in`.
 */
const CONSUMER_FAMILIES = [
  "gmail",
  "googlemail",
  "yahoo",
  "ymail",
  "rocketmail",
  "hotmail",
  "outlook",
  "live",
  "msn",
  "aol",
  "gmx",
  "yandex",
];

/** Throwaway inbox services — a campus account shouldn't be disposable. */
const DISPOSABLE_DOMAINS = [
  "10minutemail",
  "dispostable",
  "fakeinbox",
  "getnada",
  "guerrillamail",
  "mailinator",
  "maildrop",
  "mohmal",
  "sharklasers",
  "spamgourmet",
  "temp-mail",
  "tempmail",
  "throwawaymail",
  "trashmail",
  "yopmail",
];

/**
 * Second-level labels that sit under a country TLD in a public suffix —
 * the `co` in `yahoo.co.in`, the `com` in `outlook.com.br`.
 */
const COUNTRY_SECOND_LEVELS = new Set([
  "co",
  "com",
  "net",
  "org",
  "or",
  "ne",
  "in",
]);

export function isConsumerDomain(domain: string): boolean {
  const normalized = domain.toLowerCase();
  if (CONSUMER_DOMAINS.has(normalized)) return true;

  const labels = normalized.split(".").filter(Boolean);

  // A family name only counts when it IS the registrable domain —
  // `yahoo.com`, `yahoo.co.in`, `outlook.com.br`. It must NOT count when
  // it's a subdomain of somewhere else: `live.university.edu` is that
  // university's own host, and `live` is an ordinary English word.
  const isRegistrable =
    labels.length === 2 ||
    (labels.length === 3 &&
      COUNTRY_SECOND_LEVELS.has(labels[1]!) &&
      labels[2]!.length === 2);

  if (isRegistrable && CONSUMER_FAMILIES.includes(labels[0]!)) {
    return true;
  }

  return DISPOSABLE_DOMAINS.some((name) => labels.includes(name));
}

export function isCampusEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  const parts = normalized.split("@");
  // Exactly one @, and something on both sides of it.
  if (parts.length !== 2 || !parts[0] || !parts[1]) return false;

  const domain = parts[1]!;
  if (!domain.includes(".") || domain.startsWith(".") || domain.endsWith(".")) {
    return false;
  }

  switch (campusEmailMode()) {
    case "allowlist":
      // Subdomains count: `sjcetpalai.ac.in` admits `es.sjcetpalai.ac.in`.
      return allowedDomains().some(
        (allowed) => domain === allowed || domain.endsWith(`.${allowed}`),
      );

    case "academic":
      return isAcademicDomain(domain) && !isConsumerDomain(domain);

    case "non-consumer":
      return !isConsumerDomain(domain);
  }
}

/** The message shown when an address is rejected, matched to the mode. */
export function campusEmailMessage(): string {
  switch (campusEmailMode()) {
    case "allowlist": {
      // Naming the domain is genuinely helpful when there are one or two of
      // them. Past that it turns into a wall of text that tells the user
      // less than the plain sentence does.
      const domains = allowedDomains();
      if (domains.length === 0 || domains.length > 3) {
        return "Buzz is campus-only — use your institutional email address";
      }
      const list = domains
        .map((domain) => `@${domain}`)
        .join(domains.length === 2 ? " or " : ", ");
      return `Buzz is campus-only — use your ${list} address`;
    }
    case "academic":
      return "Buzz is campus-only — use your institutional email address";
    case "non-consumer":
      return "Buzz is campus-only — personal email addresses aren't accepted";
  }
}

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("That isn't a valid email")
  .max(160)
  .refine(isCampusEmail, () => ({ message: campusEmailMessage() }));

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
