const FLEET_API_BASE = "https://fleet-api.prd.na.vn.cloud.tesla.com";
const TESLA_AUTH_URL =
  "https://fleet-auth.prd.vn.cloud.tesla.com/oauth2/v3/token";

export async function handler(event) {
  const jsonHeaders = {
    "Content-Type": "application/json",
  };

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: jsonHeaders,
      body: JSON.stringify({
        ok: false,
        error: "POST 요청만 허용됩니다.",
      }),
    };
  }

  try {
    const clientId = process.env.VITE_TESLA_CLIENT_ID;
    const clientSecret = process.env.TESLA_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return {
        statusCode: 500,
        headers: jsonHeaders,
        body: JSON.stringify({
          ok: false,
          error: "Tesla 환경변수가 설정되지 않았습니다.",
        }),
      };
    }

    // 1. 파트너 토큰 발급
    const tokenResponse = await fetch(TESLA_AUTH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
        audience: FLEET_API_BASE,
        scope:
          "openid vehicle_device_data vehicle_cmds vehicle_charging_cmds",
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      return {
        statusCode: tokenResponse.status,
        headers: jsonHeaders,
        body: JSON.stringify({
          ok: false,
          step: "partner-token",
          error: "Tesla 파트너 토큰 발급에 실패했습니다.",
          details: tokenData,
        }),
      };
    }

    // 2. C-Volt 도메인 등록
    const registerResponse = await fetch(
      `${FLEET_API_BASE}/api/1/partner_accounts`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          domain: "meek-bienenstitch-2e36ba.netlify.app",
        }),
      }
    );

    const registerText = await registerResponse.text();

    let registerData;

    try {
      registerData = registerText
        ? JSON.parse(registerText)
        : {};
    } catch {
      registerData = {
        raw: registerText,
      };
    }

    if (!registerResponse.ok) {
      return {
        statusCode: registerResponse.status,
        headers: jsonHeaders,
        body: JSON.stringify({
          ok: false,
          step: "partner-register",
          error: "Tesla 파트너 등록에 실패했습니다.",
          details: registerData,
        }),
      };
    }

    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify({
        ok: true,
        message: "C-Volt가 Tesla Fleet API에 등록되었습니다.",
        result: registerData,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({
        ok: false,
        error: "등록 중 서버 오류가 발생했습니다.",
        details: error.message,
      }),
    };
  }
}