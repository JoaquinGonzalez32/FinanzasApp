import SwiftUI
import WidgetKit

/// Quick-add widget (medium 4x2) — shows frequent categories for 2-tap expense recording
struct QuickAddWidgetView: View {
    let entry: FinanceEntry

    var body: some View {
        Group {
            if let data = entry.data, !data.frequentCategories.isEmpty {
                dataView(data)
            } else {
                emptyView
            }
        }
    }

    @ViewBuilder
    private func dataView(_ data: WidgetDataReader.WidgetData) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            // Header
            HStack {
                Text("Registro rapido")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.primary)
                Spacer()
                Text("Hoy: \(WidgetDataReader.formatAmount(data.dailySpent, currency: data.currency))")
                    .font(.system(size: 11))
                    .foregroundColor(.secondary)
            }

            // Category buttons
            HStack(spacing: 0) {
                ForEach(Array(data.frequentCategories.prefix(5).enumerated()), id: \.element.id) { index, cat in
                    let accountId = cat.accountId ?? data.defaultAccountId ?? ""
                    Link(destination: URL(string: "finanzasapp://add?category=\(cat.id)&account=\(accountId)")!) {
                        VStack(spacing: 3) {
                            ZStack {
                                Circle()
                                    .fill(categoryColor(cat.color))
                                    .frame(width: 44, height: 44)
                                // Use first letter as icon (SF Symbols don't map to MaterialIcons)
                                Text(String(cat.name.prefix(1)).uppercased())
                                    .font(.system(size: 18, weight: .bold))
                                    .foregroundColor(.white)
                            }
                            Text(cat.name)
                                .font(.system(size: 10))
                                .foregroundColor(.secondary)
                                .lineLimit(1)
                        }
                    }
                    .frame(maxWidth: .infinity)
                }
            }
        }
        .padding(12)
    }

    private var emptyView: some View {
        VStack(spacing: 8) {
            Image(systemName: "plus.circle.fill")
                .font(.system(size: 28))
                .foregroundColor(.blue)
            Text("Registro rapido")
                .font(.system(size: 14, weight: .semibold))
            Text("Abri la app para configurar categorias")
                .font(.system(size: 11))
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
        .widgetURL(URL(string: "finanzasapp://home"))
    }

    private func categoryColor(_ colorName: String) -> Color {
        switch colorName {
        case "orange":  return Color(.systemOrange)
        case "blue":    return Color(.systemBlue)
        case "green":   return Color(.systemGreen)
        case "purple":  return Color(.systemPurple)
        case "emerald": return Color(red: 0.063, green: 0.725, blue: 0.506)
        case "rose":    return Color(red: 0.957, green: 0.247, blue: 0.369)
        case "red":     return Color(.systemRed)
        case "primary": return Color(red: 0.075, green: 0.498, blue: 0.925)
        default:        return Color(.systemGray)
        }
    }
}
