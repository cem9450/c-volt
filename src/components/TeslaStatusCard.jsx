import { useCallback, useEffect, useState } from "react";
import { SiTesla } from "react-icons/si";

function translateChargingState(state) {
  const labels = {
    Charging: "충전 중",
    Complete: "충전 완료",
    Disconnected: "미연결",
    Stopped: "충전 중지",
    Starting: "충전 시작 중",
    NoPower: "전원 없음",
    Unknown: "확인 불가",
  };

  return labels[state] || state || "확인 불가";
}

function translateVehicleState(state) {
  const labels = {
    online: "온라인",
    asleep: "절전 상태",
    offline: "오프라인",
    waking: "차량 깨우는 중",
  };

  return labels[state] || state || "상태 확인 중";
}

export default function TeslaStatusCard() {
  const [vehicle, setVehicle] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadVehicle = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/.netlify/functions/vehicle-status",
        {
          credentials: "include",
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(
          data.error || "차량 정보를 불러오지 못했습니다."
        );
      }

      setVehicle(data.vehicle);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVehicle();
  }, [loadVehicle]);

  if (loading && !vehicle) {
    return (
      <section className="tesla-status-card">
        <div className="tesla-status-loading">
          실제 차량 정보 불러오는 중...
        </div>
      </section>
    );
  }

  if (error && !vehicle) {
    return (
      <section className="tesla-status-card">
        <div className="tesla-status-error">{error}</div>

        <button
          className="tesla-refresh-button"
          onClick={loadVehicle}
        >
          다시 불러오기
        </button>
      </section>
    );
  }

  const isOnline = vehicle?.state === "online";

  return (
    <section className="tesla-status-card">
      <div className="tesla-status-head">
        <div className="tesla-car-name">
          <SiTesla />

          <div>
            <strong>{vehicle?.name || "My Tesla"}</strong>

            <span className={isOnline ? "online" : "sleeping"}>
              {translateVehicleState(vehicle?.state)}
            </span>
          </div>
        </div>

        <button
          className="tesla-refresh-button compact"
          onClick={loadVehicle}
          disabled={loading}
        >
          {loading ? "갱신 중" : "새로고침"}
        </button>
      </div>

      {vehicle?.batteryLevel !== null ? (
        <div className="tesla-live-grid expanded">
          <div>
            <span>배터리</span>
            <strong>{vehicle.batteryLevel}%</strong>
          </div>

          <div>
            <span>주행 가능</span>
            <strong>{vehicle.rangeKm ?? "-"} km</strong>
          </div>

          <div>
            <span>충전 상태</span>
            <strong>
              {translateChargingState(vehicle.chargingState)}
            </strong>
          </div>
          {vehicle.chargingState === "Charging" && (
  <>
    <div>
      <span>충전 목표</span>
      <strong>
        {vehicle.chargeLimit !== null
          ? `${vehicle.chargeLimit}%`
          : "-"}
      </strong>
    </div>

    <div>
      <span>충전 속도</span>
      <strong>
        {vehicle.chargerPowerKw !== null
          ? `${vehicle.chargerPowerKw} kW`
          : "-"}
      </strong>
    </div>

    <div>
      <span>완료까지</span>
      <strong>
        {vehicle.timeToFullCharge !== null
          ? `${Math.floor(vehicle.timeToFullCharge)}시간 ${Math.round(
              (vehicle.timeToFullCharge % 1) * 60
            )}분`
          : "-"}
      </strong>
    </div>

    <div className="wide">
      <span>이번 충전량</span>
      <strong>
        {vehicle.energyAddedKwh !== null
          ? `${vehicle.energyAddedKwh.toFixed(1)} kWh`
          : "-"}
      </strong>
    </div>
  </>
)}

          <div>
            <span>실내 온도</span>
            <strong>
              {vehicle.insideTemp !== null
                ? `${Math.round(vehicle.insideTemp)}℃`
                : "-"}
            </strong>
          </div>

          <div>
            <span>실외 온도</span>
            <strong>
              {vehicle.outsideTemp !== null
                ? `${Math.round(vehicle.outsideTemp)}℃`
                : "-"}
            </strong>
          </div>

          <div>
            <span>문 상태</span>
            <strong>
              {vehicle.locked === null
                ? "확인 불가"
                : vehicle.locked
                  ? "잠김"
                  : "열림"}
            </strong>
          </div>

          <div className="wide">
            <span>누적 주행거리</span>
            <strong>
              {vehicle.odometer !== null
                ? `${vehicle.odometer.toLocaleString()} km`
                : "-"}
            </strong>
          </div>
        </div>
      ) : (
        <p className="tesla-sleep-message">
          차량이 절전 상태입니다. Tesla 앱에서 차량을 깨운 뒤
          새로고침을 눌러주세요.
        </p>
      )}
    </section>
  );
}