import Foundation
import FirebaseFirestore
import FirebaseFunctions

@MainActor
final class ChatViewModel: ObservableObject {
    @Published var messages: [ChatMessage] = []
    @Published var inputText = ""
    @Published var selectedMode: ChatMode = .cofounder
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var dailyCount = 0
    @Published var dailyLimit = 20

    private let threadId = "default"
    private var listener: ListenerRegistration?
    private let functions = Functions.functions()

    var optionalContext: String?

    init() {
        #if DEBUG
        // Connect to emulator in debug builds
        // Uncomment the line below when using Firebase emulator
        // functions.useEmulator(withHost: "localhost", port: 5001)
        #endif
    }

    func startListening() {
        listener = FirestoreService.shared.listenToMessages(threadId: threadId) { [weak self] messages in
            Task { @MainActor in
                self?.messages = messages
            }
        }

        Task {
            let usage = try? await FirestoreService.shared.loadUsage()
            dailyCount = usage?.count ?? 0
            dailyLimit = usage?.limit ?? 20
        }
    }

    func stopListening() {
        listener?.remove()
        listener = nil
    }

    func sendMessage() async {
        let text = inputText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }

        inputText = ""
        isLoading = true
        errorMessage = nil

        do {
            let data: [String: Any] = [
                "threadId": threadId,
                "mode": selectedMode.rawValue,
                "message": text,
                "optionalContext": optionalContext ?? "",
            ]

            let result = try await functions.httpsCallable("chat").call(data)

            if let response = result.data as? [String: Any] {
                dailyCount = response["dailyCount"] as? Int ?? dailyCount + 1
                dailyLimit = response["dailyLimit"] as? Int ?? dailyLimit
            }

            optionalContext = nil
        } catch {
            let nsError = error as NSError
            if nsError.domain == FunctionsErrorDomain {
                let code = FunctionsErrorCode(rawValue: nsError.code)
                if code == .resourceExhausted {
                    errorMessage = "Daily message limit reached. Try again tomorrow!"
                } else {
                    errorMessage = nsError.localizedDescription
                }
            } else {
                errorMessage = error.localizedDescription
            }
        }

        isLoading = false
    }

    func toggleBookmark(_ message: ChatMessage) async {
        do {
            try await FirestoreService.shared.toggleBookmark(
                threadId: threadId,
                messageId: message.id,
                bookmarked: !message.bookmarked
            )
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    var remainingMessages: Int {
        max(0, dailyLimit - dailyCount)
    }
}
