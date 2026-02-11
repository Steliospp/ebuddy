import SwiftUI

enum AppTab: String, CaseIterable {
    case home = "Home"
    case chat = "Chat"
    case library = "Library"
    case settings = "Settings"

    var icon: String {
        switch self {
        case .home: return "house.fill"
        case .chat: return "bubble.left.fill"
        case .library: return "books.vertical.fill"
        case .settings: return "gearshape.fill"
        }
    }
}

struct RootView: View {
    @EnvironmentObject var authVM: AuthViewModel

    @State private var selectedTab: AppTab = .home
    @State private var chatContext: String?

    var body: some View {
        Group {
            switch authVM.authState {
            case .loading:
                ProgressView("Loading...")

            case .signedOut:
                AuthView()
                    .environmentObject(authVM)

            case .needsProfile:
                ProfileSetupView(isEditMode: false)
                    .environmentObject(authVM)

            case .signedIn:
                mainTabView
            }
        }
        .animation(.default, value: authVM.authState == .signedIn)
    }

    private var mainTabView: some View {
        TabView(selection: $selectedTab) {
            HomeView(selectedTab: $selectedTab, chatContext: $chatContext)
                .tabItem {
                    Label(AppTab.home.rawValue, systemImage: AppTab.home.icon)
                }
                .tag(AppTab.home)

            ChatView(chatContext: $chatContext)
                .tabItem {
                    Label(AppTab.chat.rawValue, systemImage: AppTab.chat.icon)
                }
                .tag(AppTab.chat)

            LibraryView()
                .tabItem {
                    Label(AppTab.library.rawValue, systemImage: AppTab.library.icon)
                }
                .tag(AppTab.library)

            SettingsView()
                .environmentObject(authVM)
                .tabItem {
                    Label(AppTab.settings.rawValue, systemImage: AppTab.settings.icon)
                }
                .tag(AppTab.settings)
        }
    }
}
