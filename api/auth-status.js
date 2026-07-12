export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({
      error: "GET 요청만 허용됩니다.",
    });
  }

  const cookieHeader = req.headers.cookie ?? "";

  const isLoggedIn = cookieHeader.includes("cvolt_access_token=");

  return res.status(200).json({
    loggedIn: isLoggedIn,
  });
}