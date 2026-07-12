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
        <h2>오늘 주행</h2>
        <p>{error}</p>
      </section>
    );
  }

  if (!drivingData) {
    return (
      <section className="today-driving-card">
        <h2>오늘 주행</h2>
        <p>주행 기록 확인 중...</p>
      </section>
    );
  }

  if (drivingData.isDriving) {
    return (
      <section className="today-driving-card driving">
        <div className="today-driving-title">
          <span>🚗 Driving...</span>
          <strong>운행 중</strong>
        </div>

        <div className="today-driving-grid">
          <div>
            <span>현재 거리</span>
            <strong>
              {drivingData.currentDistanceKm?.toFixed(1) ?? "0.0"} km
            </strong>
          </div>

          <div>
            <span>운행 시간</span>
            <strong>
              {formatDuration(drivingData.currentDurationSec)}
            </strong>
          </div>

          <div>
            <span>평균 속도</span>
            <strong>
              {drivingData.currentAvgSpeedKmh?.toFixed(1) ?? "0.0"} km/h
            </strong>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="today-driving-card">
      <div className="today-driving-title">
        <span>오늘 주행</span>
        <strong>{drivingData.tripCount ?? 0}회</strong>
      </div>

      {drivingData.tripCount > 0 ? (
        <div className="today-driving-grid">
          <div>
            <span>주행거리</span>
            <strong>
              {drivingData.totalDistanceKm?.toFixed(1) ?? "0.0"} km
            </strong>
          </div>

          <div>
            <span>운행 시간</span>
            <strong>
              {formatDuration(drivingData.totalDurationSec)}
            </strong>
          </div>

          <div>
            <span>평균 속도</span>
            <strong>
              {drivingData.avgSpeedKmh?.toFixed(1) ?? "0.0"} km/h
            </strong>
          </div>

          <div>
            <span>배터리 사용</span>
            <strong>
              {drivingData.totalBatteryUsed ?? 0}%
            </strong>
          </div>
        </div>
      ) : (
        <p className="today-driving-empty">
          아직 오늘 주행 기록이 없습니다.
        </p>
      )}
    </section>
  );
}