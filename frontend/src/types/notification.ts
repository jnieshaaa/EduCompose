export type NotificationType = 
  // Teacher notifications
  | "student_submitted"
  | "resubmission_requested"
  | "resubmission_request"
  | "submission_received"
  | "activity_missed"
  // Student notifications
  | "essay_graded"
  | "new_activity"
  | "resubmission_open"
  | "resubmission_allowed"
  | "upcoming_deadline"
  | "revision_requested"
  | "essay_feedback"
  | "course_removed";

export type RelatedType = "essay" | "rubric" | "essay_activities" | "classes" | "assignments";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  relatedId?: string;
  relatedType?: RelatedType;
  timestamp: string;
}
