export async function handler(event) {
  const cookies = event.headers.cookie || "";

  const isLoggedIn = cookies.includes("cvolt_access_token=");

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      loggedIn: isLoggedIn,
    }),
  };
}