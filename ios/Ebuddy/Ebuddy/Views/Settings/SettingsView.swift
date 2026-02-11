import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var authVM: AuthViewModel
    @StateObject private var vm = SettingsViewModel()
    @State private var showProfileEditor = false

    var body: some View {
        NavigationStack {
            Form {
                // Profile
                Section("Startup Profile") {
                    Button(action: { showProfileEditor = true }) {
                        Label("Edit Startup Profile", systemImage: "building.2")
                    }
                }

                // Notifications
                Section("Notifications") {
                    Toggle(isOn: $vm.preferences.quoteNotifEnabled) {
                        Label("Daily Quote", systemImage: "quote.opening")
                    }
                    .onChange(of: vm.preferences.quoteNotifEnabled) {
                        Task { await vm.savePreferences() }
                    }

                    if vm.preferences.quoteNotifEnabled {
                        DatePicker(
                            "Quote Time",
                            selection: Binding(
                                get: { vm.timeFromString(vm.preferences.quoteNotifTime) },
                                set: { vm.preferences.quoteNotifTime = vm.stringFromTime($0) }
                            ),
                            displayedComponents: .hourAndMinute
                        )
                        .onChange(of: vm.preferences.quoteNotifTime) {
                            Task { await vm.savePreferences() }
                        }
                    }

                    Toggle(isOn: $vm.preferences.checkinNotifEnabled) {
                        Label("Daily Check-in", systemImage: "checkmark.circle")
                    }
                    .onChange(of: vm.preferences.checkinNotifEnabled) {
                        Task { await vm.savePreferences() }
                    }

                    if vm.preferences.checkinNotifEnabled {
                        DatePicker(
                            "Check-in Time",
                            selection: Binding(
                                get: { vm.timeFromString(vm.preferences.checkinNotifTime) },
                                set: { vm.preferences.checkinNotifTime = vm.stringFromTime($0) }
                            ),
                            displayedComponents: .hourAndMinute
                        )
                        .onChange(of: vm.preferences.checkinNotifTime) {
                            Task { await vm.savePreferences() }
                        }
                    }
                }

                // Chat
                Section("Chat") {
                    Button(role: .destructive) {
                        vm.showResetConfirmation = true
                    } label: {
                        Label("Reset Chat Memory", systemImage: "arrow.counterclockwise")
                    }
                }

                // Account
                Section("Account") {
                    if let email = authVM.currentUser?.email {
                        HStack {
                            Text("Email")
                            Spacer()
                            Text(email)
                                .foregroundStyle(.secondary)
                        }
                    }

                    Button(role: .destructive) {
                        authVM.signOut()
                    } label: {
                        Label("Sign Out", systemImage: "rectangle.portrait.and.arrow.right")
                    }
                }

                // Legal
                Section("Legal") {
                    Link(destination: URL(string: "https://example.com/privacy")!) {
                        Label("Privacy Policy", systemImage: "hand.raised")
                    }
                    Link(destination: URL(string: "https://example.com/terms")!) {
                        Label("Terms of Service", systemImage: "doc.text")
                    }
                }

                Section {
                    VStack(spacing: 4) {
                        Text("Ebuddy is not a substitute for professional legal, financial, or medical advice.")
                            .font(.caption2)
                            .foregroundStyle(.tertiary)
                        Text("Version 1.0.0")
                            .font(.caption2)
                            .foregroundStyle(.tertiary)
                    }
                    .frame(maxWidth: .infinity)
                    .listRowBackground(Color.clear)
                }
            }
            .navigationTitle("Settings")
            .task {
                await vm.requestNotificationPermission()
                await vm.loadPreferences()
            }
            .sheet(isPresented: $showProfileEditor) {
                ProfileSetupView(isEditMode: true, onDismiss: { showProfileEditor = false })
                    .environmentObject(authVM)
            }
            .alert("Reset Chat Memory", isPresented: $vm.showResetConfirmation) {
                Button("Cancel", role: .cancel) {}
                Button("Reset", role: .destructive) {
                    Task { await vm.resetChatMemory() }
                }
            } message: {
                Text("This will delete all chat messages and the AI's memory of your conversations. Your startup profile will be kept.")
            }
        }
    }
}
