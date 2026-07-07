import { useState } from "react";
import "./App.css";

import Home from "./pages/Home";
import Calendar from "./pages/Calendar";
import League from "./pages/League";
import Chat from "./pages/Chat";

import BottomNav from "./components/BottomNav";

export default function App() {
  const [page, setPage] = useState("home");

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