import {
  useEffect,
  useState,
} from "react";

import "./App.css";

import Records from "./pages/Records";
import AuthCallback from "./pages/AuthCallback";
import Home from "./pages/Home";
import Login from "./pages/Login";
import League from "./pages/League";
import Chat from "./pages/Chat";
import Stats from "./pages/Stats";
import DrivingDNA from "./pages/DrivingDNA";

import BottomNav from "./components/BottomNav";

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
  <Records />
)}

      {page === "league" && (
        <League />
      )}

      {page === "stats" && (
        <Stats />
      )}

      {page === "dna" && (
  <DrivingDNA />
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