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
      "이동 경로 데이터를 불러오지 못했습니다."
    );

    error.statusCode = response.status;
    error.details = data;

    throw error;
  }

  return data;
}

function getKoreaDayRange() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(new Date());

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

async function getLatestSnapshot() {
  const query = new URLSearchParams({
    select: "vehicle_id",
    order: "created_at.desc",
    limit: "1",
  });

  const rows = await supabaseRequest(
    `vehicle_snapshots?${query.toString()}`
  );

  return rows?.[0] || null;
}

function removeDuplicatePoints(points) {
  return points.filter((point, index, array) => {
    if (index === 0) return true;

    const previous = array[index - 1];

    return (
      point.latitude !== previous.latitude ||
      point.longitude !== previous.longitude
    );
  });
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

    const latestSnapshot = await getLatestSnapshot();

    if (!latestSnapshot?.vehicle_id) {
      return res.status(200).json({
        ok: true,
        points: [],
        pointCount: 0,
        message: "아직 저장된 차량 기록이 없습니다.",
      });
    }

    const { start, end } = getKoreaDayRange();

    const query = new URLSearchParams({
      vehicle_id: `eq.${latestSnapshot.vehicle_id}`,
      created_at: `gte.${start}`,
      select:
        "created_at,latitude,longitude,speed_kmh,is_driving",
      order: "created_at.asc",
    });

    const rows = await supabaseRequest(
      `vehicle_snapshots?${query.toString()}`
    );

    const validPoints = (rows || [])
      .filter((row) => {
        const createdAt = new Date(row.created_at);

        return (
          createdAt < new Date(end) &&
          typeof row.latitude === "number" &&
          typeof row.longitude === "number"
        );
      })
      .map((row) => ({
        latitude: row.latitude,
        longitude: row.longitude,
        createdAt: row.created_at,
        speedKmh:
          typeof row.speed_kmh === "number"
            ? row.speed_kmh
            : null,
        isDriving: row.is_driving === true,
      }));

    const points = removeDuplicatePoints(validPoints);

    return res.status(200).json({
      ok: true,
      vehicleId: latestSnapshot.vehicle_id,
      points,
      pointCount: points.length,
      startPoint: points[0] || null,
      endPoint: points.at(-1) || null,
    });
  } catch (error) {
    console.error("today-route error:", error);

    return res
      .status(error.statusCode || 500)
      .json({
        ok: false,
        error:
          error.message ||
          "오늘 이동 경로를 불러오는 중 오류가 발생했습니다.",
        details: error.details || null,
      });
  }
}