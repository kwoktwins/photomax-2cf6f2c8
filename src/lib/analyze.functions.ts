import { createServerFn } from "@tanstack/react-start";

const SYSTEM_PROMPT = `You are a photography composition analyst. Given an image or description, return ONLY a JSON object matching this exact schema, with no other text: { subject_placement: one of [upper_left, upper_center, upper_right, center_left, center, center_right, lower_left, lower_center, lower_right], negative_space: one of [heavy_left, heavy_right, heavy_top, heavy_bottom, balanced, minimal], mood: one of [cinematic_moody, bright_airy, warm_golden_hour, moody_dark, vibrant_bold, minimal_clean, vintage_film, natural_candid], framing: one of [extreme_close_up, close_up, medium_shot, wide_shot], lighting: one of [soft_diffused, harsh_direct, golden_hour, backlit_silhouette, low_key_dark, bright_even, neon_artificial], coaching_focus: array of 1-2 strings pulled only from ['subject_placement','negative_space','mood','framing'] }

Framing rules — judge ONLY by the proportion of the frame occupied by environment vs. the subject's body and its surroundings. Ignore the subject's pose (seated, curled up, reclining, legs tucked, etc.) — a compact pose is NOT a close-up.
- extreme_close_up: only the face or part of the face fills the frame.
- close_up: head and shoulders visible, minimal background.
- medium_shot: subject visible roughly waist-up, OR the majority of the body is visible but the background/environment occupies only a minor part of the frame.
- wide_shot: full body visible AND significant surrounding environment/setting (furniture, room, landscape, etc.) is a meaningful part of the composition.

Examples of correct framing judgment (pose does NOT determine framing, visible environment does):
- A subject sitting cross-legged or with knees bent, with most of the room/floor/environment visible around them → wide_shot (NOT medium_shot, even though their body looks compact)
- A subject sitting at a desk or table with visible background objects, furniture, and space around them → wide_shot
- A subject shown only from the waist up, seated or standing, with little background visible → medium_shot

The key test: if you removed the subject from the frame, would there be a lot of empty/visible environment left over? If yes, it's wide_shot regardless of the subject's pose or how their limbs are positioned.`;

export type TargetProfile = {
  subject_placement: string;
  negative_space: string;
  mood: string;
  framing: string;
  lighting: string;
  coaching_focus: string[];
};

type Input =
  | { kind: "image"; mediaType: string; base64: string }
  | { kind: "text"; description: string };

export const analyzeInspiration = createServerFn({ method: "POST" })
  .inputValidator((data: unknown): Input => {
    const d = data as Input;
    if (d.kind === "image" && d.base64 && d.mediaType) return d;
    if (d.kind === "text" && typeof d.description === "string" && d.description.trim()) return d;
    throw new Error("Provide an image or a description.");
  })
  .handler(async ({ data }): Promise<TargetProfile> => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");

    const userContent =
      data.kind === "image"
        ? [
            {
              type: "image",
              source: { type: "base64", media_type: data.mediaType, data: data.base64 },
            },
            { type: "text", text: "Analyze this inspiration photo." },
          ]
        : [{ type: "text", text: `Analyze this described aesthetic: ${data.description}` }];

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
        messages: [{ role: "user", content: userContent }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Anthropic API error ${res.status}: ${errText}`);
    }

    const json = (await res.json()) as { content: Array<{ type: string; text?: string }> };
    const text = json.content?.find((b) => b.type === "text")?.text?.trim() ?? "";
    // Strip potential code fences
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed = JSON.parse(cleaned) as TargetProfile;
    return parsed;
  });
