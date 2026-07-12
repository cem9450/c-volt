import DrivingScoreCard from "../components/DrivingScoreCard";
import VehicleLocationCard from "../components/VehicleLocationCard";
import TodayDrivingCard from "../components/TodayDrivingCard";
import TodayRouteMap from "../components/TodayRouteMap";
import TeslaStatusCard from "../components/TeslaStatusCard";
import UserGreeting from "../components/UserGreeting";
import logo from "../assets/logo.png";

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

      <TodayDrivingCard />

      <DrivingScoreCard />

      <TeslaStatusCard />

      <TodayRouteMap />

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
          오늘 이동 경로와 주행 데이터를 수집하고 있습니다.
          운행을 마치면 거리와 운전 패턴을 분석해드릴게요.
        </p>
      </section>
    </main>
  );
}