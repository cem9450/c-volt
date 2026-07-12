import {
  CircleMarker,
  MapContainer,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";

import { useCallback, useEffect, useMemo, useState } from "react";
import "leaflet/dist/leaflet.css";

function formatTime(dateString) {
  if (!dateString) return "-";

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));
}

function FitRouteBounds({ positions }) {
  const map = useMap();

  useEffect(() => {
    if (positions.length === 0) return;

    if (positions.length === 1) {
      map.setView(positions[0], 15);
      return;
    }

    map.fitBounds(positions, {
      padding: [35, 35],
    });
  }, [map, positions]);

  return null;
}

export default function TodayRouteMap() {
  const [routeData, setRouteData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRoute = useCallback(async () => {
    try {
      const response = await fetch("/api/today-route", {
        credentials: "include",
        cache: "no-store",
      });

      const text = await response.text();

      let data;

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          "경로 서버가 올바르지 않은 응답을 보냈습니다."
        );
      }

      if (!response.ok || !data.ok) {
        throw new Error(
          data.error || "오늘 이동 경로를 불러오지 못했습니다."
        );
      }

      setRouteData(data);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "오늘 이동 경로를 불러오지 못했습니다."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoute();

    const intervalId = window.setInterval(() => {
      loadRoute();
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadRoute]);

  const positions = useMemo(() => {
    return (routeData?.points || []).map((point) => [
      point.latitude,
      point.longitude,
    ]);
  }, [routeData]);

  const startPoint = routeData?.startPoint;
  const endPoint = routeData?.endPoint;

  const defaultCenter = positions[0] || [37.5665, 126.978];

  return (
    <section className="today-route-card">
      <div className="today-route-header">
        <div>
          <span className="today-route-eyebrow">
            TODAY&apos;S ROUTE
          </span>

          <h2>오늘 이동 경로</h2>
        </div>

        <button
          type="button"
          className="today-route-refresh"
          onClick={loadRoute}
          disabled={loading}
        >
          {loading ? "확인 중" : "새로고침"}
        </button>
      </div>

      {error ? (
        <div className="today-route-empty">
          <strong>경로를 불러오지 못했습니다</strong>
          <span>{error}</span>
        </div>
      ) : loading && !routeData ? (
        <div className="today-route-empty">
          <strong>이동 경로 확인 중...</strong>
        </div>
      ) : positions.length === 0 ? (
        <div className="today-route-empty">
          <div className="today-route-empty-icon">⌁</div>

          <strong>아직 오늘 위치 기록이 없습니다</strong>

          <span>
            운행을 시작하면 이동 경로가 지도에 표시됩니다.
          </span>
        </div>
      ) : (
        <>
          <div className="today-route-map-wrapper">
            <MapContainer
              center={defaultCenter}
              zoom={15}
              scrollWheelZoom={false}
              className="today-route-map"
            >
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <FitRouteBounds positions={positions} />

              {positions.length > 1 && (
                <Polyline
                  positions={positions}
                  pathOptions={{
                    color: "#a83cff",
                    weight: 5,
                    opacity: 0.9,
                  }}
                />
              )}

              {startPoint && (
                <CircleMarker
                  center={[
                    startPoint.latitude,
                    startPoint.longitude,
                  ]}
                  radius={8}
                  pathOptions={{
                    color: "#4dff9a",
                    fillColor: "#4dff9a",
                    fillOpacity: 1,
                  }}
                >
                  <Popup>
                    출발
                    <br />
                    {formatTime(startPoint.createdAt)}
                  </Popup>
                </CircleMarker>
              )}

              {endPoint && (
                <CircleMarker
                  center={[
                    endPoint.latitude,
                    endPoint.longitude,
                  ]}
                  radius={8}
                  pathOptions={{
                    color: "#ff4d86",
                    fillColor: "#ff4d86",
                    fillOpacity: 1,
                  }}
                >
                  <Popup>
                    최근 위치
                    <br />
                    {formatTime(endPoint.createdAt)}
                  </Popup>
                </CircleMarker>
              )}
            </MapContainer>
          </div>

          <div className="today-route-summary">
            <div>
              <span>출발</span>
              <strong>{formatTime(startPoint?.createdAt)}</strong>
            </div>

            <div>
              <span>최근 기록</span>
              <strong>{formatTime(endPoint?.createdAt)}</strong>
            </div>

            <div>
              <span>경로 포인트</span>
              <strong>{routeData?.pointCount ?? 0}개</strong>
            </div>
          </div>
        </>
      )}
    </section>
  );
}