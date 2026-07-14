import { useEffect, useRef, useState } from "react";
import { FiCamera, FiChevronLeft, FiSave, FiX } from "react-icons/fi";

const DEFAULT_PROFILE = {
  displayName: "cem",
  profileImage: "",
  driveNotifications: true,
  updateNotifications: true,
};

export default function ProfilePanel({
  open,
  onClose,
  onProfileChange,
}) {
  const fileInputRef = useRef(null);
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    if (!open) return;

    try {
      const saved = localStorage.getItem("cvolt_profile");

      if (saved) {
        setProfile({
          ...DEFAULT_PROFILE,
          ...JSON.parse(saved),
        });
      }
    } catch {
      setProfile(DEFAULT_PROFILE);
    }

    setSavedMessage("");
  }, [open]);

  if (!open) return null;

  function handleImageChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      window.alert("이미지 파일만 선택할 수 있습니다.");
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      window.alert("사진은 3MB 이하로 선택해주세요.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setProfile((previous) => ({
        ...previous,
        profileImage: String(reader.result || ""),
      }));
    };

    reader.readAsDataURL(file);
  }

  function saveProfile() {
    const nextProfile = {
      ...profile,
      displayName:
        profile.displayName.trim() || DEFAULT_PROFILE.displayName,
    };

    localStorage.setItem(
      "cvolt_profile",
      JSON.stringify(nextProfile)
    );

    setProfile(nextProfile);
    onProfileChange?.(nextProfile);
    setSavedMessage("저장되었습니다.");

    window.setTimeout(() => {
      setSavedMessage("");
    }, 1800);
  }

  return (
    <div className="cv-sheet-backdrop" onClick={onClose}>
      <section
        className="cv-profile-panel"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="cv-sheet-handle" />

        <header className="cv-sheet-header">
          <button
            type="button"
            className="cv-sheet-icon-button"
            onClick={onClose}
            aria-label="닫기"
          >
            <FiChevronLeft />
          </button>

          <h2>프로필 및 설정</h2>

          <button
            type="button"
            className="cv-sheet-icon-button"
            onClick={onClose}
            aria-label="닫기"
          >
            <FiX />
          </button>
        </header>

        <div className="cv-profile-photo-area">
          <button
            type="button"
            className="cv-profile-photo-button"
            onClick={() => fileInputRef.current?.click()}
          >
            {profile.profileImage ? (
              <img
                src={profile.profileImage}
                alt="프로필"
              />
            ) : (
              <span>⚡</span>
            )}

            <i>
              <FiCamera />
            </i>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handleImageChange}
          />

          <strong>프로필 사진 변경</strong>
          <span>사진을 누르면 변경할 수 있습니다.</span>
        </div>

        <div className="cv-settings-group">
          <label className="cv-settings-field">
            <span>표시 이름</span>

            <input
              value={profile.displayName}
              maxLength={20}
              onChange={(event) =>
                setProfile((previous) => ({
                  ...previous,
                  displayName: event.target.value,
                }))
              }
              placeholder="표시 이름"
            />
          </label>
        </div>

        <div className="cv-settings-group">
          <div className="cv-settings-row">
            <div>
              <strong>운행 종료 알림</strong>
              <span>
                운행 종료 후 점수와 리포트 알림을 받습니다.
              </span>
            </div>

            <button
              type="button"
              className={
                profile.driveNotifications
                  ? "cv-toggle active"
                  : "cv-toggle"
              }
              onClick={() =>
                setProfile((previous) => ({
                  ...previous,
                  driveNotifications:
                    !previous.driveNotifications,
                }))
              }
            >
              <i />
            </button>
          </div>

          <div className="cv-settings-row">
            <div>
              <strong>업데이트 알림</strong>
              <span>
                새로운 기능과 버전 정보를 받습니다.
              </span>
            </div>

            <button
              type="button"
              className={
                profile.updateNotifications
                  ? "cv-toggle active"
                  : "cv-toggle"
              }
              onClick={() =>
                setProfile((previous) => ({
                  ...previous,
                  updateNotifications:
                    !previous.updateNotifications,
                }))
              }
            >
              <i />
            </button>
          </div>
        </div>

        <button
          type="button"
          className="cv-profile-save-button"
          onClick={saveProfile}
        >
          <FiSave />
          설정 저장
        </button>

        {savedMessage && (
          <p className="cv-profile-saved-message">
            {savedMessage}
          </p>
        )}
      </section>
    </div>
  );
}