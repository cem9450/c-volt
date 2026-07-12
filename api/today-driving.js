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

function getSupabaseHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

async function supabaseRequest(path) {
  const baseUrl = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
      "Supabase 데이터를 불러오지 못했습니다."
    );
    error.statusCode = response.status;
    error.details = data;
    throw error;
  }

  return data;
}

function getKoreaDayRange() {
  const now = new Date();

  const koreaParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const year = koreaParts.find(
    (part) => part.type === "year"
  )?.value;

  const month = koreaParts.find(
    (part) => part.type === "month"
  )?.value;

  const day = koreaParts.find(
    (part) => part.type === "day"
  )?.value;

  const start = new Date(
    `${year}-${month}-${day}T00:00:00+09:00`
  );

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

function roundOne(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Math.round(value * 10) / 10;
}

async function getLatestSnapshot() {
  const query = new URLSearchParams({
    select: "*",
    order: "created_at.desc",
    limit: "1",
  });

  const rows = await supabaseRequest(
    `vehicle_snapshots?${query.toString()}`
  );

  return rows?.[0] || null;
}

async function getTodaySessions(vehicleId, start, end) {
  const query = new URLSearchParams({
    vehicle_id: `eq.${vehicleId}`,
    started_at: `gte.${start}`,
    select: "*",
    order: "started_at.asc",
  });

  const rows = await supabaseRequest(
    `driving_sessions?${query.toString()}`
  );

  return (rows || []).filter((session) => {
    const startedAt = new Date(session.started_at);

    return (
      startedAt >= new Date(start) &&
      startedAt < new Date(end)
    );
  });
}

async function getSessionSnapshots(
  vehicleId,
  startedAt
) {
  const query = new URLSearchParams({
    vehicle_id: `eq.${vehicleId}`,
    created_at: `gte.${startedAt}`,
    select:
      "created_at,odometer_km,battery_level,speed_kmh,is_driving",
    order: "created_at.asc",
  });

  return (
    (await supabaseRequest(
      `vehicle_snapshots?${query.toString()}`
    )) || []
  );
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");

    return res.status(405).json({
      ok: false,
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

    const latestSnapshot =
      await getLatestSnapshot();

    if (!latestSnapshot?.vehicle_id) {
      return res.status(200).json({
        ok: true,
        isDriving: false,
        tripCount: 0,
        totalDistanceKm: 0,
        totalDurationSec: 0,
        avgSpeedKmh: 0,
        totalBatteryUsed: 0,
        message: "아직 저장된 차량 기록이 없습니다.",
      });
    }

    const { start, end } =
      getKoreaDayRange();

    const sessions = await getTodaySessions(
      latestSnapshot.vehicle_id,
      start,
      end
    );

    const completedSessions = sessions.filter(
      (session) => session.ended_at
    );

    const openSession = sessions.find(
      (session) => !session.ended_at
    );

    const totalDistanceKm =
      completedSessions.reduce(
        (sum, session) =>
          sum +
          (typeof session.distance_km === "number"
            ? session.distance_km
            : 0),
        0
      );

    const totalDurationSec =
      completedSessions.reduce(
        (sum, session) =>
          sum +
          (typeof session.duration_sec === "number"
            ? session.duration_sec
            : 0),
        0
      );

    const totalBatteryUsed =
      completedSessions.reduce(
        (sum, session) =>
          sum +
          (typeof session.battery_used === "number"
            ? session.battery_used
            : 0),
        0
      );

    const avgSpeedKmh =
      totalDurationSec > 0
        ? totalDistanceKm /
          (totalDurationSec / 3600)
        : 0;

    if (openSession) {
      const snapshots =
        await getSessionSnapshots(
          latestSnapshot.vehicle_id,
          openSession.started_at
        );

      const firstSnapshot =
        snapshots.find(
          (snapshot) =>
            typeof snapshot.odometer_km === "number"
        ) || null;

      const lastSnapshot =
        [...snapshots]
          .reverse()
          .find(
            (snapshot) =>
              typeof snapshot.odometer_km === "number"
          ) || null;

      const currentDistanceKm =
        firstSnapshot && lastSnapshot
          ? Math.max(
              lastSnapshot.odometer_km -
                firstSnapshot.odometer_km,
              0
            )
          : 0;

      const startedAt = new Date(
        openSession.started_at
      );

      const currentDurationSec = Math.max(
        Math.round(
          (Date.now() - startedAt.getTime()) / 1000
        ),
        0
      );

      const currentAvgSpeedKmh =
        currentDurationSec > 0
          ? currentDistanceKm /
            (currentDurationSec / 3600)
          : 0;

      return res.status(200).json({
        ok: true,
        isDriving: true,
        tripCount: completedSessions.length,
        totalDistanceKm: roundOne(totalDistanceKm),
        totalDurationSec,
        avgSpeedKmh: roundOne(avgSpeedKmh),
        totalBatteryUsed,
        currentDistanceKm:
          roundOne(currentDistanceKm),
        currentDurationSec,
        currentAvgSpeedKmh:
          roundOne(currentAvgSpeedKmh),
        startedAt: openSession.started_at,
      });
    }

    return res.status(200).json({
      ok: true,
      isDriving: false,
      tripCount: completedSessions.length,
      totalDistanceKm: roundOne(totalDistanceKm),
      totalDurationSec,
      avgSpeedKmh: roundOne(avgSpeedKmh),
      totalBatteryUsed,
    });
  } catch (error) {
    console.error("today-driving error:", error);

    return res
      .status(error.statusCode || 500)
      .json({
        ok: false,
        error:
          error.message ||
          "오늘 주행 기록을 불러오는 중 오류가 발생했습니다.",
        details: error.details || null,
      });
  }
}