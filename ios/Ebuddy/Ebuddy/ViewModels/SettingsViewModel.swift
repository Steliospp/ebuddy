import Foundation

@MainActor
final class SettingsViewModel: ObservableObject {
    @Published var preferences = UserPreferences()
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var showResetConfirmation = false
    @Published var isResetting = false

    func loadPreferences() async {
        isLoading = true
        defer { isLoading = false }

        do {
            preferences = try await FirestoreService.shared.loadPreferences()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func savePreferences() async {
        do {
            try await FirestoreService.shared.savePreferences(preferences)
            updateNotifications()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func updateNotifications() {
        NotificationService.shared.scheduleQuoteNotification(
            enabled: preferences.quoteNotifEnabled,
            timeString: preferences.quoteNotifTime
        )
        NotificationService.shared.scheduleCheckinNotification(
            enabled: preferences.checkinNotifEnabled,
            timeString: preferences.checkinNotifTime
        )
    }

    func requestNotificationPermission() async {
        _ = await NotificationService.shared.requestPermission()
    }

    func resetChatMemory() async {
        isResetting = true
        defer { isResetting = false }

        do {
            try await FirestoreService.shared.resetMemory()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    // Parse HH:mm to Date for DatePicker
    func timeFromString(_ str: String) -> Date {
        let parts = str.split(separator: ":").compactMap { Int($0) }
        let hour = parts.first ?? 8
        let minute = parts.count > 1 ? parts[1] : 0
        var components = Calendar.current.dateComponents([.year, .month, .day], from: Date())
        components.hour = hour
        components.minute = minute
        return Calendar.current.date(from: components) ?? Date()
    }

    func stringFromTime(_ date: Date) -> String {
        let components = Calendar.current.dateComponents([.hour, .minute], from: date)
        return String(format: "%02d:%02d", components.hour ?? 8, components.minute ?? 0)
    }
}
