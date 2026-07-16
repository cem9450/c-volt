import {
  useEffect,
  useState,
} from "react";

import "./App.css";

import AuthCallback from "./pages/AuthCallback";
import Home from "./pages/Home";
import Login from "./pages/Login";
import League from "./pages/League";
import Chat from "./pages/Chat";
import Stats from "./pages/Stats";

import BottomNav from "./components/BottomNav";

function PreparingPage({
  eyebrow,
  title,
  description,
}) {
  return (
    <main className="cv-preparing-page">
      <span>{eyebrow}</span>
      <h1>{title}</h1>
      <p>{description}</p>
    </main>
  );
}

export default function App() {
  const [page, setPage] =
    useState("home");

  const [
    isLoggedIn,
    setIsLoggedIn,
  ] = useState(false);

  const [
    isCheckingAuth,
    setIsCheckingAuth,
  ] = useState(true);

  const isAuthCallback =
    window.location.pathname ===
    "/auth/callback";

  useEffect(() => {
    if (isAuthCallback) {
      setIsCheckingAuth(false);
      return;
    }

    fetch("/api/auth-status", {
      credentials: "include",
    })
      .then((response) =>
        response.json()
      )
      .then((data) => {
        setIsLoggedIn(
          data.loggedIn === true
        );
      })
      .catch((error) => {
        console.error(
          "로그인 상태 확인 실패:",
          error
        );

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
      <div className="cv-app-loading">
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

      {page === "records" && (
        <PreparingPage
          eyebrow="DRIVE HISTORY"
          title="주행 기록"
          description="날짜별 운행 리포트와 이동 경로를 보여줄 예정입니다."
        />
      )}

      {page === "league" && (
        <League />
      )}

      {page === "stats" && (
        <Stats />
      )}

      {page === "dna" && (
        <PreparingPage
          eyebrow="DRIVING DNA"
          title="운전 DNA"
          description="운전 성향, 레벨, 배지와 업적을 보여줄 예정입니다."
        />
      )}

      {page === "chat" && (
        <Chat />
      )}

      <BottomNav
        page={page}
        setPage={setPage}
      />
    </div>
  );
}