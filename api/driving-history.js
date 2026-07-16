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

function getSupabaseHeaders() {
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

async function supabaseRequest(path) {
  const baseUrl =
    process.env.SUPABASE_URL;

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
      method: "GET",
      headers: getSupabaseHeaders(),
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
      "주행 기록을 불러오지 못했습니다."
    );

    error.statusCode = response.status;
    error.details = data;

    throw error;
  }

  return data;
}

function roundOne(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.round(number * 10) / 10;
}

function calculateEstimatedScore({
  distanceKm,
  durationSec,
  batteryUsed,
}) {
  if (
    distanceKm <= 0 ||
    durationSec <= 0
  ) {
    return 0;
  }

  const avgSpeedKmh =
    distanceKm /
    (durationSec / 3600);

  const efficiency =
    batteryUsed > 0
      ? distanceKm / batteryUsed
      : 0;

  let score = 72;

  if (distanceKm >= 3) score += 1;
  if (distanceKm >= 10) score += 2;
  if (distanceKm >= 30) score += 1;

  if (
    avgSpeedKmh >= 18 &&
    avgSpeedKmh <= 55
  ) {
    score += 7;
  } else if (
    avgSpeedKmh > 55 &&
    avgSpeedKmh <= 75
  ) {
    score += 5;
  } else if (
    avgSpeedKmh >= 10 &&
    avgSpeedKmh < 18
  ) {
    score += 2;
  } else if (avgSpeedKmh < 10) {
    score -= 4;
  } else if (avgSpeedKmh > 95) {
    score -= 5;
  }

  if (batteryUsed > 0) {
    if (efficiency >= 6) score += 14;
    else if (efficiency >= 5) score += 11;
    else if (efficiency >= 4) score += 8;
    else if (efficiency >= 3) score += 4;
    else if (efficiency >= 2) score += 1;
    else score -= 8;
  } else {
    score = Math.min(score, 84);
  }

  if (distanceKm < 3) {
    score = Math.min(score, 82);
  } else if (distanceKm < 8) {
    score = Math.min(score, 89);
  }

  return Math.min(
    Math.max(Math.round(score), 60),
    97
  );
}

async function getLatestVehicleId() {
  const query = new URLSearchParams({
    select: "vehicle_id",
    order: "created_at.desc",
    limit: "1",
  });

  const rows = await supabaseRequest(
    `vehicle_snapshots?${query.toString()}`
  );

  return rows?.[0]?.vehicle_id || null;
}

async function getCompletedSessions(vehicleId) {
  const query = new URLSearchParams({
    vehicle_id: `eq.${vehicleId}`,
    ended_at: "not.is.null",
    select: "*",
    order: "ended_at.desc",
    limit: "100",
  });

  const rows = await supabaseRequest(
    `driving_sessions?${query.toString()}`
  );

  return rows || [];
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
    "no-store"
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

    const vehicleId =
      await getLatestVehicleId();

    if (!vehicleId) {
      return res.status(200).json({
        ok: true,
        hasData: false,
        sessions: [],
      });
    }

    const rows =
      await getCompletedSessions(vehicleId);

    const sessions = rows.map((session) => {
      const distanceKm =
        Number(session.distance_km) || 0;

      const durationSec =
        Number(session.duration_sec) || 0;

      const batteryUsed =
        Number(session.battery_used) || 0;

      const avgSpeedKmh =
        Number(session.avg_speed_kmh) ||
        (
          durationSec > 0
            ? distanceKm /
              (durationSec / 3600)
            : 0
        );

      const efficiency =
        batteryUsed > 0
          ? distanceKm / batteryUsed
          : 0;

      return {
        id: session.id,
        startedAt: session.started_at,
        endedAt: session.ended_at,

        distanceKm:
          roundOne(distanceKm),

        durationSec,

        batteryUsed:
          roundOne(batteryUsed),

        avgSpeedKmh:
          roundOne(avgSpeedKmh),

        efficiency:
          roundOne(efficiency),

        score:
          calculateEstimatedScore({
            distanceKm,
            durationSec,
            batteryUsed,
          }),
      };
    });

    return res.status(200).json({
      ok: true,
      hasData: sessions.length > 0,
      sessions,
    });
  } catch (error) {
    console.error(
      "driving-history error:",
      error
    );

    return res
      .status(error.statusCode || 500)
      .json({
        ok: false,

        error:
          error.message ||
          "주행 기록을 불러오지 못했습니다.",

        details:
          error.details || null,
      });
  }
}