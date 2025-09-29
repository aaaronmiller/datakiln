# Expected User Behavior: Core Research Workflow

This document outlines the expected behavior for a primary user workflow in the DataKiln application: performing a basic research query. This can be used as a manual test plan to identify non-functional parts of the system.

---

### Prerequisites

1.  **Action:** The user opens a new browser tab and manually logs into `gemini.google.com`.
    *   **Expected Result:** The user is successfully logged into their Google account on the Gemini website. This ensures the browser automation has an authenticated session to work with.

### Workflow Steps

1.  **Action:** The user navigates to the DataKiln frontend URL (e.g., `http://localhost:3000`).
    *   **Expected Result:** The application loads, and the main Dashboard page is displayed without errors.

2.  **Action:** On the Dashboard, the user clicks the "New Research" button.
    *   **Expected Result:** The UI transitions to a view where the user can configure a new research query.

3.  **Action:** The user selects a research mode. For this test, they click on "Balanced".
    *   **Expected Result:** The "Balanced" mode is visually selected or highlighted, indicating it's the active choice.

4.  **Action:** The user types a simple query, such as `"What is the Playwright framework?"`, into the main input field.
    *   **Expected Result:** The text is correctly entered and visible in the input field.

5.  **Action:** The user clicks the "Start Research" button.
    *   **Expected Result:**
        *   The UI provides immediate feedback that the task has started (e.g., a loading indicator appears, the "Start" button is disabled).
        *   A new entry appears in a "Jobs" or "Runs" panel, showing the status as "In Progress" or "Running".

6.  **Action:** The user waits for the research task to complete.
    *   **Expected Result:**
        *   The backend should trigger a Playwright instance to perform the research on Gemini's website.
        *   The UI should display real-time progress updates (e.g., in a log panel or through a progress bar).
        *   After a few minutes, the status of the job in the UI should change to "Complete" or "Success".

7.  **Action:** The user clicks on the completed job to view the results.
    *   **Expected Result:** The UI displays the formatted research report, including a summary, sources, and the main body of text.

8.  **Action:** The user checks the designated output directory.
    *   **Expected Result:** A new Markdown file (`.md`) containing the research report has been saved to the local filesystem (e.g., in a default `output` folder or a configured Obsidian vault path). The file's content should match the results shown in the UI.
