import { FiBell, FiChevronRight } from "react-icons/fi";

import TodayDrivingCard from "../components/TodayDrivingCard";
import TodayRouteMap from "../components/TodayRouteMap";
import VehicleLocationCard from "../components/VehicleLocationCard";

export default function Home() {
  return (
    <main className="home home-v2">
      <header className="dashboard-header">
        <div className="dashboard-profile">
          <div className="dashboard-avatar">
            <span>⚡</span>
          </div>

          <div>
            <span className="dashboard-greeting">
              Good Morning
            </span>

            <h1>
              Welcome back <strong>cem</strong>
            </h1>
          </div>
        </div>

        <button
          type="button"
          className="dashboard-bell"
          aria-label="알림"
        >
          <FiBell />
          <span />
        </button>
      </header>

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

      <section className="dashboard-section dashboard-location">
        <div className="dashboard-section-heading compact">
          <div>
            <span className="dashboard-eyebrow">
              PARKED LOCATION
            </span>

            <h2>현재 주차 위치</h2>
          </div>

          <span className="dashboard-update-label">
            실시간
          </span>
        </div>

        <VehicleLocationCard />
      </section>

      <section className="dashboard-section dashboard-route">
        <div className="dashboard-section-heading compact">
          <div>
            <span className="dashboard-eyebrow">
              TODAY&apos;S ROUTE
            </span>

            <h2>오늘 이동 경로</h2>
          </div>

          <button
            type="button"
            className="dashboard-text-button"
          >
            기록 보기
            <FiChevronRight />
          </button>
        </div>

        <TodayRouteMap />
      </section>

      <section className="dashboard-section dashboard-ai">
        <div className="dashboard-section-heading compact">
          <div>
            <span className="dashboard-eyebrow">
              AI BRIEFING
            </span>

            <h2>오늘의 브리핑</h2>
          </div>

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
            운행이 끝나면 점수와 개선 포인트를 알려드릴게요.
          </p>
        </div>
      </section>
    </main>
  );
}