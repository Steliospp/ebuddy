import SwiftUI

struct ChatView: View {
    @StateObject private var vm = ChatViewModel()
    @Binding var chatContext: String?

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Mode selector
                ModeSelector(selectedMode: $vm.selectedMode)

                // Messages
                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(spacing: 12) {
                            if vm.messages.isEmpty {
                                EmptyChatView()
                            }

                            ForEach(vm.messages) { message in
                                MessageBubble(
                                    message: message,
                                    onBookmark: {
                                        Task { await vm.toggleBookmark(message) }
                                    }
                                )
                                .id(message.id)
                            }

                            if vm.isLoading {
                                HStack {
                                    TypingIndicator()
                                    Spacer()
                                }
                                .padding(.horizontal)
                                .id("typing")
                            }
                        }
                        .padding(.vertical, 8)
                    }
                    .onChange(of: vm.messages.count) {
                        withAnimation {
                            proxy.scrollTo(vm.messages.last?.id, anchor: .bottom)
                        }
                    }
                    .onChange(of: vm.isLoading) {
                        if vm.isLoading {
                            withAnimation {
                                proxy.scrollTo("typing", anchor: .bottom)
                            }
                        }
                    }
                }

                // Error message
                if let error = vm.errorMessage {
                    Text(error)
                        .font(.caption)
                        .foregroundStyle(.red)
                        .padding(.horizontal)
                        .padding(.vertical, 4)
                }

                // Quick actions
                QuickActionsBar(onAction: { action in
                    vm.inputText = action
                    Task { await vm.sendMessage() }
                })

                // Input bar
                ChatInputBar(
                    text: $vm.inputText,
                    isLoading: vm.isLoading,
                    remaining: vm.remainingMessages,
                    onSend: { Task { await vm.sendMessage() } }
                )
            }
            .navigationTitle("Chat")
            .navigationBarTitleDisplayMode(.inline)
            .onAppear {
                vm.startListening()
                if let context = chatContext {
                    vm.optionalContext = context
                    vm.inputText = context.hasPrefix("Daily check-in:")
                        ? String(context.dropFirst("Daily check-in: ".count))
                        : "Let's discuss this quote"
                    chatContext = nil
                }
            }
            .onDisappear {
                vm.stopListening()
            }
        }
    }
}

// MARK: - Mode Selector

struct ModeSelector: View {
    @Binding var selectedMode: ChatMode

    var body: some View {
        Picker("Mode", selection: $selectedMode) {
            ForEach(ChatMode.allCases, id: \.self) { mode in
                Label(mode.displayName, systemImage: mode.icon)
                    .tag(mode)
            }
        }
        .pickerStyle(.segmented)
        .padding(.horizontal)
        .padding(.vertical, 8)
        .background(Color(.systemGroupedBackground))
    }
}

// MARK: - Empty Chat

struct EmptyChatView: View {
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "bubble.left.and.text.bubble.right")
                .font(.system(size: 48))
                .foregroundStyle(.tertiary)

            Text("Start a conversation")
                .font(.headline)
                .foregroundStyle(.secondary)

            Text("Ask about your startup, brainstorm ideas, or just talk through what's on your mind.")
                .font(.subheadline)
                .foregroundStyle(.tertiary)
                .multilineTextAlignment(.center)
        }
        .padding(40)
    }
}

// MARK: - Message Bubble

struct MessageBubble: View {
    let message: ChatMessage
    let onBookmark: () -> Void

    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            if message.isUser { Spacer(minLength: 60) }

            VStack(alignment: message.isUser ? .trailing : .leading, spacing: 4) {
                Text(message.content)
                    .font(.body)
                    .padding(12)
                    .background(message.isUser ? Color.blue : Color(.secondarySystemGroupedBackground))
                    .foregroundStyle(message.isUser ? .white : .primary)
                    .clipShape(RoundedRectangle(cornerRadius: 16))

                if !message.isUser {
                    HStack(spacing: 12) {
                        Button(action: onBookmark) {
                            Image(systemName: message.bookmarked ? "bookmark.fill" : "bookmark")
                                .font(.caption)
                                .foregroundStyle(message.bookmarked ? .blue : .secondary)
                        }

                        Button(action: { copyToClipboard(message.content) }) {
                            Image(systemName: "doc.on.doc")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .padding(.horizontal, 4)
                }
            }

            if !message.isUser { Spacer(minLength: 60) }
        }
        .padding(.horizontal)
    }

    private func copyToClipboard(_ text: String) {
        UIPasteboard.general.string = text
    }
}

// MARK: - Typing Indicator

struct TypingIndicator: View {
    @State private var phase = 0.0

    var body: some View {
        HStack(spacing: 4) {
            ForEach(0..<3) { i in
                Circle()
                    .fill(Color.secondary)
                    .frame(width: 8, height: 8)
                    .scaleEffect(phase == Double(i) ? 1.2 : 0.8)
                    .opacity(phase == Double(i) ? 1 : 0.5)
            }
        }
        .padding(12)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .onAppear {
            withAnimation(.easeInOut(duration: 0.6).repeatForever()) {
                phase = 2
            }
        }
    }
}

// MARK: - Quick Actions

struct QuickActionsBar: View {
    let onAction: (String) -> Void

    private let actions = [
        ("Fix my pitch", "text.badge.checkmark"),
        ("Pricing brainstorm", "dollarsign.circle"),
        ("Cold email draft", "envelope"),
        ("Next 3 actions", "list.number"),
        ("Calm me down", "heart.circle"),
    ]

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(actions, id: \.0) { action, icon in
                    Button(action: { onAction(action) }) {
                        Label(action, systemImage: icon)
                            .font(.caption)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 6)
                            .background(Color(.tertiarySystemGroupedBackground))
                            .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal)
            .padding(.vertical, 6)
        }
        .background(Color(.systemGroupedBackground))
    }
}

// MARK: - Chat Input Bar

struct ChatInputBar: View {
    @Binding var text: String
    let isLoading: Bool
    let remaining: Int
    let onSend: () -> Void

    var body: some View {
        VStack(spacing: 4) {
            HStack(alignment: .bottom, spacing: 8) {
                TextField("Message Ebuddy...", text: $text, axis: .vertical)
                    .lineLimit(1...5)
                    .textFieldStyle(.plain)
                    .padding(10)
                    .background(Color(.tertiarySystemGroupedBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 20))

                Button(action: onSend) {
                    Image(systemName: "arrow.up.circle.fill")
                        .font(.title)
                        .foregroundStyle(canSend ? .blue : .gray)
                }
                .disabled(!canSend)
            }
            .padding(.horizontal)
            .padding(.vertical, 8)

            Text("\(remaining) messages remaining today")
                .font(.caption2)
                .foregroundStyle(.tertiary)
                .padding(.bottom, 4)
        }
        .background(Color(.systemBackground))
    }

    private var canSend: Bool {
        !isLoading && !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && remaining > 0
    }
}
