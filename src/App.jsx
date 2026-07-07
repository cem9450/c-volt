import { useState } from 'react'
import './App.css'

function App() {
  const [tab, setTab] = useState('today')

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brandMark">⚡</div>
          <div>
            <h1>C-Volt</h1>
            <p>cem vs ceh Drive League</p>
          </div>
        </div>

        <button
          className="helpBtn"
          onClick={() =>
            alert(
              'C-Volt는 Tesla 주행 종료 후 데이터를 저장하고, 둘 다 10km 이상 주행한 날 전비/거리/시간을 비교하는 운전 리그 앱입니다. 리그 초대는 처음 한 번만 하면 계속 유지됩니다.'
            )
          }
        >
          ?
        </button>
      </header>

      <div className="syncBar">
        <span className="syncDot" />
        클라우드 저장됨
        <b>오늘 00:12</b>
      </div>

      {tab === 'today' && <Today />}
      {tab === 'graph' && <Graph />}
      {tab === 'calendar' && <Calendar />}
      {tab === 'chat' && <Chat />}

      <nav className="bottomNav">
        <button className={tab === 'today' ? 'active' : ''} onClick={() => setTab('today')}>오늘</button>
        <button className={tab === 'graph' ? 'active' : ''} onClick={() => setTab('graph')}>그래프</button>
        <button className={tab === 'calendar' ? 'active' : ''} onClick={() => setTab('calendar')}>달력</button>
        <button className={tab === 'chat' ? 'active' : ''} onClick={() => setTab('chat')}>채팅</button>
      </nav>
    </div>
  )
}

function Today() {
  return (
    <>
      <section className="card">
        <div className="sectionHead">
          <h2>오늘의 경기</h2>
          <span>경기 성립 ✅</span>
        </div>

        <div className="drivers">
          <Driver
            name="cem"
            model="Model Y Juniper"
            color="silver"
            efficiency="136"
            distance="92km"
            time="1h42m"
            result="승"
            winner
          />

          <Driver
            name="ceh"
            model="Model Y Juniper"
            color="blue"
            efficiency="149"
            distance="71km"
            time="1h18m"
            result="패"
          />
        </div>
      </section>

      <section className="aiCard">
        <b>AI 경기 해설</b>
        <p>오늘은 cem 승리. 둘 다 10km 이상 주행했고, cem이 ceh보다 약 8.7% 좋은 전비를 기록했습니다.</p>
      </section>
    </>
  )
}

function Driver({ name, model, color, efficiency, distance, time, result, winner }) {
  return (
    <div className={`driver ${winner ? 'winner' : ''}`}>
      <div className={`car ${color}`}>{color === 'silver' ? '🚘' : '🚙'}</div>
      <div className="name">{name}</div>
      <div className="model">{model}</div>

      <div className="metric">
        {efficiency}
        <span> Wh/km</span>
      </div>

      <div className="mini">
        <div><b>{distance}</b>주행</div>
        <div><b>{time}</b>시간</div>
        <div><b>{result}</b>결과</div>
      </div>
    </div>
  )
}

function Graph() {
  const labels = ['월', '화', '수', '목', '금', '토', '일']

  return (
    <section className="card">
      <div className="sectionHead">
        <h2>주간 전비 그래프</h2>
        <span>cem / ceh</span>
      </div>

      <div className="legend">
        <span><i className="silverDot" />cem</span>
        <span><i className="blueDot" />ceh</span>
      </div>

      <svg className="lineChart" viewBox="0 0 320 140" preserveAspectRatio="none">
        <polyline
          points="16,72 64,50 112,38 160,58 208,52 256,28 304,44"
          fill="none"
          stroke="#9AA3AD"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polyline
          points="16,105 64,90 112,112 160,96 208,82 256,120 304,112"
          fill="none"
          stroke="#6DB7FF"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <div className="chartLabels">
        {labels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </section>
  )
}

function Calendar() {
  const wins = [
    'cem', 'ceh', 'cem', 'cem', 'ceh', '', 'cem',
    'ceh', 'cem', 'cem', 'ceh', 'cem', 'ceh', 'cem',
    'cem', 'ceh', '', 'cem', 'ceh', 'cem', 'cem',
    'ceh', 'cem', 'ceh', 'cem', 'cem', 'ceh', 'cem',
    'ceh', '',
  ]

  return (
    <section className="card">
      <div className="sectionHead">
        <h2>7월 경기 달력</h2>
        <span>cem 12승 · ceh 9승</span>
      </div>

      <div className="calendar">
        {wins.map((winner, i) => (
          <div className={`day ${winner}`} key={i}>
            <b>{i + 1}</b>
            <em>{winner}</em>
          </div>
        ))}
      </div>
    </section>
  )
}

function Chat() {
  const [messages, setMessages] = useState([
    { sender: 'ceh', text: '오늘 전비 몇 나왔냐?' },
    { sender: 'cem', text: '136. 오늘은 내가 이긴듯 ㅋㅋ' },
  ])
  const [text, setText] = useState('')

  const send = () => {
    if (!text.trim()) return
    setMessages([...messages, { sender: 'cem', text }])
    setText('')
  }

  return (
    <section className="card">
      <div className="sectionHead">
        <h2>경기 채팅</h2>
        <button onClick={() => setMessages([...messages, { sender: 'cem', text: '📍 내 위치 보냄' }])}>
          위치
        </button>
      </div>

      <div className="chatBox">
        {messages.map((m, i) => (
          <div key={i} className={`message ${m.sender === 'cem' ? 'me' : 'other'}`}>
            {m.text}
          </div>
        ))}
      </div>

      <div className="inputRow">
        <input
          value={text}
          placeholder="메시지 입력"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') send()
          }}
        />
        <button onClick={send}>전송</button>
      </div>
    </section>
  )
}

export default App