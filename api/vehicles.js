function getCookie(cookieHeader, name) {
  const cookies = cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .filter(Boolean);

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

  try {
    const cookieHeader = req.headers.cookie ?? "";

    const accessToken = getCookie(
      cookieHeader,
      "cvolt_access_token"
    );

    if (!accessToken) {
      return res.status(401).json({
        ok: false,
        error: "Tesla 로그인이 필요합니다.",
      });
    }

    const response = await fetch(
      "https://fleet-api.prd.na.vn.cloud.tesla.com/api/1/vehicles",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        ok: false,
        error: "차량 목록을 가져오지 못했습니다.",
        details: data,
      });
    }

    const vehicles = (data.response || []).map((vehicle) => ({
      id: vehicle.id_s || String(vehicle.id),
      name: vehicle.display_name || "My Tesla",
      state: vehicle.state || "unknown",
      vinLast4: vehicle.vin
        ? vehicle.vin.slice(-4)
        : null,
    }));

    return res.status(200).json({
      ok: true,
      vehicles,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "차량 조회 중 서버 오류가 발생했습니다.",
      details: error.message,
    });
  }
}