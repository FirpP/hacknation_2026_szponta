import { describe, expect, it } from "bun:test";
import { isPathAllowed, parseRobots } from "./robots";

describe("robots.txt", () => {
  it("PPM: Disallow: / dla * blokuje OAI, Crawl-delay 10 s", () => {
    const policy = parseRobots(
      "User-agent: *\nDisallow: /\nCrawl-delay: 10\n\nUser-agent: googlebot\nAllow: /\n",
      "RadarInnowacji-demo",
    );
    expect(policy.crawlDelayMs).toBe(10_000);
    expect(isPathAllowed(policy.rules!, "/oai?verb=Identify")).toBe(false);
  });

  it("gov.pl: Allow: / przepuszcza wszystko", () => {
    const policy = parseRobots("User-Agent: *\nAllow: /\n", "RadarInnowacji-demo");
    expect(isPathAllowed(policy.rules!, "/web/ncbr/wyszukiwarka-sukcesow-beneficjentow")).toBe(true);
  });

  it("najdłuższe dopasowanie wygrywa, obsługa * i $", () => {
    const policy = parseRobots(
      "User-agent: *\nDisallow: /search\nAllow: /search/public\nDisallow: /*.pdf$\n",
      "RadarInnowacji-demo",
    );
    expect(isPathAllowed(policy.rules!, "/search?q=x")).toBe(false);
    expect(isPathAllowed(policy.rules!, "/search/public/1")).toBe(true);
    expect(isPathAllowed(policy.rules!, "/files/a.pdf")).toBe(false);
    expect(isPathAllowed(policy.rules!, "/files/a.pdf?x=1")).toBe(true);
  });

  it("grupa dla naszego tokenu ma pierwszeństwo przed *", () => {
    const policy = parseRobots(
      "User-agent: *\nDisallow: /\n\nUser-agent: radarinnowacji\nAllow: /\n",
      "RadarInnowacji-demo/0.1",
    );
    expect(isPathAllowed(policy.rules!, "/anything")).toBe(true);
  });
});
