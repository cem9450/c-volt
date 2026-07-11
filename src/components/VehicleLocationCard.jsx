import { useState } from "react";

export default function VehicleLocationCard() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function openVehicleLocation() {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        "/.netlify/functions/vehicle-location",
        {
          credentials: "include",
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(
          data.error || "차량 위치를 불러오지 못했습니다."
        );
      }

      if (!data.location) {
        setMessage(
          data.message || "현재 위치 정보가 없습니다."
        );
        return;
      }

      const { latitude, longitude } = data.location;

      const mapUrl =
        `https://www.google.com/maps/search/?api=1&query=` +
        `${latitude},${longitude}`;

      window.open(mapUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="vehicle-location-card">
      <div>
        <span className="location-label">차량 위치</span>
        <strong>내 Tesla가 어디 있는지 확인</strong>
      </div>

      <button
        className="location-button"
        onClick={openVehicleLocation}
        disabled={loading}
      >
        {loading ? "위치 확인 중..." : "지도에서 보기"}
      </button>

      {message && (
        <p className="location-message">{message}</p>
      )}
    </section>
  );
}