import {
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

function getStoredDistance() {
  try {
    return normalizeDistance(
      localStorage.getItem(
        "cvolt:driving-dna-distance-km"
      )
    );
  } catch {
    return 0;
  }
}

function getEventDistance(event) {
  const detail = event?.detail;

  return normalizeDistance(
    detail?.distance_km ??
      detail?.distanceKm ??
      detail?.session?.distance_km ??
      detail?.session?.distanceKm
  );
}

export default function DrivingDNA() {
  const [distanceKm, setDistanceKm] =
    useState(getStoredDistance);

  useEffect(() => {
    const handleDriveEnded = (event) => {
      const addedDistance =
        getEventDistance(event);

      if (addedDistance <= 0) {
        return;
      }

      setDistanceKm((currentDistance) => {
        const nextDistance =
          currentDistance + addedDistance;

        try {
          localStorage.setItem(
            "cvolt:driving-dna-distance-km",
            String(nextDistance)
          );
        } catch (error) {
          console.error(
            "Driving DNA 거리 저장 실패:",
            error
          );
        }

        return nextDistance;
      });
    };

    const handleStorage = (event) => {
      if (
        event.key !==
        "cvolt:driving-dna-distance-km"
      ) {
        return;
      }

      setDistanceKm(
        normalizeDistance(event.newValue)
      );
    };

    window.addEventListener(
      "cvolt:drive-ended",
      handleDriveEnded
    );

    window.addEventListener(
      "storage",
      handleStorage
    );

    return () => {
      window.removeEventListener(
        "cvolt:drive-ended",
        handleDriveEnded
      );

      window.removeEventListener(
        "storage",
        handleStorage
      );
    };
  }, []);

  const progress = useMemo(() => {
    return Math.min(
      100,
      Math.round(
        (distanceKm /
          DNA_UNLOCK_DISTANCE_KM) *
          100
      )
    );
  }, [distanceKm]);

  const remainingDistance = Math.max(
    0,
    DNA_UNLOCK_DISTANCE_KM - distanceKm
  );

  const isUnlocked =
    distanceKm >= DNA_UNLOCK_DISTANCE_KM;

  return (
    <main className="driving-dna-page">
      <header className="driving-dna-header">
        <span className="driving-dna-eyebrow">
          C-VOLT DRIVING PROFILE
        </span>

        <h1>운전 DNA</h1>

        <p>
          주행 데이터를 분석해 나만의 운전
          성향을 발견합니다.
        </p>
      </header>

      <section className="driving-dna-hero">
        <div className="driving-dna-glow" />

        <div className="driving-dna-symbol">
          <TbDna2 />
        </div>

        <span className="driving-dna-status">
          {isUnlocked
            ? "DNA ANALYSIS READY"
            : "LEARNING"}
        </span>

        <h2>
          {isUnlocked
            ? "분석 준비 완료"
            : "운전 습관을 학습하고 있어요"}
        </h2>

        <p>
          {isUnlocked
            ? "수집된 데이터를 바탕으로 운전 성향 분석을 시작할 수 있습니다."
            : `${remainingDistance.toFixed(
                1
              )}km를 더 주행하면 첫 번째 운전 DNA가 공개됩니다.`}
        </p>

        <div className="driving-dna-progress">
          <div className="driving-dna-progress-head">
            <span>분석 진행률</span>
            <strong>{progress}%</strong>
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
              {distanceKm.toFixed(1)}km 수집
            </span>

            <span>
              {DNA_UNLOCK_DISTANCE_KM}km
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
          <strong>운전할수록 더 정확해져요</strong>
          <p>
            누적된 주행거리와 운전 패턴을
            바탕으로 Driving DNA가 계속
            성장합니다.
          </p>
        </div>
      </section>
    </main>
  );
}