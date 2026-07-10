import { useState } from "react";
import { SiTesla } from "react-icons/si";

import logo from "../assets/logo.png";
import { loginWithTesla } from "../services/tesla";

export default function Login() {
  const [isConnecting, setIsConnecting] = useState(false);

  function handleTeslaLogin() {
    if (isConnecting) return;

    setIsConnecting(true);

    setTimeout(() => {
      loginWithTesla();
    }, 600);
  }

  return (
    <main className="login-screen">
      <div className="login-hero">
        <img src={logo} alt="CVOLT" className="login-logo" />

        <div className="login-copy">
          <h1>
            DRIVE.
            <br />
            COMPETE.
            <br />
            EVOLVE.
          </h1>

          <p>AI Driving Coach for Tesla Drivers</p>
        </div>

        <button
          className="tesla-login"
          onClick={handleTeslaLogin}
          disabled={isConnecting}
        >
          {isConnecting ? (
            <>
              <span className="login-spinner" />
              <span>Connecting...</span>
            </>
          ) : (
            <>
              <SiTesla className="tesla-icon" />
              <span className="tesla-divider" />

              <span className="tesla-login-text">
                <strong>TESLA</strong> 로그인
              </span>
            </>
          )}
        </button>

        <div className="login-notes">
          <span>🔒 Tesla 공식 OAuth 사용</span>
          <span>🚗 차량 데이터 안전 연결</span>
          <span>⚡ 언제든 연결 해제 가능</span>
        </div>
      </div>
    </main>
  );
}