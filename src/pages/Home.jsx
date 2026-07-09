import logo from "../assets/logo.png";
import { loginWithTesla } from "../services/tesla";
export default function Home() {
  return (
    <main className="home">
      <header className="home-header">
 <div className="brand">
  <img src={logo} alt="CVOLT" className="brand-logo" />
</div>

        <button className="bell-button">♡</button>
      </header>
      <button className="tesla-login" onClick={loginWithTesla}>
  Tesla로 로그인
</button>

      <section className="greeting">
        <h1>Good Evening, cem</h1>
        <p>Ready for a better drive?</p>
      </section>

      <section className="drive-card">
        <div className="drive-top">
          <div>
            <div className="label">TODAY'S DRIVE</div>
            <div className="efficiency">
              146 <span>Wh/km</span>
            </div>
          </div>

          <div className="change-badge">▲ 8.2%</div>
        </div>

        <div className="chart">
          <svg viewBox="0 0 320 110" preserveAspectRatio="none">
            <defs>
              <linearGradient id="lineFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#8b2cff" stopOpacity="0.42" />
                <stop offset="100%" stopColor="#8b2cff" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              className="chart-fill"
              d="M0,70 C30,68 42,72 64,66 C90,55 104,58 130,62 C150,66 158,48 176,58 C200,72 214,42 236,38 C258,34 268,56 286,44 C300,34 310,32 320,28 L320,110 L0,110 Z"
            />
            <path
              className="chart-line"
              d="M0,70 C30,68 42,72 64,66 C90,55 104,58 130,62 C150,66 158,48 176,58 C200,72 214,42 236,38 C258,34 268,56 286,44 C300,34 310,32 320,28"
            />
            <circle cx="320" cy="28" r="5" className="chart-dot" />
          </svg>
          <div className="chart-labels">
            <span>00</span><span>06</span><span>12</span><span>18</span><span>24</span>
          </div>
        </div>
      </section>

      <section className="stat-grid">
        <div className="stat-card">
          <span>DISTANCE</span>
          <strong>62.4 <small>km</small></strong>
        </div>
        <div className="stat-card">
          <span>DURATION</span>
          <strong>1h 23m</strong>
        </div>
        <div className="stat-card">
          <span>AVG SPEED</span>
          <strong>44 <small>km/h</small></strong>
        </div>
      </section>

      <section className="shortcut-card">
        <button>🏆<span>LEAGUE</span></button>
        <button>🧠<span>AI COACH</span></button>
        <button>▮▮▮<span>STATS</span></button>
        <button>🧬<span>DNA</span></button>
      </section>

      <section className="ai-commentary">
        <h2>🤖 AI 경기 해설</h2>
        <p>
          오늘은 출발 초반 전비가 안정적입니다. 이 흐름이면 하남 Model Y
          Juniper 리그에서 상위권 진입도 가능합니다.
        </p>
      </section>

      <section className="replay-card">
        <div className="replay-head">
          <div>
            <h2>Replay</h2>
            <p>46.2 km · 1h 02m · 142 Wh/km</p>
          </div>
          <button>▶</button>
        </div>
        <div className="route-map">
          <div className="route-line"></div>
          <i className="start-dot"></i>
          <i className="end-dot"></i>
        </div>
      </section>
    </main>
  );
}