import { useEffect } from "react";

export default function AuthCallback() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const code = params.get("code");
const returnedState = params.get("state");
const savedState = sessionStorage.getItem("tesla_oauth_state");

if (!code) {
  console.error("Tesla 인증 코드가 없습니다.");
  return;
}

if (!returnedState || returnedState !== savedState) {
  console.error("Tesla 로그인 보안 확인에 실패했습니다.");
  return;
}

sessionStorage.removeItem("tesla_oauth_state");

console.log("Tesla Authorization Code received");

fetch("/.netlify/functions/tesla-auth", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ code }),
})
  .then((res) => res.json())
  .then((data) => {
  if (!data.ok) {
    console.error("Tesla 로그인 실패:", data);
    return;
  }

  window.location.href = "/";
})
  .catch((err) => {
    console.error(err);
  });

    // 다음 단계에서 서버로 code를 보낼 예정
  }, []);

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#09090c",
        color: "white",
        fontSize: "22px",
      }}
    >
      ⚡ Connecting to Tesla...
    </div>
  );
}