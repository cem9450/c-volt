export function getTeslaLoginUrl() {
  const clientId = import.meta.env.VITE_TESLA_CLIENT_ID;
  const redirectUri = import.meta.env.VITE_TESLA_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    throw new Error("Tesla 로그인 환경변수가 없습니다.");
  }

  const state = crypto.randomUUID();
  const nonce = crypto.randomUUID();

  sessionStorage.setItem("tesla_oauth_state", state);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope:
      "openid offline_access vehicle_device_data vehicle_location vehicle_cmds vehicle_charging_cmds",
    
      state,
    nonce,
    prompt_missing_scopes: "true",
  });

  return `https://auth.tesla.com/oauth2/v3/authorize?${params.toString()}`;
}

export function loginWithTesla() {
  window.location.href = getTeslaLoginUrl();
}