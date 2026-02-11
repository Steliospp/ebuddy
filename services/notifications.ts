import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Configure how notifications are presented when the app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function scheduleQuoteNotification(
  enabled: boolean,
  timeString: string
): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync("daily-quote").catch(
    () => {}
  );

  // Cancel all with this identifier pattern
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if (n.identifier === "daily-quote") {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }

  if (!enabled) return;

  const { hour, minute } = parseTime(timeString);

  await Notifications.scheduleNotificationAsync({
    identifier: "daily-quote",
    content: {
      title: "Ebuddy",
      body: "Your daily quote is ready.",
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

export async function scheduleCheckinNotification(
  enabled: boolean,
  timeString: string
): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if (n.identifier === "daily-checkin") {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }

  if (!enabled) return;

  const { hour, minute } = parseTime(timeString);

  await Notifications.scheduleNotificationAsync({
    identifier: "daily-checkin",
    content: {
      title: "Ebuddy",
      body: "Daily check-in: what's the one move that matters today?",
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

function parseTime(timeString: string): { hour: number; minute: number } {
  const parts = timeString.split(":").map(Number);
  return { hour: parts[0] ?? 8, minute: parts[1] ?? 0 };
}
