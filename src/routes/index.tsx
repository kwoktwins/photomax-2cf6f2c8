import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { InspirationIntake } from "@/components/InspirationIntake";
import { ShotScoring } from "@/components/ShotScoring";
import type { TargetProfile } from "@/lib/analyze.functions";
import type { ShotScore } from "@/lib/score.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Photomax — Inspiration to Shot" },
      {
        name: "description",
        content:
          "Analyze an inspiration photo, then score your own shots against it and track your progress.",
      },
    ],
  }),
  component: Flow,
});

type Attempt = { attempt: number; total_score: number };

function Flow() {
  const [profile, setProfile] = useState<TargetProfile | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const scoringRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (profile && scoringRef.current) {
      scoringRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [profile]);

  const handleScored = (s: ShotScore) => {
    setAttempts((prev) => [
      ...prev,
      { attempt: prev.length + 1, total_score: s.total_score },
    ]);
  };

  const max = 100;
  const width = 480;
  const height = 120;
  const pad = 24;

  return (
    <div
      style={{
        maxWidth: 640,
        margin: "40px auto",
        padding: "0 20px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <InspirationIntake profile={profile} onProfile={setProfile} />

      {profile && (
        <div ref={scoringRef} style={{ marginTop: 48, paddingTop: 32, borderTop: "1px solid #e5e5e5" }}>
          <ShotScoring target={profile} onScored={handleScored} />

          {attempts.length > 0 && (
            <div
              style={{
                marginTop: 24,
                border: "1px solid #e5e5e5",
                borderRadius: 8,
                padding: 20,
                background: "white",
              }}
            >
              <h3 style={{ fontSize: 16, marginTop: 0, marginBottom: 12 }}>Progress</h3>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", fontSize: 14 }}>
                {attempts.map((a) => (
                  <li key={a.attempt} style={{ padding: "4px 0" }}>
                    Attempt {a.attempt}: <strong>{a.total_score}</strong>
                  </li>
                ))}
              </ul>

              {attempts.length > 1 && (
                <svg
                  width={width}
                  height={height}
                  style={{ marginTop: 16, maxWidth: "100%", display: "block" }}
                >
                  <line
                    x1={pad}
                    y1={height - pad}
                    x2={width - pad}
                    y2={height - pad}
                    stroke="#ccc"
                  />
                  <line x1={pad} y1={pad} x2={pad} y2={height - pad} stroke="#ccc" />
                  <polyline
                    fill="none"
                    stroke="#111"
                    strokeWidth={2}
                    points={attempts
                      .map((a, i) => {
                        const x =
                          pad +
                          (attempts.length === 1
                            ? 0
                            : (i * (width - pad * 2)) / (attempts.length - 1));
                        const y =
                          height - pad - (a.total_score / max) * (height - pad * 2);
                        return `${x},${y}`;
                      })
                      .join(" ")}
                  />
                  {attempts.map((a, i) => {
                    const x =
                      pad +
                      (attempts.length === 1
                        ? 0
                        : (i * (width - pad * 2)) / (attempts.length - 1));
                    const y =
                      height - pad - (a.total_score / max) * (height - pad * 2);
                    return <circle key={a.attempt} cx={x} cy={y} r={3} fill="#111" />;
                  })}
                </svg>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
