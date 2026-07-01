import { createServerFn } from "@tanstack/react-start";
import type { TargetProfile } from "./analyze.functions";

const SYSTEM_PROMPT = `You are a photography composition coach. You will receive a photo and a target profile JSON describing the desired composition. Score the photo against the target using this exact rubric, and return ONLY a JSON object with no other text:

{
  subject_placement_score: integer 0-40. Award 35-40 if subject matches target subject_placement exactly. Award 20-25 if within one adjacent zone. Award 0-10 if opposite or unrelated zone.
  negative_space_score: integer 0-30. Award 25-30 if the photo's negative space direction matches target negative_space. Award 10-15 if partially matches. Award 0-5 if opposite or unrelated.
  framing_score: integer 0-30. Award 25-30 if framing matches target framing exactly. Award 10-15 if one category off (e.g. medium vs wide). Award 0-5 if two or more categories off.
  total_score: integer, the sum of the three scores above (0-100)
  feedback: a short string (max 2 sentences) giving specific, actionable direction based on the lowest-scoring criterion. Reference mood qualitatively if relevant but do not score it.
  direction: one of [pan_left, pan_right, pan_up, pan_down, zoom_in, zoom_out, no_change] — the single most impactful adjustment the user should make next
}

Do not deviate from this schema. Do not add commentary outside the JSON.`;

export type ShotScore = {
  subject_placement_score: number;
  negative_space_score: number;
  framing_score: number;
  total_score: number;
  feedback: string;
  direction:
    | "pan_left"
    | "pan_right"
    | "pan_up"
    | "pan_down"
    | "zoom_in"
    | "zoom_out"
    | "no_change";
};

type Input = {
  mediaType: string;
  base64: string;
  target: TargetProfile;
};

export const scoreShot = createServerFn({ method: "POST" })
  .inputValidator((data: unknown): Input => {
    const d = data as Input;
    if (!d?.base64 || !d?.mediaType || !d?.target) {
      throw new Error("Provide an image and a target profile.");
    }
    return d;
  })
  .handler(async ({ data }): Promise<ShotScore> => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: data.mediaType,
                  data: data.base64,
                },
              },
              {
                type: "text",
                text: `Target profile JSON:\n${JSON.stringify(data.target)}`,
              },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Anthropic API error ${res.status}: ${errText}`);
    }

    const json = (await res.json()) as {
      content: Array<{ type: string; text?: string }>;
    };
    const text = json.content?.find((b) => b.type === "text")?.text?.trim() ?? "";
    const cleaned = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    return JSON.parse(cleaned) as ShotScore;
  });
