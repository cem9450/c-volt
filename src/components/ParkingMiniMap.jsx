import {
  CircleMarker,
  MapContainer,
  TileLayer,
  useMap,
} from "react-leaflet";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FiChevronRight,
  FiClock,
  FiMapPin,
} from "react-icons/fi";

import "leaflet/dist/leaflet.css";

function MoveMap({
  latitude,
  longitude,
}) {
  const map = useMap();

  useEffect(() => {
    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number"
    ) {
      return;
    }

    map.setView(
      [latitude, longitude],
      16
    );
  }, [latitude, longitude, map]);

  return null;
}

function getElapsedText(startedAt) {
  if (!startedAt) {
    return "주차 시간 확인 중";
  }

  const startedTime =
    new Date(startedAt).getTime();

  if (!Number.isFinite(startedTime)) {
    return "주차 시간 확인 중";
  }

  const elapsedMs =
    Date.now() - startedTime;

  const elapsedMinutes = Math.max(
    Math.floor(elapsedMs / 60000),
    0
  );

  if (elapsedMinutes < 1) {
    return "방금 주차";
  }

  if (elapsedMinutes < 60) {
    return `주차 ${elapsedMinutes}분 경과`;
  }

  const hours =
    Math.floor(elapsedMinutes / 60);

  const minutes =
    elapsedMinutes % 60;

  return `주차 ${hours}시간 ${minutes}분 경과`;
}

export default function ParkingMiniMap() {
  const [location, setLocation] =
    useState(null);

  const [message, setMessage] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [parkedAt, setParkedAt] =
    useState(() =>
      localStorage.getItem(
        "cvolt_parked_at"
      )
    );

  const [memo, setMemo] =
    useState(() =>
      localStorage.getItem(
        "cvolt_parking_memo"
      ) || ""
    );

  const [, setClockTick] =
    useState(0);

  const loadLocation =
    useCallback(async () => {
      try {
        const response = await fetch(
          "/api/vehicle-location",
          {
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
            "차량 위치 서버 응답을 확인하지 못했습니다."
          );
        }

        if (!response.ok || !data.ok) {
          throw new Error(
            data.error ||
              "차량 위치를 불러오지 못했습니다."
          );
        }

        if (data.location) {
          setLocation(data.location);
          setMessage("");
        } else {
          setLocation(null);
          setMessage(
            data.message ||
              "현재 위치 정보가 없습니다."
          );
        }
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

    const locationTimer =
      window.setInterval(
        loadLocation,
        30000
      );

    const clockTimer =
      window.setInterval(() => {
        setClockTick(
          (value) => value + 1
        );
      }, 60000);

    return () => {
      window.clearInterval(
        locationTimer
      );

      window.clearInterval(
        clockTimer
      );
    };
  }, [loadLocation]);

  useEffect(() => {
    function handleParkingUpdated(
      event
    ) {
      const detail =
        event.detail || {};

      if (detail.isDriving) {
        setParkedAt(null);

        localStorage.removeItem(
          "cvolt_parked_at"
        );
      } else if (detail.parkedAt) {
        setParkedAt(
          detail.parkedAt
        );

        localStorage.setItem(
          "cvolt_parked_at",
          detail.parkedAt
        );
      }

      if (detail.clearMemo) {
        setMemo("");

        localStorage.removeItem(
          "cvolt_parking_memo"
        );
      }
    }

    window.addEventListener(
      "cvolt:parking-updated",
      handleParkingUpdated
    );

    return () => {
      window.removeEventListener(
        "cvolt:parking-updated",
        handleParkingUpdated
      );
    };
  }, []);

  const elapsedText = useMemo(
    () => getElapsedText(parkedAt),
    [parkedAt]
  );

  function handleMemoChange(event) {
    const nextMemo =
      event.target.value;

    setMemo(nextMemo);

    if (nextMemo.trim()) {
      localStorage.setItem(
        "cvolt_parking_memo",
        nextMemo
      );
    } else {
      localStorage.removeItem(
        "cvolt_parking_memo"
      );
    }
  }

  function openGoogleMap() {
    if (!location) return;

    const mapUrl =
      "https://www.google.com/maps/search/?api=1&query=" +
      `${location.latitude},${location.longitude}`;

    window.open(
      mapUrl,
      "_blank",
      "noopener,noreferrer"
    );
  }

  if (loading) {
    return (
      <div className="parking-reference-empty">
        현재 주차 위치 확인 중...
      </div>
    );
  }

  if (!location) {
    return (
      <div className="parking-reference-empty">
        {message ||
          "현재 위치 정보가 없습니다."}
      </div>
    );
  }

  return (
    <div className="parking-reference-card">
      <div className="parking-reference-header">
        <h2>현재 주차 위치</h2>

        <button
          type="button"
          onClick={openGoogleMap}
        >
          지도에서 보기
          <FiChevronRight />
        </button>
      </div>

      <div className="parking-reference-body">
        <div className="parking-reference-info">
          <div className="parking-reference-location">
            <FiMapPin />

            <div>
              <strong>
                현재 차량 위치
              </strong>

              <span>
                지도에서 정확한 위치를
                확인하세요
              </span>
            </div>
          </div>

          <div className="parking-reference-time">
            <FiClock />
            <span>{elapsedText}</span>
          </div>
        </div>

        <div className="parking-reference-map-wrap">
          <MapContainer
            center={[
              location.latitude,
              location.longitude,
            ]}
            zoom={16}
            zoomControl={false}
            scrollWheelZoom={false}
            dragging={false}
            doubleClickZoom={false}
            attributionControl={false}
            className="parking-reference-map"
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MoveMap
              latitude={
                location.latitude
              }
              longitude={
                location.longitude
              }
            />

            <CircleMarker
              center={[
                location.latitude,
                location.longitude,
              ]}
              radius={10}
              pathOptions={{
                color: "#d17cff",
                fillColor: "#9d42ff",
                fillOpacity: 1,
                weight: 3,
              }}
            />
          </MapContainer>

          <div className="parking-reference-pin-glow" />
        </div>
      </div>

      <div className="parking-reference-note">
        <span>주차 메모</span>

        <input
          type="text"
          value={memo}
          onChange={handleMemoChange}
          placeholder="예: B3 C27, 엘리베이터 4번 옆"
        />
      </div>
    </div>
  );
}