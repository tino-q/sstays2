# Airbnb Employee Time Tracking System - Data Model

## Overview

A lean data model for Airbnb employee time tracking built on existing Supabase infrastructure. Extends current reservation management with task management, time tracking, generic file uploads, conversation threads, and product inventory.

## Core Entities

### 1\. Tasks

Core task management:

- `id` (UUID, PK)
- `listing_id` (BIGINT) - References hardcoded listings map
- `reservation_id` (TEXT) - References existing reservations
- `task_type` (TEXT) - eg. 'cleaning', 'maintenance', 'sheets' (not enforced)
- `title` (TEXT)
- `description` (TEXT)
- `scheduled_datetime` (TIMESTAMPTZ)
- `status` (ENUM) - 'unassigned', 'assigned', 'accepted', 'completed'
- `assigned_to` (UUID) - References auth.users (Google Auth)
- `assigned_by` (UUID) - References auth.users (admin)
- `assigned_at` (TIMESTAMPTZ)
- `accepted_at` (TIMESTAMPTZ)
- `completed_at` (TIMESTAMPTZ)

### 2\. Time Entries

Employee time tracking (Immutable):

- `id` (UUID, PK)
- `task_id` (UUID) - References tasks
- `employee_id` (UUID) - References auth.users (Google Auth)
- `created_at` (TIMESTAMPTZ)
- `type` (ENUM) - 'clock_in', 'clock_out'
- `total_hours` (DECIMAL) - Auto-calculated (clock_out - clock_in) / 3600 .toFixed(2) (in hours)

### 3\. Task Files

Generic file uploads for tasks (Immutable):

- `id` (UUID, PK)
- `task_id` (UUID) - References tasks
- `file_name` (TEXT) - Original filename
- `file_type` (TEXT) - MIME type (video, image, document, etc.)
- `file_url` (TEXT) - Storage URL
- `uploaded_by` (UUID) - References auth.users (Google Auth)
- `description` (TEXT) - Optional file description
- `created_at` (TIMESTAMPTZ)

### 4\. Task Messages

Conversation thread for tasks:

- `id` (UUID, PK)
- `task_id` (UUID) - References tasks
- `message` (TEXT) - Message content
- `sent_by` (UUID) - References auth.users (Google Auth)
- `created_at` (TIMESTAMPTZ)

### 5\. Products

Product catalog from Google Sheets:

- `id` (UUID, PK)
- `name` (TEXT) - Product name
- `category` (TEXT) - e.g., 'cleaning', 'bathroom', 'kitchen'
- `sheet_id` (TEXT) - Google Sheets reference
- `is_active` (BOOLEAN)

### 6\. Product Requests

Missing products tracking:

- `id` (UUID, PK)
- `task_id` (UUID) - References tasks
- `product_id` (UUID) - References products
- `quantity` (INTEGER) - Amount needed
- `requested_by` (UUID) - References auth.users (Google Auth)
- `status` (ENUM) - 'pending', 'ordered', 'received'
- `created_at` (TIMESTAMPTZ)

## Key Relationships

- **Tasks** → **Reservations** (many-to-one)
- **Tasks** → **Users** (assigned_to, assigned_by) - via Google Auth
- **Time Entries** → **Tasks** (many-to-one)
- **Time Entries** → **Users** (many-to-one) - via Google Auth
- **Task Files** → **Tasks** (many-to-one)
- **Task Files** → **Users** (many-to-one) - via Google Auth
- **Task Messages** → **Tasks** (many-to-one)
- **Task Messages** → **Users** (many-to-one) - via Google Auth
- **Product Requests** → **Tasks** (many-to-one)
- **Product Requests** → **Products** (many-to-one)

## Workflows

### Task Assignment Flow

1. Task created (unassigned)
2. Admin assigns to employee (assigned)
3. Employee accepts (accepted)
4. Employee starts work (in_progress)
5. Employee completes (completed)

### Time Tracking

- Employees can clock in/out multiple times per task
- Times editable until task completion
- Only validation: clock_out > clock_in
- Auto-calculates total_hours

### File Uploads

- Generic file uploads (videos, images, documents, etc.)
- Only admins and assigned employee can upload
- File compression for large files (>50MB)
- Stored with task reference and metadata
- Accessible to admins and assigned employee

### Conversation Threads

- Thread-like view for each task
- Only admins and assigned employee can view/send messages
- Real-time messaging capability
- Message history preserved

### Product Management

- Products synced from Google Sheets
- Employees mark missing products per task
- Admins can track requests and order status
- Monthly product usage reports

## Access Control

### Admins

- View all tasks, time entries, files, messages, product requests
- Assign tasks to employees
- Upload files to any task
- Send messages to any task
- Manage product catalog
- Generate reports

### Employees

- View only assigned tasks
- Manage own time entries
- Upload files to assigned tasks only
- View and send messages in assigned task threads only
- Request missing products

## Views

### Employee Dashboard

Shows assigned tasks with:

- Task details and status
- Time worked
- File uploads (own and admin)
- Conversation thread
- Product requests

### Admin Dashboard

Shows all tasks with:

- Assignment status and employee info (from Google Auth)
- Time tracking and costs
- File uploads and downloads
- Conversation threads
- Product request summary

### Monthly Reports

- Total hours per employee
- Product usage and costs
- Export to Excel/Sheets

## Integration Points

### Google Sheets

- Read reservations for task generation
- Sync product catalog
- Export monthly reports

### WhatsApp

- Generate task assignment messages
- Use employee info from Google Auth profiles

### File Storage

- Supabase Storage for all file types
- Compression handling for all files
- Secure access via RLS policies
- Support for videos, images, documents, etc.

### Listings Map

- Hardcoded listings data in application
- Quick lookup by listing_id
- No database storage needed

## Data Validation

### Tasks

- scheduled_date not in past
- assigned_to must be valid Google Auth user
- assigned_by must be admin user
- Only one cleaning task per reservation
- listing_id must exist in hardcoded map

### Time Entries

- clock_out > clock_in
- Only for accepted/in_progress tasks
- Employee can only modify own entries

### Files

- Only admins and assigned employee can upload
- File size limits and compression
- Secure URL generation
- Valid file types allowed

### Messages

- Only admins and assigned employee can view/send
- Message content validation
- Real-time delivery

### Products

- Active products only
- Valid quantities
- Request status tracking

This lean model provides all core functionality while being simple to implement and maintain, leveraging Google Auth for user management and hardcoded listings for property data.
