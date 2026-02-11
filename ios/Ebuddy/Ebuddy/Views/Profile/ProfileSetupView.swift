import SwiftUI

struct ProfileSetupView: View {
    @EnvironmentObject var authVM: AuthViewModel
    @StateObject private var vm = ProfileViewModel()
    @State private var showValidation = false

    var isEditMode: Bool = false
    var onDismiss: (() -> Void)?

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(isEditMode ? "Edit Startup Profile" : "Set Up Your Startup Profile")
                            .font(.title2.bold())
                        Text("Help Ebuddy understand your startup so conversations are relevant from day one.")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    .listRowBackground(Color.clear)
                    .listRowInsets(EdgeInsets())
                    .padding(.vertical, 8)
                }

                Section("Company Basics") {
                    TextField("Company Name", text: $vm.profile.companyName)
                    TextField("One-liner (what you do)", text: $vm.profile.oneLiner)

                    Picker("Stage", selection: $vm.profile.stage) {
                        ForEach(StartupStage.allCases, id: \.self) { stage in
                            Text(stage.rawValue).tag(stage)
                        }
                    }
                }

                Section("Customer & Business") {
                    TextField("Target Customer", text: $vm.profile.targetCustomer)
                    TextField("Business Model", text: $vm.profile.businessModel)
                    TextField("Pricing", text: $vm.profile.pricing)
                }

                Section("Progress") {
                    TextField("Traction Metrics", text: $vm.profile.tractionMetrics)
                    TextField("Current Goal", text: $vm.profile.currentGoal)
                    TextField("Current Blockers", text: $vm.profile.currentBlockers)
                }

                Section("Default Chat Mode") {
                    Picker("Mode", selection: $vm.profile.defaultMode) {
                        ForEach(ChatMode.allCases, id: \.self) { mode in
                            Label(mode.displayName, systemImage: mode.icon).tag(mode)
                        }
                    }
                    .pickerStyle(.segmented)
                }

                if showValidation && vm.profile.companyName.isEmpty {
                    Section {
                        Text("Please enter at least a company name.")
                            .foregroundStyle(.red)
                            .font(.caption)
                    }
                }

                Section {
                    Button(action: save) {
                        if vm.isSaving {
                            ProgressView()
                                .frame(maxWidth: .infinity)
                        } else {
                            Text(isEditMode ? "Save Changes" : "Get Started")
                                .fontWeight(.semibold)
                                .frame(maxWidth: .infinity)
                        }
                    }
                    .disabled(vm.isSaving)
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                if isEditMode {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Cancel") { onDismiss?() }
                    }
                }
            }
            .task {
                await vm.loadProfile()
            }
        }
    }

    private func save() {
        if vm.profile.companyName.trimmingCharacters(in: .whitespaces).isEmpty {
            showValidation = true
            return
        }

        Task {
            let success = await vm.saveProfile()
            if success {
                if isEditMode {
                    onDismiss?()
                } else {
                    authVM.completeProfileSetup()
                }
            }
        }
    }
}
