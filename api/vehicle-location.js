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

  return decodeURIComponent(target.slice(name.length + 1));
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({
      error: "GET 요청만 허용됩니다.",
    });
  }

  res.setHeader("Cache-Control", "no-store");

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

    const authHeaders = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };

    // 차량 목록 조회
    const listResponse = await fetch(
      `${FLEET_API_BASE}/api/1/vehicles`,
      { headers: authHeaders }
    );

    const listData = await listResponse.json();

    if (!listResponse.ok) {
      return res.status(listResponse.status).json({
        ok: false,
        error: "차량 목록을 불러오지 못했습니다.",
        details: listData,
      });
    }

    const vehicle = listData.response?.[0];

    if (!vehicle) {
      return res.status(404).json({
        ok: false,
        error: "연결된 Tesla 차량이 없습니다.",
      });
    }

    // Sleep 상태면 깨우지 않음
    if (vehicle.state !== "online") {
      return res.status(200).json({
        ok: true,
        location: null,
        vehicleState: vehicle.state || "unknown",
        message:
          "차량이 절전 상태라 현재 위치를 조회하지 않았습니다.",
      });
    }

    // 위치 조회
    const dataResponse = await fetch(
      `${FLEET_API_BASE}/api/1/vehicles/${encodeURIComponent(
        vehicle.vin
      )}/vehicle_data?endpoints=location_data`,
      {
        headers: authHeaders,
      }
    );

    const data = await dataResponse.json();

    if (!dataResponse.ok) {
      return res.status(dataResponse.status).json({
        ok: false,
        error: "차량 위치를 불러오지 못했습니다.",
        details: data,
      });
    }

    const driveState = data.response?.drive_state || {};

    const latitude =
      typeof driveState.active_route_latitude === "number"
        ? driveState.active_route_latitude
        : driveState.latitude;

    const longitude =
      typeof driveState.active_route_longitude === "number"
        ? driveState.active_route_longitude
        : driveState.longitude;

    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number"
    ) {
      return res.status(200).json({
        ok: true,
        location: null,
        vehicleState: vehicle.state,
        message: "현재 위치 정보가 제공되지 않았습니다.",
      });
    }

    return res.status(200).json({
      ok: true,
      vehicleName:
        data.response?.display_name ||
        vehicle.display_name ||
        "My Tesla",

      vehicleState: vehicle.state,

      location: {
        latitude,
        longitude,
        heading: driveState.heading ?? null,
        speedMph: driveState.speed ?? null,
        timestamp: driveState.timestamp ?? null,
      },
    });

  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "차량 위치 조회 중 오류가 발생했습니다.",
      details: error.message,
    });
  }
}