import { TbDna2 } from "react-icons/tb";
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
  icon: TbDna2,
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
        const active = page === tab.id;

        return (
          <button
            type="button"
            key={tab.id}
            className={
              active
                ? "cv-nav-item active"
                : "cv-nav-item"
            }
            onClick={() => setPage(tab.id)}
            aria-current={
              active ? "page" : undefined
            }
          >
            <span className="cv-nav-icon">
              <Icon />
            </span>

            <span className="cv-nav-label">
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}