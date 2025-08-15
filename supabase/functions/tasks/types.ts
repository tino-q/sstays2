// Generated types for Supabase database
// You can also generate these automatically with: supabase gen types typescript --project-id YOUR_PROJECT_ID

export type TaskStatus =
  | "unassigned"
  | "assigned"
  | "accepted"
  | "completed"
  | "cancelled";

export interface Task {
  id: string;
  listing_id: string;
  reservation_id?: string | null;
  task_type: string;
  title: string;
  description?: string | null;
  scheduled_datetime: string; // ISO string from database
  status: TaskStatus;
  assigned_to?: string | null;
  assigned_by?: string | null;
  assigned_at?: string | null;
  accepted_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskData {
  listing_id: string;
  reservation_id?: string;
  task_type: string;
  title: string;
  description?: string;
  scheduled_datetime: string;
  assigned_to?: string;
  assigned_by?: string;
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  scheduled_datetime?: string;
  status?: TaskStatus;
  assigned_to?: string;
  assigned_by?: string;
  assigned_at?: string;
  accepted_at?: string;
  completed_at?: string;
}
