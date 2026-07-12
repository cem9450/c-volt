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
      "운전 점수 데이터를 불러오지 못했습니다."
    );

    error.statusCode = response.status;
    error.details = data;

    throw error;
  }

  return data;
}

function getKoreaDayRange() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find(
    (part) => part.type === "year"
  )?.value;

  const month = parts.find(
    (part) => part.type === "month"
  )?.value;

  const day = parts.find(
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

async function getTodaySessions(vehicleId, start, end) {
  const query = new URLSearchParams({
    vehicle_id: `eq.${vehicleId}`,
    started_at: `gte.${start}`,
    ended_at: `lt.${end}`,
    select: "*",
    order: "started_at.asc",
  });

  const rows = await supabaseRequest(
    `driving_sessions?${query.toString()}`
  );

  return (rows || []).filter(
    (session) => session.ended_at
  );
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function calculateScore({
  totalDistanceKm,
  totalDurationSec,
  totalBatteryUsed,
  avgSpeedKmh,
  tripCount,
}) {
  let score = 80;

  if (totalDistanceKm >= 5) {
    score += 4;
  }

  if (totalDistanceKm >= 20) {
    score += 3;
  }

  if (avgSpeedKmh >= 15 && avgSpeedKmh <= 70) {
    score += 5;
  }

  if (tripCount <= 4) {
    score += 2;
  }

  if (
    totalBatteryUsed > 0 &&
    totalDistanceKm > 0
  ) {
    const kmPerBatteryPercent =
      totalDistanceKm / totalBatteryUsed;

    if (kmPerBatteryPercent >= 4) {
      score += 6;
    } else if (kmPerBatteryPercent >= 3) {
      score += 3;
    } else if (kmPerBatteryPercent < 2) {
      score -= 5;
    }
  }

  if (
    totalDurationSec > 0 &&
    avgSpeedKmh < 8
  ) {
    score -= 4;
  }

  return clamp(Math.round(score), 60, 100);
}

function getBadge(score, avgSpeedKmh, batteryEfficiency) {
  if (score >= 95) {
    return {
      name: "Elite Driver",
      emoji: "🏆",
    };
  }

  if (batteryEfficiency >= 4) {
    return {
      name: "Eco Driver",
      emoji: "🌱",
    };
  }

  if (avgSpeedKmh >= 60) {
    return {
      name: "Highway Cruiser",
      emoji: "🛣️",
    };
  }

  if (score >= 88) {
    return {
      name: "Smooth Driver",
      emoji: "✨",
    };
  }

  return {
    name: "Daily Driver",
    emoji: "🚗",
  };
}

function getComment(score, batteryEfficiency) {
  if (score >= 95) {
    return "오늘은 거리와 배터리 사용의 균형이 아주 좋았습니다.";
  }

  if (batteryEfficiency >= 4) {
    return "배터리를 효율적으로 사용한 주행이었습니다.";
  }

  if (score >= 88) {
    return "전체적으로 안정적이고 균형 잡힌 주행이었습니다.";
  }

  if (score >= 80) {
    return "좋은 주행이었습니다. 데이터가 더 쌓이면 분석이 정교해집니다.";
  }

  return "오늘 기록을 바탕으로 다음 주행에서 효율 개선점을 찾아볼게요.";
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

    const vehicleId = await getLatestVehicleId();

    if (!vehicleId) {
      return res.status(200).json({
        ok: true,
        hasData: false,
        message: "아직 저장된 주행 기록이 없습니다.",
      });
    }

    const { start, end } = getKoreaDayRange();

    const sessions = await getTodaySessions(
      vehicleId,
      start,
      end
    );

    if (sessions.length === 0) {
      return res.status(200).json({
        ok: true,
        hasData: false,
        message: "오늘 완료된 주행 기록이 없습니다.",
      });
    }

    const totalDistanceKm = sessions.reduce(
      (sum, session) =>
        sum + Number(session.distance_km || 0),
      0
    );

    const totalDurationSec = sessions.reduce(
      (sum, session) =>
        sum + Number(session.duration_sec || 0),
      0
    );

    const totalBatteryUsed = sessions.reduce(
      (sum, session) =>
        sum + Number(session.battery_used || 0),
      0
    );

    const avgSpeedKmh =
      totalDurationSec > 0
        ? totalDistanceKm /
          (totalDurationSec / 3600)
        : 0;

    const batteryEfficiency =
      totalBatteryUsed > 0
        ? totalDistanceKm / totalBatteryUsed
        : 0;

    const score = calculateScore({
      totalDistanceKm,
      totalDurationSec,
      totalBatteryUsed,
      avgSpeedKmh,
      tripCount: sessions.length,
    });

    const badge = getBadge(
      score,
      avgSpeedKmh,
      batteryEfficiency
    );

    const comment = getComment(
      score,
      batteryEfficiency
    );

    return res.status(200).json({
      ok: true,
      hasData: true,
      score,
      badge,
      comment,
      summary: {
        tripCount: sessions.length,
        totalDistanceKm:
          Math.round(totalDistanceKm * 10) / 10,
        totalDurationSec,
        avgSpeedKmh:
          Math.round(avgSpeedKmh * 10) / 10,
        totalBatteryUsed,
        batteryEfficiency:
          Math.round(batteryEfficiency * 10) / 10,
      },
    });
  } catch (error) {
    console.error("today-score error:", error);

    return res
      .status(error.statusCode || 500)
      .json({
        ok: false,
        error:
          error.message ||
          "오늘 운전 점수를 계산하지 못했습니다.",
        details: error.details || null,
      });
  }
}