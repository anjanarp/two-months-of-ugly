import "./Home.css";
import logo from "./assets/tmou-logo.png";
import { useState, useEffect } from "react"
import { auth, db } from "./firebase";
import { collection, addDoc, getDocs, serverTimestamp, onSnapshot, query, where } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

// helper to format a date in local timezone
const getLocalDateString = (date = new Date()) => {
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
        .toISOString()
        .split("T")[0];
};

function Home() {
    const navigate = useNavigate();
    // input field for creating a new sprint
    const [newSprint, setNewSprint] = useState("");
    // stores all the sprints that belong to the user
    const [allSprints, setAllSprints] = useState([]);

    const today = new Date();

    // split into current sprints (ongoing) and past sprints (already ended)
    const currentSprints = allSprints.filter((sprint) => {
        const end = new Date(sprint.endDate);
        return end >= today;
    });

    const pastSprints = allSprints.filter((sprint) => {
        const end = new Date(sprint.endDate);
        return end < today;
    });

    // manually format a date string for display
    const formatDate = (isoString) => {
        const localDate = new Date(isoString + "T00:00:00");
        const month = localDate.getMonth() + 1;
        const day = localDate.getDate();
        const year = localDate.getFullYear();
        return `${month}/${day}/${year}`;
    };


    // fetch all sprints from firestore for the current user
    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;

        const unsubscribe = onSnapshot(collection(db, "sprints"), (snapshot) => {
            const now = new Date();

            const sprints = snapshot.docs
                .map((doc) => {
                    const data = doc.data();
                    if (data.createdBy !== user.uid) return null;

                    return {
                        id: doc.id,
                        ...data,
                        showLog: false,
                    };
                })
                .filter(Boolean);

            setAllSprints(sprints);
        });

        // clean up snapshot listener
        return () => unsubscribe();
    }, []);

    // add a new sprint when user presses + button
    const handleAddSprint = () => {
        if (!newSprint.trim()) return;
        addSprintToFirestore(newSprint);
        setNewSprint("");
    };

    // hides all open log buttons if user clicks outside a card
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

    // toggles the log button on current sprints
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

    // toggles the log button on past sprints
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

    // turns sprint title into a slug-safe format for the URL
    const slugify = (str) =>
        str
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)+/g, "");

    // makes sure no two sprints have the same slug
    const generateUniqueSlug = async (baseSlug) => {
        let slug = baseSlug;
        let counter = 1;

        const sprintsRef = collection(db, "sprints");
        let snapshot = await getDocs(query(sprintsRef, where("slug", "==", slug)));

        while (!snapshot.empty) {
            slug = `${baseSlug}-${counter}`;
            counter++;
            snapshot = await getDocs(query(sprintsRef, where("slug", "==", slug)));
        }

        return slug;
    };

    // creates a new sprint and saves it to firestore
    const addSprintToFirestore = async (sprintName) => {
        try {
            const user = auth.currentUser;
            const today = new Date();
            const sixtyDaysLater = new Date(today);

            sixtyDaysLater.setDate(today.getDate() + 60);

            const formattedToday = getLocalDateString(today);
            const formattedEnd = getLocalDateString(sixtyDaysLater);

            const rawSlug = slugify(sprintName);
            const slug = await generateUniqueSlug(rawSlug);

            await addDoc(collection(db, "sprints"), {
                title: sprintName.trim(),
                slug,
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
                    {/* top row with logo and streaks box */}
                    <div className="top-row-aligned">
                        <img src={logo} alt="Two Months of Ugly Logo" className="logo" />

                        <div className="streaks-border">
                            <div className="streaks-box">
                                <h2>STREAKS</h2>
                                {currentSprints.map((sprint, index) => (
                                    <p key={index}>
                                        {sprint.title} &nbsp;&nbsp; {sprint.streak}🔥
                                    </p>
                                ))}

                            </div>
                        </div>

                    </div>

                    <div className="sprints-wrapper">
                        {/* left side shows current sprints */}
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

                                    console.log("Raw startDate:", sprint.startDate);
                                    console.log("Formatted date:", formatDate(sprint.startDate));

                                    return (
                                        <div
                                            className={`sprint-card ${sprint.showLog ? "expanded" : ""}`}
                                            key={sprint.id}
                                            onDoubleClick={() => toggleLog(sprint.id)}
                                        >
                                            {sprint.showLog && (
                                                <button className="log-btn" onClick={() => navigate(`/home/${sprint.slug}`)}>
                                                    LOG
                                                </button>
                                            )}
                                            <h3>{sprint.title}</h3>
                                            <p>STARTED ON {formatDate(sprint.startDate)}</p>
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

                        {/* right side shows completed sprints */}
                        <div className="past-sprints-section">
                            <h2>PAST SPRINTS</h2>
                            <div className="past-sprint-grid">
                                {pastSprints.map((sprint, index) => (
                                    <div
                                        key={sprint.id}
                                        className={`past-sprint-card ${sprint.showLog ? "expanded-right" : ""}`}
                                        onDoubleClick={() => togglePastLog(sprint.id)}
                                    >
                                        {sprint.showLog && (
                                            <button className="past-log-btn" onClick={() => navigate(`/home/${sprint.slug}`)}>
                                                LOG
                                            </button>
                                        )}
                                        <h3>{sprint.title}</h3>
                                        <p>{formatDate(sprint.startDate)} — {formatDate(sprint.endDate)}</p>
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
