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

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({
      error: "GET 요청만 허용됩니다.",
    });
  }

  const headers = {
    "Cache-Control": "no-store",
  };

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

    // 차량 목록
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

    // 차량이 Sleep 상태면 깨우지 않음
    if (vehicle.state !== "online") {
      res.setHeader("Cache-Control", headers["Cache-Control"]);

      return res.status(200).json({
        ok: true,
        vehicle: {
          name: vehicle.display_name || "My Tesla",
          state: vehicle.state || "unknown",
          batteryLevel: null,
          rangeKm: null,
          chargingState: null,
        },
      });
    }

    // 실시간 데이터 조회
    const dataResponse = await fetch(
      `${FLEET_API_BASE}/api/1/vehicles/${encodeURIComponent(
        vehicle.vin
      )}/vehicle_data`,
      { headers: authHeaders }
    );

    const data = await dataResponse.json();

    if (!dataResponse.ok) {
      return res.status(dataResponse.status).json({
        ok: false,
        error: "실시간 차량 정보를 불러오지 못했습니다.",
        details: data,
      });
    }

    const live = data.response || {};
    const charge = live.charge_state || {};
    const climate = live.climate_state || {};
    const vehicleState = live.vehicle_state || {};

    res.setHeader("Cache-Control", headers["Cache-Control"]);

    return res.status(200).json({
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

        chargeLimit:
          charge.charge_limit_soc ?? null,

        chargerPowerKw:
          charge.charger_power ?? null,

        timeToFullCharge:
          typeof charge.time_to_full_charge === "number"
            ? charge.time_to_full_charge
            : null,

        energyAddedKwh:
          typeof charge.charge_energy_added === "number"
            ? charge.charge_energy_added
            : null,

        insideTemp:
          climate.inside_temp ?? null,

        outsideTemp:
          climate.outside_temp ?? null,

        locked:
          vehicleState.locked ?? null,

        odometer:
          typeof vehicleState.odometer === "number"
            ? Math.round(vehicleState.odometer * 1.60934)
            : null,
      },
    });

  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "차량 정보를 불러오는 중 오류가 발생했습니다.",
      details: error.message,
    });
  }
}