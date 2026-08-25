# SamaaDev Hub

Here is the Lovable prompt to create the "Samaa dev" management system. It's written in clear, specific, English suitable for Lovable, incorporating all the modules you requested while adhering to best practices like standardized tables and Supabase integration.

### Copy and Paste this into Lovable:

```text

Build a robust internal Management System (CRM) for "Samaa dev," a software development agency. The application should integrate all aspects of project, task, sprint, and financial management.

The UI should be professional, data-driven, and easy to navigate.

Core Modules to Implement:

1. Financial Accounts (Finance):

   *   Track Income (client payments) and Expenses (operational costs, project tools, subscriptions, hosting).

   *   Generate a Finance Overview Dashboard showing total revenue, total expenses, net profit margins, and current cash flow.

   *   Provide a real-time list of outstanding (unpaid) payments per client.

2. Projects & Progress Tracking:

   *   Project Card/Profile: Define Project Name, Client, Scope of Work (SOW), total budget, strict deadline, and status (Planning, Active, In Review, Completed, On Hold).

   *   Progress Bar: Visually display project completion percentage based on the status of Milestones and associated tasks.

   *   Resources Section: Attach links (e.g., Figma designs, GitHub repos, project documentation) to the project profile.

3. Sprints (Agile Methodology):

   *   Sprint Planning: Ability to create Sprints (define duration e.g., 1 or 2 weeks) and set a specific "Sprint Goal".

   *   Sprint Backlog: drag-and-drop tasks from the main project backlog into an active sprint.

   *   Performance Tracking: Generate a Burndown Chart for each active sprint to track team velocity and detect bottlenecks.

4. Task Management & Assignment:

   *   Kanban Board View: A global and project-specific Kanban board (To Do, In Progress, QA/Review, Done).

   *   Task Details: Assign an owner (developer/designer), priority (High, Medium, Low), estimated hours, and link it to a specific Sprint and Project.

   *   Workflow: Support a QA flow where tasks require approval or "Code Review" before moving to "Done".

5. Key Performance Indicators (KPIs) & Analytics:

   *   Team Dashboard: Monitor team velocity (tasks completed per sprint), average task completion time, and adherence to deadlines.

   *   Project Health: Visualize project budget vs. actual spending and scheduled vs. actual timeline.

   *   Client Insights: Track client satisfaction and the frequency of "scope creep" (change requests).

6. Invoicing System:

   *   Generate Invoices: Automatically generate invoices based on defined project Milestones or completed Sprints.

   *   Invoice Management: List all invoices with statuses (Draft, Sent, Paid, Overdue). Send automated reminders for overdue payments.

   *   Quotations: Create professional quotations for potential clients, which can be converted directly into a Project and Invoice upon acceptance.

Technical & Design Requirements:

*   Use Supabase (Database & Authentication): Provide a logical relational database schema for projects, tasks, sprints, finances, invoices, and users. All project data must be secure and user-specific (if multi-user access is implemented).

*   UI: Modern, clean dashboard design. Use professional data visualization tools (charts/graphs) where necessary (especially for finance and KPIs).

*   Standard Tables: Present data (projects, tasks, invoices) using sortable and filterable tables.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://samaa-flow-engine.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4c967e21-0570-49f9-95d2-53ff995da6d4).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
