# Two Months of Ugly (MVP)

## Purpose
This project is a personal growth experiment and public learning log. It tracks 60-day “sprints” where the creator documents daily progress across different interests, embracing imperfect work as proof of learning.  
The app serves as both a dashboard for ongoing sprints and a log system for capturing text, code, and media entries.

Landing Page:
<img width="1512" height="942" alt="landing page" src="https://github.com/user-attachments/assets/cce78d92-a01c-4541-aa65-e605d79d9e8d" />

Home page that shows "current sprints" and "past sprints". I am using the word "sprint" to refer to one or two domains that someone wants to dedicate their free time tcompletely spearhead their learning curve as much as they can every day:
<img width="1512" height="943" alt="home page" src="https://github.com/user-attachments/assets/145c08b0-0d4e-464d-adbe-c622514d3b53" />

The log page UI of one sprint:
<img width="1512" height="943" alt="logging modal" src="https://github.com/user-attachments/assets/f08c2804-abab-4b8a-a537-6122113eaff0" />
<img width="1511" height="944" alt="logs" src="https://github.com/user-attachments/assets/7183e4ce-c6c8-4691-936a-993225823c6c" />



## Current Features
- **Google Authentication** (restricted to the creator’s email for now)  
- **Landing Page** with project description and sign-in flow  
- **Dashboard (Home)**  
  - Create new sprints with title and automatic 60-day duration.  
  - View current sprints (with days left and streaks).  
  - View past sprints (with dates).  
  - Double-click cards to reveal a log button.  
- **Sprint Log Page**  
  - Add daily logs with title, time spent, and at least one content type.  
  - Supported content: text blurbs, code snippets (with filename), images, audio, video, and PDFs.  
  - Media files are uploaded to Firebase Storage, other entries go to Firestore.  
  - Streaks automatically update based on logging activity.  
  - Logs display in reverse chronological order with formatted previews.  

## Tech Stack
- **Frontend:** Vite + React + React Router  
- **Styling:** Custom CSS (App.css, Home.css, SprintLog.css)  
- **Authentication:** Firebase Authentication (Google OAuth)  
- **Database:** Firebase Firestore (sprints and nested log collections)  
- **Storage:** Firebase Storage for file uploads (images, audio, video, PDFs)  
- **State Management:** React hooks (useState, useEffect)  

## Access Control
Currently, only the creator’s email can enter edit mode. Unauthorized users are redirected to the landing page.

## Next Steps
- Add **viewer mode** for public access.  
- Build **progress reports** with reflection prompts and automated insights.  
- Implement a **momentum graph** to visualize acceleration in activity using semantic analysis.
- Add a visual network of fleeting thoughts and action items that are connected together using metatags and semantic analysis. 
