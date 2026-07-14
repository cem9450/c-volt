import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { FiChevronRight } from "react-icons/fi";

function makeBriefing(drivingData, scoreData) {
  const hasDrive =
    drivingData?.tripCount > 0 ||
    drivingData?.isDriving === true;

  if (!hasDrive) {
    return {
      line1: "오늘은 아직 주행 기록이 없습니다.",
      line2: "운행을 시작하면 AI가 자동으로 분석해드릴게요.",
    };
  }

  if (drivingData?.isDriving) {
    return {
      line1: "현재 주행 데이터를 실시간으로 분석하고 있어요.",
      line2: "운행이 끝나면 점수와 개선 포인트를 알려드릴게요.",
    };
  }

  if (scoreData?.hasData) {
    const score = scoreData.score ?? 0;
    const efficiency =
      scoreData.summary?.batteryEfficiency ?? 0;

    if (score >= 90) {
      return {
        line1: `오늘 운전 점수는 ${score}점으로 아주 좋았어요.`,
        line2:
          efficiency > 0
            ? `배터리 효율은 ${efficiency.toFixed(
                1
              )}km/%를 기록했습니다.`
            : scoreData.comment,
      };
    }

    return {
      line1: `오늘 운전 점수는 ${score}점입니다.`,
      line2:
        scoreData.comment ||
        "다음 주행에서는 더 좋은 기록을 기대할 수 있어요.",
    };
  }

  return {
    line1: "오늘의 주행 기록을 분석하고 있습니다.",
    line2: "잠시 후 AI 브리핑이 업데이트됩니다.",
  };
}

export default function AIBriefingCard() {
  const [drivingData, setDrivingData] =
    useState(null);

  const [scoreData, setScoreData] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const loadBriefing = useCallback(async () => {
    try {
      const [drivingResponse, scoreResponse] =
        await Promise.all([
          fetch("/api/today-driving", {
            credentials: "include",
            cache: "no-store",
          }),
          fetch("/api/today-score", {
            credentials: "include",
            cache: "no-store",
          }),
        ]);

      const [drivingJson, scoreJson] =
        await Promise.all([
          drivingResponse.json(),
          scoreResponse.json(),
        ]);

      if (
        drivingResponse.ok &&
        drivingJson.ok
      ) {
        setDrivingData(drivingJson);
      }

      if (
        scoreResponse.ok &&
        scoreJson.ok
      ) {
        setScoreData(scoreJson);
      }
    } catch (error) {
      console.error(
        "AI 브리핑 불러오기 실패:",
        error
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBriefing();

    const timer = window.setInterval(
      loadBriefing,
      30000
    );

    return () => {
      window.clearInterval(timer);
    };
  }, [loadBriefing]);

  const briefing = loading
    ? {
        line1:
          "오늘의 주행 데이터를 불러오고 있습니다.",
        line2:
          "잠시만 기다려주세요.",
      }
    : makeBriefing(
        drivingData,
        scoreData
      );

  return (
    <div className="ai-reference-card">
      <div className="ai-reference-header">
        <h2>AI 브리핑</h2>

        <button type="button">
          모두 보기
          <FiChevronRight />
        </button>
      </div>

      <div className="ai-reference-content">
        <div className="ai-reference-gem">
          <div className="ai-reference-gem-core" />
          <span className="ai-reference-spark one" />
          <span className="ai-reference-spark two" />
        </div>

        <p>
          {briefing.line1}
          <br />
          {briefing.line2}
        </p>
      </div>
    </div>
  );
}