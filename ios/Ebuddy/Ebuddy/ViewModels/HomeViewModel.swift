import Foundation
import FirebaseAuth

@MainActor
final class HomeViewModel: ObservableObject {
    @Published var quoteOfTheDay: Quote?
    @Published var isQuoteSaved = false
    @Published var checkinText = ""
    @Published var checkinSubmitted = false
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let quoteService = QuoteService.shared
    private let firestoreService = FirestoreService.shared

    func loadDailyQuote() async {
        guard let uid = Auth.auth().currentUser?.uid else { return }

        isLoading = true
        defer { isLoading = false }

        let quote = quoteService.quoteOfTheDay(uid: uid)
        quoteOfTheDay = quote

        if let quote {
            let dateStr = QuoteService.dateString()
            // Save daily record
            try? await firestoreService.saveDailyQuote(quote, date: dateStr)
            // Check if saved
            isQuoteSaved = (try? await firestoreService.isQuoteSaved(quote.id)) ?? false
        }
    }

    func toggleSaveQuote() async {
        guard let quote = quoteOfTheDay else { return }

        do {
            if isQuoteSaved {
                try await firestoreService.unsaveQuote(quote.id)
                isQuoteSaved = false
            } else {
                try await firestoreService.saveQuote(quote)
                isQuoteSaved = true
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func submitCheckin() async {
        guard !checkinText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }

        let dateStr = QuoteService.dateString()
        do {
            try await firestoreService.saveCheckin(text: checkinText, date: dateStr)
            checkinSubmitted = true
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
