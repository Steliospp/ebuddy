import Foundation

struct Quote: Codable, Identifiable {
    let id: Int
    let text: String
    let author: String
    let tags: [String]
}

struct SavedQuote: Identifiable {
    let id: String
    let quoteId: Int
    let text: String
    let author: String
    let tags: [String]
    let savedAt: Date

    var asQuote: Quote {
        Quote(id: quoteId, text: text, author: author, tags: tags)
    }

    static func from(_ document: FirestoreDocument) -> SavedQuote {
        let data = document.data
        return SavedQuote(
            id: document.id,
            quoteId: data["quoteId"] as? Int ?? 0,
            text: data["text"] as? String ?? "",
            author: data["author"] as? String ?? "",
            tags: data["tags"] as? [String] ?? [],
            savedAt: (data["savedAt"] as? DateValue)?.dateValue() ?? Date()
        )
    }
}

// Lightweight wrappers so Quote model doesn't import Firebase directly
struct FirestoreDocument {
    let id: String
    let data: [String: Any]
}

protocol DateValue {
    func dateValue() -> Date
}
