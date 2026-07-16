const FLEET_API_BASE =
  "https://fleet-api.prd.na.vn.cloud.tesla.com";

function getCookie(cookieHeader, name) {
  const cookies = (cookieHeader || "")
    .split(";")
    .map((cookie) => cookie.trim())
    .filter(Boolean);

  const target = cookies.find((cookie) =>
    cookie.startsWith(`${name}=`)
  );

  if (!target) return null;

  return decodeURIComponent(
    target.slice(name.length + 1)
  );
}

async function readJson(response) {
  const text = await response.text();

  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return {
      raw: text,
    };
  }
}

function toNumber(value) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}

function roundOne(value) {
  const number = toNumber(value);

  if (number === null) {
    return null;
  }

  return Math.round(number * 10) / 10;
}

function milesToKm(value) {
  const miles = toNumber(value);

  if (miles === null) {
    return null;
  }

  return roundOne(miles * 1.60934);
}

function normalizeSite(site, index) {
  const latitude =
    toNumber(site.latitude) ??
    toNumber(site.location?.lat) ??
    toNumber(site.location?.latitude) ??
    toNumber(site.gps?.latitude);

  const longitude =
    toNumber(site.longitude) ??
    toNumber(site.location?.long) ??
    toNumber(site.location?.lng) ??
    toNumber(site.location?.longitude) ??
    toNumber(site.gps?.longitude);

  const distanceMiles =
    toNumber(site.distance_miles) ??
    toNumber(site.distance);

  const totalStalls =
    toNumber(site.total_stalls) ??
    toNumber(site.totalStalls) ??
    toNumber(site.num_stalls) ??
    toNumber(site.stalls);

  const availableStalls =
    toNumber(site.available_stalls) ??
    toNumber(site.availableStalls) ??
    toNumber(site.available);

  const name =
    site.name ||
    site.site_name ||
    site.location_name ||
    site.title ||
    "Tesla 충전소";

  return {
    id:
      site.id ||
      site.site_id ||
      `${name}-${index}`,

    name,

    type:
      site.type ||
      site.charger_type ||
      "supercharger",

    distanceKm:
      milesToKm(distanceMiles),

    latitude,
    longitude,

    availableStalls,
    totalStalls,

    amenity:
      site.amenity ||
      site.address ||
      null,

    raw: site,
  };
}

function extractSites(payload) {
  const response =
    payload?.response || payload || {};

  const possibleLists = [
    response.superchargers,
    response.charging_sites,
    response.sites,
    response.destination_charging,
    response.destination_chargers,
  ];

  const sites = possibleLists.flatMap(
    (list) =>
      Array.isArray(list) ? list : []
  );

  if (sites.length > 0) {
    return sites;
  }

  if (Array.isArray(response)) {
    return response;
  }

  return [];
}

export default async function handler(
  req,
  res
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");

    return res.status(405).json({
      ok: false,
      error: "GET 요청만 허용됩니다.",
    });
  }

  res.setHeader(
    "Cache-Control",
    "private, no-store"
  );

  try {
    const accessToken = getCookie(
      req.headers.cookie ?? "",
      "cvolt_access_token"
    );

    if (!accessToken) {
      return res.status(401).json({
        ok: false,
        error: "Tesla 로그인이 필요합니다.",
      });
    }

    const headers = {
      Authorization:
        `Bearer ${accessToken}`,

      "Content-Type":
        "application/json",
    };

    const vehicleListResponse =
      await fetch(
        `${FLEET_API_BASE}/api/1/vehicles`,
        {
          method: "GET",
          headers,
        }
      );

    const vehicleListData =
      await readJson(
        vehicleListResponse
      );

    if (!vehicleListResponse.ok) {
      return res
        .status(
          vehicleListResponse.status
        )
        .json({
          ok: false,

          error:
            "차량 목록을 불러오지 못했습니다.",

          details:
            vehicleListData,
        });
    }

    const vehicle =
      vehicleListData.response?.[0];

    if (!vehicle?.vin) {
      return res.status(404).json({
        ok: false,
        error:
          "연결된 Tesla 차량의 VIN을 확인하지 못했습니다.",
      });
    }

    const chargingResponse =
      await fetch(
        `${FLEET_API_BASE}/api/1/vehicles/${encodeURIComponent(
          vehicle.vin
        )}/nearby_charging_sites`,
        {
          method: "GET",
          headers,
        }
      );

    const chargingData =
      await readJson(
        chargingResponse
      );

    if (!chargingResponse.ok) {
      const teslaError =
        chargingData?.error ||
        chargingData?.error_description;

      return res
        .status(
          chargingResponse.status
        )
        .json({
          ok: false,

          error:
            teslaError ||
            "주변 충전소를 불러오지 못했습니다.",

          details:
            chargingData,
        });
    }

    const sites = extractSites(
      chargingData
    )
      .map(normalizeSite)
      .filter((site) =>
        site.name
      )
      .sort((a, b) => {
        if (
          a.distanceKm === null &&
          b.distanceKm === null
        ) {
          return 0;
        }

        if (a.distanceKm === null) {
          return 1;
        }

        if (b.distanceKm === null) {
          return -1;
        }

        return (
          a.distanceKm -
          b.distanceKm
        );
      })
      .slice(0, 5);

    return res.status(200).json({
      ok: true,
      hasData: sites.length > 0,
      vehicleState:
        vehicle.state || "unknown",
      sites,
    });
  } catch (error) {
    console.error(
      "nearby-chargers error:",
      error
    );

    return res
      .status(
        error.statusCode || 500
      )
      .json({
        ok: false,

        error:
          error.message ||
          "주변 충전소를 불러오지 못했습니다.",

        details:
          error.details || null,
      });
  }
}