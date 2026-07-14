import { useEffect, useMemo, useState } from "react";
import { FiBell } from "react-icons/fi";

import quicksilver from "../assets/quicksilver.png";
import glacierblue from "../assets/glacierblue.png";

import ProfilePanel from "./ProfilePanel";
import NotificationPanel from "./NotificationPanel";

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

function loadProfile() {
  try {
    const saved = localStorage.getItem("cvolt_profile");

    return saved
      ? JSON.parse(saved)
      : {
          displayName: "cem",
          profileImage: "",
          driveNotifications: true,
          updateNotifications: true,
        };
  } catch {
    return {
      displayName: "cem",
      profileImage: "",
      driveNotifications: true,
      updateNotifications: true,
    };
  }
}

function loadNotifications() {
  try {
    const saved = localStorage.getItem("cvolt_notifications");

    if (saved) return JSON.parse(saved);
  } catch {
    // 초기값 사용
  }

  const initial = [
    {
      id: "version-0-1",
      type: "update",
      title: "C-Volt ver 0.1",
      message:
        "프로필 설정과 알림 센터 기능이 추가되었습니다.",
      createdAt: new Date().toISOString(),
      read: false,
    },
  ];

  localStorage.setItem(
    "cvolt_notifications",
    JSON.stringify(initial)
  );

  return initial;
}

export default function TopBar() {
  const [vehicle, setVehicle] = useState(() => {
    try {
      const savedVehicle =
        localStorage.getItem("cvolt_vehicle");

      return savedVehicle
        ? JSON.parse(savedVehicle)
        : null;
    } catch {
      return null;
    }
  });

  const [profile, setProfile] = useState(loadProfile);
  const [notifications, setNotifications] =
    useState(loadNotifications);

  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] =
    useState(false);

  useEffect(() => {
    function handleVehicleUpdated(event) {
      const nextVehicle = event.detail;

      setVehicle(nextVehicle);

      localStorage.setItem(
        "cvolt_vehicle",
        JSON.stringify(nextVehicle)
      );
    }

    function handleDriveEnded(event) {
      const savedProfile = loadProfile();

      if (savedProfile.driveNotifications === false) {
        return;
      }

      const detail = event.detail || {};
      const score =
        typeof detail.score === "number"
          ? `${detail.score}점`
          : "운전 점수";

      const nextNotification = {
        id: `drive-${Date.now()}`,
        type: "drive",
        title: "오늘 운행이 종료되었습니다",
        message: `${score}과 오늘의 운행 리포트를 확인해보세요.`,
        createdAt: new Date().toISOString(),
        read: false,
      };

      setNotifications((previous) => {
        const next = [nextNotification, ...previous];

        localStorage.setItem(
          "cvolt_notifications",
          JSON.stringify(next)
        );

        return next;
      });
    }

    window.addEventListener(
      "cvolt:vehicle-updated",
      handleVehicleUpdated
    );

    window.addEventListener(
      "cvolt:drive-ended",
      handleDriveEnded
    );

    return () => {
      window.removeEventListener(
        "cvolt:vehicle-updated",
        handleVehicleUpdated
      );

      window.removeEventListener(
        "cvolt:drive-ended",
        handleDriveEnded
      );
    };
  }, []);

  const unreadCount = useMemo(
    () =>
      notifications.filter(
        (notification) => !notification.read
      ).length,
    [notifications]
  );

  function updateNotifications(nextNotifications) {
    setNotifications(nextNotifications);

    localStorage.setItem(
      "cvolt_notifications",
      JSON.stringify(nextNotifications)
    );
  }

  const profileImage =
    profile.profileImage || getVehicleImage(vehicle);

  return (
    <>
      <header className="cv-topbar">
        <div className="cv-profile">
          <button
            type="button"
            className="cv-profile-image"
            onClick={() => setProfileOpen(true)}
            aria-label="프로필 설정 열기"
          >
            <img
              src={profileImage}
              alt="프로필"
            />
          </button>

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
          aria-label="알림 열기"
          onClick={() => setNotificationsOpen(true)}
        >
          <FiBell />

          {unreadCount > 0 && (
            <>
              <i />
              <b>
                {unreadCount > 9 ? "9+" : unreadCount}
              </b>
            </>
          )}
        </button>
      </header>

      <ProfilePanel
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        onProfileChange={setProfile}
      />

      <NotificationPanel
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        notifications={notifications}
        onNotificationsChange={updateNotifications}
      />
    </>
  );
}