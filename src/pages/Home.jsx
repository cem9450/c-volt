import {
  useEffect,
  useState,
} from "react";

import NearbyChargersCard from "../components/NearbyChargersCard";
import TopBar from "../components/TopBar";
import DriveDashboardSection from "../components/DriveDashboardSection";
import DriveEndReport from "../components/DriveEndReport";
import TeslaStatusCard from "../components/TeslaStatusCard";
import ParkingMiniMap from "../components/ParkingMiniMap";
import AIBriefingCard from "../components/AIBriefingCard";

function getSavedDrivingState() {
  try {
    const saved =
      localStorage.getItem(
        "cvolt_vehicle"
      );

    if (!saved) {
      return false;
    }

    const vehicle =
      JSON.parse(saved);

    return vehicle?.isDriving === true;
  } catch {
    return false;
  }
}

export default function Home() {
  const [isDriving, setIsDriving] =
    useState(getSavedDrivingState);

  useEffect(() => {
    function handleVehicleUpdated(
      event
    ) {
      setIsDriving(
        event.detail?.isDriving === true
      );
    }

    window.addEventListener(
      "cvolt:vehicle-updated",
      handleVehicleUpdated
    );

    return () => {
      window.removeEventListener(
        "cvolt:vehicle-updated",
        handleVehicleUpdated
      );
    };
  }, []);

  function handleVehicleChange(
    vehicle
  ) {
    setIsDriving(
      vehicle?.isDriving === true
    );
  }

  function openDriveDetail() {
    window.dispatchEvent(
      new CustomEvent(
        "cvolt:open-drive-detail"
      )
    );
  }

  const vehicleCard = (
    <section className="dashboard-section dashboard-vehicle">
      <TeslaStatusCard
        onVehicleChange={
          handleVehicleChange
        }
      />
    </section>
  );

  const parkingCard = (
    <section className="dashboard-section dashboard-parking">
      <ParkingMiniMap />
    </section>
  );

  return (
    <main className="home home-v2">
      <TopBar />

      <section className="dashboard-section dashboard-insight">
        <AIBriefingCard />
      </section>

      <DriveDashboardSection />

      {isDriving ? (
        <>
          {vehicleCard}
          {parkingCard}
        </>
      ) : (
        <>
          {parkingCard}
          {vehicleCard}
        </>
      )}

      <section className="dashboard-section dashboard-chargers">
        <NearbyChargersCard />
      </section>

      <footer className="app-footer">
        <div className="footer-brand">
          <span className="footer-icon">
            ⚡
          </span>

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

      <DriveEndReport
        onOpenDetail={
          openDriveDetail
        }
      />
    </main>
  );
}