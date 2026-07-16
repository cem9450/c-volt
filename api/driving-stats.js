function getCookie(cookieHeader, name) {
  const cookies = (cookieHeader || "")
    .split(";")
    .map((cookie) => cookie.trim())
    .filter(Boolean);

  const target = cookies.find((cookie) =>
    cookie.startsWith(`${name}=`)
  );

  if (!target) {
    return null;
  }

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
      "통계 데이터를 불러오지 못했습니다."
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

function getKoreaDateKey(date) {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).format(date);
}

function getKoreaDayLabel(date) {
  return new Intl.DateTimeFormat(
    "ko-KR",
    {
      timeZone: "Asia/Seoul",
      weekday: "short",
    }
  )
    .format(date)
    .replace("요일", "");
}

function getSevenDayRange() {
  const now = new Date();

  const todayKey =
    getKoreaDateKey(now);

  const todayStart = new Date(
    `${todayKey}T00:00:00+09:00`
  );

  const start = new Date(todayStart);

  start.setUTCDate(
    start.getUTCDate() - 6
  );

  const end = new Date(todayStart);

  end.setUTCDate(
    end.getUTCDate() + 1
  );

  const days = [];

  for (let index = 0; index < 7; index += 1) {
    const day = new Date(start);

    day.setUTCDate(
      start.getUTCDate() + index
    );

    days.push({
      date: getKoreaDateKey(day),
      label: getKoreaDayLabel(day),
      distanceKm: 0,
      durationSec: 0,
      tripCount: 0,
      batteryUsed: 0,
      efficiency: 0,
      score: 0,
    });
  }

  return {
    start: start.toISOString(),
    end: end.toISOString(),
    days,
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

async function getSessions(
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

function calculateEstimatedScore({
  distanceKm,
  durationSec,
  batteryUsed,
  tripCount,
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

  if (
    tripCount >= 1 &&
    tripCount <= 3
  ) {
    score += 2;
  }

  if (distanceKm < 3) {
    score = Math.min(score, 82);
  } else if (distanceKm < 8) {
    score = Math.min(score, 89);
  }

  return Math.min(
    Math.max(
      Math.round(score),
      60
    ),
    97
  );
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

    const range =
      getSevenDayRange();

    if (!vehicleId) {
      return res.status(200).json({
        ok: true,
        hasData: false,
        days: range.days,
        summary: {
          totalDistanceKm: 0,
          totalDurationSec: 0,
          totalTripCount: 0,
          averageScore: 0,
          averageEfficiency: 0,
          bestEfficiency: 0,
        },
      });
    }

    const sessions =
      await getSessions(
        vehicleId,
        range.start,
        range.end
      );

    const daysByDate = new Map(
      range.days.map((day) => [
        day.date,
        day,
      ])
    );

    for (const session of sessions) {
      const date =
        getKoreaDateKey(
          new Date(session.started_at)
        );

      const day =
        daysByDate.get(date);

      if (!day) {
        continue;
      }

      day.distanceKm +=
        Number(session.distance_km) || 0;

      day.durationSec +=
        Number(session.duration_sec) || 0;

      day.batteryUsed +=
        Number(session.battery_used) || 0;

      day.tripCount += 1;
    }

    const days = range.days.map(
      (day) => {
        const efficiency =
          day.batteryUsed > 0
            ? day.distanceKm /
              day.batteryUsed
            : 0;

        const score =
          calculateEstimatedScore({
            distanceKm:
              day.distanceKm,
            durationSec:
              day.durationSec,
            batteryUsed:
              day.batteryUsed,
            tripCount:
              day.tripCount,
          });

        return {
          ...day,
          distanceKm:
            roundOne(day.distanceKm),

          batteryUsed:
            roundOne(day.batteryUsed),

          efficiency:
            roundOne(efficiency),

          score,
        };
      }
    );

    const totalDistanceKm =
      days.reduce(
        (sum, day) =>
          sum + day.distanceKm,
        0
      );

    const totalDurationSec =
      days.reduce(
        (sum, day) =>
          sum + day.durationSec,
        0
      );

    const totalTripCount =
      days.reduce(
        (sum, day) =>
          sum + day.tripCount,
        0
      );

    const scoreDays =
      days.filter(
        (day) => day.score > 0
      );

    const efficiencyDays =
      days.filter(
        (day) => day.efficiency > 0
      );

    const averageScore =
      scoreDays.length > 0
        ? scoreDays.reduce(
            (sum, day) =>
              sum + day.score,
            0
          ) / scoreDays.length
        : 0;

    const averageEfficiency =
      efficiencyDays.length > 0
        ? efficiencyDays.reduce(
            (sum, day) =>
              sum + day.efficiency,
            0
          ) /
          efficiencyDays.length
        : 0;

    const bestEfficiency =
      efficiencyDays.length > 0
        ? Math.max(
            ...efficiencyDays.map(
              (day) =>
                day.efficiency
            )
          )
        : 0;

    return res.status(200).json({
      ok: true,
      hasData:
        totalTripCount > 0,

      range: {
        start: range.days[0].date,
        end:
          range.days[
            range.days.length - 1
          ].date,
      },

      days,

      summary: {
        totalDistanceKm:
          roundOne(totalDistanceKm),

        totalDurationSec,

        totalTripCount,

        averageScore:
          roundOne(averageScore),

        averageEfficiency:
          roundOne(
            averageEfficiency
          ),

        bestEfficiency:
          roundOne(bestEfficiency),
      },
    });
  } catch (error) {
    console.error(
      "driving-stats error:",
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
          "주행 통계를 불러오지 못했습니다.",

        details:
          error.details || null,
      });
  }
}