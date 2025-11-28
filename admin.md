# Admin Dashboard - Employee Management PRD

## 1. Overview
This document outlines the employee management features for the Admin Dashboard, focusing on user account management.

## 2. Core Features

### 2.1 Add New Employee
- **Form Fields**
  - Full Name (required)
  - Email (required, unique)
  - Department (dropdown)
  - Role (Admin/Employee)
  - Joining Date (date picker)
  - Profile Picture (optional)

- **Auto-Generated Fields**
  - Employee ID (format: DEPT-YYYY-XXXX)
  - Temporary Password (auto-generated, can be overridden)
  - Account Status (Active/Inactive)

### 2.2 Employee ID Generation
- **Format**: DEPT-YYYY-XXXX
  - DEPT: Department code (3-4 letters)
  - YYYY: Year of joining
  - XXXX: Sequential number (0001-9999)
- **Validation**: Ensure uniqueness
- **Preview**: Show ID before saving

(Continuing with the rest of the content...)

## 3. User Interface

### 3.1 Add/Edit Form
- Single page form
- Real-time validation
- Save as draft
- Form sections:
  - Personal Information
  - Account Details
  - Department & Role

(Remaining sections follow the same pattern as in the previous message)
