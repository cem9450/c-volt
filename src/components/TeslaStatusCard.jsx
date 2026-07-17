import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  FiRefreshCw,
  FiThermometer,
} from "react-icons/fi";

import {
  MdOutlineElectricBolt,
  MdOutlineSecurity,
  MdOutlineSensorDoor,
  MdOutlineWifi,
  MdOutlineWindow,
} from "react-icons/md";

import { IoCarSportOutline } from "react-icons/io5";

import quicksilver from "../assets/quicksilver.png";
import glacierblue from "../assets/glacierblue.png";

function translateChargingState(state) {
  const labels = {
    Charging: "충전 중",
    Complete: "충전 완료",
    Disconnected: "충전 중 아님",
    Stopped: "충전 중지",
    Starting: "충전 준비 중",
    NoPower: "전원 없음",
    Unknown: "확인 불가",
  };

  return labels[state] || state || "확인 불가";
}

function formatUpdatedTime(seconds) {
  if (seconds < 10) return "방금 전";
  if (seconds < 60) return `${seconds}초 전`;

  return `${Math.floor(seconds / 60)}분 전`;
}

function getOpenDoorNames(doors) {
  if (!doors) return [];

  const labels = {
    driverFront: "운전석",
    driverRear: "운전석 뒷문",
    passengerFront: "조수석",
    passengerRear: "조수석 뒷문",
  };

  return Object.entries(doors)
    .filter(([, isOpen]) => isOpen === true)
    .map(([key]) => labels[key]);
}

function getOpenWindowNames(windows) {
  if (!windows) return [];

  const labels = {
    driverFront: "운전석",
    driverRear: "운전석 뒤",
    passengerFront: "조수석",
    passengerRear: "조수석 뒤",
  };

  return Object.entries(windows)
    .filter(([, isOpen]) => isOpen === true)
    .map(([key]) => labels[key]);
}
function getDoorSummary(doors) {
  if (!doors) {
    return {
      warning: false,
      label: "문",
      value: "확인 불가",
      detail: "차량 절전 또는 오프라인",
    };
  }

  const opened = getOpenDoorNames(doors);

  if (opened.length === 0) {
    return {
      warning: false,
      label: "문",
      value: "모두 닫힘",
      detail: "모든 문이 닫혀 있습니다.",
    };
  }

  return {
    warning: true,
    label: "문",
    value: `${opened.length}곳 열림`,
    detail: opened.join(", "),
  };
}

function getWindowSummary(windows) {
  if (!windows) {
    return {
      warning: false,
      label: "창문",
      value: "확인 불가",
      detail: "차량 절전 또는 오프라인",
    };
  }

  const opened = getOpenWindowNames(windows);

  if (opened.length === 0) {
    return {
      warning: false,
      label: "창문",
      value: "모두 닫힘",
      detail: "모든 창문이 닫혀 있습니다.",
    };
  }

  return {
    warning: true,
    label: "창문",
    value: `${opened.length}곳 열림`,
    detail: opened.join(", "),
  };
}

function getStorageSummary(vehicle) {
  if (
    vehicle?.frunkOpen === null ||
    vehicle?.frunkOpen === undefined ||
    vehicle?.trunkOpen === null ||
    vehicle?.trunkOpen === undefined
  ) {
    return {
      warning: false,
      label: "트렁크 확인 불가",
      detail: "차량 상태 확인 필요",
    };
  }

  const opened = [];

  if (vehicle.frunkOpen) {
    opened.push("프렁크");
  }

  if (vehicle.trunkOpen) {
    opened.push("트렁크");
  }

  if (opened.length === 0) {
    return {
      warning: false,
      label: "프렁크·트렁크 닫힘",
      detail: "모두 정상",
    };
  }

  return {
    warning: true,
    label: `${opened.join("·")} 열림`,
    detail: "차량을 확인하세요",
  };
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

        const text =
          await response.text();

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

        const nextVehicle =
          data.vehicle;

        setVehicle(nextVehicle);
        setError("");

        onVehicleChange?.(
          nextVehicle
        );

        if (
          nextVehicle?.isDriving === true
        ) {
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
                  parkedAt:
                    data.parkedAt,

                  clearMemo: false,
                },
              }
            )
          );
        }

        if (
          data.event ===
          "driving_ended"
        ) {
          let score = null;

          try {
            const scoreResponse =
              await fetch(
                "/api/today-score",
                {
                  credentials:
                    "include",

                  cache:
                    "no-store",
                }
              );

            const scoreData =
              await scoreResponse.json();

            if (
              scoreResponse.ok &&
              scoreData.ok &&
              scoreData.hasData
            ) {
              score =
                scoreData.score;
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
                    data.session ||
                    null,
                },
              }
            )
          );
        }

        setLastUpdated(new Date());
        setSecondsAgo(0);

        localStorage.setItem(
          "cvolt_vehicle",
          JSON.stringify(
            nextVehicle
          )
        );

        window.dispatchEvent(
          new CustomEvent(
            "cvolt:vehicle-updated",
            {
              detail:
                nextVehicle,
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
      }, 30000);

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
          onClick={() =>
            loadVehicle()
          }
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

  const doorSummary =
    getDoorSummary(vehicle?.doors);

  const windowSummary =
    getWindowSummary(vehicle?.windows);

  const storageSummary =
    getStorageSummary(vehicle);

  const isOnline =
    vehicle?.state === "online";

  const sentryOn =
    vehicle?.sentryMode === true;

  const chargePortOpen =
    vehicle?.chargePortOpen === true;

  return (
    <div
      className={
        isDriving
          ? "vehicle-reference-card driving"
          : "vehicle-reference-card"
      }
    >
      <div className="vehicle-reference-title-row">
        <h2>차량 상태</h2>

        <button
          type="button"
          className="vehicle-reference-updated"
          onClick={() =>
            loadVehicle()
          }
          disabled={loading}
        >
          업데이트:{" "}
          {formatUpdatedTime(
            secondsAgo
          )}

          <FiRefreshCw
            className={
              loading
                ? "vehicle-spin"
                : ""
            }
          />
        </button>
      </div>
      <div className="vehicle-reference-status-grid">
        <div
          className={
            doorSummary.warning
              ? "vehicle-status-card warning"
              : "vehicle-status-card normal"
          }
          title={doorSummary.detail}
        >
          <span className="vehicle-status-card-icon">
            <MdOutlineSensorDoor />
          </span>

          <span className="vehicle-status-card-title">
            문
          </span>

          <strong className="vehicle-status-card-value">
            {doorSummary.value}
          </strong>
        </div>

        <div
          className={
            windowSummary.warning
              ? "vehicle-status-card warning"
              : "vehicle-status-card normal"
          }
          title={windowSummary.detail}
        >
          <span className="vehicle-status-card-icon">
            <MdOutlineWindow />
          </span>

          <span className="vehicle-status-card-title">
            창문
          </span>

          <strong className="vehicle-status-card-value">
            {windowSummary.value}
          </strong>
        </div>

        <div
          className={
            storageSummary.warning
              ? "vehicle-status-card warning"
              : "vehicle-status-card normal"
          }
          title={storageSummary.detail}
        >
          <span className="vehicle-status-card-icon">
            <IoCarSportOutline />
          </span>

          <span className="vehicle-status-card-title">
            적재공간
          </span>

          <strong className="vehicle-status-card-value">
            {storageSummary.warning
              ? storageSummary.label
              : "모두 닫힘"}
          </strong>
        </div>

        <div
          className={
            chargePortOpen
              ? "vehicle-status-card warning"
              : "vehicle-status-card normal"
          }
        >
          <span className="vehicle-status-card-icon">
            <MdOutlineElectricBolt />
          </span>

          <span className="vehicle-status-card-title">
            충전포트
          </span>

          <strong className="vehicle-status-card-value">
            {vehicle?.chargePortOpen === null ||
            vehicle?.chargePortOpen === undefined
              ? "확인 불가"
              : chargePortOpen
                ? "열림"
                : "닫힘"}
          </strong>
        </div>

        <div
          className={
            sentryOn
              ? "vehicle-status-card active"
              : "vehicle-status-card normal"
          }
        >
          <span className="vehicle-status-card-icon">
            <MdOutlineSecurity />
          </span>

          <span className="vehicle-status-card-title">
            센트리
          </span>

          <strong className="vehicle-status-card-value">
            {vehicle?.sentryMode === null ||
            vehicle?.sentryMode === undefined
              ? "확인 불가"
              : sentryOn
                ? "켜짐"
                : "꺼짐"}
          </strong>
        </div>

        <div
          className={
            isOnline
              ? "vehicle-status-card online"
              : "vehicle-status-card sleeping"
          }
        >
          <span className="vehicle-status-card-icon">
            <MdOutlineWifi />
          </span>

          <span className="vehicle-status-card-title">
            연결 상태
          </span>

          <strong className="vehicle-status-card-value">
            {isOnline
              ? "온라인"
              : vehicle?.state === "asleep"
                ? "절전 중"
                : "오프라인"}
          </strong>
        </div>
      </div>

      <div className="vehicle-reference-main">
        <div className="vehicle-reference-battery">
          <span>배터리</span>

          <strong>
            {vehicle?.batteryLevel ??
              "-"}
            <small>%</small>
          </strong>

          <div className="vehicle-reference-bar">
            <i
              style={{
                width: `${
                  vehicle?.batteryLevel ??
                  0
                }%`,
              }}
            />
          </div>

          <p>
            예상 주행 가능 거리{" "}
            <b>
              {vehicle?.rangeKm ??
                "-"}
              km
            </b>
          </p>
        </div>

        <div className="vehicle-reference-visual">
          <div className="vehicle-reference-glow" />

          <img
            src={vehicleImage}
            alt={vehicle?.name || "Tesla"}
          />
        </div>
      </div>
    </div>
  );
}