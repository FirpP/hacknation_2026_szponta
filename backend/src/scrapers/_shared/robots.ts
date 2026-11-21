/**
 * Minimalny parser robots.txt (RFC 9309) + cache per origin.
 *
 * Polityka (ściśle, bez wyjątków):
 * - 2xx z treścią robots => reguły dla naszej grupy (token z User-Agent) albo "*"
 * - 4xx => brak ograniczeń (RFC 9309 §2.3.1.3)
 * - 5xx / błąd sieci => całkowity zakaz (RFC 9309 §2.3.1.4)
 * - 2xx, ale HTML (np. strona anti-bot zamiast robots.txt) => traktujemy jak niedostępny, czyli zakaz.
 *   Ostrożniej niż RFC, ale nie chcemy omijać zabezpieczeń.
 */

export type RobotsRule = { allow: boolean; pattern: string };
export type RobotsPolicy = {
  /** null = brak dostępu do całego hosta, powód w `reason` */
  rules: RobotsRule[] | null;
  crawlDelayMs: number | null;
  reason?: string;
};

type Group = { agents: string[]; rules: RobotsRule[]; crawlDelayMs: number | null };

export const parseRobots = (text: string, productToken: string): Omit<RobotsPolicy, "reason"> => {
  const groups: Group[] = [];
  let current: Group | null = null;
  let lastWasAgent = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();

    if (key === "user-agent") {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [], crawlDelayMs: null };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!current) continue;
    if (key === "allow" || key === "disallow") {
      // Pusty "Disallow:" oznacza brak ograniczeń, więc go pomijamy
      if (value) current.rules.push({ allow: key === "allow", pattern: value });
    } else if (key === "crawl-delay") {
      const seconds = Number.parseFloat(value);
      if (Number.isFinite(seconds) && seconds >= 0) current.crawlDelayMs = Math.round(seconds * 1000);
    }
  }

  const token = productToken.toLowerCase();
  const specific = groups.filter((g) => g.agents.some((a) => a !== "*" && token.includes(a)));
  const chosen = specific.length > 0 ? specific : groups.filter((g) => g.agents.includes("*"));

  return {
    rules: chosen.flatMap((g) => g.rules),
    crawlDelayMs: chosen.reduce<number | null>(
      (acc, g) => (g.crawlDelayMs === null ? acc : Math.max(acc ?? 0, g.crawlDelayMs)),
      null,
    ),
  };
};

const patternToRegExp = (pattern: string): RegExp => {
  const anchored = pattern.endsWith("$");
  const body = (anchored ? pattern.slice(0, -1) : pattern)
    .split("*")
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${body}${anchored ? "$" : ""}`);
};

/** Najdłuższe pasujące dopasowanie wygrywa; przy remisie wygrywa Allow (RFC 9309 §2.2.2) */
export const isPathAllowed = (rules: RobotsRule[], pathWithQuery: string): boolean => {
  let best: RobotsRule | null = null;
  for (const rule of rules) {
    if (!patternToRegExp(rule.pattern).test(pathWithQuery)) continue;
    if (
      !best ||
      rule.pattern.length > best.pattern.length ||
      (rule.pattern.length === best.pattern.length && rule.allow)
    ) {
      best = rule;
    }
  }
  return best ? best.allow : true;
};

const cache = new Map<string, Promise<RobotsPolicy>>();

export const getRobotsPolicy = (
  origin: string,
  userAgent: string,
  timeoutMs: number,
  /** Wywoływane przed pobraniem robots.txt (rate limit hosta) */
  beforeFetch: () => Promise<void> = async () => {},
): Promise<RobotsPolicy> => {
  let pending = cache.get(origin);
  if (!pending) {
    pending = beforeFetch().then(() => fetchRobots(origin, userAgent, timeoutMs));
    cache.set(origin, pending);
  }
  return pending;
};

const fetchRobots = async (origin: string, userAgent: string, timeoutMs: number): Promise<RobotsPolicy> => {
  const productToken = userAgent.split(/[\s/]/)[0] ?? userAgent;
  try {
    const res = await fetch(`${origin}/robots.txt`, {
      headers: { "User-Agent": userAgent },
      signal: AbortSignal.timeout(timeoutMs),
      redirect: "follow",
    });
    if (res.status >= 400 && res.status < 500) {
      return { rules: [], crawlDelayMs: null };
    }
    if (!res.ok) {
      return { rules: null, crawlDelayMs: null, reason: `robots.txt zwrócił HTTP ${res.status}` };
    }
    const text = await res.text();
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("text/html") || /^\s*<(!doctype|html)/i.test(text)) {
      return {
        rules: null,
        crawlDelayMs: null,
        reason: "robots.txt niedostępny (serwer zwrócił stronę HTML, np. weryfikację anti-bot)",
      };
    }
    return parseRobots(text, productToken);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { rules: null, crawlDelayMs: null, reason: `robots.txt niedostępny: ${message}` };
  }
};
