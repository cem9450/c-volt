import { useEffect, useState } from "react";

export default function AuthCallback() {
  const [status, setStatus] = useState("connecting");
  const [message, setMessage] = useState(
    "Tesla 계정을 연결하고 있습니다..."
  );

  useEffect(() => {
    let cancelled = false;

    async function completeTeslaLogin() {
      try {
        const params = new URLSearchParams(
          window.location.search
        );

        const code = params.get("code");
        const returnedState = params.get("state");

        const savedState = sessionStorage.getItem(
          "tesla_oauth_state"
        );

        if (!code) {
          throw new Error(
            "Tesla 인증 코드가 없습니다. 처음부터 다시 로그인해주세요."
          );
        }

        if (!returnedState) {
          throw new Error(
            "Tesla 로그인 보안 정보가 없습니다. 처음부터 다시 로그인해주세요."
          );
        }

        if (!savedState) {
          throw new Error(
            "로그인 정보가 만료되었습니다. Tesla 로그인을 다시 진행해주세요."
          );
        }

        if (returnedState !== savedState) {
          throw new Error(
            "Tesla 로그인 보안 확인에 실패했습니다. 처음부터 다시 로그인해주세요."
          );
        }

        sessionStorage.removeItem(
          "tesla_oauth_state"
        );

        const response = await fetch(
          "/api/tesla-auth",
          {
            method: "POST",
            credentials: "include",
            cache: "no-store",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ code }),
          }
        );

        const responseText = await response.text();

        let data;

        try {
          data = responseText
            ? JSON.parse(responseText)
            : {};
        } catch {
          throw new Error(
            "로그인 서버가 올바르지 않은 응답을 보냈습니다."
          );
        }

        if (!response.ok || !data.ok) {
          throw new Error(
            data.error ||
              data.message ||
              "Tesla 로그인에 실패했습니다."
          );
        }

        if (cancelled) return;

        setStatus("success");
        setMessage("연결되었습니다. C-Volt로 이동합니다.");

        window.setTimeout(() => {
          window.location.replace("/");
        }, 500);
      } catch (error) {
        console.error(
          "Tesla 로그인 콜백 오류:",
          error
        );

        if (cancelled) return;

        setStatus("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "Tesla 로그인 중 오류가 발생했습니다."
        );
      }
    }

    completeTeslaLogin();

    return () => {
      cancelled = true;
    };
  }, []);

  function restartLogin() {
    sessionStorage.removeItem(
      "tesla_oauth_state"
    );

    window.location.replace("/");
  }

  return (
    <main className="auth-callback-screen">
      <div className="auth-callback-card">
        <div
          className={
            status === "error"
              ? "auth-callback-icon error"
              : "auth-callback-icon"
          }
        >
          {status === "error" ? "!" : "⚡"}
        </div>

        <h1>
          {status === "error"
            ? "연결에 실패했습니다"
            : status === "success"
              ? "Tesla 연결 완료"
              : "Connecting to Tesla"}
        </h1>

        <p>{message}</p>

        {status === "connecting" && (
          <div className="auth-callback-loader">
            <span />
          </div>
        )}

        {status === "error" && (
          <button
            type="button"
            onClick={restartLogin}
          >
            다시 로그인
          </button>
        )}
      </div>
    </main>
  );
}