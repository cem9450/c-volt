import {
  FiChevronRight,
  FiInfo,
} from "react-icons/fi";

import TopBar from "../components/TopBar";
import TodayDrivingCard from "../components/TodayDrivingCard";
import TeslaStatusCard from "../components/TeslaStatusCard";
import ParkingMiniMap from "../components/ParkingMiniMap";
import AIBriefingCard from "../components/AIBriefingCard";

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
         <AIBriefingCard />
      </section>

    </main>
  );
}