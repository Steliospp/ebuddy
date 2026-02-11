import Foundation

@MainActor
final class ProfileViewModel: ObservableObject {
    @Published var profile = StartupProfile()
    @Published var isLoading = false
    @Published var isSaving = false
    @Published var errorMessage: String?
    @Published var savedSuccessfully = false

    func loadProfile() async {
        isLoading = true
        defer { isLoading = false }

        do {
            if let loaded = try await FirestoreService.shared.loadStartupProfile() {
                profile = loaded
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func saveProfile() async -> Bool {
        isSaving = true
        defer { isSaving = false }

        do {
            try await FirestoreService.shared.saveStartupProfile(profile)
            savedSuccessfully = true
            return true
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }
}
