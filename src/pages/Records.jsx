import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FiActivity,
  FiBatteryCharging,
  FiChevronRight,
  FiClock,
  FiMap,
  FiRefreshCw,
  FiX,
} from "react-icons/fi";

function formatDuration(seconds) {
  const safeSeconds =
    Number(seconds) || 0;

  const hours = Math.floor(
    safeSeconds / 3600
  );

  const minutes = Math.floor(
    (safeSeconds % 3600) / 60
  );

  if (hours > 0) {
    return `${hours}시간 ${minutes}분`;
  }

  return `${minutes}분`;
}

function formatDate(dateString) {
  if (!dateString) return "-";

  return new Intl.DateTimeFormat(
    "ko-KR",
    {
      timeZone: "Asia/Seoul",
      month: "long",
      day: "numeric",
      weekday: "short",
    }
  ).format(new Date(dateString));
}

function formatTime(dateString) {
  if (!dateString) return "-";

  return new Intl.DateTimeFormat(
    "ko-KR",
    {
      timeZone: "Asia/Seoul",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }
  ).format(new Date(dateString));
}

function formatDateKey(dateString) {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).format(new Date(dateString));
}

function getScoreLabel(score) {
  if (score >= 95) return "Excellent";
  if (score >= 90) return "Great";
  if (score >= 85) return "Smooth";
  if (score >= 80) return "Good";
  return "Complete";
}

function RecordDetail({
  session,
  onClose,
}) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [onClose]);

  return (
    <div
      className="records-detail-backdrop"
      onMouseDown={onClose}
    >
      <section
        className="records-detail-sheet"
        role="dialog"
        aria-modal="true"
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <div className="records-detail-handle" />

        <header className="records-detail-header">
          <div>
            <span>DRIVE REPORT</span>
            <h2>주행 상세 기록</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
          >
            <FiX />
          </button>
        </header>

        <div className="records-detail-score">
          <div>
            <span>AI 운전 점수</span>

            <strong>
              {session.score}
              <small>점</small>
            </strong>

            <p>
              {getScoreLabel(
                session.score
              )} Drive
            </p>
          </div>

          <div
            className="records-score-ring"
            style={{
              "--record-score":
                `${session.score}%`,
            }}
          >
            <strong>
              {session.score}
            </strong>
          </div>
        </div>

        <div className="records-detail-time">
          <span>
            {formatDate(
              session.startedAt
            )}
          </span>

          <strong>
            {formatTime(
              session.startedAt
            )}
            {" → "}
            {formatTime(
              session.endedAt
            )}
          </strong>
        </div>

        <div className="records-detail-grid">
          <div>
            <FiMap />
            <span>주행 거리</span>

            <strong>
              {session.distanceKm}
              <small>km</small>
            </strong>
          </div>

          <div>
            <FiClock />
            <span>운행 시간</span>

            <strong>
              {formatDuration(
                session.durationSec
              )}
            </strong>
          </div>

          <div>
            <FiActivity />
            <span>평균 속도</span>

            <strong>
              {session.avgSpeedKmh}
              <small>km/h</small>
            </strong>
          </div>

          <div>
            <FiBatteryCharging />
            <span>배터리 사용</span>

            <strong>
              {session.batteryUsed}
              <small>%</small>
            </strong>
          </div>

          <div>
            <FiBatteryCharging />
            <span>배터리 효율</span>

            <strong>
              {session.efficiency || "-"}
              <small>km/%</small>
            </strong>
          </div>
        </div>

        <div className="records-detail-notice">
          현재 점수는 주행거리, 운행시간,
          평균속도와 배터리 사용량을 기준으로
          계산됩니다.
        </div>
      </section>
    </div>
  );
}

export default function Records() {
  const [sessions, setSessions] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [selectedSession, setSelectedSession] =
    useState(null);

  const loadHistory =
    useCallback(async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          "/api/driving-history",
          {
            credentials: "include",
            cache: "no-store",
          }
        );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.ok
        ) {
          throw new Error(
            data.error ||
              "주행 기록을 불러오지 못했습니다."
          );
        }

        setSessions(
          Array.isArray(data.sessions)
            ? data.sessions
            : []
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "주행 기록을 불러오지 못했습니다."
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const groupedSessions =
    useMemo(() => {
      const groups = new Map();

      for (const session of sessions) {
        const key =
          formatDateKey(
            session.startedAt
          );

        if (!groups.has(key)) {
          groups.set(key, {
            date: session.startedAt,
            sessions: [],
          });
        }

        groups.get(key).sessions.push(
          session
        );
      }

      return Array.from(
        groups.values()
      );
    }, [sessions]);

  return (
    <main className="records-page">
      <header className="records-header">
        <div>
          <span>DRIVE HISTORY</span>
          <h1>주행 기록</h1>

          <p>
            완료된 운행과 AI 리포트를
            확인하세요.
          </p>
        </div>

        <button
          type="button"
          onClick={loadHistory}
          disabled={loading}
          aria-label="새로고침"
        >
          <FiRefreshCw
            className={
              loading
                ? "records-spin"
                : ""
            }
          />
        </button>
      </header>

      {loading &&
        sessions.length === 0 && (
          <div className="records-state">
            주행 기록을 불러오는 중...
          </div>
        )}

      {!loading &&
        error &&
        sessions.length === 0 && (
          <div className="records-state">
            <span>{error}</span>

            <button
              type="button"
              onClick={loadHistory}
            >
              다시 불러오기
            </button>
          </div>
        )}

      {!loading &&
        !error &&
        sessions.length === 0 && (
          <div className="records-empty">
            <FiActivity />

            <strong>
              아직 완료된 운행이 없어요
            </strong>

            <span>
              운행이 종료되면 이곳에
              자동으로 기록됩니다.
            </span>
          </div>
        )}

      {groupedSessions.map(
        (group) => {
          const totalDistance =
            group.sessions.reduce(
              (sum, session) =>
                sum +
                Number(
                  session.distanceKm || 0
                ),
              0
            );

          return (
            <section
              className="records-day"
              key={formatDateKey(
                group.date
              )}
            >
              <div className="records-day-heading">
                <div>
                  <h2>
                    {formatDate(
                      group.date
                    )}
                  </h2>

                  <span>
                    {group.sessions.length}회 운행
                  </span>
                </div>

                <strong>
                  {totalDistance.toFixed(1)}
                  <small>km</small>
                </strong>
              </div>

              <div className="records-list">
                {group.sessions.map(
                  (session) => (
                    <button
                      type="button"
                      className="record-item"
                      key={session.id}
                      onClick={() =>
                        setSelectedSession(
                          session
                        )
                      }
                    >
                      <div className="record-score">
                        <strong>
                          {session.score}
                        </strong>

                        <span>점</span>
                      </div>

                      <div className="record-copy">
                        <strong>
                          {formatTime(
                            session.startedAt
                          )}
                          {" – "}
                          {formatTime(
                            session.endedAt
                          )}
                        </strong>

                        <span>
                          {session.distanceKm}km
                          {" · "}
                          {formatDuration(
                            session.durationSec
                          )}
                          {" · "}
                          {session.batteryUsed}%
                        </span>
                      </div>

                      <FiChevronRight />
                    </button>
                  )
                )}
              </div>
            </section>
          );
        }
      )}

      {selectedSession && (
        <RecordDetail
          session={selectedSession}
          onClose={() =>
            setSelectedSession(null)
          }
        />
      )}
    </main>
  );
}