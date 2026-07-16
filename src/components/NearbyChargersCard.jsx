import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  FiChevronRight,
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
    hasTotal
  ) {
    return `${available}/${total}기 이용 가능`;
  }

  if (hasTotal) {
    return `총 ${total}기`;
  }

  return "충전기 현황 확인";
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
            (site, index) => (
              <button
                type="button"
                className="charger-reference-item"
                key={site.id}
                onClick={() =>
                  openNavigation(site)
                }
              >
                <div className="charger-reference-rank">
                  {index === 0 ? (
                    <FiZap />
                  ) : (
                    index + 1
                  )}
                </div>

                <div className="charger-reference-copy">
                  <strong>
                    {site.name}
                  </strong>

                  <span>
                    {site.distanceKm !==
                    null
                      ? `${site.distanceKm.toFixed(
                          1
                        )}km`
                      : "거리 확인 중"}

                    {" · "}

                    {getStallText(site)}
                  </span>
                </div>

                <div className="charger-reference-action">
                  <FiNavigation />
                  <FiChevronRight />
                </div>
              </button>
            )
          )}
        </div>
      )}

      <p className="chargers-reference-notice">
        충전기 이용 가능 수는 Tesla에서
        제공될 때만 표시됩니다. 길찾기는
        Google 지도에서 열립니다.
      </p>
    </div>
  );
}