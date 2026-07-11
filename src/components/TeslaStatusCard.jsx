import { useEffect, useState } from "react";
import { SiTesla } from "react-icons/si";

export default function TeslaStatusCard() {
  const [vehicle, setVehicle] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/.netlify/functions/vehicle-status", {
      credentials: "include",
    })
      .then(async (response) => {
        const data = await response.json();

        if (!response.ok || !data.ok) {
          throw new Error(
            data.error || "차량 정보를 불러오지 못했습니다."
          );
        }

        setVehicle(data.vehicle);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <section className="tesla-status-card">
        <div className="tesla-status-loading">
          실제 차량 정보 불러오는 중...
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="tesla-status-card">
        <div className="tesla-status-error">{error}</div>
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
            <strong>{vehicle.name}</strong>
            <span className={isOnline ? "online" : "sleeping"}>
              {isOnline ? "Online" : vehicle.state}
            </span>
          </div>
        </div>
      </div>

      {vehicle.batteryLevel !== null ? (
        <div className="tesla-live-grid">
          <div>
            <span>BATTERY</span>
            <strong>{vehicle.batteryLevel}%</strong>
          </div>

          <div>
            <span>RANGE</span>
            <strong>{vehicle.rangeKm} km</strong>
          </div>

          <div>
            <span>CHARGING</span>
            <strong>{vehicle.chargingState}</strong>
          </div>
        </div>
      ) : (
        <p className="tesla-sleep-message">
          차량이 절전 상태입니다. Tesla 앱에서 차량을 열면
          실시간 정보가 표시됩니다.
        </p>
      )}
    </section>
  );
}