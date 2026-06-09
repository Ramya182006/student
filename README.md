README
Student Report Card Portal
Overview
Student Report Card Portal is a role-based web application that helps colleges manage student marks securely. Admins manage students, faculty, subjects, and report cards. Faculty can enter marks only for assigned subjects, while students can view their published report cards.
Features
Role-based Authentication (Admin, Faculty, Student)
Student, Faculty, and Subject Management
Mark Entry and Automatic Grade Calculation
Publish/Unpublish Report Cards
Dashboard KPIs
Search and Filtering
Bulk CSV Import
Optimistic Concurrency Control
Local Draft Recovery
Structured Logging and Metrics

Local Draft Recovery
The Enter Marks page autosaves unsaved mark entry changes to browser localStorage using a per-user draft key. If the page is refreshed, it shows an "Unsaved draft found. Restore draft?" prompt. Restore Draft reloads the selected department, semester, section, subject, student, marks, and version into the form.

Limitations:
- Drafts are local to the same browser and device.
- Drafts are separated by logged-in user, but they are not a replacement for saved database records.
- Drafts are cleared after Save or Clear.
- Drafts cannot be restored after browser storage is cleared, in some private browsing sessions, on another device/browser, or if the underlying student/subject record was removed or changed.

Search and Filtering Approach
Search is implemented with a normalized, case-insensitive text match. Student search checks name, roll number, email, phone, and guardian fields where available. Mark entry search checks student name, roll number, subject name, subject code, faculty name, and published/draft state. Server-side student filters support department, semester, section, and pass/fail status. Faculty users receive only their scoped students and marks before filtering, so search results never expose unassigned student records.

Test Artifacts
- `samples/sample_marks_import_50_rows.csv` demonstrates the minimum 50-row marks import format.
- `samples/sample_account_import.csv` demonstrates admin-side student/faculty account import.
- `docs/ui-unauthorized-faculty-edit-test.md` documents the UI verification for an unauthorized faculty edit attempt.
- API tests cover authentication, role access, CSV import idempotency, faculty scoping, and optimistic concurrency.

Tech Stack
Frontend: React.js, HTML, CSS, JavaScript
Backend: Node.js, Express.js
Database: MongoDB
Roles
Admin
Manage Students, Faculty, and Subjects
Assign Subjects to Faculty
Publish/Unpublish Report Cards
View Analytics Dashboard
Faculty
View Assigned Subjects
Add/Edit Marks
Cannot Edit Unassigned Subjects
Student
View Published Report Cards
Read-only Access
Architecture
React Frontend
↓
Node.js + Express Backend
↓
MongoDB Database
Setup
Install Dependencies:
npm install
Run Application:
npm run dev
Testing
Concurrency Testing
Unauthorized Access Testing
CSV Import Validation
Role-Based Access Testing

Architecture Diagram
┌─────────────────┐
                    │     Student     │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │     Faculty     │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │      Admin      │
                    └────────┬────────┘
                             │
                             ▼
              ┌──────────────────────────┐
              │      React Frontend      │
              │   (UI & Dashboards)      │
              └────────────┬─────────────┘
                           │ API Calls
                           ▼
              ┌──────────────────────────┐
              │  Node.js + Express API   │
              │ Authentication & Logic   │
              └────────────┬─────────────┘
                           │
                           ▼
              ┌──────────────────────────┐
              │        MongoDB           │
              │ Students, Subjects,      │
              │ Marks, Users, drafs    │
              └──────────────────────────┘

 AI Audit Log

Task| AI Used| Accepted| Modified| Rejected| Why
Antigravity Folder Architecture Creation| Claude| Yes| Adjusted folder hierarchy for Student Report Card Portal| No| Provided a scalable and maintainable project structure
Initial Project Setup and Folder Organization| Claude| Yes| Added documentation and testing folders| No| Improved project maintainability and submission readiness
Authentication and Role-Based Access Flow| ChatGPT| Yes| Added Admin, Faculty, and Student role restrictions| No| Required for assignment requirements
MongoDB Database Schema Design| ChatGPT| Yes| Added semester and version fields| No| Needed for report card management and concurrency handling
Faculty Subject Assignment Logic| ChatGPT| Yes| Added server-side validation checks| No| Faculty should edit only assigned subjects
Grade Calculation Logic| ChatGPT| Yes| Modified grading criteria based on project requirements| No| Required custom grade mapping
Dashboard KPI Design| ChatGPT| Yes| Updated calculations using actual database fields| No| Improved accuracy of analytics
Bulk CSV Import Feature| ChatGPT| Yes| Added duplicate detection and validation rules| No| Required idempotent import functionality
Codex Build Error Resolution| ChatGPT| Yes| Applied only relevant dependency fixes| No| Helped resolve development environment issues
API Endpoint Generation| ChatGPT| No| No| Yes| Some generated routes did not match the project architecture
Optimistic Concurrency Control| ChatGPT| Yes| Added version comparison before update operations| No| Prevented stale data updates
Search and Filtering Implementation| ChatGPT| Yes| Added department, semester, and pass/fail filters| No| Enhanced usability and reporting
Admin Dashboard UI Suggestions| Claude| Yes| Customized widgets and layout| No| Improved user experience
Faculty Dashboard Design| ChatGPT| Yes| Simplified workflow for mark entry| No| Better usability for faculty users
README and Documentation Generation| ChatGPT| Yes| Reformatted content and added project-specific details| No| Improved project documentation quality
Testing Strategy and Test Cases| ChatGPT| Yes| Added concurrency and unauthorized access scenarios| No| Covered assignment testing requirements

Prompt Receipts
Prompt 1
Timestamp: 06-06-2026 10:30 AM

Prompt:
Create a scalable folder structure for a Student Report Card Portal using React, Node.js, and MongoDB.

AI Used: Claude

AI Response (Trimmed):
Generated frontend, backend, and modular folder architecture.

Accepted: Base project structure.

Modified: Added assignment documentation files.

Why: Better organization.
Prompt 2

Timestamp: 06-06-2026 06:30 PM

Prompt:
Generate MongoDB schemas for Student, Subject, and Marks collections.

AI Used: ChatGPT

AI Response (Trimmed):
Generated schema definitions and relationships.

Accepted: Student and Subject schema.

Modified: Added version field.

Why: Required for optimistic concurrency.

Prompt 3

Timestamp: 07-06-2026 11:00 AM

Prompt:
Create role-based authentication for Admin, Faculty, and Student.

AI Used: ChatGPT

AI Response (Trimmed):
Provided JWT authentication and middleware.

Accepted: Authentication flow.

Modified: Added faculty authorization checks.

Why: Faculty can edit only assigned subjects.

Prompt 4

Timestamp: 07-06-2026 04:15 PM

Prompt:
Generate dashboard UI and KPI cards for Admin.

AI Used: Claude

AI Response (Trimmed):
Generated dashboard layout with cards and navigation.

Accepted: Dashboard structure.

Modified: Customized KPI metrics.

Why: Project-specific requirements.

Prompt 5 (AI Error Example)

Timestamp: 08-06-2026 02:00 PM

Prompt:
Generate API routes for report card management.

AI Used: ChatGPT

AI Response (Trimmed):
Generated CRUD endpoints and controller functions.

Accepted: Basic CRUD routes.

Rejected: Some route validations and endpoint structure.

Why: Did not completely satisfy assignment requirements and architecture.

Prompt 6

Timestamp: 08-06-2026 06:30 PM

Prompt:
Help debug Codex build errors, dependency issues, and project configuration problems.

AI Used: ChatGPT

AI Response (Trimmed):
Suggested package installation, environment setup, and configuration fixes.

Accepted: Most debugging suggestions.

Modified: Applied only verified fixes.

Why: To maintain project stability and avoid unnecessary changes.

Prompt-to-Production Note (debrief.md)

1. Which AI output misled you most?

The API route suggestions generated by AI were the most misleading. Some endpoints and validation logic did not completely match the project architecture and assignment requirements.

2. How did you identify the issue?

I reviewed the generated code, compared it with the assignment requirements, and tested the functionality manually. During testing, I found that some routes allowed actions that should have been restricted by role-based access control.

3. What did you verify manually?

- Authentication and authorization flow
- Faculty subject assignment restrictions
- Grade calculation logic
- MongoDB schema design
- Bulk CSV import validation
- Dashboard KPI calculations
- Optimistic concurrency handling
- API endpoint security and validation

4. What would you improve if given another day?

- Add AI-powered student performance insights
- Improve dashboard analytics and charts
- Add email and notification support
- Increase automated test coverage
- Enhance UI responsiveness and user experience

Conclusion

AI tools such as Claude and ChatGPT helped accelerate development by assisting with project structure, database design, 
authentication flow, debugging, documentation, and feature implementation. However, all AI-generated outputs were reviewed, modified when necessary, and manually tested before being integrated into the final application.

role	name	email	password	department	roll_no	semester	section	admission_year	gender	date_of_birth	phone	guardian_name	guardian_phone	address	designation	handled_sections	handled_subject_codes
student	Arun Kumar	arun@example.com	student123	CS	CS2023001	1	A	2026	Male	12-05-2006	9876543210	Ravi Kumar	9876543211	Chennai			
faculty	Meena R	meena@example.com	faculty123	CS											Assistant Professor	A	CS301|CS302
<img width="1761" height="32766" alt="image" src="https://github.com/user-attachments/assets/b953869d-45be-4b67-abd7-cfb9778edede" />
