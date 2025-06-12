import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { collection, query, where, getDocs, serverTimestamp, doc, writeBatch, onSnapshot, orderBy } from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "./firebase.js";
import "./SprintLog.css";

// helper to get date in local time
const getLocalDateString = (date = new Date()) => {
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
        .toISOString()
        .split("T")[0];
};

function SprintLog() {
    // pulls slug param from url
    const { slug } = useParams();

    // sprint-level state
    const [sprint, setSprint] = useState(null);
    const [notFound, setNotFound] = useState(false);

    // log input fields
    const [title, setTitle] = useState("");
    const [hoursSpent, setHoursSpent] = useState("");
    const [minutesSpent, setMinutesSpent] = useState("");

    // navigation
    const navigate = useNavigate();

    // logs saved to firestore
    const [logDocs, setLogDocs] = useState([]);

    // current draft entries
    const [logEntries, setLogEntries] = useState([]);

    // text input toggle + content
    const [textBlurb, setTextBlurb] = useState("");
    const [showTextInput, setShowTextInput] = useState(false);

    // code input toggle + content
    const [showCodeInput, setShowCodeInput] = useState(false);
    const [codeSnippet, setCodeSnippet] = useState("");
    const [codeFilename, setCodeFilename] = useState("");

    // file input reset trigger
    const [fileInputKey, setFileInputKey] = useState(Date.now());

    // watch for sprint.id and fetch logs from subcollection
    useEffect(() => {
        if (!sprint?.id) return;

        const logsRef = collection(db, "sprints", sprint.id, "logs");
        const q = query(logsRef, orderBy("createdAt", "desc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const logs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            }));
            console.log("Fetched logs:", logs);
            setLogDocs(logs);
        });

        return () => unsubscribe();
    }, [sprint?.id]);

    // format iso to mm/dd/yyyy
    const formatDate = (isoString) => {
        const localDate = new Date(isoString + "T00:00:00");
        const month = localDate.getMonth() + 1;
        const day = localDate.getDate();
        const year = localDate.getFullYear();
        return `${month}/${day}/${year}`;
    };

    // compute total time in minutes
    const totalMinutes = (parseInt(hoursSpent) || 0) * 60 + (parseInt(minutesSpent) || 0);

    // make sure the log is complete before allowing submit
    const canSubmit = title.trim() && (parseInt(hoursSpent) > 0 || parseInt(minutesSpent) > 0) && logEntries.length > 0;

    // fetch the sprint data using slug on mount
    useEffect(() => {
        const fetchSprint = async () => {
            try {
                const q = query(collection(db, "sprints"), where("slug", "==", slug));
                const snapshot = await getDocs(q);

                if (!snapshot.empty) {
                    setSprint({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
                } else {
                    setNotFound(true);
                }
            } catch (err) {
                console.error("Error fetching sprint:", err);
            }
        };

        fetchSprint();
    }, [slug]);

    // show error page if sprint not found
    if (notFound) {
        return (
            <div className="sprint-log-wrapper">
                <h1>Oops.</h1>
                <p>We couldn't find a sprint for "{slug}".</p>
            </div>
        );
    }

    // wait to render until sprint is loaded
    if (!sprint) return null;

    // helper to treat YYYY-MM-DD strings as local calendar days
    function localMidnight(dateStr) {
        return new Date(dateStr + "T00:00:00");
    }

    // handles saving the log to firestore
    const handleSubmit = async () => {
        if (!sprint || !sprint.id || !sprint.slug) {
            alert("Sprint not loaded correctly.");
            return;
        }

        try {
            const user = auth.currentUser;
            const h = parseInt(hoursSpent) || 0;
            const m = parseInt(minutesSpent) || 0;
            const totalMinutes = h * 60 + m;

            // if any file-type entries, upload to storage first
            const entriesWithUrls = await Promise.all(
                logEntries.map(async (entry) => {
                    if (entry.type !== "file") return entry;

                    try {
                        const fileRef = ref(storage, `logs/${sprint.slug}/${Date.now()}_${entry.fileName}`);
                        await uploadString(fileRef, entry.fileDataUrl, "data_url");
                        const downloadURL = await getDownloadURL(fileRef);

                        let contentType;
                        if (entry.fileType.startsWith("image/")) contentType = "image";
                        else if (entry.fileType.startsWith("audio/")) contentType = "audio";
                        else if (entry.fileType.startsWith("video/")) contentType = "video";
                        else if (entry.fileType === "application/pdf") contentType = "pdf";
                        else contentType = "file";

                        return {
                            type: contentType,
                            url: downloadURL,
                            fileName: entry.fileName,
                            fileType: entry.fileType,
                        };
                    } catch (err) {
                        console.error(`Error uploading ${entry.fileName}:`, err);
                        throw err;
                    }
                })
            );

            // batch log and update sprint's streak
            const batch = writeBatch(db);
            const logRef = doc(collection(db, "sprints", sprint.id, "logs"));

            batch.set(logRef, {
                title: title.trim(),
                durationMinutes: totalMinutes,
                entries: entriesWithUrls,
                createdAt: serverTimestamp(),
                createdBy: user?.uid || "anonymous",
            });

            const sprintRef = doc(db, "sprints", sprint.id);
            const today = new Date();
            const todayStr = getLocalDateString(today);

            // default to no streak update unless needed
            let updateStreak = false;
            let newStreak = sprint.streak || 0;

            // if this is the first ever log
            if (!sprint.lastLoggedDate) {
                updateStreak = true;
                newStreak = 1;
            } else {
                const lastDate = localMidnight(sprint.lastLoggedDate);
                const currentDate = localMidnight(todayStr);
                const diffDays = Math.floor((currentDate - lastDate) / (1000 * 60 * 60 * 24));

                if (diffDays === 1) {
                    updateStreak = true;
                    newStreak = newStreak + 1;
                } else if (diffDays > 1) {
                    updateStreak = true;
                    newStreak = 1;
                } else if (diffDays === 0) {
                    updateStreak = false;
                }

            }

            if (updateStreak) {
                batch.update(sprintRef, {
                    lastLoggedDate: todayStr,
                    streak: newStreak,
                });
            }


            await batch.commit();
            console.log("Log saved!");

            // clear form
            setTitle("");
            setHoursSpent("");
            setMinutesSpent("");
            setLogEntries([]);
            setTextBlurb("");
            setCodeSnippet("");
            setCodeFilename("");
            setShowTextInput(false);
            setShowCodeInput(false);

            // refresh sprint streak display
            const refreshedSnapshot = await getDocs(query(collection(db, "sprints"), where("slug", "==", sprint.slug)));
            if (!refreshedSnapshot.empty) {
                setSprint({ id: refreshedSnapshot.docs[0].id, ...refreshedSnapshot.docs[0].data() });
            }

        } catch (err) {
            console.error("Error submitting log:", err);
            alert("Failed to save log. See console for details.");
        }
    };

    return (
        <div>
            {/* main layout container */}
            <div className="sprint-log-page">

                {/* vertical column structure */}
                <div className="sprint-log-wrapper">

                    {/* header with sprint info and back button */}
                    <div className="sprint-header-block">
                        <div className="back-arrow" onClick={() => navigate("/home")}>⭠</div>
                        <div className="sprint-header-content">
                            <div className="sprint-header-row">
                                <h1 className="sprint-title">{sprint.title}</h1>
                                <div className="streak-icon">{sprint.streak ?? 0}🔥</div>
                            </div>
                            <p className="sprint-dates">
                                {formatDate(sprint.startDate)} — {formatDate(sprint.endDate)}
                            </p>
                        </div>
                    </div>

                    {/* main horizontal layout */}
                    <div className="log-layout-row">

                        {/* left side log history feed */}
                        <div className="log-feed">
                            {logDocs.map((log) => {
                                const createdDate = log.createdAt?.toDate();
                                const dateStr = createdDate
                                    ? createdDate.toLocaleDateString("en-US", {
                                        month: "long",
                                        day: "numeric",
                                        year: "numeric",
                                    }).toUpperCase()
                                    : "";

                                return (
                                    <div key={log.id} className="log-entry-block">
                                        <p className="log-date-header">{dateStr}</p>
                                        <div className="log-date-divider" />
                                        <div className="log-title-duration-row">
                                            <p className="log-entry-title">{log.title}</p>
                                            <p className="log-duration">
                                                {Math.floor(log.durationMinutes / 60)}H {log.durationMinutes % 60}M
                                            </p>
                                        </div>

                                        {/* scroll row of media/code/text inside each log */}
                                        <div className="entry-scroll-row">
                                            {log.entries.map((entry, idx) => (
                                                <div key={idx} className="entry-item">
                                                    {entry.type === "text" && (
                                                        <div className="text-blurb-box">
                                                            <p className="text-blurb-text">{entry.content}</p>
                                                        </div>
                                                    )}

                                                    {entry.type === "code" && (
                                                        <div className="code-snippet-box">
                                                            <pre className="code-block">{entry.content}</pre>
                                                            <p className="code-filename">{entry.filename}</p>
                                                        </div>
                                                    )}

                                                    {entry.type === "image" && (
                                                        <img src={entry.url} alt={entry.fileName} className="preview-media" />
                                                    )}

                                                    {entry.type === "audio" && (
                                                        <audio controls className="preview-media">
                                                            <source src={entry.url} type={entry.fileType} />
                                                        </audio>
                                                    )}

                                                    {entry.type === "video" && (
                                                        <video controls width="300" className="preview-media">
                                                            <source src={entry.url} type={entry.fileType} />
                                                        </video>
                                                    )}

                                                    {entry.type === "pdf" && (
                                                        <div className="pdf-entry-block">
                                                            <a
                                                                href={entry.url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="pdf-link-box"
                                                            >
                                                                <div className="pdf-box-content">
                                                                    📄 {entry.fileName}
                                                                </div>
                                                            </a>

                                                            <embed
                                                                src={entry.url}
                                                                type="application/pdf"
                                                                className="pdf-preview-embed"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>


                        {/* right side input panel */}
                        <div className="log-input-box">
                            <div className="log-title-time-row">
                                <input
                                    type="text"
                                    placeholder="TITLE"
                                    className="log-title-input"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                />
                                <div className="time-input-group">
                                    <input
                                        type="number"
                                        min="0"
                                        max="23"
                                        placeholder="HH"
                                        className="time-input"
                                        value={hoursSpent}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value, 10);
                                            if (isNaN(val)) return setHoursSpent("");
                                            if (val > 23) return setHoursSpent("23");
                                            if (val < 0) return setHoursSpent("0");
                                            setHoursSpent(e.target.value);
                                        }}
                                    />
                                    <input
                                        type="number"
                                        min="0"
                                        max="59"
                                        placeholder="MM"
                                        className="time-input"
                                        value={minutesSpent}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value, 10);
                                            if (isNaN(val)) return setMinutesSpent("");
                                            if (val > 59) return setMinutesSpent("59");
                                            if (val < 0) return setMinutesSpent("0");
                                            setMinutesSpent(e.target.value);
                                        }}
                                    />

                                </div>
                            </div>

                            {/* add buttons for input types */}
                            <div className="log-button-row">
                                <label className="log-btn-inline" htmlFor="file-upload">ADD FILES</label>
                                <input
                                    key={fileInputKey}
                                    id="file-upload"
                                    type="file"
                                    accept="image/*,audio/*,.m4a,video/*,.pdf"
                                    style={{ display: "none" }}
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;

                                        const validTypes = [
                                            "image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif",
                                            "audio/mpeg", "audio/wav", "audio/x-m4a", "audio/mp4", "audio/ogg",
                                            "video/mp4", "video/webm", "video/quicktime",
                                            "application/pdf",
                                        ];

                                        if (!validTypes.includes(file.type)) {
                                            alert("Unsupported file type.");
                                            return;
                                        }

                                        const reader = new FileReader();
                                        reader.onload = (event) => {
                                            setLogEntries((prev) => [
                                                ...prev,
                                                {
                                                    type: "file",
                                                    fileType: file.type,
                                                    fileName: file.name,
                                                    fileDataUrl: event.target.result,
                                                },
                                            ]);
                                            setFileInputKey(Date.now());
                                        };
                                        reader.readAsDataURL(file);
                                    }}
                                />

                                <button
                                    className={`log-btn-inline ${showTextInput ? "active" : ""}`}
                                    onClick={() => setShowTextInput((prev) => !prev)}
                                >
                                    ADD TEXT BLURB
                                </button>

                                <button
                                    className={`log-btn-inline ${showCodeInput ? "active" : ""}`}
                                    onClick={() => setShowCodeInput(prev => !prev)}
                                >
                                    ADD CODE
                                </button>

                            </div>

                            {/* text input area */}
                            {showTextInput && (
                                <div className="log-text-blurb">
                                    <textarea
                                        value={textBlurb}
                                        onChange={(e) => setTextBlurb(e.target.value)}
                                        className="text-blurb-input"
                                        placeholder="Type your blurb here"
                                    />
                                    <button
                                        className="log-btn-inline done-btn"
                                        onClick={() => {
                                            if (textBlurb.trim()) {
                                                setLogEntries([...logEntries, { type: "text", content: textBlurb.trim() }]);
                                                setTextBlurb("");
                                                setShowTextInput(false);
                                            }
                                        }}
                                    >
                                        DONE
                                    </button>
                                </div>
                            )}

                            {/* code input area */}
                            {showCodeInput && (
                                <div className="log-code-snippet">
                                    <textarea
                                        className="code-snippet-input"
                                        value={codeSnippet}
                                        onChange={(e) => setCodeSnippet(e.target.value)}
                                        placeholder="Paste your code here"
                                    />
                                    <input
                                        type="text"
                                        className="code-filename-input"
                                        placeholder="Filename"
                                        value={codeFilename}
                                        onChange={(e) => setCodeFilename(e.target.value)}
                                    />
                                    <button
                                        className="log-btn-inline done-btn"
                                        onClick={() => {
                                            if (codeSnippet.trim() && codeFilename.trim()) {
                                                setLogEntries([...logEntries, {
                                                    type: "code",
                                                    filename: codeFilename.trim(),
                                                    content: codeSnippet.trim(),
                                                }]);
                                                setCodeSnippet("");
                                                setCodeFilename("");
                                                setShowCodeInput(false);
                                            }
                                        }}
                                    >
                                        DONE
                                    </button>
                                </div>
                            )}

                            {/* preview of all added entries */}
                            <div className="log-preview">
                                {logEntries.map((entry, index) => (
                                    <div key={index} className="log-preview-entry">
                                        <div className="log-preview-line-wrapper">
                                            <p className="log-preview-line">
                                                {entry.type === "text" && `TEXT BLURB: “${entry.content}”`}
                                                {entry.type === "code" && `CODE SNIPPET: ${entry.filename}`}
                                                {entry.type === "file" && `FILE: ${entry.fileName}`}
                                            </p>
                                            <button
                                                className="delete-blurb-btn"
                                                onClick={() =>
                                                    setLogEntries(logEntries.filter((_, i) => i !== index))
                                                }
                                            >
                                                X
                                            </button>
                                        </div>

                                        {/* file preview thumbnails */}
                                        {entry.type === "file" && (
                                            <div className="preview-container">
                                                {entry.fileType.startsWith("image/") && (
                                                    <img
                                                        src={entry.fileDataUrl}
                                                        alt={entry.fileName}
                                                        className="preview-media"
                                                    />
                                                )}
                                                {entry.fileType.startsWith("audio/") && (
                                                    <audio controls className="preview-media">
                                                        <source src={entry.fileDataUrl} type={entry.fileType} />
                                                    </audio>
                                                )}
                                                {entry.fileType.startsWith("video/") && (
                                                    <video controls width="320" height="240" className="preview-media">
                                                        <source src={entry.fileDataUrl} type={entry.fileType} />
                                                    </video>
                                                )}
                                                {entry.fileType === "application/pdf" && (
                                                    <embed
                                                        src={entry.fileDataUrl}
                                                        type="application/pdf"
                                                        width="320"
                                                        height="245"
                                                        className="preview-media"
                                                    />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* final submit button appears only if minimum info has been entered */}
                            {canSubmit && (
                                <button className="log-btn-inline submit-btn" onClick={handleSubmit}>
                                    SUBMIT
                                </button>
                            )}

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SprintLog;
