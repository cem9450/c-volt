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
  const parts = new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).formatToParts(new Date());

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

async function getTodaySessions(
  vehicleId,
  start,
  end
) {
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
  return Math.min(
    Math.max(value, min),
    max
  );
}

function calculateScore({
  totalDistanceKm,
  totalDurationSec,
  totalBatteryUsed,
  avgSpeedKmh,
  tripCount,
}) {
  let score = 75;
  let dataQuality = "good";

  const factors = [];

  const hasDistance =
    Number.isFinite(totalDistanceKm) &&
    totalDistanceKm > 0;

  const hasBatteryData =
    Number.isFinite(totalBatteryUsed) &&
    totalBatteryUsed > 0;

  if (!hasDistance) {
    return {
      score: 0,
      dataQuality: "insufficient",
      factors: [],
    };
  }

  /*
   * 주행거리 점수
   */

  if (totalDistanceKm >= 5) {
    score += 3;

    factors.push({
      type: "bonus",
      label: "충분한 주행거리",
      value: 3,
    });
  }

  if (totalDistanceKm >= 20) {
    score += 2;

    factors.push({
      type: "bonus",
      label: "장거리 주행 완료",
      value: 2,
    });
  }

  /*
   * 평균속도 점수
   */

  if (
    avgSpeedKmh >= 15 &&
    avgSpeedKmh <= 70
  ) {
    score += 5;

    factors.push({
      type: "bonus",
      label: "안정적인 평균속도",
      value: 5,
    });
  } else if (avgSpeedKmh < 8) {
    score -= 5;

    factors.push({
      type: "penalty",
      label: "저속 정체 주행",
      value: -5,
    });
  }

  /*
   * 배터리 효율 점수
   * 주행거리 ÷ 배터리 사용 퍼센트
   */

  let batteryEfficiency = 0;

  if (hasBatteryData) {
    batteryEfficiency =
      totalDistanceKm / totalBatteryUsed;

    if (batteryEfficiency >= 5) {
      score += 12;

      factors.push({
        type: "bonus",
        label: "매우 우수한 배터리 효율",
        value: 12,
      });
    } else if (batteryEfficiency >= 4) {
      score += 9;

      factors.push({
        type: "bonus",
        label: "우수한 배터리 효율",
        value: 9,
      });
    } else if (batteryEfficiency >= 3) {
      score += 5;

      factors.push({
        type: "bonus",
        label: "양호한 배터리 효율",
        value: 5,
      });
    } else if (batteryEfficiency >= 2) {
      score += 1;

      factors.push({
        type: "bonus",
        label: "보통 수준의 배터리 효율",
        value: 1,
      });
    } else {
      score -= 8;

      factors.push({
        type: "penalty",
        label: "배터리 소모가 큰 주행",
        value: -8,
      });
    }
  } else {
    dataQuality = "limited";

    factors.push({
      type: "info",
      label: "배터리 사용량 데이터 부족",
      value: 0,
    });
  }

  /*
   * 운행 횟수
   */

  if (
    tripCount >= 1 &&
    tripCount <= 4
  ) {
    score += 2;

    factors.push({
      type: "bonus",
      label: "적정한 운행 횟수",
      value: 2,
    });
  }

  /*
   * 비정상 데이터 방어
   */

  if (
    totalDurationSec > 0 &&
    totalDistanceKm > 0
  ) {
    const calculatedAvgSpeed =
      totalDistanceKm /
      (totalDurationSec / 3600);

    if (calculatedAvgSpeed > 130) {
      score -= 5;

      factors.push({
        type: "penalty",
        label: "비정상적으로 높은 평균속도",
        value: -5,
      });
    }
  }

  /*
   * 배터리 데이터가 없으면
   * 점수가 지나치게 높아지지 않게 제한
   */

  if (dataQuality === "limited") {
    score = Math.min(score, 85);
  }

  return {
    score: clamp(
      Math.round(score),
      60,
      100
    ),
    dataQuality,
    factors,
    batteryEfficiency,
  };
}

function getBadge(
  score,
  avgSpeedKmh,
  batteryEfficiency
) {
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

function getComment(
  score,
  batteryEfficiency
) {
  if (score >= 95) {
    return "오늘은 거리와 배터리 사용의 균형이 매우 좋았습니다.";
  }

  if (batteryEfficiency >= 4) {
    return "배터리를 효율적으로 사용한 주행이었습니다.";
  }

  if (score >= 88) {
    return "전체적으로 안정적이고 균형 잡힌 주행이었습니다.";
  }

  if (score >= 80) {
    return "좋은 주행이었습니다. 데이터가 더 쌓이면 분석이 더욱 정교해집니다.";
  }

  return "다음 주행에서는 부드러운 가속과 효율적인 속도 유지에 집중해보세요.";
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
        score: null,
        message:
          "아직 저장된 주행 기록이 없습니다.",
      });
    }

    const { start, end } =
      getKoreaDayRange();

    const sessions =
      await getTodaySessions(
        vehicleId,
        start,
        end
      );

    if (sessions.length === 0) {
      return res.status(200).json({
        ok: true,
        hasData: false,
        score: null,
        message:
          "오늘 완료된 주행 기록이 없습니다.",
      });
    }

    const totalDistanceKm =
      sessions.reduce(
        (sum, session) =>
          sum +
          Number(
            session.distance_km || 0
          ),
        0
      );

    const totalDurationSec =
      sessions.reduce(
        (sum, session) =>
          sum +
          Number(
            session.duration_sec || 0
          ),
        0
      );

    const totalBatteryUsed =
      sessions.reduce(
        (sum, session) =>
          sum +
          Number(
            session.battery_used || 0
          ),
        0
      );

    const avgSpeedKmh =
      totalDurationSec > 0
        ? totalDistanceKm /
          (totalDurationSec / 3600)
        : 0;

    const scoreResult =
      calculateScore({
        totalDistanceKm,
        totalDurationSec,
        totalBatteryUsed,
        avgSpeedKmh,
        tripCount: sessions.length,
      });

    const score = scoreResult.score;

    const batteryEfficiency =
      scoreResult.batteryEfficiency || 0;

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

      dataQuality:
        scoreResult.dataQuality,

      factors:
        scoreResult.factors,

      badge,

      comment,

      summary: {
        tripCount: sessions.length,

        totalDistanceKm:
          Math.round(
            totalDistanceKm * 10
          ) / 10,

        totalDurationSec,

        avgSpeedKmh:
          Math.round(
            avgSpeedKmh * 10
          ) / 10,

        totalBatteryUsed,

        batteryEfficiency:
          Math.round(
            batteryEfficiency * 10
          ) / 10,
      },
    });
  } catch (error) {
    console.error(
      "today-score error:",
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
          "오늘 운전 점수를 계산하지 못했습니다.",

        details:
          error.details || null,
      });
  }
}