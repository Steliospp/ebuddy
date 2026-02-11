import Foundation
import FirebaseFirestore
import FirebaseAuth

final class FirestoreService {
    static let shared = FirestoreService()
    private let db = Firestore.firestore()

    private var uid: String? {
        Auth.auth().currentUser?.uid
    }

    private func userDoc() throws -> DocumentReference {
        guard let uid else { throw EbuddyError.notAuthenticated }
        return db.collection("users").doc(uid)
    }

    // MARK: - User Document

    func ensureUserDocument() async throws {
        guard let uid else { throw EbuddyError.notAuthenticated }
        let ref = db.collection("users").document(uid)
        let snap = try await ref.getDocument()
        if !snap.exists {
            let user = Auth.auth().currentUser
            let tomorrow = Calendar.current.startOfDay(for: Date().addingTimeInterval(86400))
            try await ref.setData([
                "email": user?.email ?? "",
                "name": user?.displayName ?? "",
                "createdAt": FieldValue.serverTimestamp(),
                "plan": "free",
                "usage": [
                    "dailyCount": 0,
                    "dailyLimit": 20,
                    "resetAt": Timestamp(date: tomorrow),
                ],
                "preferences": [
                    "defaultMode": "cofounder",
                    "quoteNotifEnabled": true,
                    "quoteNotifTime": "08:00",
                    "checkinNotifEnabled": true,
                    "checkinNotifTime": "09:00",
                ],
            ])
        }
    }

    // MARK: - Startup Profile

    func loadStartupProfile() async throws -> StartupProfile? {
        guard let uid else { throw EbuddyError.notAuthenticated }
        let snap = try await db.document("users/\(uid)/startupProfile/main").getDocument()
        guard let data = snap.data() else { return nil }
        return StartupProfile.from(data)
    }

    func saveStartupProfile(_ profile: StartupProfile) async throws {
        guard let uid else { throw EbuddyError.notAuthenticated }
        try await db.document("users/\(uid)/startupProfile/main")
            .setData(profile.toFirestore(), merge: true)
    }

    // MARK: - Preferences

    func loadPreferences() async throws -> UserPreferences {
        guard let uid else { throw EbuddyError.notAuthenticated }
        let snap = try await db.document("users/\(uid)").getDocument()
        guard let data = snap.data(), let prefs = data["preferences"] as? [String: Any] else {
            return UserPreferences()
        }
        return UserPreferences.from(prefs)
    }

    func savePreferences(_ prefs: UserPreferences) async throws {
        guard let uid else { throw EbuddyError.notAuthenticated }
        try await db.document("users/\(uid)").updateData([
            "preferences": prefs.toFirestore(),
        ])
    }

    // MARK: - Messages Listener

    func listenToMessages(
        threadId: String = "default",
        onChange: @escaping ([ChatMessage]) -> Void
    ) -> ListenerRegistration? {
        guard let uid else { return nil }
        return db.collection("users/\(uid)/chats/\(threadId)/messages")
            .order(by: "createdAt", descending: false)
            .addSnapshotListener { snapshot, error in
                guard let docs = snapshot?.documents else { return }
                let messages = docs.map { ChatMessage.from($0) }
                onChange(messages)
            }
    }

    // MARK: - Bookmark

    func toggleBookmark(threadId: String = "default", messageId: String, bookmarked: Bool) async throws {
        guard let uid else { throw EbuddyError.notAuthenticated }
        try await db.document("users/\(uid)/chats/\(threadId)/messages/\(messageId)")
            .updateData(["bookmarked": bookmarked])
    }

    func loadBookmarkedMessages(threadId: String = "default") async throws -> [ChatMessage] {
        guard let uid else { throw EbuddyError.notAuthenticated }
        let snap = try await db.collection("users/\(uid)/chats/\(threadId)/messages")
            .whereField("bookmarked", isEqualTo: true)
            .order(by: "createdAt", descending: true)
            .getDocuments()
        return snap.documents.map { ChatMessage.from($0) }
    }

    // MARK: - Saved Quotes

    func saveQuote(_ quote: Quote) async throws {
        guard let uid else { throw EbuddyError.notAuthenticated }
        try await db.document("users/\(uid)/savedQuotes/\(quote.id)").setData([
            "quoteId": quote.id,
            "text": quote.text,
            "author": quote.author,
            "tags": quote.tags,
            "savedAt": FieldValue.serverTimestamp(),
        ])
    }

    func unsaveQuote(_ quoteId: Int) async throws {
        guard let uid else { throw EbuddyError.notAuthenticated }
        try await db.document("users/\(uid)/savedQuotes/\(quoteId)").delete()
    }

    func loadSavedQuotes() async throws -> [SavedQuote] {
        guard let uid else { throw EbuddyError.notAuthenticated }
        let snap = try await db.collection("users/\(uid)/savedQuotes")
            .order(by: "savedAt", descending: true)
            .getDocuments()
        return snap.documents.map { doc in
            let data = doc.data()
            return SavedQuote(
                id: doc.documentID,
                quoteId: data["quoteId"] as? Int ?? 0,
                text: data["text"] as? String ?? "",
                author: data["author"] as? String ?? "",
                tags: data["tags"] as? [String] ?? [],
                savedAt: (data["savedAt"] as? Timestamp)?.dateValue() ?? Date()
            )
        }
    }

    func isQuoteSaved(_ quoteId: Int) async throws -> Bool {
        guard let uid else { throw EbuddyError.notAuthenticated }
        let snap = try await db.document("users/\(uid)/savedQuotes/\(quoteId)").getDocument()
        return snap.exists
    }

    // MARK: - Daily Quote Record

    func saveDailyQuote(_ quote: Quote, date: String) async throws {
        guard let uid else { throw EbuddyError.notAuthenticated }
        try await db.document("users/\(uid)/daily/\(date)").setData([
            "quoteId": quote.id,
            "text": quote.text,
            "author": quote.author,
            "tags": quote.tags,
            "createdAt": FieldValue.serverTimestamp(),
        ], merge: true)
    }

    // MARK: - Daily Check-in

    func saveCheckin(text: String, date: String) async throws {
        guard let uid else { throw EbuddyError.notAuthenticated }
        try await db.document("users/\(uid)/daily/\(date)").setData([
            "checkinText": text,
            "checkinAt": FieldValue.serverTimestamp(),
        ], merge: true)
    }

    // MARK: - Usage Info

    func loadUsage() async throws -> (count: Int, limit: Int) {
        guard let uid else { throw EbuddyError.notAuthenticated }
        let snap = try await db.document("users/\(uid)").getDocument()
        let data = snap.data() ?? [:]
        let usage = data["usage"] as? [String: Any] ?? [:]
        let count = usage["dailyCount"] as? Int ?? 0
        let limit = usage["dailyLimit"] as? Int ?? 20
        return (count, limit)
    }

    // MARK: - Reset Memory

    func resetMemory() async throws {
        guard let uid else { throw EbuddyError.notAuthenticated }
        try await db.document("users/\(uid)/memory/latest").delete()

        // Delete all messages in default thread
        let messagesSnap = try await db.collection("users/\(uid)/chats/default/messages").getDocuments()
        let batch = db.batch()
        for doc in messagesSnap.documents {
            batch.deleteDocument(doc.reference)
        }
        try await batch.commit()

        // Delete thread doc
        try await db.document("users/\(uid)/chats/default").delete()
    }
}

enum EbuddyError: LocalizedError {
    case notAuthenticated
    case quotaExceeded
    case networkError(String)

    var errorDescription: String? {
        switch self {
        case .notAuthenticated: return "Please sign in to continue."
        case .quotaExceeded: return "Daily message limit reached. Try again tomorrow."
        case .networkError(let msg): return msg
        }
    }
}
