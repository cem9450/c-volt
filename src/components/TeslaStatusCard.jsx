import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  LuCarFront,
  LuDoorClosed,
  LuPanelTopClose,
  LuPlugZap,
  LuRefreshCw,
  LuShieldCheck,
  LuWifi,
} from "react-icons/lu";

import quicksilver from "../assets/quicksilver.png";
import glacierblue from "../assets/glacierblue.png";

const AUTO_REFRESH_INTERVAL = 30_000;

const DOOR_LABELS = {
  driverFront: "운전석",
  driverRear: "운전석 뒷문",
  passengerFront: "조수석",
  passengerRear: "조수석 뒷문",
};

const WINDOW_LABELS = {
  driverFront: "운전석",
  driverRear: "운전석 뒤",
  passengerFront: "조수석",
  passengerRear: "조수석 뒤",
};

function formatUpdatedTime(seconds) {
  if (seconds < 10) return "방금 전";
  if (seconds < 60) return `${seconds}초 전`;

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) return `${minutes}분 전`;

  const hours = Math.floor(minutes / 60);
  return `${hours}시간 전`;
}

function getOpenPartNames(parts, labels) {
  if (!parts || typeof parts !== "object") {
    return null;
  }

  return Object.entries(parts)
    .filter(([, isOpen]) => isOpen === true)
    .map(([key]) => labels[key] || key);
}

function createOpenCloseStatus({
  parts,
  labels,
  closedLabel,
  openSuffix,
}) {
  const opened = getOpenPartNames(parts, labels);

  if (opened === null) {
    return {
      value: "확인 불가",
      detail: "차량 상태 확인 필요",
      tone: "unknown",
    };
  }

  if (opened.length === 0) {
    return {
      value: closedLabel,
      detail: "모두 정상",
      tone: "good",
    };
  }

  return {
    value:
      opened.length === 1
        ? `${opened[0]} ${openSuffix}`
        : `${opened.length}곳 ${openSuffix}`,
    detail: opened.join(", "),
    tone: "warning",
  };
}

function createStorageStatus(vehicle) {
  const hasFrunkState =
    vehicle?.frunkOpen !== null &&
    vehicle?.frunkOpen !== undefined;

  const hasTrunkState =
    vehicle?.trunkOpen !== null &&
    vehicle?.trunkOpen !== undefined;

  if (!hasFrunkState || !hasTrunkState) {
    return {
      value: "확인 불가",
      detail: "차량 상태 확인 필요",
      tone: "unknown",
    };
  }

  const opened = [];

  if (vehicle.frunkOpen) opened.push("프렁크");
  if (vehicle.trunkOpen) opened.push("트렁크");

  if (opened.length === 0) {
    return {
      value: "모두 닫힘",
      detail: "프렁크·트렁크 정상",
      tone: "good",
    };
  }

  return {
    value: `${opened.join("·")} 열림`,
    detail: "차량을 확인하세요",
    tone: "warning",
  };
}

function createChargePortStatus(vehicle) {
  if (
    vehicle?.chargePortOpen === null ||
    vehicle?.chargePortOpen === undefined
  ) {
    return {
      value: "확인 불가",
      detail: "충전포트 상태 없음",
      tone: "unknown",
    };
  }

  if (vehicle.chargePortOpen) {
    return {
      value: "열림",
      detail:
        vehicle?.chargingState === "Charging"
          ? "충전 중"
          : "포트가 열려 있어요",
      tone:
        vehicle?.chargingState === "Charging"
          ? "active"
          : "warning",
    };
  }

  return {
    value: "닫힘",
    detail: "정상",
    tone: "good",
  };
}

function createSentryStatus(vehicle) {
  if (
    vehicle?.sentryMode === null ||
    vehicle?.sentryMode === undefined
  ) {
    return {
      value: "확인 불가",
      detail: "센트리 상태 없음",
      tone: "unknown",
    };
  }

  return vehicle.sentryMode
    ? {
        value: "ON",
        detail: "차량 보호 중",
        tone: "active",
      }
    : {
        value: "OFF",
        detail: "센트리 꺼짐",
        tone: "neutral",
      };
}

function createOnlineStatus(vehicle) {
  const state = vehicle?.state;

  if (state === "online") {
    return {
      value: "온라인",
      detail: "차량 연결됨",
      tone: "good",
    };
  }

  if (state === "asleep") {
    return {
      value: "절전 중",
      detail: "필요 시 차량이 깨어나요",
      tone: "neutral",
    };
  }

  if (!state) {
    return {
      value: "확인 불가",
      detail: "연결 상태 없음",
      tone: "unknown",
    };
  }

  return {
    value: "오프라인",
    detail: "차량 연결 끊김",
    tone: "warning",
  };
}

function StatusCard({
  icon: Icon,
  title,
  value,
  detail,
  tone,
}) {
  return (
    <div
      className={`vehicle-status-card ${tone}`}
      title={detail}
    >
      <span className="vehicle-status-card-icon">
        <Icon aria-hidden="true" />
      </span>

      <span className="vehicle-status-card-title">
        {title}
      </span>

      <strong className="vehicle-status-card-value">
        {value}
      </strong>

      <small className="vehicle-status-card-detail">
        {detail}
      </small>
    </div>
  );
}

export default function TeslaStatusCard({
  onVehicleChange,
}) {
  const [vehicle, setVehicle] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [lastUpdated, setLastUpdated] =
    useState(null);

  const [secondsAgo, setSecondsAgo] =
    useState(0);

  const requestInProgress =
    useRef(false);

  const loadVehicle = useCallback(
    async (silent = false) => {
      if (requestInProgress.current) {
        return;
      }

      requestInProgress.current = true;

      if (!silent) {
        setLoading(true);
      }

      try {
        const response = await fetch(
          "/api/vehicle-snapshot",
          {
            method: "POST",
            credentials: "include",
            cache: "no-store",
          }
        );

        const text = await response.text();

        let data;

        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(
            "차량 서버 응답을 확인하지 못했습니다."
          );
        }

        if (!response.ok || !data.ok) {
          throw new Error(
            data.error ||
              "차량 정보를 불러오지 못했습니다."
          );
        }

        const nextVehicle = data.vehicle;

        setVehicle(nextVehicle);
        setError("");

        onVehicleChange?.(nextVehicle);

        if (nextVehicle?.isDriving === true) {
          localStorage.removeItem(
            "cvolt_parked_at"
          );

          localStorage.removeItem(
            "cvolt_parking_memo"
          );

          window.dispatchEvent(
            new CustomEvent(
              "cvolt:parking-updated",
              {
                detail: {
                  isDriving: true,
                  parkedAt: null,
                  clearMemo: true,
                },
              }
            )
          );
        } else if (data.parkedAt) {
          localStorage.setItem(
            "cvolt_parked_at",
            data.parkedAt
          );

          window.dispatchEvent(
            new CustomEvent(
              "cvolt:parking-updated",
              {
                detail: {
                  isDriving: false,
                  parkedAt: data.parkedAt,
                  clearMemo: false,
                },
              }
            )
          );
        }

        if (data.event === "driving_ended") {
          let score = null;

          try {
            const scoreResponse =
              await fetch(
                "/api/today-score",
                {
                  credentials: "include",
                  cache: "no-store",
                }
              );

            const scoreData =
              await scoreResponse.json();

            if (
              scoreResponse.ok &&
              scoreData.ok &&
              scoreData.hasData
            ) {
              score = scoreData.score;
            }
          } catch (scoreError) {
            console.error(
              "운행 종료 점수 조회 실패:",
              scoreError
            );
          }

          window.dispatchEvent(
            new CustomEvent(
              "cvolt:drive-ended",
              {
                detail: {
                  score,
                  session:
                    data.session || null,
                },
              }
            )
          );
        }

        setLastUpdated(new Date());
        setSecondsAgo(0);

        localStorage.setItem(
          "cvolt_vehicle",
          JSON.stringify(nextVehicle)
        );

        window.dispatchEvent(
          new CustomEvent(
            "cvolt:vehicle-updated",
            {
              detail: nextVehicle,
            }
          )
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "차량 정보를 불러오지 못했습니다."
        );
      } finally {
        requestInProgress.current =
          false;

        if (!silent) {
          setLoading(false);
        }
      }
    },
    [onVehicleChange]
  );

  useEffect(() => {
    loadVehicle();

    const refreshTimer =
      window.setInterval(() => {
        loadVehicle(true);
      }, AUTO_REFRESH_INTERVAL);

    return () => {
      window.clearInterval(
        refreshTimer
      );
    };
  }, [loadVehicle]);

  useEffect(() => {
    const clockTimer =
      window.setInterval(() => {
        if (!lastUpdated) return;

        setSecondsAgo(
          Math.floor(
            (
              Date.now() -
              lastUpdated.getTime()
            ) / 1000
          )
        );
      }, 1000);

    return () => {
      window.clearInterval(
        clockTimer
      );
    };
  }, [lastUpdated]);

  const statusCards = useMemo(() => {
    if (!vehicle) return [];

    const doorStatus =
      createOpenCloseStatus({
        parts: vehicle.doors,
        labels: DOOR_LABELS,
        closedLabel: "모두 닫힘",
        openSuffix: "열림",
      });

    const windowStatus =
      createOpenCloseStatus({
        parts: vehicle.windows,
        labels: WINDOW_LABELS,
        closedLabel: "모두 닫힘",
        openSuffix: "열림",
      });

    return [
      {
        key: "doors",
        icon: LuDoorClosed,
        title: "문",
        ...doorStatus,
      },
      {
        key: "windows",
        icon: LuPanelTopClose,
        title: "창문",
        ...windowStatus,
      },
      {
        key: "storage",
        icon: LuCarFront,
        title: "프렁크·트렁크",
        ...createStorageStatus(vehicle),
      },
      {
        key: "charge-port",
        icon: LuPlugZap,
        title: "충전포트",
        ...createChargePortStatus(vehicle),
      },
      {
        key: "sentry",
        icon: LuShieldCheck,
        title: "센트리",
        ...createSentryStatus(vehicle),
      },
      {
        key: "online",
        icon: LuWifi,
        title: "온라인",
        ...createOnlineStatus(vehicle),
      },
    ];
  }, [vehicle]);

  if (loading && !vehicle) {
    return (
      <div className="vehicle-reference-loading">
        실제 차량 정보를 불러오는 중...
      </div>
    );
  }

  if (error && !vehicle) {
    return (
      <div className="vehicle-reference-loading">
        <span>{error}</span>

        <button
          type="button"
          onClick={() => loadVehicle()}
        >
          다시 불러오기
        </button>
      </div>
    );
  }

  const vehicleName = (
    vehicle?.name || ""
  ).toLowerCase();

  const vehicleImage =
    vehicleName.includes("대기리차") ||
    vehicleName.includes("ceh")
      ? glacierblue
      : quicksilver;

  const isDriving =
    vehicle?.isDriving === true;

  const batteryLevel =
    Number.isFinite(
      Number(vehicle?.batteryLevel)
    )
      ? Math.min(
          100,
          Math.max(
            0,
            Number(vehicle.batteryLevel)
          )
        )
      : 0;

  return (
    <section
      className={
        isDriving
          ? "vehicle-reference-card driving"
          : "vehicle-reference-card"
      }
    >
      <div className="vehicle-reference-title-row">
        <div>
          <span className="vehicle-reference-eyebrow">
            TESLA
          </span>

          <h2>차량 상태</h2>
        </div>

        <button
          type="button"
          className="vehicle-reference-updated"
          onClick={() => loadVehicle()}
          disabled={loading}
          aria-label="차량 상태 새로고침"
        >
          <span>
            업데이트:{" "}
            {formatUpdatedTime(
              secondsAgo
            )}
          </span>

          <LuRefreshCw
            className={
              loading
                ? "vehicle-spin"
                : ""
            }
            aria-hidden="true"
          />
        </button>
      </div>

      {error && (
        <div className="vehicle-reference-inline-error">
          {error}
        </div>
      )}

      <div className="vehicle-reference-status compact">
        {statusCards.map((status) => (
          <StatusCard
            key={status.key}
            icon={status.icon}
            title={status.title}
            value={status.value}
            detail={status.detail}
            tone={status.tone}
          />
        ))}
      </div>

      <div className="vehicle-reference-main">
        <div className="vehicle-reference-battery">
          <span>배터리</span>

          <strong>
            {vehicle?.batteryLevel ?? "-"}
            <small>%</small>
          </strong>

          <div
            className="vehicle-reference-bar"
            role="progressbar"
            aria-label="차량 배터리"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow={batteryLevel}
          >
            <i
              style={{
                width: `${batteryLevel}%`,
              }}
            />
          </div>

          <p>
            예상 주행 가능 거리{" "}
            <b>
              {vehicle?.rangeKm ?? "-"}km
            </b>
          </p>
        </div>

        <div className="vehicle-reference-visual">
          <div className="vehicle-reference-glow" />

          <img
            src={vehicleImage}
            alt={
              vehicle?.name ||
              "Tesla"
            }
          />
        </div>
      </div>
    </section>
  );
}
라이브러리
/
c-volt
/
TeslaStatusCard.jsx


import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  LuCarFront,
  LuDoorClosed,
  LuPanelTopClose,
  LuPlugZap,
  LuRefreshCw,
  LuShieldCheck,
  LuWifi,
} from "react-icons/lu";

import quicksilver from "../assets/quicksilver.png";
import glacierblue from "../assets/glacierblue.png";

const AUTO_REFRESH_INTERVAL = 30_000;

const DOOR_LABELS = {
  driverFront: "운전석",
  driverRear: "운전석 뒷문",
  passengerFront: "조수석",
  passengerRear: "조수석 뒷문",
};

const WINDOW_LABELS = {
  driverFront: "운전석",
  driverRear: "운전석 뒤",
  passengerFront: "조수석",
  passengerRear: "조수석 뒤",
};

function formatUpdatedTime(seconds) {
  if (seconds < 10) return "방금 전";
  if (seconds < 60) return `${seconds}초 전`;

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) return `${minutes}분 전`;

  const hours = Math.floor(minutes / 60);
  return `${hours}시간 전`;
}

function getOpenPartNames(parts, labels) {
  if (!parts || typeof parts !== "object") {
    return null;
  }

  return Object.entries(parts)
    .filter(([, isOpen]) => isOpen === true)
    .map(([key]) => labels[key] || key);
}

function createOpenCloseStatus({
  parts,
  labels,
  closedLabel,
  openSuffix,
}) {
  const opened = getOpenPartNames(parts, labels);

  if (opened === null) {
    return {
      value: "확인 불가",
      detail: "차량 상태 확인 필요",
      tone: "unknown",
    };
  }

  if (opened.length === 0) {
    return {
      value: closedLabel,
      detail: "모두 정상",
      tone: "good",
    };
  }

  return {
    value:
      opened.length === 1
        ? `${opened[0]} ${openSuffix}`
        : `${opened.length}곳 ${openSuffix}`,
    detail: opened.join(", "),
    tone: "warning",
  };
}

function createStorageStatus(vehicle) {
  const hasFrunkState =
    vehicle?.frunkOpen !== null &&
    vehicle?.frunkOpen !== undefined;

  const hasTrunkState =
    vehicle?.trunkOpen !== null &&
    vehicle?.trunkOpen !== undefined;

  if (!hasFrunkState || !hasTrunkState) {
    return {
      value: "확인 불가",
      detail: "차량 상태 확인 필요",
      tone: "unknown",
    };
  }

  const opened = [];

  if (vehicle.frunkOpen) opened.push("프렁크");
  if (vehicle.trunkOpen) opened.push("트렁크");

  if (opened.length === 0) {
    return {
      value: "모두 닫힘",
      detail: "프렁크·트렁크 정상",
      tone: "good",
    };
  }

  return {
    value: `${opened.join("·")} 열림`,
    detail: "차량을 확인하세요",
    tone: "warning",
  };
}

function createChargePortStatus(vehicle) {
  if (
    vehicle?.chargePortOpen === null ||
    vehicle?.chargePortOpen === undefined
  ) {
    return {
      value: "확인 불가",
      detail: "충전포트 상태 없음",
      tone: "unknown",
    };
  }

  if (vehicle.chargePortOpen) {
    return {
      value: "열림",
      detail:
        vehicle?.chargingState === "Charging"
          ? "충전 중"
          : "포트가 열려 있어요",
      tone:
        vehicle?.chargingState === "Charging"
          ? "active"
          : "warning",
    };
  }

  return {
    value: "닫힘",
    detail: "정상",
    tone: "good",
  };
}

function createSentryStatus(vehicle) {
  if (
    vehicle?.sentryMode === null ||
    vehicle?.sentryMode === undefined
  ) {
    return {
      value: "확인 불가",
      detail: "센트리 상태 없음",
      tone: "unknown",
    };
  }

  return vehicle.sentryMode
    ? {
        value: "ON",
        detail: "차량 보호 중",
        tone: "active",
      }
    : {
        value: "OFF",
        detail: "센트리 꺼짐",
        tone: "neutral",
      };
}

function createOnlineStatus(vehicle) {
  const state = vehicle?.state;

  if (state === "online") {
    return {
      value: "온라인",
      detail: "차량 연결됨",
      tone: "good",
    };
  }

  if (state === "asleep") {
    return {
      value: "절전 중",
      detail: "필요 시 차량이 깨어나요",
      tone: "neutral",
    };
  }

  if (!state) {
    return {
      value: "확인 불가",
      detail: "연결 상태 없음",
      tone: "unknown",
    };
  }

  return {
    value: "오프라인",
    detail: "차량 연결 끊김",
    tone: "warning",
  };
}

function StatusCard({
  icon: Icon,
  title,
  value,
  detail,
  tone,
}) {
  return (
    <div
      className={`vehicle-status-card ${tone}`}
      title={detail}
    >
      <span className="vehicle-status-card-icon">
        <Icon aria-hidden="true" />
      </span>

      <span className="vehicle-status-card-title">
        {title}
      </span>

      <strong className="vehicle-status-card-value">
        {value}
      </strong>

      <small className="vehicle-status-card-detail">
        {detail}
      </small>
    </div>
  );
}

export default function TeslaStatusCard({
  onVehicleChange,
}) {
  const [vehicle, setVehicle] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [lastUpdated, setLastUpdated] =
    useState(null);

  const [secondsAgo, setSecondsAgo] =
    useState(0);

  const requestInProgress =
    useRef(false);

  const loadVehicle = useCallback(
    async (silent = false) => {
      if (requestInProgress.current) {
        return;
      }

      requestInProgress.current = true;

      if (!silent) {
        setLoading(true);
      }

      try {
        const response = await fetch(
          "/api/vehicle-snapshot",
          {
            method: "POST",
            credentials: "include",
            cache: "no-store",
          }
        );

        const text = await response.text();

        let data;

        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(
            "차량 서버 응답을 확인하지 못했습니다."
          );
        }

        if (!response.ok || !data.ok) {
          throw new Error(
            data.error ||
              "차량 정보를 불러오지 못했습니다."
          );
        }

        const nextVehicle = data.vehicle;

        setVehicle(nextVehicle);
        setError("");

        onVehicleChange?.(nextVehicle);

        if (nextVehicle?.isDriving === true) {
          localStorage.removeItem(
            "cvolt_parked_at"
          );

          localStorage.removeItem(
            "cvolt_parking_memo"
          );

          window.dispatchEvent(
            new CustomEvent(
              "cvolt:parking-updated",
              {
                detail: {
                  isDriving: true,
                  parkedAt: null,
                  clearMemo: true,
                },
              }
            )
          );
        } else if (data.parkedAt) {
          localStorage.setItem(
            "cvolt_parked_at",
            data.parkedAt
          );

          window.dispatchEvent(
            new CustomEvent(
              "cvolt:parking-updated",
              {
                detail: {
                  isDriving: false,
                  parkedAt: data.parkedAt,
                  clearMemo: false,
                },
              }
            )
          );
        }

        if (data.event === "driving_ended") {
          let score = null;

          try {
            const scoreResponse =
              await fetch(
                "/api/today-score",
                {
                  credentials: "include",
                  cache: "no-store",
                }
              );

            const scoreData =
              await scoreResponse.json();

            if (
              scoreResponse.ok &&
              scoreData.ok &&
              scoreData.hasData
            ) {
              score = scoreData.score;
            }
          } catch (scoreError) {
            console.error(
              "운행 종료 점수 조회 실패:",
              scoreError
            );
          }

          window.dispatchEvent(
            new CustomEvent(
              "cvolt:drive-ended",
              {
                detail: {
                  score,
                  session:
                    data.session || null,
                },
              }
            )
          );
        }

        setLastUpdated(new Date());
        setSecondsAgo(0);

        localStorage.setItem(
          "cvolt_vehicle",
          JSON.stringify(nextVehicle)
        );

        window.dispatchEvent(
          new CustomEvent(
            "cvolt:vehicle-updated",
            {
              detail: nextVehicle,
            }
          )
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "차량 정보를 불러오지 못했습니다."
        );
      } finally {
        requestInProgress.current =
          false;

        if (!silent) {
          setLoading(false);
        }
      }
    },
    [onVehicleChange]
  );

  useEffect(() => {
    loadVehicle();

    const refreshTimer =
      window.setInterval(() => {
        loadVehicle(true);
      }, AUTO_REFRESH_INTERVAL);

    return () => {
      window.clearInterval(
        refreshTimer
      );
    };
  }, [loadVehicle]);

  useEffect(() => {
    const clockTimer =
      window.setInterval(() => {
        if (!lastUpdated) return;

        setSecondsAgo(
          Math.floor(
            (
              Date.now() -
              lastUpdated.getTime()
            ) / 1000
          )
        );
      }, 1000);

    return () => {
      window.clearInterval(
        clockTimer
      );
    };
  }, [lastUpdated]);

  const statusCards = useMemo(() => {
    if (!vehicle) return [];

    const doorStatus =
      createOpenCloseStatus({
        parts: vehicle.doors,
        labels: DOOR_LABELS,
        closedLabel: "모두 닫힘",
        openSuffix: "열림",
      });

    const windowStatus =
      createOpenCloseStatus({
        parts: vehicle.windows,
        labels: WINDOW_LABELS,
        closedLabel: "모두 닫힘",
        openSuffix: "열림",
      });

    return [
      {
        key: "doors",
        icon: LuDoorClosed,
        title: "문",
        ...doorStatus,
      },
      {
        key: "windows",
        icon: LuPanelTopClose,
        title: "창문",
        ...windowStatus,
      },
      {
        key: "storage",
        icon: LuCarFront,
        title: "프렁크·트렁크",
        ...createStorageStatus(vehicle),
      },
      {
        key: "charge-port",
        icon: LuPlugZap,
        title: "충전포트",
        ...createChargePortStatus(vehicle),
      },
      {
        key: "sentry",
        icon: LuShieldCheck,
        title: "센트리",
        ...createSentryStatus(vehicle),
      },
      {
        key: "online",
        icon: LuWifi,
        title: "온라인",
        ...createOnlineStatus(vehicle),
      },
    ];
  }, [vehicle]);

  if (loading && !vehicle) {
    return (
      <div className="vehicle-reference-loading">
        실제 차량 정보를 불러오는 중...
      </div>
    );
  }

  if (error && !vehicle) {
    return (
      <div className="vehicle-reference-loading">
        <span>{error}</span>

        <button
          type="button"
          onClick={() => loadVehicle()}
        >
          다시 불러오기
        </button>
      </div>
    );
  }

  const vehicleName = (
    vehicle?.name || ""
  ).toLowerCase();

  const vehicleImage =
    vehicleName.includes("대기리차") ||
    vehicleName.includes("ceh")
      ? glacierblue
      : quicksilver;

  const isDriving =
    vehicle?.isDriving === true;

  const batteryLevel =
    Number.isFinite(
      Number(vehicle?.batteryLevel)
    )
      ? Math.min(
          100,
          Math.max(
            0,
            Number(vehicle.batteryLevel)
          )
        )
      : 0;

  return (
    <section
      className={
        isDriving
          ? "vehicle-reference-card driving"
          : "vehicle-reference-card"
      }
    >
      <div className="vehicle-reference-title-row">
        <div>
          <span className="vehicle-reference-eyebrow">
            TESLA
          </span>

          <h2>차량 상태</h2>
        </div>

        <button
          type="button"
          className="vehicle-reference-updated"
          onClick={() => loadVehicle()}
          disabled={loading}
          aria-label="차량 상태 새로고침"
        >
          <span>
            업데이트:{" "}
            {formatUpdatedTime(
              secondsAgo
            )}
          </span>

          <LuRefreshCw
            className={
              loading
                ? "vehicle-spin"
                : ""
            }
            aria-hidden="true"
          />
        </button>
      </div>

      {error && (
        <div className="vehicle-reference-inline-error">
          {error}
        </div>
      )}

      <div className="vehicle-reference-status compact">
        {statusCards.map((status) => (
          <StatusCard
            key={status.key}
            icon={status.icon}
            title={status.title}
            value={status.value}
            detail={status.detail}
            tone={status.tone}
          />
        ))}
      </div>

      <div className="vehicle-reference-main">
        <div className="vehicle-reference-battery">
          <span>배터리</span>

          <strong>
            {vehicle?.batteryLevel ?? "-"}
            <small>%</small>
          </strong>

          <div
            className="vehicle-reference-bar"
            role="progressbar"
            aria-label="차량 배터리"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow={batteryLevel}
          >
            <i
              style={{
                width: `${batteryLevel}%`,
              }}
            />
          </div>

          <p>
            예상 주행 가능 거리{" "}
            <b>
              {vehicle?.rangeKm ?? "-"}km
            </b>
          </p>
        </div>

        <div className="vehicle-reference-visual">
          <div className="vehicle-reference-glow" />

          <img
            src={vehicleImage}
            alt={
              vehicle?.name ||
              "Tesla"
            }
          />
        </div>
      </div>
    </section>
  );
}