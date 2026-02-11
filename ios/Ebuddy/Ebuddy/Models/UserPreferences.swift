import Foundation

struct UserPreferences {
    var defaultMode: ChatMode = .cofounder
    var quoteNotifEnabled: Bool = true
    var quoteNotifTime: String = "08:00"
    var checkinNotifEnabled: Bool = true
    var checkinNotifTime: String = "09:00"

    func toFirestore() -> [String: Any] {
        return [
            "defaultMode": defaultMode.rawValue,
            "quoteNotifEnabled": quoteNotifEnabled,
            "quoteNotifTime": quoteNotifTime,
            "checkinNotifEnabled": checkinNotifEnabled,
            "checkinNotifTime": checkinNotifTime,
        ]
    }

    static func from(_ data: [String: Any]) -> UserPreferences {
        var prefs = UserPreferences()
        prefs.defaultMode = ChatMode(rawValue: data["defaultMode"] as? String ?? "") ?? .cofounder
        prefs.quoteNotifEnabled = data["quoteNotifEnabled"] as? Bool ?? true
        prefs.quoteNotifTime = data["quoteNotifTime"] as? String ?? "08:00"
        prefs.checkinNotifEnabled = data["checkinNotifEnabled"] as? Bool ?? true
        prefs.checkinNotifTime = data["checkinNotifTime"] as? String ?? "09:00"
        return prefs
    }
}
