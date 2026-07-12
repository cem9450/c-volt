import { useEffect, useState } from "react";
import "./App.css";

import AuthCallback from "./pages/AuthCallback";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Calendar from "./pages/Calendar";
import League from "./pages/League";
import Chat from "./pages/Chat";

import BottomNav from "./components/BottomNav";

export default function App() {
  const [page, setPage] = useState("home");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const isAuthCallback =
    window.location.pathname === "/auth/callback";

  useEffect(() => {
    if (isAuthCallback) {
      setIsCheckingAuth(false);
      return;
    }

    fetch("/api/auth-status", {
      credentials: "include",
    })
      .then((response) => response.json())
      .then((data) => {
        setIsLoggedIn(data.loggedIn === true);
      })
      .catch((error) => {
        console.error("로그인 상태 확인 실패:", error);
        setIsLoggedIn(false);
      })
      .finally(() => {
        setIsCheckingAuth(false);
      });
  }, [isAuthCallback]);

  if (isAuthCallback) {
    return <AuthCallback />;
  }

  if (isCheckingAuth) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "#09090c",
          color: "white",
        }}
      >
        ⚡ C-Volt 불러오는 중...
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Login />;
  }

  return (
    <div className="app">
      {page === "home" && <Home />}
      {page === "calendar" && <Calendar />}
      {page === "league" && <League />}
      {page === "chat" && <Chat />}

      <BottomNav page={page} setPage={setPage} />
    </div>
  );
}