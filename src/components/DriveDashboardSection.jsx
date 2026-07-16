import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  FiActivity,
  FiAward,
  FiBatteryCharging,
  FiChevronRight,
  FiClock,
  FiInfo,
  FiMap,
  FiTrendingUp,
  FiX,
} from "react-icons/fi";

import TodayDrivingCard from "./TodayDrivingCard";

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

function formatNumber(value, digits = 1) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "-";
  }

  return number.toFixed(digits);
}

function DriveModal({
  title,
  subtitle,
  children,
  onClose,
}) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow =
      "hidden";

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [onClose]);

  return (
    <div
      className="drive-modal-backdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className="drive-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <div className="drive-modal-handle" />

        <header className="drive-modal-header">
          <div>
            <span>{subtitle}</span>
            <h2>{title}</h2>
          </div>

          <button
            type="button"
            aria-label="닫기"
            onClick={onClose}
          >
            <FiX />
          </button>
        </header>

        <div className="drive-modal-content">
          {children}
        </div>
      </section>
    </div>
  );
}

export default function DriveDashboardSection() {
  const [activeModal, setActiveModal] =
    useState(null);

  const [drivingData, setDrivingData] =
    useState(null);

  const [scoreData, setScoreData] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const loadDetails = useCallback(
    async () => {
      setLoading(true);
      setError("");

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

        const [
          drivingJson,
          scoreJson,
        ] = await Promise.all([
          drivingResponse.json(),
          scoreResponse.json(),
        ]);

        if (
          !drivingResponse.ok ||
          !drivingJson.ok
        ) {
          throw new Error(
            drivingJson.error ||
              "오늘 주행 정보를 불러오지 못했습니다."
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
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "상세 정보를 불러오지 못했습니다."
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (activeModal === "detail") {
      loadDetails();
    }
  }, [activeModal, loadDetails]);

  const summary =
    scoreData?.summary || {};

  const totalDistanceKm =
    summary.totalDistanceKm ??
    drivingData?.totalDistanceKm ??
    0;

  const totalDurationSec =
    summary.totalDurationSec ??
    drivingData?.totalDurationSec ??
    0;

  const avgSpeedKmh =
    summary.avgSpeedKmh ??
    drivingData?.avgSpeedKmh ??
    0;

  const tripCount =
    summary.tripCount ??
    drivingData?.tripCount ??
    0;

  const batteryEfficiency =
    summary.batteryEfficiency ?? 0;

  const totalBatteryUsed =
    summary.totalBatteryUsed ?? 0;

useEffect(() => {
  function handleOpenDriveDetail() {
    setActiveModal("detail");
  }

  window.addEventListener(
    "cvolt:open-drive-detail",
    handleOpenDriveDetail
  );

  return () => {
    window.removeEventListener(
      "cvolt:open-drive-detail",
      handleOpenDriveDetail
    );
  };
}, []);

  return (
    <>
      <section className="dashboard-section dashboard-drive">
        <div className="dashboard-section-heading">
          <div>
            <h2 className="dashboard-card-title">
              오늘의 드라이브

              <button
                type="button"
                className="dashboard-info-button"
                aria-label="오늘의 드라이브 안내"
                onClick={() =>
                  setActiveModal("info")
                }
              >
                <FiInfo />
              </button>
            </h2>
          </div>

          <button
            type="button"
            className="dashboard-detail-button"
            onClick={() =>
              setActiveModal("detail")
            }
          >
            상세 보기
            <FiChevronRight />
          </button>
        </div>

        <TodayDrivingCard />
      </section>

      {activeModal === "info" && (
        <DriveModal
          title="오늘의 드라이브"
          subtitle="HOW IT WORKS"
          onClose={() =>
            setActiveModal(null)
          }
        >
          <div className="drive-info-intro">
            <div>
              <FiActivity />
            </div>

            <p>
              오늘 완료된 Tesla 주행 기록을
              바탕으로 거리, 시간, 평균속도와
              배터리 효율을 분석합니다.
            </p>
          </div>

          <div className="drive-info-list">
            <div>
              <FiMap />

              <section>
                <strong>주행 거리</strong>
                <span>
                  오늘 완료된 모든 운행의
                  거리를 합산합니다.
                </span>
              </section>
            </div>

            <div>
              <FiBatteryCharging />

              <section>
                <strong>배터리 효율</strong>
                <span>
                  주행 거리 ÷ 사용한 배터리
                  퍼센트로 계산합니다.
                </span>
              </section>
            </div>

            <div>
              <FiTrendingUp />

              <section>
                <strong>AI 운전 점수</strong>
                <span>
                  거리, 시간, 평균속도와 효율을
                  종합해 보수적으로 계산합니다.
                </span>
              </section>
            </div>

            <div>
              <FiAward />

              <section>
                <strong>등급과 배지</strong>
                <span>
                  주행 특성에 따라 등급과
                  운전자 배지가 부여됩니다.
                </span>
              </section>
            </div>
          </div>

          <div className="drive-info-notice">
            현재 점수는 Tesla Fleet API에서
            확인 가능한 주행 데이터를 활용한
            추정 점수입니다. 추후 Telemetry가
            연결되면 급가속, 급감속, 코너링과
            회생제동까지 반영됩니다.
          </div>
        </DriveModal>
      )}

      {activeModal === "detail" && (
        <DriveModal
          title="오늘 주행 상세"
          subtitle="TODAY'S REPORT"
          onClose={() =>
            setActiveModal(null)
          }
        >
          {loading && (
            <div className="drive-detail-loading">
              오늘 주행 데이터를 분석하는 중...
            </div>
          )}

          {!loading && error && (
            <div className="drive-detail-error">
              <span>{error}</span>

              <button
                type="button"
                onClick={loadDetails}
              >
                다시 불러오기
              </button>
            </div>
          )}

          {!loading &&
            !error &&
            tripCount === 0 && (
              <div className="drive-detail-empty">
                <FiActivity />

                <strong>
                  오늘 완료된 운행이 없어요
                </strong>

                <span>
                  운행이 종료되면 상세 리포트가
                  자동으로 생성됩니다.
                </span>
              </div>
            )}

          {!loading &&
            !error &&
            tripCount > 0 && (
              <>
                <div className="drive-detail-score">
                  <div
                    className="drive-detail-score-ring"
                    style={{
                      "--detail-score":
                        `${
                          Number(
                            scoreData?.score
                          ) || 0
                        }%`,
                    }}
                  >
                    <div>
                      <strong>
                        {scoreData?.score ?? "-"}
                      </strong>
                      <span>점</span>
                    </div>
                  </div>

                  <section>
                    <span>오늘의 등급</span>

                    <strong>
                      {scoreData?.grade || "-"}
                    </strong>

                    <p>
                      {scoreData?.badge?.emoji}
                      {" "}
                      {scoreData?.badge?.name ||
                        "Daily Driver"}
                    </p>
                  </section>
                </div>

                <div className="drive-detail-grid">
                  <div>
                    <FiMap />
                    <span>총 주행 거리</span>

                    <strong>
                      {formatNumber(
                        totalDistanceKm
                      )}
                      <small>km</small>
                    </strong>
                  </div>

                  <div>
                    <FiClock />
                    <span>총 운행 시간</span>

                    <strong>
                      {formatDuration(
                        totalDurationSec
                      )}
                    </strong>
                  </div>

                  <div>
                    <FiActivity />
                    <span>운행 횟수</span>

                    <strong>
                      {tripCount}
                      <small>회</small>
                    </strong>
                  </div>

                  <div>
                    <FiTrendingUp />
                    <span>평균 속도</span>

                    <strong>
                      {formatNumber(
                        avgSpeedKmh
                      )}
                      <small>km/h</small>
                    </strong>
                  </div>

                  <div>
                    <FiBatteryCharging />
                    <span>배터리 사용</span>

                    <strong>
                      {formatNumber(
                        totalBatteryUsed
                      )}
                      <small>%</small>
                    </strong>
                  </div>

                  <div>
                    <FiAward />
                    <span>배터리 효율</span>

                    <strong>
                      {formatNumber(
                        batteryEfficiency
                      )}
                      <small>km/%</small>
                    </strong>
                  </div>
                </div>

                {scoreData?.comment && (
                  <div className="drive-detail-comment">
                    <span>AI</span>

                    <p>
                      {scoreData.comment}
                    </p>
                  </div>
                )}

                {scoreData?.factors?.length >
                  0 && (
                  <div className="drive-detail-factors">
                    <h3>점수 분석</h3>

                    {scoreData.factors.map(
                      (factor, index) => (
                        <div
                          key={`${factor.label}-${index}`}
                        >
                          <span>
                            {factor.label}
                          </span>

                          <strong
                            className={
                              factor.value > 0
                                ? "positive"
                                : factor.value < 0
                                  ? "negative"
                                  : ""
                            }
                          >
                            {factor.value > 0
                              ? `+${factor.value}`
                              : factor.value}
                          </strong>
                        </div>
                      )
                    )}
                  </div>
                )}
              </>
            )}
        </DriveModal>
      )}
    </>
  );
}