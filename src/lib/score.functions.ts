import { createServerFn } from "@tanstack/react-start";
import type { TargetProfile } from "./analyze.functions";

const SYSTEM_PROMPT = `You are a photography composition coach. You will receive a photo and a target profile JSON describing the desired composition. Score the photo against the target using this exact rubric, and return ONLY a JSON object with no other text:

{
  subject_placement_score: integer 0-30. Award 26-30 if subject matches target subject_placement exactly. Award 15-19 if within one adjacent zone. Award 0-8 if opposite or unrelated zone.
  negative_space_score: integer 0-25. Award 21-25 if the photo's negative space direction matches target negative_space. Award 8-12 if partially matches. Award 0-4 if opposite or unrelated.
  framing_score: integer 0-25. Award 21-25 if framing matches target framing exactly. Award 8-12 if one category off (e.g. medium vs wide). Award 0-4 if two or more categories off.
  lighting_score: integer 0-20. Lighting values are grouped into two buckets — warm/soft: [soft_diffused, golden_hour, bright_even], harsh/dramatic: [harsh_direct, backlit_silhouette, low_key_dark, neon_artificial]. Award 17-20 if the shot's lighting matches target lighting exactly. Award 8-12 if it's a different value in the same bucket. Award 0-5 if it's in the opposite bucket.
  total_score: integer, the sum of the four scores above (0-100)
  feedback: a short string (max 2 sentences) giving specific, actionable direction based on the lowest-scoring criterion.
  mood_match: a short qualitative string (max 1 sentence) comparing the shot's mood to the target's mood. Do not score this numerically.
  direction: one of [pan_left, pan_right, pan_up, pan_down, zoom_in, zoom_out, no_change] — the single most impactful adjustment the user should make next
}

Do not deviate from this schema. Do not add commentary outside the JSON.`;

export type ShotScore = {
  subject_placement_score: number;
  negative_space_score: number;
  framing_score: number;
  lighting_score: number;
  total_score: number;
  feedback: string;
  mood_match: string;
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

    const callOnce = async (): Promise<ShotScore> => {
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
    };

    const [a, b] = await Promise.all([callOnce(), callOnce()]);
    const avg = (x: number, y: number) => Math.round((x + y) / 2);

    const subject_placement_score = avg(a.subject_placement_score, b.subject_placement_score);
    const negative_space_score = avg(a.negative_space_score, b.negative_space_score);
    const framing_score = avg(a.framing_score, b.framing_score);
    const lighting_score = avg(a.lighting_score, b.lighting_score);
    const total_score = subject_placement_score + negative_space_score + framing_score + lighting_score;

    const distA = Math.abs(a.total_score - total_score);
    const distB = Math.abs(b.total_score - total_score);
    const closer = distA <= distB ? a : b;

    return {
      subject_placement_score,
      negative_space_score,
      framing_score,
      lighting_score,
      total_score,
      feedback: closer.feedback,
      mood_match: closer.mood_match,
      direction: a.direction === b.direction ? a.direction : closer.direction,
    };
  });
