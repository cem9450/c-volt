import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  FiMapPin,
  FiNavigation,
  FiRefreshCw,
  FiZap,
} from "react-icons/fi";

function getStallText(site) {
  const available =
    Number(site.availableStalls);

  const total =
    Number(site.totalStalls);

  const hasAvailable =
    Number.isFinite(available);

  const hasTotal =
    Number.isFinite(total);

  if (
    hasAvailable &&
    hasTotal &&
    total > 0
  ) {
    return `${available}/${total}기 이용 가능`;
  }

  if (hasTotal && total > 0) {
    return `총 ${total}기`;
  }

  return "실시간 현황 없음";
}

function getCongestion(site) {
  const available =
    Number(site.availableStalls);

  const total =
    Number(site.totalStalls);

  if (
    !Number.isFinite(available) ||
    !Number.isFinite(total) ||
    total <= 0
  ) {
    return {
      key: "unknown",
      label: "현황 미확인",
      icon: "⚪",
    };
  }

  const ratio =
    available / total;

  if (available === 0) {
    return {
      key: "busy",
      label: "혼잡",
      icon: "🔴",
    };
  }

  if (ratio >= 0.5) {
    return {
      key: "available",
      label: "여유",
      icon: "🟢",
    };
  }

  return {
    key: "normal",
    label: "보통",
    icon: "🟡",
  };
}

function getEstimatedMinutes(distanceKm) {
  const distance =
    Number(distanceKm);

  if (!Number.isFinite(distance)) {
    return null;
  }

  if (distance <= 1) {
    return 2;
  }

  return Math.max(
    Math.round(
      (distance / 35) * 60
    ),
    2
  );
}

function isDestinationCharger(site) {
  const type = String(
    site.type || ""
  ).toLowerCase();

  const name = String(
    site.name || ""
  ).toLowerCase();

  return (
    type.includes("destination") ||
    type.includes("destination_charger") ||
    name.includes("hotel") ||
    name.includes("호텔") ||
    name.includes("resort") ||
    name.includes("리조트")
  );
}

function openNavigation(site) {
  if (
    typeof site.latitude ===
      "number" &&
    typeof site.longitude ===
      "number"
  ) {
    const url =
      "https://www.google.com/maps/dir/?api=1&destination=" +
      `${site.latitude},${site.longitude}`;

    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );

    return;
  }

  const query =
    encodeURIComponent(site.name);

  window.open(
    `https://www.google.com/maps/search/?api=1&query=${query}`,
    "_blank",
    "noopener,noreferrer"
  );
}

export default function NearbyChargersCard() {
  const [sites, setSites] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const loadChargers =
    useCallback(async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          "/api/nearby-chargers",
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
            "충전소 서버 응답을 확인하지 못했습니다."
          );
        }

        if (
          !response.ok ||
          !data.ok
        ) {
          throw new Error(
            data.error ||
              "주변 충전소를 불러오지 못했습니다."
          );
        }

        setSites(
          Array.isArray(data.sites)
            ? data.sites
            : []
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "주변 충전소를 불러오지 못했습니다."
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    loadChargers();
  }, [loadChargers]);

  return (
    <div className="chargers-reference-card">
      <header className="chargers-reference-header">
        <div>
          <span>
            NEARBY CHARGING
          </span>

          <h2>
            주변 슈퍼차저
          </h2>
        </div>

        <button
          type="button"
          onClick={loadChargers}
          disabled={loading}
          aria-label="충전소 새로고침"
        >
          <FiRefreshCw
            className={
              loading
                ? "chargers-spin"
                : ""
            }
          />
        </button>
      </header>

      {loading &&
        sites.length === 0 && (
          <div className="chargers-reference-state">
            <FiZap />

            <span>
              차량 주변 충전소를 찾는 중...
            </span>
          </div>
        )}

      {!loading &&
        error &&
        sites.length === 0 && (
          <div className="chargers-reference-state error">
            <FiZap />

            <strong>
              충전소를 불러오지 못했어요
            </strong>

            <span>{error}</span>

            <button
              type="button"
              onClick={loadChargers}
            >
              다시 불러오기
            </button>
          </div>
        )}

      {!loading &&
        !error &&
        sites.length === 0 && (
          <div className="chargers-reference-state">
            <FiMapPin />

            <strong>
              주변 충전소가 표시되지 않아요
            </strong>

            <span>
              차량이 온라인인지 확인한 뒤
              다시 시도해주세요.
            </span>
          </div>
        )}

      {sites.length > 0 && (
        <div className="chargers-reference-list">
          {sites.map(
            (site, index) => {
              const congestion =
                getCongestion(site);

              const estimatedMinutes =
                getEstimatedMinutes(
                  site.distanceKm
                );

              const destination =
                isDestinationCharger(site);

              return (
                <button
                  type="button"
                  className={
                    index === 0
                      ? "charger-reference-item recommended"
                      : "charger-reference-item"
                  }
                  key={site.id}
                  onClick={() =>
                    openNavigation(site)
                  }
                >
                  <div
                    className={
                      destination
                        ? "charger-reference-rank destination"
                        : "charger-reference-rank"
                    }
                  >
                    {destination ? (
  <span className="charger-destination-symbol">
    🔌
  </span>
) : index === 0 ? (
  <FiZap />
) : (
  index + 1
)}
                  </div>

                  <div className="charger-reference-copy">
                    <div className="charger-reference-title-row">
                      <strong>
                        {site.name}
                      </strong>

                      {index === 0 && (
                        <em>
                          추천
                        </em>
                      )}
                    </div>

                    <div className="charger-reference-type">
                      {destination
                        ? "Destination"
                        : "Supercharger"}
                    </div>

                    <span>
                      {site.distanceKm !==
                      null
                        ? `${site.distanceKm.toFixed(
                            1
                          )}km`
                        : "거리 확인 중"}

                      {estimatedMinutes !==
                        null &&
                        ` · 약 ${estimatedMinutes}분`}
                    </span>

                    <span
                      className={`charger-reference-congestion ${congestion.key}`}
                    >
                      {congestion.icon}
                      {" "}
                      {congestion.label}
                      {" · "}
                      {getStallText(site)}
                    </span>
                  </div>

                  <div className="charger-reference-action">
                    <FiNavigation />
                  </div>
                </button>
              );
            }
          )}
        </div>
      )}

      <p className="chargers-reference-notice">
        실시간 충전 정보는 Tesla Fleet API
        기준입니다.
      </p>
    </div>
  );
}