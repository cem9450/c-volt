export function getTeslaLoginUrl() {
  const clientId = import.meta.env.VITE_TESLA_CLIENT_ID;
  const redirectUri = import.meta.env.VITE_TESLA_REDIRECT_URI;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid vehicle_device_data vehicle_cmds vehicle_charging_cmds",
    state: crypto.randomUUID(),
  });

  return `https://auth.tesla.com/oauth2/v3/authorize?${params.toString()}`;
}

export function loginWithTesla() {
  window.location.href = getTeslaLoginUrl();
}