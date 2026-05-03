import type { NavigateFunction } from 'react-router-dom';
import { buildSecureUrl } from './secureUrl';
import type { Notification } from '../types/notification';

export const handleNotificationNavigation = (
  notification: Notification,
  role: 'Teacher' | 'Student',
  userAuthId: string | undefined,
  navigate: NavigateFunction
) => {
  let activityId = "";
  let essayId = "";
  let studentId = "";

  if (notification.relatedId) {
    const trimmed = notification.relatedId.trim();
    if (trimmed) {
      if (trimmed.startsWith("{")) {
        try {
          const parsed = JSON.parse(trimmed);
          activityId = parsed.activityId || parsed.id || "";
          essayId = parsed.essayId || "";
          studentId = parsed.studentId || "";
        } catch (e) {
          console.error("[NotificationUtils] JSON parse error:", e);
          activityId = trimmed;
        }
      } else {
        // Fallback for legacy simple string IDs
        if (notification.type === 'essay_graded' || notification.type === 'essay_feedback') {
          essayId = trimmed;
        } else {
          activityId = trimmed;
        }
      }
    }
  }

  console.log("[NotificationUtils] Extracted IDs:", { activityId, essayId, studentId, type: notification.type });

  const targetId = activityId || essayId;
  if (!targetId) {
    console.warn("[NotificationUtils] No target ID found, cannot navigate.");
    return;
  }

  if (role === 'Teacher') {
    const params: Record<string, string> = { activityId: targetId };
    if (studentId) params.studentId = studentId;
    if (essayId) params.essayId = essayId;

    const url = buildSecureUrl('/Teacher/Activities', params);
    navigate(url);
  } else {
    // Student logic
    const params: Record<string, string> = { activityId: targetId };
    if (studentId || userAuthId) params.studentId = studentId || userAuthId || "";
    
    let targetPath = '/Student/Submit';
    
    switch (notification.type) {
      case "essay_graded":
      case "essay_feedback":
        // Both types now lead to the Transcript for stability
        if (essayId) params.essayId = essayId;
        targetPath = '/Student/Essays/Result';
        break;
      case "new_activity":
        targetPath = '/Student/Submit';
        break;
      default:
        targetPath = '/Student/Submit';
        break;
    }
    
    const url = buildSecureUrl(targetPath, params);
    navigate(url);
  }
};
