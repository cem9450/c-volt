import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { FiBell } from "react-icons/fi";

import quicksilver from "../assets/quicksilver.png";
import glacierblue from "../assets/glacierblue.png";

import ProfilePanel from "./ProfilePanel";
import NotificationPanel from "./NotificationPanel";

import { APP_UPDATES } from "../data/appUpdates";

const DEFAULT_PROFILE = {
  displayName: "cem",
  profileImage: "",
  driveNotifications: true,
  updateNotifications: true,
};

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  if (hour < 22) return "Good Evening";

  return "Good Night";
}

function getVehicleImage(vehicle) {
  const name = (
    vehicle?.name || ""
  ).toLowerCase();

  return name.includes("대기리차") ||
    name.includes("ceh")
    ? glacierblue
    : quicksilver;
}

function loadProfile() {
  try {
    const saved = localStorage.getItem(
      "cvolt_profile"
    );

    return saved
      ? {
          ...DEFAULT_PROFILE,
          ...JSON.parse(saved),
        }
      : DEFAULT_PROFILE;
  } catch {
    return DEFAULT_PROFILE;
  }
}

function loadStoredNotifications() {
  try {
    const saved = localStorage.getItem(
      "cvolt_notifications"
    );

    return saved
      ? JSON.parse(saved)
      : [];
  } catch {
    return [];
  }
}

function syncUpdateNotifications(
  notifications,
  profile
) {
  if (
    profile.updateNotifications === false
  ) {
    return notifications;
  }

  const existingIds = new Set(
    notifications.map(
      (notification) => notification.id
    )
  );

  const missingUpdates = APP_UPDATES
    .filter(
      (update) =>
        !existingIds.has(update.id)
    )
    .map((update) => ({
      id: update.id,
      type: update.type,
      title: update.title,
      message: update.message,
      createdAt: update.releasedAt,
      read: false,
    }));

  return [
    ...missingUpdates,
    ...notifications,
  ];
}

export default function TopBar() {
  const [vehicle, setVehicle] =
    useState(() => {
      try {
        const savedVehicle =
          localStorage.getItem(
            "cvolt_vehicle"
          );

        return savedVehicle
          ? JSON.parse(savedVehicle)
          : null;
      } catch {
        return null;
      }
    });

  const [profile, setProfile] =
    useState(loadProfile);

  const [notifications, setNotifications] =
    useState(() => {
      const savedProfile = loadProfile();
      const stored =
        loadStoredNotifications();

      return syncUpdateNotifications(
        stored,
        savedProfile
      );
    });

  const [
    profileOpen,
    setProfileOpen,
  ] = useState(false);

  const [
    notificationsOpen,
    setNotificationsOpen,
  ] = useState(false);

  useEffect(() => {
    localStorage.setItem(
      "cvolt_notifications",
      JSON.stringify(notifications)
    );
  }, [notifications]);

  useEffect(() => {
    function handleVehicleUpdated(event) {
      const nextVehicle =
        event.detail;

      setVehicle(nextVehicle);

      localStorage.setItem(
        "cvolt_vehicle",
        JSON.stringify(nextVehicle)
      );
    }

    function handleDriveEnded(event) {
      const savedProfile =
        loadProfile();

      if (
        savedProfile
          .driveNotifications === false
      ) {
        return;
      }

      const detail =
        event.detail || {};

      const scoreText =
        typeof detail.score === "number"
          ? `${detail.score}점`
          : "운전 점수";

      const nextNotification = {
        id: `drive-${Date.now()}`,
        type: "drive",
        title:
          "오늘 운행이 종료되었습니다",
        message:
          `${scoreText}과 오늘의 운행 리포트를 확인해보세요.`,
        createdAt:
          new Date().toISOString(),
        read: false,
      };

      setNotifications(
        (previous) => [
          nextNotification,
          ...previous,
        ]
      );
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
        (notification) =>
          !notification.read
      ).length,
    [notifications]
  );

  function updateNotifications(
    nextNotifications
  ) {
    setNotifications(
      nextNotifications
    );
  }

  function handleProfileChange(
    nextProfile
  ) {
    setProfile(nextProfile);

    const synced =
      syncUpdateNotifications(
        notifications,
        nextProfile
      );

    setNotifications(synced);
  }

  const profileImage =
    profile.profileImage ||
    getVehicleImage(vehicle);

  return (
    <>
      <header className="cv-topbar">
        <div className="cv-profile">
          <button
            type="button"
            className="cv-profile-image"
            onClick={() =>
              setProfileOpen(true)
            }
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
                {vehicle?.name ||
                  "My Tesla"}
              </strong>
            </h1>
          </div>
        </div>

        <button
          type="button"
          className="cv-notification-button"
          aria-label="알림 열기"
          onClick={() =>
            setNotificationsOpen(true)
          }
        >
          <FiBell />

          {unreadCount > 0 && (
            <>
              <i />

              <b>
                {unreadCount > 9
                  ? "9+"
                  : unreadCount}
              </b>
            </>
          )}
        </button>
      </header>

      <ProfilePanel
        open={profileOpen}
        onClose={() =>
          setProfileOpen(false)
        }
        onProfileChange={
          handleProfileChange
        }
      />

      <NotificationPanel
        open={notificationsOpen}
        onClose={() =>
          setNotificationsOpen(false)
        }
        notifications={
          notifications
        }
        onNotificationsChange={
          updateNotifications
        }
      />
    </>
  );
}