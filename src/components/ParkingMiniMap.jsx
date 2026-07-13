import {
  CircleMarker,
  MapContainer,
  TileLayer,
  useMap,
} from "react-leaflet";

import { useCallback, useEffect, useState } from "react";
import { FiChevronRight, FiMapPin } from "react-icons/fi";

import "leaflet/dist/leaflet.css";

function MoveMap({ latitude, longitude }) {
  const map = useMap();

  useEffect(() => {
    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number"
    ) {
      return;
    }

    map.setView([latitude, longitude], 16);
  }, [latitude, longitude, map]);

  return null;
}

export default function ParkingMiniMap() {
  const [location, setLocation] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const loadLocation = useCallback(async () => {
    try {
      const response = await fetch(
        "/api/vehicle-location",
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

      setLocation(data.location || null);
      setMessage(data.message || "");
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : "차량 위치를 불러오지 못했습니다."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLocation();

    const timer = window.setInterval(() => {
      loadLocation();
    }, 30000);

    return () => {
      window.clearInterval(timer);
    };
  }, [loadLocation]);

  function openGoogleMap() {
    if (!location) return;

    const url =
      "https://www.google.com/maps/search/?api=1&query=" +
      `${location.latitude},${location.longitude}`;

    window.open(url, "_blank", "noopener,noreferrer");
  }

  if (loading) {
    return (
      <div className="v2-parking-empty">
        현재 주차 위치 확인 중...
      </div>
    );
  }

  if (!location) {
    return (
      <div className="v2-parking-empty">
        {message || "현재 위치 정보가 없습니다."}
      </div>
    );
  }

  return (
    <div className="v2-parking-content">
      <div className="v2-parking-info">
        <div className="v2-parking-place">
          <FiMapPin />

          <div>
            <span>현재 차량 위치</span>
            <strong>지도에서 바로 확인하세요</strong>
          </div>
        </div>

        <button
          type="button"
          className="v2-map-link"
          onClick={openGoogleMap}
        >
          지도에서 보기
          <FiChevronRight />
        </button>
      </div>

      <div className="v2-mini-map-wrapper">
        <MapContainer
          center={[
            location.latitude,
            location.longitude,
          ]}
          zoom={16}
          scrollWheelZoom={false}
          zoomControl={false}
          dragging={false}
          doubleClickZoom={false}
          className="v2-mini-map"
        >
          <TileLayer
            attribution="&copy; OpenStreetMap"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MoveMap
            latitude={location.latitude}
            longitude={location.longitude}
          />

          <CircleMarker
            center={[
              location.latitude,
              location.longitude,
            ]}
            radius={10}
            pathOptions={{
              color: "#bd65ff",
              fillColor: "#9d3cff",
              fillOpacity: 1,
            }}
          />
        </MapContainer>
      </div>

      <div className="v2-parking-memo">
        <span>주차 메모</span>

        <input
          type="text"
          placeholder="예: B3 C27, 엘리베이터 4번 옆"
        />
      </div>
    </div>
  );
}