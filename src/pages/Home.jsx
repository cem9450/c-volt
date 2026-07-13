import {
  FiChevronRight,
  FiInfo,
} from "react-icons/fi";

import TopBar from "../components/TopBar";
import TodayDrivingCard from "../components/TodayDrivingCard";
import TeslaStatusCard from "../components/TeslaStatusCard";
import ParkingMiniMap from "../components/ParkingMiniMap";

export default function Home() {
  return (
    <main className="home home-v2">
      <TopBar />

      <section className="dashboard-section dashboard-drive">
        <div className="dashboard-section-heading">
          <div>
            
            <h2 className="dashboard-card-title">
              오늘의 드라이브
              <FiInfo className="dashboard-info-icon" />
            </h2>
          </div>

          <button
            type="button"
            className="dashboard-detail-button"
          >
            상세 보기
            <FiChevronRight />
          </button>
        </div>

        <TodayDrivingCard />
      </section>

      <section className="dashboard-section dashboard-vehicle">
        <TeslaStatusCard />
      </section>

      <section className="dashboard-section dashboard-parking">
        <ParkingMiniMap />
      </section>

      <section className="dashboard-section dashboard-ai">
        <div className="dashboard-section-heading compact">
          <h2 className="dashboard-card-title">
            AI 브리핑
          </h2>

          <button
            type="button"
            className="dashboard-text-button"
          >
            모두 보기
            <FiChevronRight />
          </button>
        </div>

        <div className="dashboard-ai-content">
          <div className="dashboard-ai-icon">◆</div>

          <p>
            오늘의 주행 데이터를 분석하고 있습니다.
            운행이 끝나면 점수와 개선 포인트를
            알려드릴게요.
          </p>
        </div>
      </section>
    </main>
  );
}