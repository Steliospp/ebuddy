import SwiftUI

struct HomeView: View {
    @StateObject private var vm = HomeViewModel()
    @Binding var selectedTab: AppTab
    @Binding var chatContext: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Daily Quote Card
                    if let quote = vm.quoteOfTheDay {
                        QuoteCard(
                            quote: quote,
                            isSaved: vm.isQuoteSaved,
                            onSave: { Task { await vm.toggleSaveQuote() } },
                            onShare: { shareQuote(quote) },
                            onDiscuss: { discussQuote(quote) }
                        )
                    } else if vm.isLoading {
                        ProgressView()
                            .frame(maxWidth: .infinity, minHeight: 200)
                    }

                    // Daily Check-in Card
                    CheckinCard(
                        text: $vm.checkinText,
                        submitted: vm.checkinSubmitted,
                        onSubmit: {
                            Task {
                                await vm.submitCheckin()
                                // Also send to chat
                                chatContext = "Daily check-in: \(vm.checkinText)"
                                selectedTab = .chat
                            }
                        }
                    )
                }
                .padding()
            }
            .navigationTitle("Ebuddy")
            .task {
                await vm.loadDailyQuote()
            }
            .refreshable {
                await vm.loadDailyQuote()
            }
        }
    }

    private func shareQuote(_ quote: Quote) {
        let text = "\"\(quote.text)\" — \(quote.author)\n\nvia Ebuddy"
        let activityVC = UIActivityViewController(activityItems: [text], applicationActivities: nil)
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let rootVC = windowScene.windows.first?.rootViewController {
            rootVC.present(activityVC, animated: true)
        }
    }

    private func discussQuote(_ quote: Quote) {
        chatContext = "Quote of the day: \"\(quote.text)\" — \(quote.author)"
        selectedTab = .chat
    }
}

// MARK: - Quote Card

struct QuoteCard: View {
    let quote: Quote
    let isSaved: Bool
    let onSave: () -> Void
    let onShare: () -> Void
    let onDiscuss: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Label("Quote of the Day", systemImage: "quote.opening")
                .font(.subheadline.bold())
                .foregroundStyle(.blue)

            Text("\"\(quote.text)\"")
                .font(.title3)
                .italic()

            Text("— \(quote.author)")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            // Tags
            if !quote.tags.isEmpty {
                HStack(spacing: 6) {
                    ForEach(quote.tags, id: \.self) { tag in
                        Text(tag)
                            .font(.caption2)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color.blue.opacity(0.1))
                            .clipShape(Capsule())
                    }
                }
            }

            Divider()

            HStack(spacing: 16) {
                Button(action: onSave) {
                    Label(isSaved ? "Saved" : "Save", systemImage: isSaved ? "bookmark.fill" : "bookmark")
                        .font(.subheadline)
                }

                Button(action: onShare) {
                    Label("Share", systemImage: "square.and.arrow.up")
                        .font(.subheadline)
                }

                Spacer()

                Button(action: onDiscuss) {
                    Label("Discuss", systemImage: "bubble.left")
                        .font(.subheadline.bold())
                }
                .buttonStyle(.borderedProminent)
                .buttonBorderShape(.capsule)
            }
        }
        .padding()
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}

// MARK: - Check-in Card

struct CheckinCard: View {
    @Binding var text: String
    let submitted: Bool
    let onSubmit: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("Daily Check-in", systemImage: "checkmark.circle")
                .font(.subheadline.bold())
                .foregroundStyle(.green)

            Text("What's the one move that matters today?")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            if submitted {
                HStack {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(.green)
                    Text("Check-in submitted! Opening chat...")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            } else {
                TextField("Type your one move...", text: $text, axis: .vertical)
                    .lineLimit(2...4)
                    .textFieldStyle(.roundedBorder)

                Button(action: onSubmit) {
                    Text("Submit & Discuss")
                        .fontWeight(.medium)
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .disabled(text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
        }
        .padding()
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}
