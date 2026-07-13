import { useEffect, useState } from "react";
import { FiBell } from "react-icons/fi";

import quicksilver from "../assets/quicksilver.png";
import glacierblue from "../assets/glacierblue.png";

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  if (hour < 22) return "Good Evening";

  return "Good Night";
}

function getVehicleImage(vehicle) {
  const name = (vehicle?.name || "").toLowerCase();

  return name.includes("대기리차") || name.includes("ceh")
    ? glacierblue
    : quicksilver;
}

export default function TopBar() {
  const [vehicle, setVehicle] = useState(() => {
    try {
      const savedVehicle = localStorage.getItem("cvolt_vehicle");

      return savedVehicle
        ? JSON.parse(savedVehicle)
        : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    function handleVehicleUpdated(event) {
      const nextVehicle = event.detail;

      setVehicle(nextVehicle);

      localStorage.setItem(
        "cvolt_vehicle",
        JSON.stringify(nextVehicle)
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

  return (
    <header className="cv-topbar">
      <div className="cv-profile">
        <div className="cv-profile-image">
          <img
            src={getVehicleImage(vehicle)}
            alt="내 Tesla"
          />
        </div>

        <div className="cv-profile-copy">
          <span>{getGreeting()}</span>

          <h1>
            Welcome to{" "}
            <strong>
              {vehicle?.name || "My Tesla"}
            </strong>
          </h1>
        </div>
      </div>

      <button
        type="button"
        className="cv-notification-button"
        aria-label="알림"
      >
        <FiBell />
        <i />
      </button>
    </header>
  );
}