import { getCurrentVehicleData } from "./_vehicle-data.js";

function supabaseHeaders() {
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

async function supabaseRequest(
  path,
  options = {}
) {
  const baseUrl = process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!baseUrl || !key) {
    const error = new Error(
      "Supabase 서버 환경 변수가 설정되지 않았습니다."
    );

    error.statusCode = 500;
    throw error;
  }

  const response = await fetch(
    `${baseUrl}/rest/v1/${path}`,
    {
      ...options,
      headers: {
        ...supabaseHeaders(),
        ...(options.headers || {}),
      },
    }
  );

  const text = await response.text();

  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const error = new Error(
      "Supabase 요청에 실패했습니다."
    );

    error.statusCode = response.status;
    error.details = data;

    throw error;
  }

  return data;
}

async function getLatestSnapshot(vehicleId) {
  const query = new URLSearchParams({
    vehicle_id: `eq.${vehicleId}`,
    select: "*",
    order: "created_at.desc",
    limit: "1",
  });

  const rows = await supabaseRequest(
    `vehicle_snapshots?${query.toString()}`
  );

  return rows?.[0] || null;
}

async function getOpenDrivingSession(vehicleId) {
  const query = new URLSearchParams({
    vehicle_id: `eq.${vehicleId}`,
    ended_at: "is.null",
    select: "*",
    order: "started_at.desc",
    limit: "1",
  });

  const rows = await supabaseRequest(
    `driving_sessions?${query.toString()}`
  );

  return rows?.[0] || null;
}

async function getLatestCompletedSession(
  vehicleId
) {
  const query = new URLSearchParams({
    vehicle_id: `eq.${vehicleId}`,
    ended_at: "not.is.null",
    select: "*",
    order: "ended_at.desc",
    limit: "1",
  });

  const rows = await supabaseRequest(
    `driving_sessions?${query.toString()}`
  );

  return rows?.[0] || null;
}

async function getSessionStartSnapshot(
  vehicleId,
  startedAt
) {
  const query = new URLSearchParams({
    vehicle_id: `eq.${vehicleId}`,
    created_at: `gte.${startedAt}`,
    select: "*",
    order: "created_at.asc",
    limit: "1",
  });

  const rows = await supabaseRequest(
    `vehicle_snapshots?${query.toString()}`
  );

  return rows?.[0] || null;
}

async function insertSnapshot(vehicle) {
  const payload = {
    vehicle_id: vehicle.id,
    odometer_km: vehicle.odometerKm,
    battery_level: vehicle.batteryLevel,
    range_km: vehicle.rangeKm,
    charging_state: vehicle.chargingState,
    latitude: vehicle.latitude,
    longitude: vehicle.longitude,
    is_driving: vehicle.isDriving,
    speed_kmh: vehicle.speedKmh,
  };

  const rows = await supabaseRequest(
    "vehicle_snapshots",
    {
      method: "POST",
      headers: {
        Prefer: "return=representation",
      },
      body: JSON.stringify(payload),
    }
  );

  return rows?.[0] || null;
}

async function startDrivingSession(vehicle) {
  const payload = {
    vehicle_id: vehicle.id,
    started_at: new Date().toISOString(),
    ended_at: null,
    distance_km: null,
    duration_sec: null,
    battery_used: null,
    avg_speed_kmh: null,
    efficiency_whkm: null,
  };

  const rows = await supabaseRequest(
    "driving_sessions",
    {
      method: "POST",
      headers: {
        Prefer: "return=representation",
      },
      body: JSON.stringify(payload),
    }
  );

  return rows?.[0] || null;
}

async function finishDrivingSession(
  session,
  vehicle
) {
  const startedAt =
    new Date(session.started_at);

  const endedAt = new Date();

  const startSnapshot =
    await getSessionStartSnapshot(
      vehicle.id,
      session.started_at
    );

  const durationSec = Math.max(
    Math.round(
      (
        endedAt.getTime() -
        startedAt.getTime()
      ) / 1000
    ),
    0
  );

  const startOdometer =
    startSnapshot?.odometer_km ?? null;

  const endOdometer =
    vehicle.odometerKm ?? null;

  const distanceKm =
    typeof startOdometer === "number" &&
    typeof endOdometer === "number"
      ? Math.max(
          Math.round(
            (
              endOdometer -
              startOdometer
            ) * 10
          ) / 10,
          0
        )
      : null;

  const startBattery =
    startSnapshot?.battery_level ?? null;

  const endBattery =
    vehicle.batteryLevel ?? null;

  const batteryUsed =
    typeof startBattery === "number" &&
    typeof endBattery === "number"
      ? Math.max(
          startBattery - endBattery,
          0
        )
      : null;

  const avgSpeedKmh =
    typeof distanceKm === "number" &&
    durationSec > 0
      ? Math.round(
          (
            distanceKm /
            (durationSec / 3600)
          ) * 10
        ) / 10
      : null;

  const query = new URLSearchParams({
    id: `eq.${session.id}`,
  });

  const payload = {
    ended_at: endedAt.toISOString(),
    distance_km: distanceKm,
    duration_sec: durationSec,
    battery_used: batteryUsed,
    avg_speed_kmh: avgSpeedKmh,
    efficiency_whkm: null,
  };

  const rows = await supabaseRequest(
    `driving_sessions?${query.toString()}`,
    {
      method: "PATCH",
      headers: {
        Prefer: "return=representation",
      },
      body: JSON.stringify(payload),
    }
  );

  return rows?.[0] || null;
}

export default async function handler(
  req,
  res
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");

    return res.status(405).json({
      ok: false,
      error: "POST 요청만 허용됩니다.",
    });
  }

  res.setHeader(
    "Cache-Control",
    "no-store"
  );

  try {
    const vehicle =
      await getCurrentVehicleData(req);

    if (!vehicle.id) {
      return res.status(400).json({
        ok: false,
        error:
          "차량 ID를 확인할 수 없습니다.",
      });
    }

    const latestSnapshot =
      await getLatestSnapshot(vehicle.id);

    const openSession =
      await getOpenDrivingSession(
        vehicle.id
      );

    let event = "snapshot";
    let session = openSession;

    const wasDriving =
      latestSnapshot?.is_driving === true;

    const isDriving =
      vehicle.isDriving === true;

    if (
      !wasDriving &&
      isDriving &&
      !openSession
    ) {
      session =
        await startDrivingSession(vehicle);

      event = "driving_started";
    }

    if (
      wasDriving &&
      !isDriving &&
      openSession
    ) {
      session =
        await finishDrivingSession(
          openSession,
          vehicle
        );

      event = "driving_ended";
    }

    const snapshot =
      await insertSnapshot(vehicle);

    const latestCompletedSession =
      event === "driving_ended"
        ? session
        : await getLatestCompletedSession(
            vehicle.id
          );

    const parkedAt =
      isDriving
        ? null
        : latestCompletedSession
            ?.ended_at || null;

    return res.status(200).json({
      ok: true,
      event,
      vehicle: {
        ...vehicle,
        parkedAt,
      },
      snapshot,
      session,
      parkedAt,
    });
  } catch (error) {
    console.error(
      "vehicle-snapshot error:",
      error
    );

    return res
      .status(error.statusCode || 500)
      .json({
        ok: false,
        error:
          error.message ||
          "차량 기록 저장 중 오류가 발생했습니다.",
        details: error.details || null,
      });
  }
}