# Version 0 - Baseline Project Definition

Project Location: C:\Users\Carlo Mauring Lidres\OneDrive\Desktop\Projects\00 Working Projects\ProjectTracker_React

Baseline File:

agent-history/version-0-baseline.md

Created Date: 2026-06-11
Migration Alignment Date: 2026-06-12
Latest Reference Handoff: agent-history/version-18-handoff.md

```text
agent-history/version-0-baseline.md
```

Purpose:

This document is the permanent baseline definition of the Project Tracker system.

All future coding agents must treat this file as the primary source of truth for the project goals, business requirements, migration direction, architecture, constraints, data structure, and implementation expectations.

This file may only be modified with explicit approval from the project owner.

Future handoff files must refer back to this baseline when documenting changes, fixes, migration work, architectural decisions, and implementation progress.

---

# Project Information

Project Name: 

Project Tracker

Repository:

ProjectTracker_React

Project Owner:

carlolidres

Created Date:

2026-06-11

---

# Project Objective

The objective of the **Project Tracker** is to provide a centralized, end-to-end management and monitoring system for Change Notification Forms (CNFs), project implementation activities, and related support activities. The system shall enable cross-functional visibility, coordination, accountability, and control across all activities required for the evaluation, approval, validation, implementation, and closure of product, process, packaging, material, supplier, documentation, and operational changes.

The system shall support real-time tracking of CNF status, client approvals, manufacturing readiness, technical documentation, validation deliverables, stability commitments, QC readiness, scheduling milestones, support activities, and final implementation progress. It shall help ensure timely execution, regulatory and GMP compliance, complete traceability, audit readiness, and uninterrupted product supply.


---

# Business Goals

The system must achieve the following objectives:

1. Provide a centralized platform for tracking and managing all Change Notification Forms (CNFs), project implementation activities, and support activities from initiation to completion or closure.

2. Improve cross-functional visibility, accountability, and coordination among Account Management, Business Management, Planning, TSD, Validation, QA, QC, Manufacturing, RnD, and other stakeholders involved in project and change implementation.

3. Ensure timely completion of client approvals, technical documentation, validation deliverables, QC readiness activities, manufacturing readiness requirements, scheduling milestones, and final implementation activities through real-time monitoring and notifications.

4. Reduce project delays, missed deliverables, duplicate follow-ups, and communication gaps by providing a single source of truth for project status, ownership, priority, due dates, and pending actions.

5. Provide management with KPI dashboards, workload visibility, aging analysis, project analytics, overdue monitoring, and performance metrics to support decision-making, prioritization, and resource planning.

6. Maintain complete traceability and auditability of all critical project actions, status updates, field changes, decisions, and closure activities.

7. Support the migration of the existing Google Apps Script and Google Sheets-based application into a scalable React, GitHub Pages, and Supabase-based system while preserving the approved business logic and workflow behavior.

---

## Success Criteria

The project is considered successful when:

* 100% of CNFs and applicable project activities are tracked within the system.
* All major milestones have assigned ownership, target dates, and visible status.
* Users can monitor project and CNF progress in real time.
* Overdue, near-due, and critical activities are automatically identified.
* Dashboard KPIs provide management-level visibility of project performance, workload, priority, and aging.
* Support activities can be tracked separately from full CNF lifecycle records.
* Critical actions and updates are recorded in the audit trail with old value, new value, user, timestamp, and action type.
* The migrated React and Supabase version preserves the core behavior of the current Google Apps Script version.
* The system supports role-based access control, data integrity, and audit readiness.

---

# Technology Stack

## Current Source Application

Frontend:

* HTML
* CSS
* JavaScript
* Google Apps Script HTML Service

Backend:

* Google Apps Script
* `Code.gs`

Database:

* Google Sheets

Authentication:

* None

Hosting:

* Google Apps Script

---

## Target Migration Application

Frontend:

* React
* TypeScript
* Vite

Backend / Data Layer:

* Supabase
* PostgreSQL
* Supabase queries
* Supabase RPC or Edge Functions only when required

Database:

* Supabase PostgreSQL

Authentication:

* Supabase Auth

Security:

* Supabase Row Level Security
* Role-based access control
* No service role key exposed in frontend code

Hosting:

* GitHub Pages static deployment

UI Framework:

* Ant Design or Tailwind-compatible reusable component structure

UI Framework:
* The UI framework, layout structure, styling approach, reusable components, dashboard patterns, forms, tables, and navigation design shall be based on the reference sample application located at: "C:\Users\Carlo Mauring Lidres\OneDrive\Desktop\Projects\00 Working Projects\ProjectTracker_React\sampleUI\layout" 

Sample Working Application Working Already in Google Appscript environment:
* For the logic and manner on how forms are presented refer to this project, this is already a finished project that I want to scaleup to supabase and git hub pages environment: C:\Users\Carlo Mauring Lidres\OneDrive\Desktop\Projects\00 Working Projects\ProjectTracker_React\sampleApp

* The sample application shall serve as the visual and structural reference for the migrated React version, unless otherwise revised or approved by the project owner.

Hosting:

* The migrated React application shall be deployed as a static site using GitHub Pages.


---

# Architecture Decisions

These decisions are considered approved unless explicitly changed.

---

# Data Flow

All updates shall be recorded in the readable audit trail with old value and new value.

---

# Repository and Supabase Project Configuration

## GitHub Repository

Repository:

```text
https://github.com/carlolidres/ProjectTracker_React
```

Repository Name:

```text
ProjectTracker_React
```

Repository Owner:

```text
carlolidres
```

Primary Deployment Target:

```text
GitHub Pages
```

Recommended GitHub Pages URL format:

```text
https://carlolidres.github.io/ProjectTracker_React/
```

---

## Supabase Project

Supabase Project URL:

```text
https://asukusfiiqxjjihohnzi.supabase.co
```

Supabase Project Reference:

```text
asukusfiiqxjjihohnzi
```

---

## Frontend Environment Variables

The React + Vite application shall use only frontend-safe Supabase environment variables.

Create the following local file for development:

```text
.env.local
```

Recommended content:

```env
VITE_SUPABASE_URL=https://asukusfiiqxjjihohnzi.supabase.co
VITE_SUPABASE_ANON_KEY=<SUPABASE_ANON_PUBLIC_KEY>
```

For the current project, the provided Supabase anon public key may be used as:

```env
VITE_SUPABASE_ANON_KEY=<PLACE_THE_SUPABASE_ANON_PUBLIC_KEY_HERE>
```

Important:

* The anon public key may be used in the browser only when Supabase Row Level Security is properly enabled.
* The anon public key is still a project credential and should be handled carefully.
* Do not hard-code the key directly inside React components.
* Use environment variables through Vite.

---

## Secret Key Handling

The Supabase `service_role` key shall not be used in the GitHub Pages frontend application.

The following key type is prohibited from frontend use:

```text
service_role key
```

Do not place the service role key in:

```text
README.md
Markdown files
React source code
Vite environment variables used by the browser
GitHub Pages build output
public folders
committed .env files
client-side JavaScript
```

If privileged server-side operations are required in the future, the service role key shall only be stored in a secure backend environment, such as:

```text
Supabase Edge Function secrets
trusted backend server environment variables
GitHub Actions secrets for deployment-only operations, if required
```

The service role key shall never be exposed to end users.

---

## Required `.env.example`

The repository shall include an example environment file without real key values.

File:

```text
.env.example
```

Content:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

---

## Required `.gitignore`

The repository must exclude real environment files.

Required entries:

```gitignore
.env
.env.local
.env.*.local
node_modules/
dist/
build/
*.log
```

---

## GitHub Pages Deployment Notes

The application shall be deployed as a static React + Vite application using GitHub Pages.

Recommended Vite configuration for this repository:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/ProjectTracker_React/',
});
```

Recommended routing strategy:

```text
HashRouter
```

Example route format:

```text
https://carlolidres.github.io/ProjectTracker_React/#/dashboard
https://carlolidres.github.io/ProjectTracker_React/#/projects
https://carlolidres.github.io/ProjectTracker_React/#/support-activities
```

---

## Security Requirements

The project shall follow these security rules:

1. Use only the Supabase anon public key in the React frontend.
2. Never expose the Supabase service role key in browser code.
3. Enable Row Level Security on all production Supabase tables.
4. Use Supabase Auth for authenticated users.
5. Use role-based access control for project records, support activities, audit logs, and admin functions.
6. Keep audit logs protected from unauthorized update or deletion.
7. Do not commit `.env` or `.env.local`.
8. Do not place real production data in public frontend files.
9. Rotate any Supabase service role key that may have been shared or exposed.
10. Store privileged secrets only in secure backend or deployment environments.

---

## Key Rotation Requirement

Because a service role key was already shared during project setup discussion, the project owner shall rotate or regenerate the Supabase service role key before production use.

After rotation, update only secure backend environments that require privileged access.

Do not update the GitHub Pages frontend with the service role key.


---
# Database Structure

project_id 
    ├── project_owner (AM/BM/PL text field)
    ├── activity_type (AM/BM/PL text field) (Tooltip menu: PILOT/TRIAL, TRC, VAL/VER)
    ├── client_name (AM/BM/PL text field) 
    ├── so_no (AM/BM/PL text field) (Numerical field)
    ├── fg_code (AM/BM/PL text field) (Numerical field)
    ├── product_name (AM/BM/PL text field) (String)
    └── unique_batch (AM/BM/PL text field) (Numerical field)
        └──  mo_control_no (AM/BM/PL text field) (Numerical field) (+/-)
            └──  po_control_no (AM/BM/PL text field) (Numerical field) (+/-)  
                    ├── fg_month (AM/BM/PL text field) (Dropdown calendar)
                    ├── business_unit (AM/BM/PL text field) (Tooltip menu: CM, BM, PL)
                    ├── updatedDocsVer (AM/BM/PL text field)(Yes/No)
                    ├── cnf_reference (AM/BM/PL text field) (AlphaNumeric field) (Add a button to copy the data from the first po_control_no)
                    |    ├── qrmr_ref_no (AM/BM/PL text field) (AlphaNumeric field)
                    |    ├── change_description (AM/BM/PL text field) (String)
                    |    ├── cnf_status (AM/BM/PL text field) (Dropdown menu: CNF Creation, Routing, Client Approval, Approved)
                    |    ├── client_approval_target_date (AM/BM/PL text field) (Dropdown calendar)
                    |    └── remarks (AM/BM/PL text field) (String)
                    ├── manufacturing_start_week (PP text field) (Dropdown calendar)
                    ├── mo_bmr_po_submission_status (TSD text field) (Y / N)
                    ├── mo_bmr_po_target_date (TSD text field) (Dropdown calendar)
                    ├── mo_bmr_po_activation_status (TSD text field) (Y / N)
                    ├── mo_bmr_po_activation_date (TSD text field) (Dropdown calendar)
                    ├── protocol_no (validation text field)(alphanumeric field)(The data is adapted from the entry of the first po_control_no)
                    ├── protocol_Status (validation text field)(alphanumeric field)(The data is adapted from the entry of the first po_control_no)
                    ├── protocol_target_date (validation text field)(Dropdown calendar) (The data is adapted from the entry of the first po_control_no)
                    ├── Val_Activity (VAL text field) (Tool Tip menu: VAL, VER, CHAR, COMML)
                    ├── Val_Stability (VAL text field) (Is this batch is for stability? Yes/No) 
                    ├── Val_Batch_Seq_No (VAL text field)(Tool tip menu: 1, 2, 3, 4, 5, 6, ...)
                    ├── Val_Strategy (VAL field)(tool tip menu: Concurrent, Prospective) (The data is adapted from the entry of the first po_control_no)
                    ├── Val_Strategy_remarks (VAL field)(describe the implementation strategy incase of change will implement to the COMML product while ongoing study)
                    ├── val_report_no (VAL field)(Alphanumeric field)
                    ├── Report_Sub_Status (In-process, Routing, Client Approval, Approved)
                    ├── Report_target_Date (VAL field)(Dropdown calendar)
                    ├── ar_availability_date (QC field)(Dropdown calendar)
                    ├── packaging_schedule (PP field)(Dropdown calendar)
                    └── final_status (PP field)(OPEN, CLOSED, CANCELLED, Others)(if others please specify)


### projects

Main table for project records.

Includes:

project_id
    ├── project_owner (AM/BM/PL text field)
    ├── activity_type (AM/BM/PL text field) (Tooltip menu: PILOT/TRIAL, TRC, VAL/VER)
    ├── client_name (AM/BM/PL text field) 
    ├── so_no (AM/BM/PL text field) (Numerical field)
    ├── fg_code (AM/BM/PL text field) (Numerical field)
    ├── product_name (AM/BM/PL text field) (String)
    └── unique_batch (AM/BM/PL text field) (Numerical field)
        └──  mo_control_no (AM/BM/PL text field) (Numerical field) (+/-)
            └──  po_control_no (AM/BM/PL text field) (Numerical field) (+/-)  
                    ├── fg_month (AM/BM/PL text field) (Dropdown calendar)
                    ├── business_unit (AM/BM/PL text field) (Tooltip menu: CM, BM, PL)
                    ├── updatedDocsVer (AM/BM/PL text field)(Yes/No)
                    ├── cnf_reference (AM/BM/PL text field) (AlphaNumeric field) (Add a button to copy the data from the first po_control_no)
                    |    ├── qrmr_ref_no (AM/BM/PL text field) (AlphaNumeric field)
                    |    ├── change_description (AM/BM/PL text field) (String)
                    |    ├── cnf_status (AM/BM/PL text field) (Dropdown menu: CNF Creation, Routing, Client Approval, Approved)
                    |    ├── client_approval_target_date (AM/BM/PL text field) (Dropdown calendar)
                    |    └── remarks (AM/BM/PL text field) (String)
                    ├── manufacturing_start_week (PP text field) (Dropdown calendar)
                    ├── mo_bmr_po_submission_status (TSD text field) (Y / N)
                    ├── mo_bmr_po_target_date (TSD text field) (Dropdown calendar)
                    ├── mo_bmr_po_activation_status (TSD text field) (Y / N)
                    ├── mo_bmr_po_activation_date (TSD text field) (Dropdown calendar)
                    ├── protocol_no (validation text field)(alphanumeric field)(The data is adapted from the entry of the first po_control_no)
                    ├── protocol_Status (validation text field)(alphanumeric field)(The data is adapted from the entry of the first po_control_no)
                    ├── protocol_target_date (validation text field)(Dropdown calendar) (The data is adapted from the entry of the first po_control_no)
                    ├── Val_Activity (VAL text field) (Tool Tip menu: VAL, VER, CHAR, COMML)
                    ├── Val_Stability (VAL text field) (Is this batch is for stability? Yes/No) 
                    ├── Val_Batch_Seq_No (VAL text field)(Tool tip menu: 1, 2, 3, 4, 5, 6, ...)
                    ├── Val_Strategy (VAL field)(tool tip menu: Concurrent, Prospective) (The data is adapted from the entry of the first po_control_no)
                    ├── Val_Strategy_remarks (VAL field)(describe the implementation strategy incase of change will implement to the COMML product while ongoing study)
                    ├── val_report_no (VAL field)(Alphanumeric field)
                    ├── Report_Sub_Status (In-process, Routing, Client Approval, Approved)
                    ├── Report_target_Date (VAL field)(Dropdown calendar)
                    ├── ar_availability_date (QC field)(Dropdown calendar)
                    ├── packaging_schedule (PP field)(Dropdown calendar)
                    └── final_status (PP field)(OPEN, CLOSED, CANCELLED, Others)(if others please specify)


### Small Activity Tracking

The system shall include a separate `support_activities` table for monitoring small operational activities that do not require full CNF lifecycle tracking.

These activities may include department-level follow-ups from TSD, RnD, Planning, QA, Validation, or other groups.

The table shall support flexible fields so that different departments can record only the information relevant to their activity.

TSD example fields:

- tsd_activity_id
- Department (Tooltip menu: DPM, LPM, DPP, LPP, CO, COS, TOP, STEROIDS, CEPHA)
- Material (String)
- Line (String)
- Bulk (String)
- Machinability_Protoocol (Enter the Machinability Protocol No.)
- Machinability_Protocol_Status (Status: In-process, Routing, Client Approval, Approved)
- Machinability_Report (Enter the Machinability Report No.)
- Machinability_Report_Status (Status: In-process, Routing, Client Approval, Approved)
- Product User (String)
- Target Date (Dropdown calendar)
- Planning Schedule (Dropdown calendar)

RnD example fields:

- RnD_activity_id
- Department (Tooltip menu: DPM, LPM, DPP, LPP, CO, COS, TOP, STEROIDS, CEPHA)
- Principal (Client Name)
- Product
- Line
- Target Date (Dropdown calendar)
- Planning Schedule (Dropdown calendar)

---

support_activities
│
├── TSD activity
│   ├── tsd_activity_id
│   ├── Department (Tooltip menu: DPM, LPM, DPP, LPP, CO, COS, TOP, STEROIDS, CEPHA)
│   ├── Material (String)
│   ├── Line (String)
│   ├── Bulk (String)
│   ├── Machinability_Protoocol (Enter the Machinability Protocol No.)
│   ├── Machinability_Protocol_Status (Status: In-process, Routing, Client Approval, Approved)
│   ├── Machinability_Report (Enter the Machinability Report No.)
│   ├── Machinability_Report_Status (Status: In-process, Routing, Client Approval, Approved)
│   ├── Product User (String)
│   ├── Target Date (Dropdown calendar)
│   └── Planning Schedule (Dropdown calendar)
│
└── RnD activity
    ├── RnD_activity_id
    ├── Department (Tooltip menu: DPM, LPM, DPP, LPP, CO, COS, TOP, STEROIDS, CEPHA)
    ├── Principal (Client Name)
    ├── Product
    ├── Line
    ├── Target Date (Dropdown calendar)
    └── Planning Schedule (Dropdown calendar)

---

### notifications

Stores system alerts, reminders, and overdue notifications. Main driver date is FG Month

### audit_logs

Stores immutable audit trail records for critical system activities.

---
### Notification Engine

The system shall generate alerts, reminders, escalations, and overdue notifications.

### Dashboard and KPI Monitoring

The system shall provide real-time KPI dashboards, workload monitoring, aging analysis, milestone tracking, and project analytics.
Sample KPI dashboards see the on this project file path: "C:\Users\Carlo Mauring Lidres\OneDrive\Desktop\Projects\00 Working Projects\ProejctTracker_React\sampleUI\layout" 

### Audit Trail

The system shall maintain complete audit records of all critical transactions and modifications. 
The audit trail must be plain english has date and time stampped, traceable to the user who performs the operation with a clear display of Old and New Value.

### User Management

The system shall support role-based access control.

The following user groups are:
* AM/BM/PL - Access only the AM/BM/PL forms and entries
* PP - Access only the PP forms and entries
* TSD - Access only the TSD forms and entries
* VAL - Access only the VAL forms and entries
* QC - Access only the QC forms and entries
* Admin - all access, all privileges
* View - all view access only

### Reporting

The system shall able to export report in excel format from the database based on the sorted data.

---

# Non-Functional Requirements

[Performance]
Page load time less than 3 seconds for normal operations.
Dashboard refresh less than 5 seconds.
Support at least 100 active users.

[Availability]
Minimum target availability of 99%.

[Compliance]
Maintain complete traceability of change implementation activities.
Support GMP documentation and audit requirements.
Maintain historical records and audit trails.

---


# Definition of Done

A task is complete only when:

* Functionality implemented
* Verification completed
* Handoff file created
* Git commit created
* Commit hash recorded
* Next steps documented

---

## Reviewers Feedback
- **Instructions:** always add this section at the end of Mark Down files to allow the reviewers to provide feedback. If none is provided, this section will be skipped.
- **Reviewers:** @carlo-mauring
- **Comments:**

---

# Baseline Approval

Baseline Version:

v0

Status:

APPROVED

This file serves as the foundation for all future project versions.

Future versions must be documented in:

```text
agent-history/version-X-handoff.md
```

This baseline remains the permanent source of truth unless revised by the project owner.
