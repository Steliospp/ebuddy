import SwiftUI

struct LibraryView: View {
    @StateObject private var vm = LibraryViewModel()

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Tab selector
                Picker("Tab", selection: $vm.selectedTab) {
                    ForEach(LibraryViewModel.LibraryTab.allCases, id: \.self) { tab in
                        Text(tab.rawValue).tag(tab)
                    }
                }
                .pickerStyle(.segmented)
                .padding()

                if vm.isLoading {
                    Spacer()
                    ProgressView()
                    Spacer()
                } else {
                    switch vm.selectedTab {
                    case .quotes:
                        savedQuotesList
                    case .messages:
                        bookmarkedMessagesList
                    }
                }
            }
            .navigationTitle("Library")
            .task {
                await vm.load()
            }
            .refreshable {
                await vm.load()
            }
        }
    }

    // MARK: - Saved Quotes List

    private var savedQuotesList: some View {
        Group {
            if vm.savedQuotes.isEmpty {
                emptyState(
                    icon: "bookmark",
                    title: "No saved quotes",
                    subtitle: "Save quotes from the home screen to find them here."
                )
            } else {
                List {
                    ForEach(vm.savedQuotes) { quote in
                        VStack(alignment: .leading, spacing: 8) {
                            Text("\"\(quote.text)\"")
                                .font(.body)
                                .italic()

                            Text("— \(quote.author)")
                                .font(.caption)
                                .foregroundStyle(.secondary)

                            if !quote.tags.isEmpty {
                                HStack(spacing: 4) {
                                    ForEach(quote.tags, id: \.self) { tag in
                                        Text(tag)
                                            .font(.caption2)
                                            .padding(.horizontal, 6)
                                            .padding(.vertical, 2)
                                            .background(Color.blue.opacity(0.1))
                                            .clipShape(Capsule())
                                    }
                                }
                            }
                        }
                        .padding(.vertical, 4)
                        .swipeActions(edge: .trailing) {
                            Button(role: .destructive) {
                                Task { await vm.removeQuote(quote) }
                            } label: {
                                Label("Remove", systemImage: "bookmark.slash")
                            }
                        }
                    }
                }
                .listStyle(.plain)
            }
        }
    }

    // MARK: - Bookmarked Messages List

    private var bookmarkedMessagesList: some View {
        Group {
            if vm.bookmarkedMessages.isEmpty {
                emptyState(
                    icon: "text.bookmark",
                    title: "No bookmarked messages",
                    subtitle: "Bookmark chat messages to save them here."
                )
            } else {
                List {
                    ForEach(vm.bookmarkedMessages) { message in
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                Image(systemName: message.mode.icon)
                                    .font(.caption)
                                    .foregroundStyle(.blue)
                                Text(message.mode.displayName)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                Spacer()
                                Text(message.createdAt, style: .date)
                                    .font(.caption2)
                                    .foregroundStyle(.tertiary)
                            }

                            Text(message.content)
                                .font(.body)
                                .lineLimit(6)
                        }
                        .padding(.vertical, 4)
                        .swipeActions(edge: .trailing) {
                            Button(role: .destructive) {
                                Task { await vm.removeBookmark(message) }
                            } label: {
                                Label("Unbookmark", systemImage: "bookmark.slash")
                            }
                        }
                    }
                }
                .listStyle(.plain)
            }
        }
    }

    private func emptyState(icon: String, title: String, subtitle: String) -> some View {
        VStack(spacing: 12) {
            Spacer()
            Image(systemName: icon)
                .font(.system(size: 40))
                .foregroundStyle(.tertiary)
            Text(title)
                .font(.headline)
                .foregroundStyle(.secondary)
            Text(subtitle)
                .font(.subheadline)
                .foregroundStyle(.tertiary)
                .multilineTextAlignment(.center)
            Spacer()
        }
        .padding()
    }
}
