export async function handler(event) {
  const jsonHeaders = {
    "Content-Type": "application/json",
  };

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: jsonHeaders,
      body: JSON.stringify({ error: "POST 요청만 허용됩니다." }),
    };
  }

  try {
    const { code } = JSON.parse(event.body || "{}");

    if (!code) {
      return {
        statusCode: 400,
        headers: jsonHeaders,
        body: JSON.stringify({ error: "Tesla 인증 코드가 없습니다." }),
      };
    }

    const clientId = process.env.VITE_TESLA_CLIENT_ID;
    const clientSecret = process.env.TESLA_CLIENT_SECRET;
    const redirectUri = process.env.VITE_TESLA_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      return {
        statusCode: 500,
        headers: jsonHeaders,
        body: JSON.stringify({
          error: "Tesla 서버 환경 변수가 설정되지 않았습니다.",
        }),
      };
    }

    const tokenResponse = await fetch(
      "https://fleet-auth.prd.vn.cloud.tesla.com/oauth2/v3/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: clientId,
          client_secret: clientSecret,
          code,
          audience: "https://fleet-api.prd.na.vn.cloud.tesla.com",
          redirect_uri: redirectUri,
        }),
      }
    );

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      return {
        statusCode: tokenResponse.status,
        headers: jsonHeaders,
        body: JSON.stringify({
          error: "Tesla 토큰 발급에 실패했습니다.",
          details: tokenData,
        }),
      };
    }

    const isProduction = process.env.CONTEXT === "production";
    const secureOption = isProduction ? " Secure;" : "";
    const accessMaxAge = Math.max((tokenData.expires_in || 3600) - 60, 60);

    const cookies = [
      `cvolt_access_token=${encodeURIComponent(
        tokenData.access_token
      )}; Path=/; HttpOnly; SameSite=Lax;${secureOption} Max-Age=${accessMaxAge}`,
    ];

    if (tokenData.refresh_token) {
      cookies.push(
        `cvolt_refresh_token=${encodeURIComponent(
          tokenData.refresh_token
        )}; Path=/; HttpOnly; SameSite=Lax;${secureOption} Max-Age=7776000`
      );
    }

    return {
      statusCode: 200,
      headers: jsonHeaders,
      multiValueHeaders: {
        "Set-Cookie": cookies,
      },
      body: JSON.stringify({
        ok: true,
        message: "Tesla 계정 연결에 성공했습니다.",
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({
        error: "서버 오류가 발생했습니다.",
        details: error.message,
      }),
    };
  }
}