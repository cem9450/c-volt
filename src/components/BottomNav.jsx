const tabs = [
  { id: "home", label: "오늘" },
  { id: "calendar", label: "달력" },
  { id: "league", label: "리그" },
  { id: "chat", label: "채팅" },
];

export default function BottomNav({ page, setPage }) {
  return (
    <nav className="bottomNav">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={page === tab.id ? "active" : ""}
          onClick={() => setPage(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}