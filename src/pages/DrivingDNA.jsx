import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FiActivity,
  FiClock,
  FiCompass,
  FiLock,
  FiTrendingUp,
} from "react-icons/fi";

import { TbDna2 } from "react-icons/tb";

import "./DrivingDNA.css";

const DNA_UNLOCK_DISTANCE_KM = 100;

const DNA_TYPES = [
  {
    id: "smooth",
    icon: FiActivity,
    title: "Smooth Driver",
    description: "부드럽고 안정적인 주행",
  },
  {
    id: "eco",
    icon: FiTrendingUp,
    title: "Eco Driver",
    description: "효율을 우선하는 주행",
  },
  {
    id: "explorer",
    icon: FiCompass,
    title: "Explorer",
    description: "장거리 이동을 즐기는 주행",
  },
  {
    id: "night",
    icon: FiClock,
    title: "Night Owl",
    description: "야간 비중이 높은 주행",
  },
];

function normalizeDistance(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(0, number);
}

function getSessionDistance(session) {
  return normalizeDistance(
    session?.distanceKm ??
      session?.distance_km
  );
}

function getSessionStartedAt(session) {
  return (
    session?.startedAt ??
    session?.started_at ??
    null
  );
}

function formatFirstDriveDate(dateString) {
  if (!dateString) {
    return "-";
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export default function DrivingDNA() {
  const [sessions, setSessions] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const loadDrivingHistory =
    useCallback(async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          "/api/driving-history",
          {
            credentials: "include",
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (
          !response.ok ||
          !data.ok
        ) {
          throw new Error(
            data.error ||
              "주행 기록을 불러오지 못했습니다."
          );
        }

        setSessions(
          Array.isArray(data.sessions)
            ? data.sessions
            : []
        );
      } catch (err) {
        console.error(
          "Driving DNA 주행 기록 조회 실패:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "주행 기록을 불러오지 못했습니다."
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    loadDrivingHistory();
  }, [loadDrivingHistory]);

  useEffect(() => {
    let refreshTimer;

    const handleDriveEnded = () => {
      window.clearTimeout(refreshTimer);

      refreshTimer = window.setTimeout(
        () => {
          loadDrivingHistory();
        },
        1000
      );
    };

    window.addEventListener(
      "cvolt:drive-ended",
      handleDriveEnded
    );

    return () => {
      window.clearTimeout(refreshTimer);

      window.removeEventListener(
        "cvolt:drive-ended",
        handleDriveEnded
      );
    };
  }, [loadDrivingHistory]);

  const drivingData = useMemo(() => {
    const totalDistanceKm =
      sessions.reduce(
        (sum, session) =>
          sum +
          getSessionDistance(session),
        0
      );

    const validStartedDates =
      sessions
        .map(getSessionStartedAt)
        .filter(Boolean)
        .map((dateString) =>
          new Date(dateString).getTime()
        )
        .filter(Number.isFinite);

    const firstDriveAt =
      validStartedDates.length > 0
        ? new Date(
            Math.min(...validStartedDates)
          ).toISOString()
        : null;

    return {
      totalDistanceKm,
      totalDrives: sessions.length,
      firstDriveAt,
    };
  }, [sessions]);

  const progress = useMemo(() => {
    return Math.min(
      100,
      Math.round(
        (drivingData.totalDistanceKm /
          DNA_UNLOCK_DISTANCE_KM) *
          100
      )
    );
  }, [drivingData.totalDistanceKm]);

  const remainingDistance = Math.max(
    0,
    DNA_UNLOCK_DISTANCE_KM -
      drivingData.totalDistanceKm
  );

  const isUnlocked =
    drivingData.totalDistanceKm >=
    DNA_UNLOCK_DISTANCE_KM;

  const firstDriveDate =
    formatFirstDriveDate(
      drivingData.firstDriveAt
    );

  function getStatusText() {
    if (loading && sessions.length === 0) {
      return "SYNCING DATA";
    }

    if (error && sessions.length === 0) {
      return "DATA ERROR";
    }

    if (isUnlocked) {
      return "DNA ANALYSIS READY";
    }

    return "LEARNING";
  }

  function getTitleText() {
    if (loading && sessions.length === 0) {
      return "주행 데이터를 불러오고 있어요";
    }

    if (error && sessions.length === 0) {
      return "주행 데이터를 확인할 수 없어요";
    }

    if (isUnlocked) {
      return "분석 준비 완료";
    }

    return "운전 습관을 학습하고 있어요";
  }

  function getDescriptionText() {
    if (loading && sessions.length === 0) {
      return "완료된 주행 기록을 Driving DNA와 연결하고 있습니다.";
    }

    if (error && sessions.length === 0) {
      return error;
    }

    if (isUnlocked) {
      return `${drivingData.totalDrives}회의 실제 주행 기록을 바탕으로 운전 성향 분석을 시작할 수 있습니다.`;
    }

    if (drivingData.totalDrives === 0) {
      return "첫 운행이 완료되면 Driving DNA 학습이 자동으로 시작됩니다.";
    }

    return `${remainingDistance.toFixed(
      1
    )}km를 더 주행하면 첫 번째 운전 DNA가 공개됩니다.`;
  }

  return (
    <main className="driving-dna-page">
      <header className="driving-dna-header">
        <span className="driving-dna-eyebrow">
          C-VOLT DRIVING PROFILE
        </span>

        <h1>운전 DNA</h1>

        <p>
          실제 주행 데이터를 분석해 나만의
          운전 성향을 발견합니다.
        </p>
      </header>

      <section className="driving-dna-hero">
        <div className="driving-dna-glow" />

        <div className="driving-dna-symbol">
          <TbDna2 />
        </div>

        <span className="driving-dna-status">
          {getStatusText()}
        </span>

        <h2>{getTitleText()}</h2>

        <p>{getDescriptionText()}</p>

        <div className="driving-dna-progress">
          <div className="driving-dna-progress-head">
            <span>분석 진행률</span>

            <strong>
              {loading &&
              sessions.length === 0
                ? "-"
                : `${progress}%`}
            </strong>
          </div>

          <div className="driving-dna-progress-track">
            <span
              style={{
                width: `${progress}%`,
              }}
            />
          </div>

          <div className="driving-dna-progress-foot">
            <span>
              {drivingData.totalDistanceKm.toFixed(
                1
              )}
              km · {drivingData.totalDrives}회
            </span>

            <span>
              {drivingData.firstDriveAt
                ? `첫 운행 ${firstDriveDate}`
                : `${DNA_UNLOCK_DISTANCE_KM}km`}
            </span>
          </div>
        </div>
      </section>

      <section className="driving-dna-section">
        <div className="driving-dna-section-heading">
          <div>
            <span>DNA TYPES</span>
            <h2>발견 가능한 운전 성향</h2>
          </div>

          {!isUnlocked && (
            <FiLock aria-hidden="true" />
          )}
        </div>

        <div className="driving-dna-type-grid">
          {DNA_TYPES.map((type) => {
            const Icon = type.icon;

            return (
              <article
                key={type.id}
                className={
                  isUnlocked
                    ? "driving-dna-type-card"
                    : "driving-dna-type-card locked"
                }
              >
                <div className="driving-dna-type-icon">
                  <Icon />
                </div>

                <div>
                  <h3>{type.title}</h3>
                  <p>{type.description}</p>
                </div>

                {!isUnlocked && (
                  <FiLock
                    className="driving-dna-card-lock"
                    aria-hidden="true"
                  />
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section className="driving-dna-note">
        <TbDna2 />

        <div>
          <strong>
            운전할수록 더 정확해져요
          </strong>

          <p>
            완료된 주행 기록의 누적거리와
            운전 패턴을 바탕으로 Driving
            DNA가 계속 성장합니다.
          </p>
        </div>
      </section>
    </main>
  );
}