import {
  useEffect,
  useState,
} from "react";

import {
  FiBell,
  FiChevronLeft,
  FiTrash2,
  FiX,
} from "react-icons/fi";

function formatNotificationTime(
  dateString
) {
  if (!dateString) {
    return "시간 정보 없음";
  }

  const date = new Date(dateString);
  const dateTime = date.getTime();

  if (!Number.isFinite(dateTime)) {
    return "시간 정보 없음";
  }

  const difference =
    Date.now() - dateTime;

  const minutes = Math.max(
    Math.floor(difference / 60000),
    0
  );

  if (minutes < 1) {
    return "방금 전";
  }

  if (minutes < 60) {
    return `${minutes}분 전`;
  }

  const hours =
    Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}시간 전`;
  }

  return new Intl.DateTimeFormat(
    "ko-KR",
    {
      month: "short",
      day: "numeric",
    }
  ).format(date);
}

function normalizeNotifications(
  notifications
) {
  if (!Array.isArray(notifications)) {
    return [];
  }

  return notifications
    .filter(Boolean)
    .map((item, index) => ({
      ...item,

      id:
        item.id ||
        `notification-${index}`,

      type:
        item.type || "update",

      title:
        item.title ||
        `C-Volt ${item.version || ""}`,

      message:
        item.message ||
        item.description ||
        "업데이트 내용이 없습니다.",

      notificationTime:
        item.releasedAt ||
        item.createdAt ||
        null,
    }));
}

export default function NotificationPanel({
  open,
  onClose,
  notifications,
  onNotificationsChange,
}) {
  const [items, setItems] =
    useState([]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const nextItems =
      normalizeNotifications(
        notifications
      );

    const readItems =
      nextItems.map((item) => ({
        ...item,
        read: true,
      }));

    setItems(readItems);

    onNotificationsChange?.(
      readItems
    );
  }, [
    open,
    notifications,
    onNotificationsChange,
  ]);

  if (!open) {
    return null;
  }

  function clearAll() {
    setItems([]);

    onNotificationsChange?.([]);

    localStorage.setItem(
      "cvolt_notifications",
      JSON.stringify([])
    );
  }

  return (
    <div
      className="cv-sheet-backdrop"
      onClick={onClose}
    >
      <section
        className="cv-notification-panel"
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        <div className="cv-sheet-handle" />

        <header className="cv-sheet-header">
          <button
            type="button"
            className="cv-sheet-icon-button"
            onClick={onClose}
            aria-label="알림 닫기"
          >
            <FiChevronLeft />
          </button>

          <h2>알림</h2>

          <button
            type="button"
            className="cv-sheet-icon-button"
            onClick={onClose}
            aria-label="알림 닫기"
          >
            <FiX />
          </button>
        </header>

        {items.length > 0 ? (
          <>
            <div className="cv-notification-list">
              {items.map((item) => (
                <article
                  className="cv-notification-item"
                  key={item.id}
                >
                  <div
                    className={
                      `cv-notification-type ${
                        item.type
                      }`
                    }
                  >
                    {item.type ===
                    "drive"
                      ? "🏁"
                      : "⚡"}
                  </div>

                  <div>
                    <strong>
                      {item.title}
                    </strong>

                    <p>
                      {item.message}
                    </p>

                    <span>
                      {formatNotificationTime(
                        item.notificationTime
                      )}
                    </span>
                  </div>
                </article>
              ))}
            </div>

            <button
              type="button"
              className="cv-notification-clear"
              onClick={clearAll}
            >
              <FiTrash2 />
              알림 모두 지우기
            </button>
          </>
        ) : (
          <div className="cv-notification-empty">
            <FiBell />

            <strong>
              새로운 알림이 없습니다
            </strong>

            <span>
              업데이트와 운행 리포트가
              이곳에 표시됩니다.
            </span>
          </div>
        )}
      </section>
    </div>
  );
}