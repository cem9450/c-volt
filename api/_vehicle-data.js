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

async function readJson(response) {
  const text = await response.text();

  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

export async function getCurrentVehicleData(req) {
  const accessToken = getCookie(
    req.headers.cookie ?? "",
    "cvolt_access_token"
  );

  if (!accessToken) {
    const error = new Error("Tesla 로그인이 필요합니다.");
    error.statusCode = 401;
    throw error;
  }

  const authHeaders = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  const listResponse = await fetch(
    `${FLEET_API_BASE}/api/1/vehicles`,
    {
      method: "GET",
      headers: authHeaders,
    }
  );

  const listData = await readJson(listResponse);

  if (!listResponse.ok) {
    const error = new Error(
      "차량 목록을 불러오지 못했습니다."
    );
    error.statusCode = listResponse.status;
    error.details = listData;
    throw error;
  }

  const vehicle = listData.response?.[0];

  if (!vehicle) {
    const error = new Error(
      "연결된 Tesla 차량이 없습니다."
    );
    error.statusCode = 404;
    throw error;
  }

  const baseVehicle = {
    id: vehicle.id_s || String(vehicle.id),
    vin: vehicle.vin || null,
    name: vehicle.display_name || "My Tesla",
    state: vehicle.state || "unknown",
  };

  if (vehicle.state !== "online") {
    return {
      ...baseVehicle,
      doors: null,
      windows: null,
      frunkOpen: null,
      trunkOpen: null,
      sentryMode: null,
      batteryLevel: null,
      rangeKm: null,
      chargingState: null,
      chargePortOpen: null,
      chargeLimit: null,
      chargerPowerKw: null,
      timeToFullCharge: null,
      energyAddedKwh: null,
      insideTemp: null,
      outsideTemp: null,
      locked: null,
      odometerKm: null,
      latitude: null,
      longitude: null,
      speedKmh: null,
      heading: null,
      timestamp: Date.now(),
      isDriving: false,
    };
  }

  const dataResponse = await fetch(
    `${FLEET_API_BASE}/api/1/vehicles/${encodeURIComponent(
      vehicle.vin
    )}/vehicle_data`,
    {
      method: "GET",
      headers: authHeaders,
    }
  );

  const data = await readJson(dataResponse);

  if (!dataResponse.ok) {
    const error = new Error(
      "실시간 차량 정보를 불러오지 못했습니다."
    );
    error.statusCode = dataResponse.status;
    error.details = data;
    throw error;
  }

  const live = data.response || {};
  const charge = live.charge_state || {};
  const climate = live.climate_state || {};
  const vehicleState = live.vehicle_state || {};
    const doorState = {
    driverFront:
      Number(vehicleState.df) > 0,

    driverRear:
      Number(vehicleState.dr) > 0,

    passengerFront:
      Number(vehicleState.pf) > 0,

    passengerRear:
      Number(vehicleState.pr) > 0,
  };

  const windowState = {
    driverFront:
      Number(vehicleState.fd) > 0,

    driverRear:
      Number(vehicleState.rd) > 0,

    passengerFront:
      Number(vehicleState.fp) > 0,

    passengerRear:
      Number(vehicleState.rp) > 0,
  };

  const trunkState = {
    front:
      Number(vehicleState.ft) > 0,

    rear:
      Number(vehicleState.rt) > 0,
  };
  const driveState = live.drive_state || {};

  const latitude =
    typeof driveState.active_route_latitude === "number"
      ? driveState.active_route_latitude
      : typeof driveState.latitude === "number"
        ? driveState.latitude
        : null;

  const longitude =
    typeof driveState.active_route_longitude === "number"
      ? driveState.active_route_longitude
      : typeof driveState.longitude === "number"
        ? driveState.longitude
        : null;

  const speedMph =
    typeof driveState.speed === "number"
      ? driveState.speed
      : null;

  const speedKmh =
    speedMph === null
      ? null
      : Math.round(speedMph * 1.60934 * 10) / 10;

  const shiftState = driveState.shift_state ?? null;

  const isDriving =
    shiftState === "D" ||
    shiftState === "R" ||
    (typeof speedKmh === "number" && speedKmh > 0);

  return {
    ...baseVehicle,

    name:
      live.display_name ||
      vehicle.display_name ||
      "My Tesla",

    batteryLevel:
      charge.battery_level ?? null,

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
          doors: doorState,

    windows: windowState,

    frunkOpen:
      trunkState.front,

    trunkOpen:
      trunkState.rear,

    sentryMode:
      vehicleState.sentry_mode ??
      null,

    odometerKm:
      typeof vehicleState.odometer === "number"
        ? Math.round(
            vehicleState.odometer * 1.60934 * 10
          ) / 10
        : null,

    latitude,
    longitude,
    speedKmh,
    heading: driveState.heading ?? null,
    shiftState,
    timestamp:
      driveState.timestamp ??
      vehicleState.timestamp ??
      Date.now(),

    isDriving,
  };
}