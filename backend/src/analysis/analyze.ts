/**
 * Analiza LLM: RawRecord -> InnovationCard.
 * Bierze tylko rekordy bez karty, ze zmienionym hashem albo PENDING. Pomija FAILED dla tego samego hasha (chyba że --retry-failed).
 * Błąd jednego rekordu jest zapisywany w RawRecord.analysisError i nie przerywa runa.
 *
 * Użycie: bun src/analysis/analyze.ts [--limit N] [--source ncbr] [--retry-failed]
 */
import prisma from "@/prisma-client";
import { ENV } from "@lib/constants/env";
import { RADAR_CONFIG, SOURCE_IDS, type SourceId } from "@/radar.config";
import { parseCliFlags, runExclusiveCli } from "@/scrapers/_shared/cli";
import { createLlm, generateCard, type LlmConfig } from "./llm-client";
import { normalizeCard, payloadToText } from "./evidence";
import { PROMPT_VERSION } from "./prompt";

export type AnalyzeOptions = { limit?: number; source?: string; retryFailed?: boolean; concurrency?: number };
export type AnalyzeSummary = { candidates: number; done: number; failed: number };

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

export const sourceDisplayName = (source: string): string =>
  (SOURCE_IDS as readonly string[]).includes(source) ? RADAR_CONFIG.sources[source as SourceId].name : source;

type Candidate = Awaited<ReturnType<typeof findCandidates>>[number];

export const findCandidates = async (opts: AnalyzeOptions) => {
  const rows = await prisma.rawRecord.findMany({
    where: {
      ...(opts.source ? { source: opts.source } : {}),
      OR: [{ analysisStatus: { in: ["PENDING", "FAILED"] } }, { card: null }],
    },
    select: {
      id: true,
      source: true,
      url: true,
      payloadType: true,
      rawPayload: true,
      contentHash: true,
      analysisStatus: true,
      failedHash: true,
      card: { select: { rawContentHash: true } },
    },
    orderBy: { id: "asc" },
  });

  return rows
    .filter((r) => {
      if (r.analysisStatus === "FAILED" && r.failedHash === r.contentHash && !opts.retryFailed) return false;
      return !r.card || r.card.rawContentHash !== r.contentHash || r.analysisStatus !== "DONE";
    })
    .slice(0, opts.limit ?? Number.MAX_SAFE_INTEGER);
};

const analyzeOne = async (llm: LlmConfig, record: Candidate): Promise<boolean> => {
  const view = payloadToText(record.rawPayload, record.payloadType);
  const truncated = view.length > ENV.LLM_MAX_INPUT_CHARS;
  const sourceName = sourceDisplayName(record.source);

  try {
    const { card, model } = await generateCard(llm, {
      sourceName,
      sourceUrl: record.url,
      payloadType: record.payloadType,
      record: truncated ? view.slice(0, ENV.LLM_MAX_INPUT_CHARS) : view,
      truncated,
    });
    const normalized = normalizeCard(card, record.rawPayload, record.payloadType);
    const data = {
      rawContentHash: record.contentHash,
      title: normalized.title,
      description: normalized.description,
      applicationArea: normalized.applicationArea,
      domain: normalized.domain,
      isInnovation: normalized.isInnovation,
      isInnovationRationale: normalized.isInnovationRationale,
      sourceUrl: record.url,
      sourceName,
      implementationStatus: normalized.implementationStatus,
      trl: normalized.trl,
      innovationScore: normalized.innovation.score,
      innovationRationale: normalized.innovation.rationale,
      applicationPotentialScore: normalized.applicationPotential.score,
      applicationPotentialRationale: normalized.applicationPotential.rationale,
      credibilityScore: normalized.credibility.score,
      credibilityRationale: normalized.credibility.rationale,
      evidence: normalized.evidence,
      fieldBasis: normalized.fieldBasis,
      analyzedAt: new Date(),
      model,
      promptVersion: PROMPT_VERSION,
    };

    await prisma.$transaction([
      prisma.innovationCard.upsert({
        where: { rawRecordId: record.id },
        create: { rawRecordId: record.id, ...data },
        update: data,
      }),
      prisma.rawRecord.update({
        where: { id: record.id },
        data: { analysisStatus: "DONE", analysisError: null, failedHash: null, analysisAttempts: { increment: 1 } },
      }),
    ]);

    const verified = normalized.evidence.filter((e) => e.verified).length;
    console.log(
      `  ✔ #${record.id} [${record.source}] ${normalized.title.slice(0, 70)} | ${normalized.domain}, ` +
        `${normalized.implementationStatus}, TRL ${normalized.trl ?? "–"} | cytaty ${verified}/${normalized.evidence.length} zweryfikowane`,
    );
    return true;
  } catch (error) {
    const message = errorMessage(error).slice(0, 2000);
    await prisma.rawRecord.update({
      where: { id: record.id },
      data: {
        analysisStatus: "FAILED",
        analysisError: message,
        failedHash: record.contentHash,
        analysisAttempts: { increment: 1 },
      },
    });
    console.error(`  ✖ #${record.id} [${record.source}] ${message}`);
    return false;
  }
};

/** Prosty semafor: przetwarza listę z ograniczoną współbieżnością */
const mapWithConcurrency = async <T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> => {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]!);
    }
  });
  await Promise.all(workers);
  return results;
};

export const analyzePending = async (opts: AnalyzeOptions = {}): Promise<AnalyzeSummary> => {
  const candidates = await findCandidates(opts);
  if (candidates.length === 0) {
    console.log("Analiza: brak rekordów do przetworzenia (wszystkie aktualne).");
    return { candidates: 0, done: 0, failed: 0 };
  }

  const llm = createLlm();
  const concurrency = opts.concurrency ?? ENV.LLM_CONCURRENCY;
  console.log(
    `▶ Analiza LLM: ${candidates.length} rekordów, model ${llm.model}, współbieżność ${concurrency}, prompt ${PROMPT_VERSION}`,
  );

  const results = await mapWithConcurrency(candidates, concurrency, (record) => analyzeOne(llm, record));
  const summary = {
    candidates: candidates.length,
    done: results.filter(Boolean).length,
    failed: results.filter((r) => !r).length,
  };
  console.log(`Analiza zakończona: ${summary.done} kart, ${summary.failed} błędów.`);
  return summary;
};

if (import.meta.main) {
  await runExclusiveCli("analyze", async () => {
    const flags = parseCliFlags();
    const summary = await analyzePending({ limit: flags.limit, source: flags.source, retryFailed: flags.retryFailed });
    return summary.failed === 0 || summary.done > 0;
  });
}
