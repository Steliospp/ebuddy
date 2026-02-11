import Foundation
import UserNotifications

final class NotificationService {
    static let shared = NotificationService()

    func requestPermission() async -> Bool {
        do {
            let granted = try await UNUserNotificationCenter.current()
                .requestAuthorization(options: [.alert, .badge, .sound])
            return granted
        } catch {
            print("Notification permission error: \(error)")
            return false
        }
    }

    func scheduleQuoteNotification(enabled: Bool, timeString: String) {
        let center = UNUserNotificationCenter.current()
        center.removePendingNotificationRequests(withIdentifiers: ["daily-quote"])

        guard enabled else { return }

        let components = parseTime(timeString)
        let content = UNMutableNotificationContent()
        content.title = "Ebuddy"
        content.body = "Your daily quote is ready."
        content.sound = .default

        var dateComponents = DateComponents()
        dateComponents.hour = components.hour
        dateComponents.minute = components.minute

        let trigger = UNCalendarNotificationTrigger(dateMatching: dateComponents, repeats: true)
        let request = UNNotificationRequest(identifier: "daily-quote", content: content, trigger: trigger)

        center.add(request) { error in
            if let error { print("Failed to schedule quote notification: \(error)") }
        }
    }

    func scheduleCheckinNotification(enabled: Bool, timeString: String) {
        let center = UNUserNotificationCenter.current()
        center.removePendingNotificationRequests(withIdentifiers: ["daily-checkin"])

        guard enabled else { return }

        let components = parseTime(timeString)
        let content = UNMutableNotificationContent()
        content.title = "Ebuddy"
        content.body = "Daily check-in: what's the one move that matters today?"
        content.sound = .default

        var dateComponents = DateComponents()
        dateComponents.hour = components.hour
        dateComponents.minute = components.minute

        let trigger = UNCalendarNotificationTrigger(dateMatching: dateComponents, repeats: true)
        let request = UNNotificationRequest(identifier: "daily-checkin", content: content, trigger: trigger)

        center.add(request) { error in
            if let error { print("Failed to schedule checkin notification: \(error)") }
        }
    }

    private func parseTime(_ timeString: String) -> (hour: Int, minute: Int) {
        let parts = timeString.split(separator: ":").compactMap { Int($0) }
        return (hour: parts.first ?? 8, minute: parts.count > 1 ? parts[1] : 0)
    }
}
