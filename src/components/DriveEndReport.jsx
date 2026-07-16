import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  FiActivity,
  FiBatteryCharging,
  FiChevronRight,
  FiClock,
  FiMap,
  FiX,
} from "react-icons/fi";

function formatDuration(seconds) {
  const safeSeconds =
    Number(seconds) || 0;

  if (safeSeconds <= 0) {
    return "0분";
  }

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

function formatNumber(
  value,
  digits = 1
) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "-";
  }

  return number.toFixed(digits);
}

function getScoreMessage(score) {
  const safeScore =
    Number(score) || 0;

  if (safeScore >= 95) {
    return "오늘은 속도와 효율의 균형이 매우 뛰어났어요.";
  }

  if (safeScore >= 90) {
    return "아주 안정적이고 효율적인 주행이었어요.";
  }

  if (safeScore >= 85) {
    return "전체적으로 부드럽고 균형 잡힌 주행이었어요.";
  }

  if (safeScore >= 75) {
    return "좋은 주행이었어요. 다음 운전도 안전하게 이어가세요.";
  }

  return "오늘 운행이 완료됐어요. 일정한 속도를 유지하면 효율을 더 높일 수 있어요.";
}

export default function DriveEndReport({
  onOpenDetail,
}) {
  const [open, setOpen] =
    useState(false);

  const [report, setReport] =
    useState(null);

  const [animatedScore, setAnimatedScore] =
    useState(0);

  const closeReport =
    useCallback(() => {
      setOpen(false);
    }, []);

  useEffect(() => {
    function handleDriveEnded(event) {
      const detail =
        event.detail || {};

      setReport({
        score:
          Number(detail.score) || 0,

        session:
          detail.session || null,
      });

      setAnimatedScore(0);
      setOpen(true);

      window.setTimeout(() => {
        setAnimatedScore(
          Number(detail.score) || 0
        );
      }, 150);
    }

    window.addEventListener(
      "cvolt:drive-ended",
      handleDriveEnded
    );

    return () => {
      window.removeEventListener(
        "cvolt:drive-ended",
        handleDriveEnded
      );
    };
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        closeReport();
      }
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [open, closeReport]);

  if (!open || !report) {
    return null;
  }

  const session =
    report.session || {};

  const score =
    Number(report.score) || 0;

  const distanceKm =
    Number(session.distance_km) || 0;

  const durationSec =
    Number(session.duration_sec) || 0;

  const batteryUsed =
    Number(session.battery_used) || 0;

  const avgSpeedKmh =
    Number(session.avg_speed_kmh) || 0;

  return (
    <div
      className="drive-end-backdrop"
      onMouseDown={closeReport}
    >
      <section
        className="drive-end-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="운행 종료 리포트"
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <div className="drive-end-handle" />

        <header className="drive-end-header">
          <div>
            <span>DRIVE COMPLETE</span>

            <h2>
              오늘 운행이 종료됐어요
            </h2>
          </div>

          <button
            type="button"
            aria-label="닫기"
            onClick={closeReport}
          >
            <FiX />
          </button>
        </header>

        <div className="drive-end-hero">
          <div
            className="drive-end-score-ring"
            style={{
              "--drive-end-score":
                `${animatedScore * 3.6}deg`,
            }}
          >
            <div>
              <strong>
                {score || "-"}
              </strong>

              <small>점</small>
            </div>
          </div>

          <div className="drive-end-copy">
            <span>AI 운전 점수</span>

            <strong>
              {score >= 90
                ? "Excellent Drive"
                : score >= 80
                  ? "Smooth Drive"
                  : "Drive Complete"}
            </strong>

            <p>
              {getScoreMessage(score)}
            </p>
          </div>
        </div>

        <div className="drive-end-summary">
          <div>
            <FiMap />

            <span>주행 거리</span>

            <strong>
              {formatNumber(distanceKm)}
              <small>km</small>
            </strong>
          </div>

          <div>
            <FiClock />

            <span>운행 시간</span>

            <strong>
              {formatDuration(
                durationSec
              )}
            </strong>
          </div>

          <div>
            <FiBatteryCharging />

            <span>배터리 사용</span>

            <strong>
              {formatNumber(
                batteryUsed
              )}
              <small>%</small>
            </strong>
          </div>

          <div>
            <FiActivity />

            <span>평균 속도</span>

            <strong>
              {formatNumber(
                avgSpeedKmh
              )}
              <small>km/h</small>
            </strong>
          </div>
        </div>

        <button
          type="button"
          className="drive-end-detail-button"
          onClick={() => {
            closeReport();
            onOpenDetail?.();
          }}
        >
          상세 리포트 보기
          <FiChevronRight />
        </button>
      </section>
    </div>
  );
}