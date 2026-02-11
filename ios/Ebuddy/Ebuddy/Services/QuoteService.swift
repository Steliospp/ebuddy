import Foundation
import CryptoKit

final class QuoteService {
    static let shared = QuoteService()

    private(set) var quotes: [Quote] = []

    private init() {
        loadQuotes()
    }

    private func loadQuotes() {
        guard let url = Bundle.main.url(forResource: "quotes", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let decoded = try? JSONDecoder().decode([Quote].self, from: data)
        else {
            print("Failed to load quotes.json from bundle")
            return
        }
        quotes = decoded
    }

    /// Returns a deterministic quote for the given user+date combination
    func quoteOfTheDay(uid: String, date: Date = Date()) -> Quote? {
        guard !quotes.isEmpty else { return nil }

        let dateStr = Self.dateString(from: date)
        let seed = "\(uid)-\(dateStr)"

        // Create a deterministic hash
        let hash = SHA256.hash(data: Data(seed.utf8))
        let hashBytes = Array(hash)
        let value = UInt64(hashBytes[0]) |
            (UInt64(hashBytes[1]) << 8) |
            (UInt64(hashBytes[2]) << 16) |
            (UInt64(hashBytes[3]) << 24)

        let index = Int(value % UInt64(quotes.count))
        return quotes[index]
    }

    static func dateString(from date: Date = Date()) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.timeZone = TimeZone.current
        return formatter.string(from: date)
    }
}
