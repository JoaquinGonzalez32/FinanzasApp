import SwiftUI
import WidgetKit

/// Small widget (2x2) showing the last recorded transaction
struct LastTransactionView: View {
    let entry: FinanceEntry

    var body: some View {
        Group {
            if let data = entry.data, let tx = data.lastTransaction {
                dataView(tx, currency: data.currency)
            } else {
                emptyView
            }
        }
        .widgetURL(URL(string: "finanzasapp://transactions"))
    }

    @ViewBuilder
    private func dataView(_ tx: WidgetDataReader.LastTransaction, currency: String) -> some View {
        let sign = tx.type == "expense" ? "-" : "+"
        let amountColor: Color = tx.type == "expense"
            ? Color(.systemRed)
            : Color(red: 0.063, green: 0.725, blue: 0.506)

        VStack(alignment: .leading, spacing: 3) {
            Text(tx.categoryName)
                .font(.system(size: 13, weight: .bold))
                .foregroundColor(.primary)
                .lineLimit(1)

            Text("\(sign)\(WidgetDataReader.formatAmount(tx.amount, currency: currency))")
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(amountColor)

            if let desc = tx.description, !desc.isEmpty {
                Text(desc)
                    .font(.system(size: 11))
                    .foregroundColor(.secondary)
                    .lineLimit(1)
            }

            Text(formatTime(tx.time))
                .font(.system(size: 10))
                .foregroundColor(Color(.tertiaryLabel))
        }
        .padding(12)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }

    private var emptyView: some View {
        VStack(spacing: 6) {
            Image(systemName: "arrow.left.arrow.right")
                .font(.system(size: 22))
                .foregroundColor(.blue)
            Text("Sin movimientos")
                .font(.system(size: 12, weight: .semibold))
            Text("Registra tu primer gasto")
                .font(.system(size: 10))
                .foregroundColor(.secondary)
        }
        .padding()
    }

    private func formatTime(_ isoString: String) -> String {
        let isoFormatter = ISO8601DateFormatter()
        isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

        // Try with fractional seconds first, then without
        guard let date = isoFormatter.date(from: isoString)
            ?? ISO8601DateFormatter().date(from: String(isoString.prefix(19)) + "Z") else {
            return ""
        }

        let formatter = DateFormatter()
        formatter.dateFormat = "h:mm a"
        formatter.locale = Locale(identifier: "es_UY")
        return formatter.string(from: date)
    }
}
