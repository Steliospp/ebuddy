import Foundation
import FirebaseFirestore

enum ChatMode: String, CaseIterable, Codable {
    case cofounder
    case friend
    case advisor

    var displayName: String {
        switch self {
        case .cofounder: return "Cofounder"
        case .friend: return "Friend"
        case .advisor: return "Advisor"
        }
    }

    var icon: String {
        switch self {
        case .cofounder: return "person.2.fill"
        case .friend: return "heart.fill"
        case .advisor: return "briefcase.fill"
        }
    }
}

struct ChatMessage: Identifiable {
    let id: String
    let role: String
    let content: String
    let mode: ChatMode
    let createdAt: Date
    var bookmarked: Bool

    var isUser: Bool { role == "user" }

    static func from(_ document: QueryDocumentSnapshot) -> ChatMessage {
        let data = document.data()
        return ChatMessage(
            id: document.documentID,
            role: data["role"] as? String ?? "user",
            content: data["content"] as? String ?? "",
            mode: ChatMode(rawValue: data["mode"] as? String ?? "") ?? .cofounder,
            createdAt: (data["createdAt"] as? Timestamp)?.dateValue() ?? Date(),
            bookmarked: data["bookmarked"] as? Bool ?? false
        )
    }
}
