import { useCallback, useEffect, useState } from "react";

function formatDuration(seconds) {
  if (!seconds) return "0분";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}시간 ${minutes}분`;
  }

  return `${minutes}분`;
}

export default function TodayDrivingCard() {
  const [drivingData, setDrivingData] = useState(null);
  const [error, setError] = useState("");

  const loadDrivingData = useCallback(async () => {
    try {
      const response = await fetch("/api/today-driving", {
        credentials: "include",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(
          data.error || "오늘 주행 기록을 불러오지 못했습니다."
        );
      }

      setDrivingData(data);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "오늘 주행 기록을 불러오지 못했습니다."
      );
    }
  }, []);

  useEffect(() => {
    loadDrivingData();

    const intervalId = window.setInterval(() => {
      loadDrivingData();
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadDrivingData]);

  if (error) {
    return (
      <section className="today-driving-card">
        <div className="today-driving-header">
          <h2>오늘 주행</h2>
        </div>

        <p className="today-driving-empty">{error}</p>
      </section>
    );
  }

  if (!drivingData) {
    return (
      <section className="today-driving-card">
        <div className="today-driving-header">
          <h2>오늘 주행</h2>
        </div>

        <p className="today-driving-empty">
          주행 기록 확인 중...
        </p>
      </section>
    );
  }

  if (drivingData.isDriving) {
    return (
      <section className="today-driving-card driving">
        <div className="today-driving-header">
          <div>
            <span className="today-driving-eyebrow">
              REAL-TIME DRIVING
            </span>

            <h2>
              <span className="live-dot" />
              Driving...
            </h2>
          </div>

          <span className="today-trip-badge live">
            LIVE
          </span>
        </div>

        <div className="today-driving-main">
          <span>현재 주행거리</span>

          <strong>
            {drivingData.currentDistanceKm?.toFixed(1) ?? "0.0"}
            <small>km</small>
          </strong>
        </div>

        <div className="today-driving-grid">
          <div className="today-driving-stat">
            <span>운행 시간</span>
            <strong>
              {formatDuration(
                drivingData.currentDurationSec
              )}
            </strong>
          </div>

          <div className="today-driving-stat">
            <span>평균 속도</span>
            <strong>
              {drivingData.currentAvgSpeedKmh?.toFixed(1) ??
                "0.0"}
              <small>km/h</small>
            </strong>
          </div>

          <div className="today-driving-stat">
            <span>완료 운행</span>
            <strong>
              {drivingData.tripCount ?? 0}
              <small>회</small>
            </strong>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="today-driving-card">
      <div className="today-driving-header">
        <div>
          <span className="today-driving-eyebrow">
            TODAY&apos;S DRIVE
          </span>

          <h2>오늘 주행</h2>
        </div>

        <span className="today-trip-badge">
          {drivingData.tripCount ?? 0}회
        </span>
      </div>

      {drivingData.tripCount > 0 ? (
        <>
          <div className="today-driving-main">
            <span>총 주행거리</span>

            <strong>
              {drivingData.totalDistanceKm?.toFixed(1) ?? "0.0"}
              <small>km</small>
            </strong>
          </div>

          <div className="today-driving-grid">
            <div className="today-driving-stat">
              <span>운행 시간</span>
              <strong>
                {formatDuration(
                  drivingData.totalDurationSec
                )}
              </strong>
            </div>

            <div className="today-driving-stat">
              <span>평균 속도</span>
              <strong>
                {drivingData.avgSpeedKmh?.toFixed(1) ??
                  "0.0"}
                <small>km/h</small>
              </strong>
            </div>

            <div className="today-driving-stat">
              <span>배터리 사용</span>
              <strong>
                {drivingData.totalBatteryUsed ?? 0}
                <small>%</small>
              </strong>
            </div>
          </div>
        </>
      ) : (
        <div className="today-driving-empty-state">
          <div className="today-driving-empty-icon">↗</div>

          <strong>아직 오늘 주행 기록이 없습니다</strong>

          <span>
            운행을 시작하면 실시간 기록이 표시됩니다.
          </span>
        </div>
      )}
    </section>
  );
}