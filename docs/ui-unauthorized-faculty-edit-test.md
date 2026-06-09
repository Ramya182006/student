UI Test Artifact: Unauthorized Faculty Edit Attempt

Purpose

Verify that a faculty member cannot enter or edit marks for a subject/class that is not assigned to them.

Preconditions

- Faculty A is assigned to `CS / Semester 1 / Section A / Algorithms`.
- Faculty B is assigned to a different subject or class.
- At least one student exists in `CS / Semester 1 / Section A`.

Steps

1. Log in as Faculty B.
2. Open the Enter Marks page.
3. Select `CS`, `Semester 1`, and `Section A`.
4. Check the Subject dropdown.
5. Try to access the unassigned subject directly if a stale browser state or manual URL action exposes it.
6. Try to submit marks for the unassigned subject.

Expected Result

- The unassigned subject should not appear in the Faculty B subject dropdown.
- If a forced/stale request is submitted, the server returns `403 Forbidden`.
- The UI shows a meaningful error instead of saving the mark.
- No mark entry is created or updated for the unassigned subject.

Related Automated Coverage

- `src/tests/markEntry.test.js` checks that an unassigned faculty member receives `403`.
- `src/tests/studentFacultyScope.test.js` checks that faculty dashboards show only scoped students/classes.
