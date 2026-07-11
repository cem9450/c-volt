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

export async function handler(event) {
  const jsonHeaders = {
    "Content-Type": "application/json",
  };

  try {
    const cookieHeader = event.headers.cookie || "";
    const accessToken = getCookie(
      cookieHeader,
      "cvolt_access_token"
    );

    if (!accessToken) {
      return {
        statusCode: 401,
        headers: jsonHeaders,
        body: JSON.stringify({
          ok: false,
          error: "Tesla 로그인이 필요합니다.",
        }),
      };
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
      return {
        statusCode: response.status,
        headers: jsonHeaders,
        body: JSON.stringify({
          ok: false,
          error: "차량 목록을 가져오지 못했습니다.",
          details: data,
        }),
      };
    }

    const vehicles = (data.response || []).map((vehicle) => ({
      id: vehicle.id_s || String(vehicle.id),
      name: vehicle.display_name || "My Tesla",
      state: vehicle.state || "unknown",
      vinLast4: vehicle.vin
        ? vehicle.vin.slice(-4)
        : null,
    }));

    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify({
        ok: true,
        vehicles,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({
        ok: false,
        error: "차량 조회 중 서버 오류가 발생했습니다.",
        details: error.message,
      }),
    };
  }
}