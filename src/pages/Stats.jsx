import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FiActivity,
  FiAward,
  FiBatteryCharging,
  FiClock,
  FiRefreshCw,
  FiTrendingUp,
} from "react-icons/fi";

function formatDuration(seconds) {
  const safeSeconds =
    Number(seconds) || 0;

  const hours = Math.floor(
    safeSeconds / 3600
  );

  const minutes = Math.floor(
    (safeSeconds % 3600) / 60
  );

  if (hours > 0) {
    return `${hours}시간 ${minutes}분`;
  }

  return `${minutes}분`;
}

function createLinePoints(
  values,
  width,
  height,
  padding
) {
  const safeValues =
    values.map((value) =>
      Number(value) || 0
    );

  const maximum =
    Math.max(...safeValues, 1);

  return safeValues.map(
    (value, index) => {
      const x =
        padding +
        (
          index /
          Math.max(
            safeValues.length - 1,
            1
          )
        ) *
          (width - padding * 2);

      const y =
        height -
        padding -
        (value / maximum) *
          (height - padding * 2);

      return {
        x,
        y,
        value,
      };
    }
  );
}

function StatsLineChart({
  values,
  labels,
  unit,
  emptyText,
}) {
  const width = 320;
  const height = 145;
  const padding = 18;

  const points = useMemo(
    () =>
      createLinePoints(
        values,
        width,
        height,
        padding
      ),
    [values]
  );

  const hasData =
    values.some(
      (value) =>
        Number(value) > 0
    );

  const polylinePoints =
    points
      .map(
        (point) =>
          `${point.x},${point.y}`
      )
      .join(" ");

  const areaPoints = [
    `${points[0]?.x ?? padding},${
      height - padding
    }`,

    ...points.map(
      (point) =>
        `${point.x},${point.y}`
    ),

    `${
      points[
        points.length - 1
      ]?.x ??
      width - padding
    },${height - padding}`,
  ].join(" ");

  return (
    <div className="stats-chart">
      {hasData ? (
        <>
          <svg
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label="최근 7일 통계 그래프"
          >
            <defs>
              <linearGradient
                id={`statsFill-${unit}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor="#b14cff"
                  stopOpacity="0.32"
                />

                <stop
                  offset="100%"
                  stopColor="#b14cff"
                  stopOpacity="0"
                />
              </linearGradient>
            </defs>

            <line
              x1={padding}
              y1={height - padding}
              x2={width - padding}
              y2={height - padding}
              className="stats-chart-axis"
            />

            <polygon
              points={areaPoints}
              fill={`url(#statsFill-${unit})`}
            />

            <polyline
              points={polylinePoints}
              className="stats-chart-line"
            />

            {points.map(
              (point, index) => (
                <g
                  key={`${labels[index]}-${index}`}
                >
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="4"
                    className="stats-chart-dot"
                  />

                  {point.value > 0 && (
                    <text
                      x={point.x}
                      y={Math.max(
                        point.y - 10,
                        12
                      )}
                      textAnchor="middle"
                      className="stats-chart-value"
                    >
                      {point.value}
                    </text>
                  )}
                </g>
              )
            )}
          </svg>

          <div className="stats-chart-labels">
            {labels.map(
              (label, index) => (
                <span
                  key={`${label}-${index}`}
                >
                  {label}
                </span>
              )
            )}
          </div>
        </>
      ) : (
        <div className="stats-chart-empty">
          {emptyText}
        </div>
      )}
    </div>
  );
}

export default function Stats() {
  const [data, setData] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const loadStats =
    useCallback(async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          "/api/driving-stats",
          {
            credentials: "include",
            cache: "no-store",
          }
        );

        const json =
          await response.json();

        if (
          !response.ok ||
          !json.ok
        ) {
          throw new Error(
            json.error ||
              "통계를 불러오지 못했습니다."
          );
        }

        setData(json);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "통계를 불러오지 못했습니다."
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  if (loading && !data) {
    return (
      <main className="stats-page">
        <div className="stats-loading">
          최근 주행 통계를 분석하는 중...
        </div>
      </main>
    );
  }

  if (error && !data) {
    return (
      <main className="stats-page">
        <div className="stats-error">
          <span>{error}</span>

          <button
            type="button"
            onClick={loadStats}
          >
            다시 불러오기
          </button>
        </div>
      </main>
    );
  }

  const days =
    data?.days || [];

  const summary =
    data?.summary || {};

  const labels =
    days.map((day) => day.label);

  const distanceValues =
    days.map(
      (day) =>
        day.distanceKm || 0
    );

  const scoreValues =
    days.map(
      (day) =>
        day.score || 0
    );

  return (
    <main className="stats-page">
      <header className="stats-header">
        <div>
          <span>STATISTICS</span>
          <h1>주행 통계</h1>
          <p>
            최근 7일간의 주행 데이터를
            분석했어요.
          </p>
        </div>

        <button
          type="button"
          onClick={loadStats}
          disabled={loading}
          aria-label="통계 새로고침"
        >
          <FiRefreshCw
            className={
              loading
                ? "stats-spin"
                : ""
            }
          />
        </button>
      </header>

      <section className="stats-hero-card">
        <div>
          <span>최근 7일 주행 거리</span>

          <strong>
            {Number(
              summary.totalDistanceKm ||
                0
            ).toFixed(1)}
            <small>km</small>
          </strong>

          <p>
            총{" "}
            {summary.totalTripCount || 0}
            회 운행
          </p>
        </div>

        <div className="stats-score-ring">
          <strong>
            {summary.averageScore || "-"}
          </strong>

          <span>평균 점수</span>
        </div>
      </section>

      <section className="stats-summary-grid">
        <div>
          <FiClock />
          <span>총 운행시간</span>

          <strong>
            {formatDuration(
              summary.totalDurationSec
            )}
          </strong>
        </div>

        <div>
          <FiActivity />
          <span>운행 횟수</span>

          <strong>
            {summary.totalTripCount || 0}
            <small>회</small>
          </strong>
        </div>

        <div>
          <FiBatteryCharging />
          <span>평균 효율</span>

          <strong>
            {summary.averageEfficiency ||
              "-"}
            <small>km/%</small>
          </strong>
        </div>

        <div>
          <FiAward />
          <span>최고 효율</span>

          <strong>
            {summary.bestEfficiency ||
              "-"}
            <small>km/%</small>
          </strong>
        </div>
      </section>

      <section className="stats-chart-card">
        <div className="stats-card-heading">
          <div>
            <span>DISTANCE</span>
            <h2>주행거리</h2>
          </div>

          <FiTrendingUp />
        </div>

        <StatsLineChart
          values={distanceValues}
          labels={labels}
          unit="distance"
          emptyText="운행을 완료하면 주행거리 그래프가 표시돼요."
        />
      </section>

      <section className="stats-chart-card">
        <div className="stats-card-heading">
          <div>
            <span>AI SCORE</span>
            <h2>운전 점수</h2>
          </div>

          <FiAward />
        </div>

        <StatsLineChart
          values={scoreValues}
          labels={labels}
          unit="score"
          emptyText="점수가 계산되면 최근 7일 변화가 표시돼요."
        />
      </section>

      <div className="stats-notice">
        현재 통계 점수는 거리, 운행 시간,
        평균속도와 배터리 사용량을 기준으로
        계산됩니다.
      </div>
    </main>
  );
}