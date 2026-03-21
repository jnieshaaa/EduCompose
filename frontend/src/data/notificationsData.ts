/**
 * Notification data types and mock data
 */

export type NotificationType = 
  // Teacher notifications
  | "student_submitted"
  | "resubmission_requested"
  | "submission_received"
  | "activity_missed"
  // Student notifications
  | "essay_graded"
  | "new_activity"
  | "resubmission_open"
  | "upcoming_deadline"
  | "revision_requested";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  timestamp: string;
  relatedId?: string; // ID of related essay, student, etc.
}

// Mock data for Teachers
export const teacherNotifications: Notification[] = [
  {
    id: "t1",
    type: "student_submitted",
    title: "Essay Submitted",
    message: "Emma Wilson already submitted the Essay",
    read: false,
    timestamp: "2 minutes ago",
    relatedId: "essay-1",
  },
  {
    id: "t2",
    type: "resubmission_requested",
    title: "Resubmission Request",
    message: "James Lee requested for resubmission",
    read: false,
    timestamp: "15 minutes ago",
    relatedId: "essay-2",
  },
  {
    id: "t3",
    type: "activity_missed",
    title: "Activity Missed",
    message: "Sarah Martinez miss the activity",
    read: false,
    timestamp: "1 hour ago",
    relatedId: "activity-1",
  },
  {
    id: "t4",
    type: "student_submitted",
    title: "Essay Submitted",
    message: "Michael Chen already submitted the Essay",
    read: true,
    timestamp: "3 hours ago",
    relatedId: "essay-3",
  },
  {
    id: "t5",
    type: "resubmission_requested",
    title: "Resubmission Request",
    message: "Olivia Brown requested for resubmission",
    read: true,
    timestamp: "1 day ago",
    relatedId: "essay-4",
  },
];

// Mock data for Students
export const studentNotifications: Notification[] = [
  {
    id: "s1",
    type: "essay_graded",
    title: "Essay Graded",
    message: "Ms. Johnson already graded your essay",
    read: false,
    timestamp: "5 minutes ago",
    relatedId: "essay-1",
  },
  {
    id: "s2",
    type: "new_activity",
    title: "New Activity",
    message: "Ms. Johnson posted a new essay/activity",
    read: false,
    timestamp: "1 hour ago",
    relatedId: "activity-1",
  },
  {
    id: "s3",
    type: "resubmission_open",
    title: "Resubmission Open",
    message: "Ms. Johnson open for resubmission",
    read: false,
    timestamp: "2 hours ago",
    relatedId: "essay-2",
  },
  {
    id: "s4",
    type: "upcoming_deadline",
    title: "Upcoming Deadline",
    message: "Essay submission deadline in 2 days",
    read: false,
    timestamp: "1 day ago",
    relatedId: "essay-3",
  },
  {
    id: "s5",
    type: "revision_requested",
    title: "Revision Requested",
    message: "Revision requested for your essay",
    read: true,
    timestamp: "2 days ago",
    relatedId: "essay-4",
  },
  {
    id: "s6",
    type: "essay_graded",
    title: "Essay Graded",
    message: "Mr. Smith already graded your essay",
    read: true,
    timestamp: "3 days ago",
    relatedId: "essay-5",
  },
];

