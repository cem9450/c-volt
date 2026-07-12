import TodayDrivingCard from "../components/TodayDrivingCard";
import VehicleLocationCard from "../components/VehicleLocationCard";
import logo from "../assets/logo.png";
import TeslaStatusCard from "../components/TeslaStatusCard";
import UserGreeting from "../components/UserGreeting";

export default function Home() {
  return (
    <main className="home">
      <header className="home-header">
        <div className="brand">
          <img
            src={logo}
            alt="C-VOLT"
            className="brand-logo"
          />
        </div>

        <button className="bell-button">♡</button>
      </header>

      <UserGreeting />

<TeslaStatusCard />
<TodayDrivingCard />
<VehicleLocationCard />

      <section className="shortcut-card">
        <button>
          🗓️
          <span>기록</span>
        </button>

        <button>
          🧠
          <span>AI 코치</span>
        </button>

        <button>
          📊
          <span>통계</span>
        </button>

        <button>
          🧬
          <span>운전 DNA</span>
        </button>
      </section>

      <section className="ai-commentary">
        <h2>⚡ 오늘의 C-Volt</h2>
        <p>
          실제 주행 기록 수집을 준비하고 있습니다.
          주행을 마치면 오늘의 거리와 전비를 분석해드릴게요.
        </p>
      </section>
    </main>
  );
}