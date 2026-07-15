import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

function formatDuration(seconds) {
  if (!seconds) return "0분";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(
    (seconds % 3600) / 60
  );

  if (hours > 0) {
    return `${hours}시간 ${minutes}분`;
  }

  return `${minutes}분`;
}

function getScoreMessage(score) {
  if (score >= 95) return "최고의 주행";
  if (score >= 90) return "아주 훌륭해요";
  if (score >= 85) return "매우 안정적";
  if (score >= 80) return "좋은 주행";
  if (score >= 75) return "양호한 주행";

  return "개선 가능";
}

function getGaugeDegrees(score) {
  const safeScore = Math.min(
    Math.max(Number(score) || 0, 0),
    100
  );

  return `${safeScore * 3.6}deg`;
}

export default function TodayDrivingCard() {
  const [drivingData, setDrivingData] =
    useState(null);

  const [scoreData, setScoreData] =
    useState(null);

  const [animatedScore, setAnimatedScore] =
    useState(0);

  const [error, setError] = useState("");
  const [loading, setLoading] =
    useState(true);

  const loadDashboardData =
    useCallback(async () => {
      try {
        const [
          drivingResponse,
          scoreResponse,
        ] = await Promise.all([
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
          !drivingResponse.ok ||
          !drivingJson.ok
        ) {
          throw new Error(
            drivingJson.error ||
              "오늘 주행 기록을 불러오지 못했습니다."
          );
        }

        setDrivingData(drivingJson);

        if (
          scoreResponse.ok &&
          scoreJson.ok
        ) {
          setScoreData(scoreJson);
        } else {
          setScoreData(null);
        }

        setError("");
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "오늘의 드라이브 정보를 불러오지 못했습니다."
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    loadDashboardData();

    const intervalId = window.setInterval(
      loadDashboardData,
      30000
    );

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadDashboardData]);

  useEffect(() => {
    if (!scoreData?.hasData) {
      setAnimatedScore(0);
      return;
    }

    setAnimatedScore(0);

    const animationTimer =
      window.setTimeout(() => {
        setAnimatedScore(
          Number(scoreData.score) || 0
        );
      }, 120);

    return () => {
      window.clearTimeout(animationTimer);
    };
  }, [scoreData]);

  const displayData = useMemo(() => {
    const isDriving =
      drivingData?.isDriving === true;

    const distanceKm = isDriving
      ? drivingData?.currentDistanceKm ?? 0
      : drivingData?.totalDistanceKm ?? 0;

    const durationSec = isDriving
      ? drivingData?.currentDurationSec ?? 0
      : drivingData?.totalDurationSec ?? 0;

    const avgSpeedKmh = isDriving
      ? drivingData?.currentAvgSpeedKmh ?? 0
      : drivingData?.avgSpeedKmh ?? 0;

    const score =
      scoreData?.hasData === true
        ? scoreData.score ?? 0
        : 0;

    const efficiency =
      scoreData?.hasData === true
        ? scoreData.summary
            ?.batteryEfficiency ?? 0
        : 0;

    return {
      isDriving,
      distanceKm,
      durationSec,
      avgSpeedKmh,
      score,
      efficiency,
      tripCount:
        drivingData?.tripCount ?? 0,
    };
  }, [drivingData, scoreData]);

  if (loading && !drivingData) {
    return (
      <div className="reference-drive-loading">
        오늘의 주행 데이터를 불러오는 중...
      </div>
    );
  }

  if (error && !drivingData) {
    return (
      <div className="reference-drive-loading">
        <span>{error}</span>

        <button
          type="button"
          onClick={loadDashboardData}
        >
          다시 불러오기
        </button>
      </div>
    );
  }

  const hasCompletedDrive =
    displayData.tripCount > 0;

  const hasAnyDrive =
    hasCompletedDrive ||
    displayData.isDriving;

  const hasScore =
    scoreData?.hasData === true;

  return (
    <div className="reference-drive-dashboard">
      <div className="reference-drive-metric">
        <span>
          {displayData.isDriving
            ? "현재 주행 거리"
            : "주행 거리"}
        </span>

        <strong>
          {displayData.distanceKm.toFixed(1)}
          <small>km</small>
        </strong>

        <p>
          {displayData.isDriving
            ? "실시간 운행 중"
            : hasCompletedDrive
              ? `${displayData.tripCount}회 운행`
              : "오늘 기록 없음"}
        </p>
      </div>

      <div className="reference-score-area">
        <span>AI 운전 점수</span>

        <div
          className={
            hasScore
              ? "reference-score-gauge has-score"
              : "reference-score-gauge"
          }
          style={{
            "--score-angle":
              getGaugeDegrees(
                animatedScore
              ),
          }}
        >
          <div className="reference-score-gauge-inner">
            <strong>
              {hasScore
                ? displayData.score
                : "-"}
            </strong>

            <div className="reference-score-meta">
              <small>점</small>

              {hasScore && (
                <em>
                  {scoreData.grade}
                </em>
              )}
            </div>
          </div>
        </div>

        <p
          className={
            displayData.isDriving
              ? "reference-score-message live"
              : "reference-score-message"
          }
        >
          {displayData.isDriving
            ? "Driving..."
            : hasScore
              ? getScoreMessage(
                  displayData.score
                )
              : "운행 후 계산"}
        </p>

        {hasScore && (
          <span className="reference-score-badge">
            {scoreData.badge?.emoji}
            {" "}
            {scoreData.badge?.name}
          </span>
        )}
      </div>

      <div className="reference-drive-metric right">
        <span>배터리 효율</span>

        <strong>
          {hasScore
            ? displayData.efficiency.toFixed(1)
            : "-"}
          <small>km/%</small>
        </strong>

        <p>
          {hasAnyDrive
            ? formatDuration(
                displayData.durationSec
              )
            : "주행 대기 중"}
        </p>
      </div>

      {hasScore && scoreData.comment && (
        <div className="reference-score-comment">
          <span>AI</span>

          <p>{scoreData.comment}</p>
        </div>
      )}

      <div className="reference-drive-mobile-summary">
        <div>
          <span>평균 속도</span>

          <strong>
            {displayData.avgSpeedKmh.toFixed(1)}
            <small>km/h</small>
          </strong>
        </div>

        <div>
          <span>운행 시간</span>

          <strong>
            {formatDuration(
              displayData.durationSec
            )}
          </strong>
        </div>
      </div>
    </div>
  );
}