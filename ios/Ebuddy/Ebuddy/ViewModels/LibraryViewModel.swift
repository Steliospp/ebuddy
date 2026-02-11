import Foundation

@MainActor
final class LibraryViewModel: ObservableObject {
    @Published var savedQuotes: [SavedQuote] = []
    @Published var bookmarkedMessages: [ChatMessage] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var selectedTab: LibraryTab = .quotes

    enum LibraryTab: String, CaseIterable {
        case quotes = "Saved Quotes"
        case messages = "Bookmarks"
    }

    func load() async {
        isLoading = true
        defer { isLoading = false }

        do {
            async let quotes = FirestoreService.shared.loadSavedQuotes()
            async let messages = FirestoreService.shared.loadBookmarkedMessages()

            savedQuotes = try await quotes
            bookmarkedMessages = try await messages
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func removeQuote(_ quote: SavedQuote) async {
        do {
            try await FirestoreService.shared.unsaveQuote(quote.quoteId)
            savedQuotes.removeAll { $0.id == quote.id }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func removeBookmark(_ message: ChatMessage) async {
        do {
            try await FirestoreService.shared.toggleBookmark(messageId: message.id, bookmarked: false)
            bookmarkedMessages.removeAll { $0.id == message.id }
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
