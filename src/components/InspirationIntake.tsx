import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { analyzeInspiration, type TargetProfile } from "@/lib/analyze.functions";

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

const LABELS: Record<keyof TargetProfile, string> = {
  subject_placement: "Subject Placement",
  negative_space: "Negative Space",
  mood: "Mood",
  framing: "Framing",
  coaching_focus: "Coaching Focus",
};

type Props = {
  profile: TargetProfile | null;
  onProfile: (p: TargetProfile) => void;
};

export function InspirationIntake({ profile, onProfile }: Props) {
  const analyze = useServerFn(analyzeInspiration);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (f: File | null) => {
    setFile(f);
    setPreviewUrl(f ? URL.createObjectURL(f) : null);
  };

  const onAnalyze = async () => {
    setError(null);
    if (!file && !description.trim()) {
      setError("Upload an image or enter a description.");
      return;
    }
    setLoading(true);
    try {
      const input = file
        ? { kind: "image" as const, ...(await fileToBase64(file)) }
        : { kind: "text" as const, description };
      const result = await analyze({ data: input });
      onProfile(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>Inspiration Intake</h1>
      <p style={{ color: "#666", marginTop: 0, marginBottom: 24 }}>
        Upload a reference photo or describe the aesthetic you want to match.
      </p>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) handleFile(f);
        }}
        style={{
          display: "block",
          border: `2px dashed ${dragOver ? "#333" : "#ccc"}`,
          borderRadius: 8,
          padding: 32,
          textAlign: "center",
          cursor: "pointer",
          background: dragOver ? "#f5f5f5" : "#fafafa",
        }}
      >
        <input
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />
        {previewUrl ? (
          <img src={previewUrl} alt="preview" style={{ maxHeight: 200, maxWidth: "100%", borderRadius: 4 }} />
        ) : (
          <div style={{ color: "#666" }}>Drag &amp; drop an image, or click to upload</div>
        )}
      </label>

      <div style={{ marginTop: 16 }}>
        <label style={{ display: "block", fontSize: 14, marginBottom: 6 }}>
          Or describe your aesthetic goal
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="e.g. moody cinematic portrait with soft window light"
          style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ccc", fontFamily: "inherit" }}
        />
      </div>

      <button
        onClick={onAnalyze}
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
        {loading ? "Analyzing…" : "Analyze"}
      </button>

      {error && <div style={{ marginTop: 16, color: "#b00", fontSize: 14 }}>{error}</div>}

      {profile && (
        <div
          style={{
            marginTop: 24,
            border: "1px solid #e5e5e5",
            borderRadius: 8,
            padding: 20,
            background: "white",
          }}
        >
          <h2 style={{ fontSize: 18, marginTop: 0, marginBottom: 12 }}>Target Profile (locked)</h2>
          {(Object.keys(LABELS) as Array<keyof TargetProfile>).map((k) => (
            <div key={k} style={{ display: "flex", padding: "8px 0", borderTop: "1px solid #f0f0f0" }}>
              <div style={{ flex: "0 0 180px", color: "#666", fontSize: 14 }}>{LABELS[k]}</div>
              <div style={{ flex: 1, fontSize: 14 }}>
                {Array.isArray(profile[k]) ? (profile[k] as string[]).join(", ") : (profile[k] as string)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
