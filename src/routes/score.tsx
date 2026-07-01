import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { scoreShot, type ShotScore } from "@/lib/score.functions";
import type { TargetProfile } from "@/lib/analyze.functions";

export const Route = createFileRoute("/score")({
  head: () => ({
    meta: [
      { title: "Photomax — Shot Scoring" },
      { name: "description", content: "Score your shot against a locked target profile." },
    ],
  }),
  component: ShotScoring,
});

function fileToBase64(file: File): Promise<{ mediaType: string; base64: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const [, data] = result.split(",");
      resolve({ mediaType: file.type || "image/jpeg", base64: data });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const DEFAULT_TARGET: TargetProfile = {
  subject_placement: "center",
  negative_space: "balanced",
  mood: "cinematic_moody",
  framing: "medium_shot",
  coaching_focus: ["subject_placement", "framing"],
};

const ARROWS: Record<ShotScore["direction"], string> = {
  pan_left: "←",
  pan_right: "→",
  pan_up: "↑",
  pan_down: "↓",
  zoom_in: "＋",
  zoom_out: "－",
  no_change: "✓",
};

function ShotScoring() {
  const score = useServerFn(scoreShot);
  // Assumed already available in state (would be passed as prop / from store).
  // Editable textarea here only so this screen is usable in isolation.
  const [targetJson, setTargetJson] = useState(JSON.stringify(DEFAULT_TARGET, null, 2));
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<ShotScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (f: File | null) => {
    setFile(f);
    setPreviewUrl(f ? URL.createObjectURL(f) : null);
  };

  const onScore = async () => {
    setError(null);
    setResult(null);
    if (!file) {
      setError("Upload a shot to score.");
      return;
    }
    let target: TargetProfile;
    try {
      target = JSON.parse(targetJson) as TargetProfile;
    } catch {
      setError("Target profile JSON is invalid.");
      return;
    }
    setLoading(true);
    try {
      const img = await fileToBase64(file);
      const r = await score({ data: { ...img, target } });
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: 640,
        margin: "40px auto",
        padding: "0 20px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>Shot Scoring</h1>
      <p style={{ color: "#666", marginTop: 0, marginBottom: 24 }}>
        Upload your shot to score it against the locked target profile.
      </p>

      <details style={{ marginBottom: 16 }}>
        <summary style={{ cursor: "pointer", fontSize: 13, color: "#666" }}>
          Target profile (from Inspiration Intake)
        </summary>
        <textarea
          value={targetJson}
          onChange={(e) => setTargetJson(e.target.value)}
          rows={8}
          style={{
            width: "100%",
            marginTop: 8,
            padding: 8,
            fontFamily: "ui-monospace, monospace",
            fontSize: 12,
            border: "1px solid #ccc",
            borderRadius: 6,
          }}
        />
      </details>

      <label
        style={{
          display: "block",
          border: "2px dashed #ccc",
          borderRadius: 8,
          padding: 32,
          textAlign: "center",
          cursor: "pointer",
          background: "#fafafa",
        }}
      >
        <input
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="shot preview"
            style={{ maxHeight: 240, maxWidth: "100%", borderRadius: 4 }}
          />
        ) : (
          <div style={{ color: "#666" }}>Click to upload your shot</div>
        )}
      </label>

      <button
        onClick={onScore}
        disabled={loading}
        style={{
          marginTop: 16,
          padding: "10px 20px",
          fontSize: 15,
          borderRadius: 6,
          border: "none",
          background: loading ? "#999" : "#111",
          color: "white",
          cursor: loading ? "default" : "pointer",
        }}
      >
        {loading ? "Scoring…" : "Score This Shot"}
      </button>

      {error && <div style={{ marginTop: 16, color: "#b00", fontSize: 14 }}>{error}</div>}

      {result && (
        <div
          style={{
            marginTop: 24,
            border: "1px solid #e5e5e5",
            borderRadius: 8,
            padding: 20,
            background: "white",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div>
              <div style={{ fontSize: 48, fontWeight: 700, lineHeight: 1 }}>
                {result.total_score}
                <span style={{ fontSize: 20, color: "#999", fontWeight: 400 }}>/100</span>
              </div>
              <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>Total score</div>
            </div>
            <div style={{ fontSize: 64, lineHeight: 1 }} title={result.direction}>
              {ARROWS[result.direction]}
            </div>
            <div style={{ fontSize: 12, color: "#666" }}>{result.direction}</div>
          </div>

          <div style={{ marginTop: 16, fontSize: 13, color: "#333" }}>
            <div>Subject placement: {result.subject_placement_score}/40</div>
            <div>Negative space: {result.negative_space_score}/30</div>
            <div>Framing: {result.framing_score}/30</div>
          </div>

          <div
            style={{
              marginTop: 16,
              padding: 12,
              background: "#f7f7f7",
              borderRadius: 6,
              fontSize: 14,
              lineHeight: 1.5,
            }}
          >
            {result.feedback}
          </div>
        </div>
      )}
    </div>
  );
}
