Prompt-to-Production Note

1. Which AI output misled you most?

The API route suggestions were the most misleading. Some generated endpoints allowed actions that did not match the assignment rules, especially around role-based permissions.

2. How did you identify the issue?

I compared the generated behavior against the assignment PDF and then tested the important flows manually. The mismatch became clear when admin and faculty actions needed stricter separation than the original generated routes provided.

3. What did you verify manually?

- Login and role-based navigation for Admin, Faculty, and Student.
- Faculty mark entry only for assigned students and subjects.
- Admin publish and unpublish report card flow.
- Student read-only report card access.
- Bulk CSV validation, repeated import behavior, and row feedback.
- Optimistic concurrency conflict handling with Accept Latest, Overwrite Mine, and Manual Merge.
- Local draft recovery after refresh.
- Dashboard KPI values returned from the server.

4. What would you improve if given another day?

- Add a full browser-based UI test suite for protected workflows.
- Add clearer metrics dashboards for operation latency and failure counts.
- Add deployment-ready environment examples.
- Improve report card export formatting.
- Expand automated tests around publish readiness and student report visibility.

The final application keeps AI-generated suggestions only after review, modification, and verification against the assignment requirements.
