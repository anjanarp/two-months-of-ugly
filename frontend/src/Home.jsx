import "./Home.css";
import logo from "./assets/tmou-logo.png";
import { useState, useEffect } from "react";

function Home() {
  const [sprints, setSprints] = useState([
    {
      title: "VIOLIN",
      streak: 6,
      startDate: "2025-05-26",
      endDate: "2025-07-25",
      showLog: false,
    },
    {
      title: "CREATIVE CODING",
      streak: 8,
      startDate: "2025-05-26",
      endDate: "2025-07-25",
      showLog: false,
    },
  ]);

  const [pastSprints, setPastSprints] = useState([
    {
      title: "VIOLIN",
      startDate: "2025-05-26",
      endDate: "2025-08-26",
      showLog: false,
    },
    {
      title: "CREATIVE CODING",
      startDate: "2025-05-26",
      endDate: "2025-08-26",
      showLog: false,
    },
  ]);

  const [newSprint, setNewSprint] = useState("");

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(".sprint-card")) {
        setSprints((prev) => prev.map((s) => ({ ...s, showLog: false })));
      }
      if (!e.target.closest(".past-sprint-card")) {
        setPastSprints((prev) => prev.map((s) => ({ ...s, showLog: false })));
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const toggleLog = (index) => {
    setSprints((prev) =>
      prev.map((sprint, i) =>
        i === index ? { ...sprint, showLog: !sprint.showLog } : sprint
      )
    );
  };

  const togglePastLog = (index) => {
    setPastSprints((prev) =>
      prev.map((sprint, i) =>
        i === index ? { ...sprint, showLog: !sprint.showLog } : sprint
      )
    );
  };

  const handleAddSprint = () => {
    if (!newSprint.trim()) return;

    const today = new Date();
    const sixtyDaysLater = new Date(today);
    sixtyDaysLater.setDate(today.getDate() + 60);

    const formattedToday = today.toISOString().split("T")[0];
    const formattedEnd = sixtyDaysLater.toISOString().split("T")[0];

    const newEntry = {
      title: newSprint.trim(),
      streak: 0,
      startDate: formattedToday,
      endDate: formattedEnd,
      showLog: false,
    };

    setSprints((prev) => [...prev, newEntry]);
    setNewSprint("");
  };

  return (
    <div className="page-wrapper">
      <div className="home-wrapper">
        <div className="column-layout">
          <div className="top-row-aligned">
            <img src={logo} alt="Two Months of Ugly Logo" className="logo" />

            <div className="streaks-box">
              <h2>STREAKS</h2>
              {sprints.map((sprint, index) => (
                <p key={index}>
                  {sprint.title} &nbsp;&nbsp; {sprint.streak}🔥
                </p>
              ))}
            </div>
          </div>

          <div className="sprints-wrapper">
            <div className="sprints-section">
              <h2>CURRENT SPRINTS</h2>
              <div className="sprint-input-row">
                <input
                  type="text"
                  className="sprint-input"
                  placeholder="NEW SPRINT"
                  value={newSprint}
                  maxLength={16}
                  onChange={(e) => setNewSprint(e.target.value)}
                />
                <button className="sprint-add-btn" onClick={handleAddSprint}>+</button>
              </div>

              <div className="sprint-grid">
                {sprints.map((sprint, index) => {
                  const startDate = new Date(sprint.startDate);
                  const endDate = new Date(sprint.endDate);
                  const today = new Date();
                  const daysLeft = Math.max(
                    0,
                    Math.ceil((endDate - today) / (1000 * 60 * 60 * 24))
                  );

                  return (
                    <div
                      className={`sprint-card ${sprint.showLog ? "expanded" : ""}`}
                      key={index}
                      onDoubleClick={() => toggleLog(index)}
                    >
                      {sprint.showLog && <button className="log-btn">LOG</button>}
                      <h3>{sprint.title}</h3>
                      <p>STARTED ON {sprint.startDate}</p>
                      <div className="days-left-row">
                        <div className="days-left-container">
                          <span className="days-left-label">DAYS</span>
                          <span className="days-left-label">LEFT</span>
                        </div>
                        <div className="days-left-value">{daysLeft}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="past-sprints-section">
              <h2>PAST SPRINTS</h2>
              <div className="past-sprint-grid">
                {pastSprints.map((sprint, index) => (
                  <div
                    key={index}
                    className={`past-sprint-card ${sprint.showLog ? "expanded-right" : ""}`}
                    onDoubleClick={() => togglePastLog(index)}
                  >
                    {sprint.showLog && <button className="past-log-btn">LOG</button>}
                    <h3>{sprint.title}</h3>
                    <p>{sprint.startDate} – {sprint.endDate}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;