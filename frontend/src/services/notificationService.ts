import { supabase } from "../lib/supabaseClient";
import type { Notification } from "../types/notification";

// Fetch notifications for a user (teacher or student)
export const fetchUserNotifications = async (
  userId: string,
): Promise<Notification[]> => {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching notifications:", error);
      return [];
    }

    if (!data) {
      return [];
    }

    return data.map(mapNotificationRow);
  } catch (err) {
    console.error("Error fetching user notifications:", err);
    return [];
  }
};

/**
 * Maps a database notification row to the frontend Notification interface
 */
export const mapNotificationRow = (notif: any): Notification => ({
  id: String(notif.id),
  type: notif.type as Notification["type"],
  title: notif.title,
  message: notif.message,
  read: notif.read,
  timestamp: formatTimestamp(notif.created_at),
  relatedId: notif.related_id || undefined,
});

/**
 * Subscribe to real-time notification updates for a specific user
 */
export const subscribeToNotifications = (
  userId: string,
  onNewNotification: (notification: Notification) => void,
) => {
  return supabase
    .channel(`user-notifications-${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const newNotif = mapNotificationRow(payload.new);
        onNewNotification(newNotif);
      },
    )
    .subscribe();
};

// Mark notification as read
export const markNotificationAsRead = async (
  notificationId: string,
  teacherId: string,
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notificationId)
      .eq("user_id", teacherId);

    if (error) {
      console.error("Error marking notification as read:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Error marking notification as read:", err);
    return false;
  }
};

// Mark all notifications as read
export const markAllNotificationsAsRead = async (
  teacherId: string,
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", teacherId)
      .eq("read", false);

    if (error) {
      console.error("Error marking all notifications as read:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Error marking all notifications as read:", err);
    return false;
  }
};

// Format timestamp to relative time (e.g., "2 minutes ago")
const formatTimestamp = (timestamp: string | Date): string => {
  const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return `${diffInSeconds} second${diffInSeconds !== 1 ? "s" : ""} ago`;
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes !== 1 ? "s" : ""} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours !== 1 ? "s" : ""} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays !== 1 ? "s" : ""} ago`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks} week${diffInWeeks !== 1 ? "s" : ""} ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} month${diffInMonths !== 1 ? "s" : ""} ago`;
  }

  return date.toLocaleDateString();
};

// Create a new notification
export const createNotification = async (
  notification: any // Using any for flexibility with database fields
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("notifications")
      .insert([
        {
          user_id: notification.user_id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          related_id: notification.relatedId,
          read: false,
        },
      ]);

    if (error) {
      console.error("Error creating notification:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Error creating notification:", err);
    return false;
  }
};
