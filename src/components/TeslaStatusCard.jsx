import { useCallback, useEffect, useRef, useState } from "react";
import { FiLock, FiRefreshCw, FiThermometer } from "react-icons/fi";
import { HiOutlineBolt } from "react-icons/hi2";

import quicksilver from "../assets/quicksilver.png";
import glacierblue from "../assets/glacierblue.png";

function translateChargingState(state) {
  const labels = {
    Charging: "충전 중",
    Complete: "충전 완료",
    Disconnected: "충전 안 함",
    Stopped: "충전 중지",
    Starting: "충전 준비 중",
    NoPower: "전원 없음",
    Unknown: "확인 불가",
  };

  return labels[state] || state || "확인 불가";
}

function formatUpdatedTime(seconds) {
  if (seconds <= 1) return "방금 전";
  if (seconds < 60) return `${seconds}초 전`;

  return `${Math.floor(seconds / 60)}분 전`;
}

export default function TeslaStatusCard() {
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [secondsAgo, setSecondsAgo] = useState(0);

  const requestInProgress = useRef(false);

  const loadVehicle = useCallback(async (silent = false) => {
    if (requestInProgress.current) return;

    requestInProgress.current = true;

    if (!silent) {
      setLoading(true);
    }

    try {
      const response = await fetch("/api/vehicle-snapshot", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });

      const text = await response.text();

      let data;

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("차량 서버 응답을 확인하지 못했습니다.");
      }

      if (!response.ok || !data.ok) {
        throw new Error(
          data.error || "차량 정보를 불러오지 못했습니다."
        );
      }

      setVehicle(data.vehicle);
      setError("");
      setLastUpdated(new Date());
      setSecondsAgo(0);

      window.dispatchEvent(
        new CustomEvent("cvolt:vehicle-updated", {
          detail: data.vehicle,
        })
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "차량 정보를 불러오지 못했습니다."
      );
    } finally {
      requestInProgress.current = false;

      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadVehicle();

    const dataTimer = window.setInterval(() => {
      loadVehicle(true);
    }, 30000);

    return () => {
      window.clearInterval(dataTimer);
    };
  }, [loadVehicle]);

  useEffect(() => {
    const clockTimer = window.setInterval(() => {
      if (!lastUpdated) return;

      setSecondsAgo(
        Math.floor(
          (Date.now() - lastUpdated.getTime()) / 1000
        )
      );
    }, 1000);

    return () => {
      window.clearInterval(clockTimer);
    };
  }, [lastUpdated]);

  if (loading && !vehicle) {
    return (
      <div className="v2-vehicle-loading">
        실제 차량 정보를 불러오는 중...
      </div>
    );
  }

  if (error && !vehicle) {
    return (
      <div className="v2-vehicle-error">
        <span>{error}</span>

        <button onClick={() => loadVehicle()}>
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

  const isDriving = vehicle?.isDriving === true;

  return (
    <div className="v2-vehicle-content">
      <div
        className={
          isDriving
            ? "v2-vehicle-visual driving"
            : "v2-vehicle-visual"
        }
      >
        <div className="v2-road-line" />

        <img
          src={vehicleImage}
          alt="Tesla"
          className="v2-vehicle-image"
        />
      </div>

      <div className="v2-vehicle-main-row">
        <div>
          <span className="v2-vehicle-name">
            {vehicle?.name || "My Tesla"}
          </span>

          <div className="v2-live-status">
            <span className="v2-live-dot" />

            LIVE · {formatUpdatedTime(secondsAgo)}
          </div>
        </div>

        <button
          className="v2-refresh-button"
          onClick={() => loadVehicle()}
          disabled={loading}
          aria-label="차량 정보 새로고침"
        >
          <FiRefreshCw className={loading ? "spinning" : ""} />
        </button>
      </div>

      <div className="v2-battery-row">
        <div>
          <span>배터리</span>

          <strong>
            {vehicle?.batteryLevel ?? "-"}
            <small>%</small>
          </strong>
        </div>

        <div className="v2-battery-bar">
          <span
            style={{
              width: `${vehicle?.batteryLevel ?? 0}%`,
            }}
          />
        </div>

        <div className="v2-range">
          예상 주행 가능 거리
          <strong>{vehicle?.rangeKm ?? "-"}km</strong>
        </div>
      </div>

      <div className="v2-vehicle-status-grid">
        <div>
          <FiLock />

          <span>
            {vehicle?.locked === null
              ? "확인 불가"
              : vehicle?.locked
                ? "잠김"
                : "열림"}
          </span>
        </div>

        <div>
          <FiThermometer />

          <span>
            실내{" "}
            {vehicle?.insideTemp !== null
              ? `${Math.round(vehicle.insideTemp)}℃`
              : "-"}
          </span>
        </div>

        <div>
          <HiOutlineBolt />

          <span>
            {translateChargingState(
              vehicle?.chargingState
            )}
          </span>
        </div>
      </div>
    </div>
  );
}