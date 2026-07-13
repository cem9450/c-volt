import {
  FiBarChart2,
  FiCalendar,
  FiHome,
  FiMessageCircle,
  FiSmile,
} from "react-icons/fi";

import { HiOutlineTrophy } from "react-icons/hi2";

const tabs = [
  {
    id: "home",
    label: "홈",
    icon: FiHome,
  },
  {
    id: "records",
    label: "기록",
    icon: FiCalendar,
  },
  {
    id: "league",
    label: "리그",
    icon: HiOutlineTrophy,
  },
  {
    id: "stats",
    label: "통계",
    icon: FiBarChart2,
  },
  {
    id: "dna",
    label: "운전 DNA",
    icon: FiSmile,
  },
  {
    id: "chat",
    label: "채팅",
    icon: FiMessageCircle,
  },
];

export default function BottomNav({
  page,
  setPage,
}) {
  return (
    <nav className="cv-bottom-nav">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = page === tab.id;

        return (
          <button
            type="button"
            key={tab.id}
            className={
              isActive
                ? "cv-nav-item active"
                : "cv-nav-item"
            }
            onClick={() => setPage(tab.id)}
          >
            <Icon />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}