import { useEffect, useState } from "react";

function stars(score) {
  if (score >= 95) return "★★★★★";
  if (score >= 90) return "★★★★☆";
  if (score >= 80) return "★★★☆☆";
  if (score >= 70) return "★★☆☆☆";
  return "★☆☆☆☆";
}

export default function DrivingScoreCard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const res = await fetch("/api/today-score", {
        credentials: "include",
        cache: "no-store",
      });

      const json = await res.json();

      if (json.ok) {
        setData(json);
      }
    } catch {}
  }

  if (!data?.hasData) {
    return (
      <section className="driving-score-card">
        <span className="score-title">
          TODAY'S AI SCORE
        </span>

        <h2>AI 운전 분석</h2>

        <p className="score-empty">
          오늘 운행이 끝나면 AI가 점수를 계산합니다.
        </p>
      </section>
    );
  }

  return (
    <section className="driving-score-card">

      <span className="score-title">
        TODAY'S AI SCORE
      </span>

      <h2>AI 운전 분석</h2>

      <div className="score-main">

        <div className="score-stars">
          {stars(data.score)}
        </div>

        <div className="score-number">
          {data.score}
          <small>점</small>
        </div>

      </div>

      <div className="score-badge">

        <span>
          {data.badge.emoji}
        </span>

        <strong>
          {data.badge.name}
        </strong>

      </div>

      <p className="score-comment">
        {data.comment}
      </p>

    </section>
  );
}