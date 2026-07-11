const FLEET_API_BASE =
  "https://fleet-api.prd.na.vn.cloud.tesla.com";

function getCookie(cookieHeader, name) {
  const cookies = (cookieHeader || "")
    .split(";")
    .map((cookie) => cookie.trim());

  const target = cookies.find((cookie) =>
    cookie.startsWith(`${name}=`)
  );

  if (!target) return null;

  return decodeURIComponent(target.slice(name.length + 1));
}

export async function handler(event) {
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  };

  try {
    const accessToken = getCookie(
      event.headers.cookie,
      "cvolt_access_token"
    );

    if (!accessToken) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          ok: false,
          error: "Tesla 로그인이 필요합니다.",
        }),
      };
    }

    const authHeaders = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };

    // 계정에 연결된 차량 목록
    const listResponse = await fetch(
      `${FLEET_API_BASE}/api/1/vehicles`,
      { headers: authHeaders }
    );

    const listData = await listResponse.json();

    if (!listResponse.ok) {
      return {
        statusCode: listResponse.status,
        headers,
        body: JSON.stringify({
          ok: false,
          error: "차량 목록을 불러오지 못했습니다.",
          details: listData,
        }),
      };
    }

    const vehicle = listData.response?.[0];

    if (!vehicle) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          ok: false,
          error: "연결된 Tesla 차량이 없습니다.",
        }),
      };
    }

    // 차량이 잠들어 있으면 억지로 깨우지 않음
    if (vehicle.state !== "online") {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          vehicle: {
            name: vehicle.display_name || "My Tesla",
            state: vehicle.state || "unknown",
            batteryLevel: null,
            rangeKm: null,
            chargingState: null,
          },
        }),
      };
    }

    // 차량이 온라인일 때만 실시간 정보 조회
    const dataResponse = await fetch(
      `${FLEET_API_BASE}/api/1/vehicles/${encodeURIComponent(
        vehicle.vin
      )}/vehicle_data`,
      { headers: authHeaders }
    );

    const data = await dataResponse.json();

    if (!dataResponse.ok) {
      return {
        statusCode: dataResponse.status,
        headers,
        body: JSON.stringify({
          ok: false,
          error: "실시간 차량 정보를 불러오지 못했습니다.",
          details: data,
        }),
      };
    }

    const live = data.response || {};
    const charge = live.charge_state || {};

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        vehicle: {
          name:
            live.display_name ||
            vehicle.display_name ||
            "My Tesla",
          state: vehicle.state,
          batteryLevel: charge.battery_level ?? null,
          rangeKm:
            typeof charge.battery_range === "number"
              ? Math.round(charge.battery_range * 1.60934)
              : null,
          chargingState:
            charge.charging_state || "Unknown",
          chargePortOpen:
            charge.charge_port_door_open ?? false,
        },
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        ok: false,
        error: "차량 정보를 불러오는 중 오류가 발생했습니다.",
        details: error.message,
      }),
    };
  }
}