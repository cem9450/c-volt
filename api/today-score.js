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

function roundOne(value) {
  return Math.round(value * 10) / 10;
}

function calculateScore({
  totalDistanceKm,
  totalDurationSec,
  totalBatteryUsed,
  avgSpeedKmh,
  tripCount,
}) {
  const factors = [];

  const hasDistance =
    Number.isFinite(totalDistanceKm) &&
    totalDistanceKm > 0;

  const hasDuration =
    Number.isFinite(totalDurationSec) &&
    totalDurationSec > 0;

  const hasBatteryData =
    Number.isFinite(totalBatteryUsed) &&
    totalBatteryUsed > 0;

  if (!hasDistance || !hasDuration) {
    return {
      score: 0,
      dataQuality: "insufficient",
      confidence: "low",
      factors: [],
      batteryEfficiency: 0,
    };
  }

  /*
   * 기본 점수
   *
   * 실제 Telemetry가 연결되기 전까지는
   * 거리, 시간, 평균속도, 배터리 효율을 이용한
   * 추정 점수입니다.
   */

  let score = 72;
  let dataQuality = "good";
  let confidence = "medium";

  /*
   * 주행 데이터 신뢰도
   */

  if (totalDistanceKm >= 3) {
    score += 1;

    factors.push({
      type: "bonus",
      label: "주행 데이터 확보",
      value: 1,
    });
  }

  if (totalDistanceKm >= 10) {
    score += 2;

    factors.push({
      type: "bonus",
      label: "충분한 분석 거리",
      value: 2,
    });
  }

  if (totalDistanceKm >= 30) {
    score += 1;

    factors.push({
      type: "bonus",
      label: "장거리 데이터 확보",
      value: 1,
    });
  }

  /*
   * 평균속도 분석
   */

  if (
    avgSpeedKmh >= 18 &&
    avgSpeedKmh <= 55
  ) {
    score += 7;

    factors.push({
      type: "bonus",
      label: "안정적인 평균속도",
      value: 7,
    });
  } else if (
    avgSpeedKmh > 55 &&
    avgSpeedKmh <= 75
  ) {
    score += 5;

    factors.push({
      type: "bonus",
      label: "원활한 주행 속도",
      value: 5,
    });
  } else if (
    avgSpeedKmh >= 10 &&
    avgSpeedKmh < 18
  ) {
    score += 2;

    factors.push({
      type: "bonus",
      label: "도심 주행 구간",
      value: 2,
    });
  } else if (avgSpeedKmh < 10) {
    score -= 4;

    factors.push({
      type: "penalty",
      label: "정체 또는 저속 주행",
      value: -4,
    });
  } else if (avgSpeedKmh > 95) {
    score -= 5;

    factors.push({
      type: "penalty",
      label: "높은 평균속도",
      value: -5,
    });
  }

  /*
   * 배터리 효율 분석
   * 거리 ÷ 배터리 사용 퍼센트
   */

  let batteryEfficiency = 0;

  if (hasBatteryData) {
    batteryEfficiency =
      totalDistanceKm / totalBatteryUsed;

    confidence =
      totalDistanceKm >= 10
        ? "high"
        : "medium";

    if (batteryEfficiency >= 6) {
      score += 14;

      factors.push({
        type: "bonus",
        label: "최상급 배터리 효율",
        value: 14,
      });
    } else if (batteryEfficiency >= 5) {
      score += 11;

      factors.push({
        type: "bonus",
        label: "매우 우수한 배터리 효율",
        value: 11,
      });
    } else if (batteryEfficiency >= 4) {
      score += 8;

      factors.push({
        type: "bonus",
        label: "우수한 배터리 효율",
        value: 8,
      });
    } else if (batteryEfficiency >= 3) {
      score += 4;

      factors.push({
        type: "bonus",
        label: "양호한 배터리 효율",
        value: 4,
      });
    } else if (batteryEfficiency >= 2) {
      score += 1;

      factors.push({
        type: "info",
        label: "보통 수준의 배터리 효율",
        value: 1,
      });
    } else {
      score -= 8;

      factors.push({
        type: "penalty",
        label: "높은 배터리 소모",
        value: -8,
      });
    }
  } else {
    dataQuality = "limited";
    confidence = "low";

    factors.push({
      type: "info",
      label: "배터리 사용량 데이터 부족",
      value: 0,
    });
  }

  /*
   * 운행 횟수
   *
   * 운행 횟수 자체가 운전 실력을 의미하지 않으므로
   * 영향은 작게 제한합니다.
   */

  if (tripCount >= 1 && tripCount <= 3) {
    score += 2;

    factors.push({
      type: "bonus",
      label: "안정적인 운행 기록",
      value: 2,
    });
  } else if (tripCount >= 7) {
    score -= 1;

    factors.push({
      type: "info",
      label: "짧은 운행이 여러 번 기록됨",
      value: -1,
    });
  }

  /*
   * 데이터 이상값 확인
   */

  const calculatedAvgSpeed =
    totalDistanceKm /
    (totalDurationSec / 3600);

  if (
    calculatedAvgSpeed > 140 ||
    calculatedAvgSpeed < 0
  ) {
    score -= 8;
    dataQuality = "limited";
    confidence = "low";

    factors.push({
      type: "penalty",
      label: "일부 주행 데이터 확인 필요",
      value: -8,
    });
  }

  /*
   * 짧은 주행은 점수 신뢰도가 낮으므로
   * 최고점 제한
   */

  if (totalDistanceKm < 3) {
    score = Math.min(score, 82);
    confidence = "low";
  } else if (totalDistanceKm < 8) {
    score = Math.min(score, 89);
  }

  /*
   * 배터리 데이터가 없으면
   * 높은 점수가 나오지 않도록 제한
   */

  if (dataQuality === "limited") {
    score = Math.min(score, 84);
  }

  /*
   * Telemetry 연결 전에는
   * 100점을 쉽게 주지 않도록 최고 97점 제한
   */

  return {
    score: clamp(
      Math.round(score),
      60,
      97
    ),
    dataQuality,
    confidence,
    factors,
    batteryEfficiency,
  };
}

function getGrade(score) {
  if (score >= 95) return "S";
  if (score >= 90) return "A+";
  if (score >= 85) return "A";
  if (score >= 80) return "B+";
  if (score >= 75) return "B";
  if (score >= 70) return "C+";
  return "C";
}

function getBadge({
  score,
  avgSpeedKmh,
  batteryEfficiency,
}) {
  if (score >= 95) {
    return {
      name: "Elite Driver",
      emoji: "🏆",
    };
  }

  if (batteryEfficiency >= 5) {
    return {
      name: "Eco Master",
      emoji: "🌱",
    };
  }

  if (
    avgSpeedKmh >= 18 &&
    avgSpeedKmh <= 55
  ) {
    return {
      name: "Smooth Driver",
      emoji: "✨",
    };
  }

  if (avgSpeedKmh >= 55) {
    return {
      name: "Highway Cruiser",
      emoji: "🛣️",
    };
  }

  return {
    name: "Daily Driver",
    emoji: "🚗",
  };
}

function getComment({
  score,
  batteryEfficiency,
  avgSpeedKmh,
  dataQuality,
}) {
  if (dataQuality === "limited") {
    return "배터리 데이터가 더 쌓이면 점수가 더 정확해져요.";
  }

  if (
    score >= 95 &&
    batteryEfficiency >= 5
  ) {
    return "속도와 배터리 효율의 균형이 매우 뛰어났어요.";
  }

  if (batteryEfficiency >= 5) {
    return "배터리를 아주 효율적으로 사용한 주행이었어요.";
  }

  if (
    avgSpeedKmh >= 18 &&
    avgSpeedKmh <= 55
  ) {
    return "전체적으로 안정적이고 균형 잡힌 주행이었어요.";
  }

  if (score >= 85) {
    return "오늘도 부드럽고 효율적인 주행을 유지했어요.";
  }

  if (score >= 75) {
    return "좋은 주행이에요. 효율을 조금 더 높여볼 수 있어요.";
  }

  return "다음 주행에서는 일정한 속도 유지에 집중해보세요.";
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

    const grade = getGrade(score);

    const badge = getBadge({
      score,
      avgSpeedKmh,
      batteryEfficiency,
    });

    const comment = getComment({
      score,
      batteryEfficiency,
      avgSpeedKmh,
      dataQuality:
        scoreResult.dataQuality,
    });

    return res.status(200).json({
      ok: true,
      hasData: true,

      score,
      grade,
      badge,
      comment,

      scoringMode: "estimated",

      dataQuality:
        scoreResult.dataQuality,

      confidence:
        scoreResult.confidence,

      factors:
        scoreResult.factors,

      summary: {
        tripCount: sessions.length,

        totalDistanceKm:
          roundOne(totalDistanceKm),

        totalDurationSec,

        avgSpeedKmh:
          roundOne(avgSpeedKmh),

        totalBatteryUsed:
          roundOne(totalBatteryUsed),

        batteryEfficiency:
          roundOne(batteryEfficiency),
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