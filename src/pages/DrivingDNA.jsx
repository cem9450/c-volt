import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FiActivity,
  FiCalendar,
  FiClock,
  FiCompass,
  FiLock,
  FiMap,
  FiTrendingUp,
  FiZap,
} from "react-icons/fi";

import { TbDna2 } from "react-icons/tb";

import "./DrivingDNA.css";

const DNA_UNLOCK_DISTANCE_KM = 100;

const DRIVER_LEVELS = [
  {
    level: 1,
    title: "Rookie",
    minDistance: 0,
  },
  {
    level: 2,
    title: "Driver",
    minDistance: 100,
  },
  {
    level: 3,
    title: "Skilled",
    minDistance: 500,
  },
  {
    level: 4,
    title: "Expert",
    minDistance: 1500,
  },
  {
    level: 5,
    title: "Master",
    minDistance: 5000,
  },
];

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

function normalizeNumber(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(0, number);
}

function getSessionDistance(session) {
  return normalizeNumber(
    session?.distanceKm ??
      session?.distance_km
  );
}

function getSessionDuration(session) {
  return normalizeNumber(
    session?.durationSec ??
      session?.duration_sec
  );
}

function getSessionStartedAt(session) {
  return (
    session?.startedAt ??
    session?.started_at ??
    null
  );
}

function formatDistance(distanceKm) {
  return new Intl.NumberFormat("ko-KR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(distanceKm);
}

function formatDate(dateString) {
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
    month: "2-digit",
    day: "2-digit",
  })
    .format(date)
    .replace(/\s/g, "");
}

function formatDuration(seconds) {
  const safeSeconds =
    normalizeNumber(seconds);

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

function getDriverLevel(distanceKm) {
  let currentLevel = DRIVER_LEVELS[0];

  for (const level of DRIVER_LEVELS) {
    if (distanceKm >= level.minDistance) {
      currentLevel = level;
    }
  }

  const currentIndex =
    DRIVER_LEVELS.findIndex(
      (level) =>
        level.level ===
        currentLevel.level
    );

  const nextLevel =
    DRIVER_LEVELS[currentIndex + 1] ??
    null;

  if (!nextLevel) {
    return {
      currentLevel,
      nextLevel: null,
      progress: 100,
      remainingDistance: 0,
    };
  }

  const levelDistance =
    nextLevel.minDistance -
    currentLevel.minDistance;

  const completedDistance =
    distanceKm -
    currentLevel.minDistance;

  const progress = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        (completedDistance /
          levelDistance) *
          100
      )
    )
  );

  return {
    currentLevel,
    nextLevel,
    progress,
    remainingDistance: Math.max(
      0,
      nextLevel.minDistance -
        distanceKm
    ),
  };
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

        const data =
          await response.json();

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
        loadDrivingHistory,
        1200
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

    const totalDurationSec =
      sessions.reduce(
        (sum, session) =>
          sum +
          getSessionDuration(session),
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
            Math.min(
              ...validStartedDates
            )
          ).toISOString()
        : null;

    return {
      totalDistanceKm,
      totalDurationSec,
      totalDrives: sessions.length,
      firstDriveAt,
    };
  }, [sessions]);

  const dnaProgress = useMemo(() => {
    return Math.min(
      100,
      Math.round(
        (drivingData.totalDistanceKm /
          DNA_UNLOCK_DISTANCE_KM) *
          100
      )
    );
  }, [drivingData.totalDistanceKm]);

  const levelData = useMemo(() => {
    return getDriverLevel(
      drivingData.totalDistanceKm
    );
  }, [drivingData.totalDistanceKm]);

  const remainingDnaDistance =
    Math.max(
      0,
      DNA_UNLOCK_DISTANCE_KM -
        drivingData.totalDistanceKm
    );

  const isUnlocked =
    drivingData.totalDistanceKm >=
    DNA_UNLOCK_DISTANCE_KM;

  const hasInitialError =
    Boolean(error) &&
    sessions.length === 0;

  const isInitialLoading =
    loading &&
    sessions.length === 0;

  function getHeroStatus() {
    if (isInitialLoading) {
      return "SYNCING DATA";
    }

    if (hasInitialError) {
      return "DATA ERROR";
    }

    if (isUnlocked) {
      return "DNA ANALYSIS READY";
    }

    return "LEARNING";
  }

  function getHeroTitle() {
    if (isInitialLoading) {
      return "주행 데이터를 불러오고 있어요";
    }

    if (hasInitialError) {
      return "주행 데이터를 확인할 수 없어요";
    }

    if (isUnlocked) {
      return "첫 번째 분석이 준비됐어요";
    }

    return "운전 습관을 학습하고 있어요";
  }

  function getHeroDescription() {
    if (isInitialLoading) {
      return "완료된 주행 기록을 Driving DNA와 연결하고 있습니다.";
    }

    if (hasInitialError) {
      return error;
    }

    if (
      drivingData.totalDrives === 0
    ) {
      return "첫 운행이 완료되면 Driving DNA 학습이 자동으로 시작됩니다.";
    }

    if (isUnlocked) {
      return `${drivingData.totalDrives}회의 실제 주행을 바탕으로 운전 성향을 분석하고 있습니다.`;
    }

    return `${remainingDnaDistance.toFixed(
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
          운전 성향과 성장 기록을 발견합니다.
        </p>
      </header>

      <section className="driving-dna-hero">
        <div className="driving-dna-glow" />

        <div className="driving-dna-symbol">
          <TbDna2 />
        </div>

        <span className="driving-dna-status">
          {getHeroStatus()}
        </span>

        <h2>{getHeroTitle()}</h2>

        <p>{getHeroDescription()}</p>

        <div className="driving-dna-progress">
          <div className="driving-dna-progress-head">
            <span>DNA 분석 진행률</span>

            <strong>
              {isInitialLoading
                ? "-"
                : `${dnaProgress}%`}
            </strong>
          </div>

          <div className="driving-dna-progress-track">
            <span
              style={{
                width: `${dnaProgress}%`,
              }}
            />
          </div>

          <div className="driving-dna-progress-foot">
            <span>
              {formatDistance(
                drivingData.totalDistanceKm
              )}
              km 수집
            </span>

            <span>
              {DNA_UNLOCK_DISTANCE_KM}km
            </span>
          </div>
        </div>
      </section>

      <section className="driving-dna-level-card">
        <div className="driving-dna-level-copy">
          <span className="driving-dna-card-eyebrow">
            DRIVER LEVEL
          </span>

          <div className="driving-dna-level-title">
            <strong>
              LEVEL{" "}
              {
                levelData.currentLevel
                  .level
              }
            </strong>

            <span>
              {
                levelData.currentLevel
                  .title
              }
            </span>
          </div>

          <p>
            {levelData.nextLevel
              ? `다음 레벨 ${levelData.nextLevel.title}까지 ${formatDistance(
                  levelData.remainingDistance
                )}km`
              : "최고 레벨에 도달했습니다."}
          </p>

          <div className="driving-dna-level-track">
            <span
              style={{
                width: `${levelData.progress}%`,
              }}
            />
          </div>
        </div>

        <div
          className="driving-dna-level-ring"
          style={{
            "--level-progress":
              `${levelData.progress * 3.6}deg`,
          }}
        >
          <div>
            <FiZap />

            <strong>
              {levelData.progress}%
            </strong>
          </div>
        </div>
      </section>

      <section className="driving-dna-summary">
        <div className="driving-dna-summary-heading">
          <div>
            <span className="driving-dna-card-eyebrow">
              DRIVING SUMMARY
            </span>

            <h2>나의 주행 기록</h2>
          </div>

          <TbDna2 />
        </div>

        <div className="driving-dna-summary-grid">
          <article>
            <div>
              <FiMap />
            </div>

            <span>총 주행거리</span>

            <strong>
              {formatDistance(
                drivingData.totalDistanceKm
              )}
              <small>km</small>
            </strong>
          </article>

          <article>
            <div>
              <FiActivity />
            </div>

            <span>완료된 운행</span>

            <strong>
              {drivingData.totalDrives}
              <small>회</small>
            </strong>
          </article>

          <article>
            <div>
              <FiClock />
            </div>

            <span>누적 운행시간</span>

            <strong>
              {formatDuration(
                drivingData.totalDurationSec
              )}
            </strong>
          </article>

          <article>
            <div>
              <FiCalendar />
            </div>

            <span>첫 운행</span>

            <strong className="driving-dna-summary-date">
              {formatDate(
                drivingData.firstDriveAt
              )}
            </strong>
          </article>
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

                  <p>
                    {type.description}
                  </p>
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
            완료된 주행 기록이 쌓일수록
            레벨이 성장하고 Driving DNA
            분석도 더욱 정교해집니다.
          </p>
        </div>
      </section>
    </main>
  );
}