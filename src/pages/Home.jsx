import TopBar from "../components/TopBar";
import DriveDashboardSection from "../components/DriveDashboardSection";
import TeslaStatusCard from "../components/TeslaStatusCard";
import ParkingMiniMap from "../components/ParkingMiniMap";
import AIBriefingCard from "../components/AIBriefingCard";

export default function Home() {
  return (
    <main className="home home-v2">
      <TopBar />

      <DriveDashboardSection />

      <section className="dashboard-section dashboard-vehicle">
        <TeslaStatusCard />
      </section>

      <section className="dashboard-section dashboard-parking">
        <ParkingMiniMap />
      </section>

      <section className="dashboard-section dashboard-ai">
        <AIBriefingCard />
      </section>

      <footer className="app-footer">
        <div className="footer-brand">
          <span className="footer-icon">⚡</span>
          <span className="footer-built-by">
            Built by
          </span>
          <span className="footer-cem-labs">
            CEM Labs
          </span>
        </div>

        <p className="footer-slogan">
          Connect. Evolve. Move.
        </p>
      </footer>
    </main>
  );
}