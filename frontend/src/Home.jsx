import "./Home.css";
import logo from "./assets/tmou-logo.png";
import { useState, useEffect } from "react"
import { auth, db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, addDoc, getDocs, serverTimestamp, onSnapshot } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

function Home() {
    const navigate = useNavigate();
    const [newSprint, setNewSprint] = useState("");

    const [allSprints, setAllSprints] = useState([]);

    const today = new Date();

    const currentSprints = allSprints.filter((sprint) => {
        const end = new Date(sprint.endDate);
        return end >= today;
    });

    const pastSprints = allSprints.filter((sprint) => {
        const end = new Date(sprint.endDate);
        return end < today;
    });

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;
    
        const unsubscribe = onSnapshot(collection(db, "sprints"), (snapshot) => {
            const now = new Date();
    
            const sprints = snapshot.docs
                .map((doc) => {
                    const data = doc.data();
                    if (data.createdBy !== user.uid) return null;
    
                    let adjustedStreak = data.streak || 0;
    
                    if (data.lastLoggedAt) {
                        const lastLogged = new Date(data.lastLoggedAt);
                        const hoursSinceLastLog = (now - lastLogged) / (1000 * 60 * 60);
    
                        if (hoursSinceLastLog > 36) {
                            adjustedStreak = 0;
                        }
                    } else {
                        // if no logs ever made, streak is 0
                        adjustedStreak = 0;
                    }
    
                    return {
                        id: doc.id,
                        ...data,
                        streak: adjustedStreak,
                        showLog: false,
                    };
                })
                .filter(Boolean);
    
            setAllSprints(sprints);
        });
    
        return () => unsubscribe();
    }, []);
    



    const handleAddSprint = () => {
        if (!newSprint.trim()) return;
        addSprintToFirestore(newSprint);
        setNewSprint("");
    };



    useEffect(() => {
        const handleClickOutside = (e) => {
            if (
                !e.target.closest(".sprint-card") &&
                !e.target.closest(".past-sprint-card")
            ) {
                setAllSprints((prev) =>
                    prev.map((sprint) => ({ ...sprint, showLog: false }))
                );
            }
        };

        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    }, []);


    const toggleLog = (clickedId) => {
        setAllSprints((prev) =>
            prev.map((sprint) =>
                sprint.id === clickedId
                    ? { ...sprint, showLog: !sprint.showLog }
                    : new Date(sprint.endDate) >= today
                    ? { ...sprint, showLog: false }
                    : sprint
            )
        );
    };
    
    const togglePastLog = (clickedId) => {
        setAllSprints((prev) =>
            prev.map((sprint) =>
                sprint.id === clickedId
                    ? { ...sprint, showLog: !sprint.showLog }
                    : new Date(sprint.endDate) < today
                    ? { ...sprint, showLog: false }
                    : sprint
            )
        );
    };    
    



    const addSprintToFirestore = async (sprintName) => {
        try {
            const user = auth.currentUser;
            const today = new Date();
            const sixtyDaysLater = new Date(today);

            sixtyDaysLater.setDate(today.getDate() + 60);

            const formattedToday = today.toISOString().split("T")[0];
            const formattedEnd = sixtyDaysLater.toISOString().split("T")[0];

            await addDoc(collection(db, "sprints"), {
                title: sprintName.trim(),
                startDate: formattedToday,
                endDate: formattedEnd,
                streak: 0,
                lastLoggedDate: null,
                createdAt: serverTimestamp(),
                createdBy: user?.uid || "anonymous",
            });

            console.log("Sprint successfully added to Firestore");
        } catch (error) {
            console.error("Error adding sprint: ", error);
        }
    };

    return (
        <div className="page-wrapper">
            <div className="home-wrapper">
                <div className="column-layout">
                    <div className="top-row-aligned">
                        <img src={logo} alt="Two Months of Ugly Logo" className="logo" />

                        <div className="streaks-box">
                            <h2>STREAKS</h2>
                            {currentSprints.map((sprint, index) => (
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
                                {currentSprints.map((sprint, index) => {
                                    const endDate = new Date(sprint.endDate);
                                    const today = new Date();
                                    const daysLeft = Math.max(0, Math.ceil((endDate - today) / (1000 * 60 * 60 * 24)));
                                

                                    return (
                                        <div
                                            className={`sprint-card ${sprint.showLog ? "expanded" : ""}`}
                                            key={sprint.id}
                                            onDoubleClick={() => toggleLog(sprint.id)}
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
                                        key={sprint.id}
                                        className={`past-sprint-card ${sprint.showLog ? "expanded-right" : ""}`}
                                        onDoubleClick={() => togglePastLog(sprint.id)}
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