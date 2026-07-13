import { FiChevronRight } from "react-icons/fi";

import TodayDrivingCard from "../components/TodayDrivingCard";
import TeslaStatusCard from "../components/TeslaStatusCard";
import ParkingMiniMap from "../components/ParkingMiniMap";
import TopBar from "../components/TopBar";


export default function Home() {
  return (
    <main className="home home-v2">
<TopBar />
      

      <section className="dashboard-section dashboard-drive">
        <div className="dashboard-section-heading">
          <div>
            <span className="dashboard-eyebrow">
              TODAY&apos;S DRIVE
            </span>

            <h2>오늘의 드라이브</h2>
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
        <div className="dashboard-section-heading compact">
          <h2>차량 상태</h2>

          <span className="dashboard-update-label">
            REAL-TIME
          </span>
        </div>

        <TeslaStatusCard />
      </section>

      <section className="dashboard-section dashboard-parking">
        <div className="dashboard-section-heading compact">
          <h2>현재 주차 위치</h2>
        </div>

        <ParkingMiniMap />
      </section>

      <section className="dashboard-section dashboard-ai">
        <div className="dashboard-section-heading compact">
          <h2>AI 브리핑</h2>

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