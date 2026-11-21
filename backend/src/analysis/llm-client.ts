import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { z } from "zod";
import { ENV } from "@lib/constants/env";
import { LlmCardSchema, type LlmCard } from "./card.schema";
import { SYSTEM_PROMPT, buildUserMessage, type AnalysisInput } from "./prompt";

export type LlmConfig = { client: OpenAI; model: string };

export const isLlmConfigured = (): boolean => Boolean(ENV.LLM_BASE_URL && ENV.LLM_API_KEY && ENV.LLM_MODEL);

/** Klient OpenAI SDK skierowany na API zgodne z OpenAI (DeepSeek); konfiguracja tylko z .env */
export const createLlm = (): LlmConfig => {
  const missing = (["LLM_BASE_URL", "LLM_API_KEY", "LLM_MODEL"] as const).filter((k) => !ENV[k]);
  if (missing.length > 0) {
    throw new Error(`Brak ${missing.join(", ")} w .env: analiza LLM wymaga API zgodnego z OpenAI`);
  }
  return {
    // maxRetries SDK obsługuje błędy sieci, 429 i 5xx; błędny JSON obsługujemy sami (1 retry)
    client: new OpenAI({ baseURL: ENV.LLM_BASE_URL, apiKey: ENV.LLM_API_KEY, timeout: 90_000, maxRetries: 2 }),
    model: ENV.LLM_MODEL!,
  };
};

const describeError = (error: unknown): string => {
  if (error instanceof z.ZodError) {
    return error.issues
      .slice(0, 8)
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
  }
  return error instanceof Error ? error.message : String(error);
};

/** Usuwa ewentualny blok ```json mimo json_object (niektóre modele i tak go dodają) */
const extractJson = (content: string): unknown => {
  const trimmed = content.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return JSON.parse(fenced ? fenced[1]! : trimmed);
};

export type GeneratedCard = { card: LlmCard; model: string };

/**
 * Wywołanie z response_format json_object (DeepSeek nie obsługuje json_schema; schemat jest w prompcie).
 * Niepoprawny JSON albo niezgodność ze schematem => 1 retry z informacją o błędzie, potem wyjątek.
 */
export const generateCard = async ({ client, model }: LlmConfig, input: AnalysisInput): Promise<GeneratedCard> => {
  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: buildUserMessage(input) },
  ];

  let lastError = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    const completion = await client.chat.completions.create({
      model,
      messages,
      temperature: 0,
      // Modele rozumujące (np. deepseek-flash) liczą tokeny "myślenia" do limitu, więc zapas musi być duży
      max_tokens: ENV.LLM_MAX_OUTPUT_TOKENS,
      response_format: { type: "json_object" },
    });
    const choice = completion.choices[0];
    const content = choice?.message?.content ?? "";

    // Ucięta odpowiedź: ponawiamy od zera (dopisanie uciętego JSON-a do historii tylko by przeszkadzało)
    if (choice?.finish_reason === "length" || !content.trim()) {
      lastError =
        choice?.finish_reason === "length"
          ? `odpowiedź ucięta na limicie ${ENV.LLM_MAX_OUTPUT_TOKENS} tokenów (zwiększ LLM_MAX_OUTPUT_TOKENS)`
          : "pusta odpowiedź modelu";
      console.warn(`  ↻ ${lastError}, próba ${attempt}/2`);
      continue;
    }

    try {
      const card = LlmCardSchema.parse(extractJson(content));
      return { card, model: completion.model || model };
    } catch (error) {
      lastError = describeError(error);
      messages.push(
        { role: "assistant", content: content || "(pusta odpowiedź)" },
        {
          role: "user",
          content: `Twoja odpowiedź jest niepoprawna: ${lastError}. Zwróć wyłącznie poprawny obiekt JSON zgodny ze schematem z instrukcji.`,
        },
      );
    }
  }
  throw new Error(`Niepoprawna odpowiedź modelu po ponowieniu: ${lastError}`);
};
