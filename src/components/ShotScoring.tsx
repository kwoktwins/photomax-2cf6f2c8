import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { scoreShot, type ShotScore } from "@/lib/score.functions";
import type { TargetProfile } from "@/lib/analyze.functions";

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

const ARROWS: Record<ShotScore["direction"], string> = {
  pan_left: "←",
  pan_right: "→",
  pan_up: "↑",
  pan_down: "↓",
  zoom_in: "＋",
  zoom_out: "－",
  no_change: "✓",
};

type Props = {
  target: TargetProfile;
  onScored?: (score: ShotScore) => void;
};

export function ShotScoring({ target, onScored }: Props) {
  const score = useServerFn(scoreShot);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<ShotScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileKey, setFileKey] = useState(0);

  const handleFile = (f: File | null) => {
    setFile(f);
    setPreviewUrl(f ? URL.createObjectURL(f) : null);
  };

  const resetForNext = () => {
    setFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    setFileKey((k) => k + 1);
  };

  const onScore = async () => {
    setError(null);
    setResult(null);
    if (!file) {
      setError("Upload a shot to score.");
      return;
    }
    setLoading(true);
    try {
      const img = await fileToBase64(file);
      const r = await score({ data: { ...img, target } });
      setResult(r);
      onScored?.(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: 22, marginBottom: 4 }}>Shot Scoring</h2>
      <p style={{ color: "#666", marginTop: 0, marginBottom: 24 }}>
        Upload your shot to score it against the locked target profile.
      </p>

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
          key={fileKey}
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

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button
          onClick={onScore}
          disabled={loading}
          style={{
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
        {result && (
          <button
            onClick={resetForNext}
            style={{
              padding: "10px 20px",
              fontSize: 15,
              borderRadius: 6,
              border: "1px solid #ccc",
              background: "white",
              cursor: "pointer",
            }}
          >
            Try another shot
          </button>
        )}
      </div>

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
            <div>Subject placement: {result.subject_placement_score}/30</div>
            <div>Negative space: {result.negative_space_score}/25</div>
            <div>Framing: {result.framing_score}/25</div>
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
