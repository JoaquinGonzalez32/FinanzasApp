import SwiftUI
import WidgetKit

/// Monthly summary widget — available in small (2x2) and medium (4x2) sizes
struct SummaryWidgetView: View {
    let entry: FinanceEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        Group {
            if let data = entry.data {
                dataView(data)
            } else {
                emptyView
            }
        }
        .widgetURL(URL(string: "finanzasapp://budget"))
    }

    @ViewBuilder
    private func dataView(_ data: WidgetDataReader.WidgetData) -> some View {
        let symbol = WidgetDataReader.currencySymbol(for: data.currency)
        let pct = data.monthlyBudget > 0
            ? min(data.monthlySpent / data.monthlyBudget, 1.0)
            : 0.0
        let pctInt = Int(pct * 100)
        let pace = paceLabel(pct)

        VStack(alignment: .leading, spacing: 4) {
            Text("Gasto del mes")
                .font(.system(size: 12))
                .foregroundColor(.secondary)

            Text(WidgetDataReader.formatAmount(data.monthlySpent, currency: data.currency))
                .font(.system(size: family == .systemSmall ? 20 : 24, weight: .bold))
                .foregroundColor(.primary)

            // Progress bar
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 3)
                        .fill(Color(.systemGray5))
                        .frame(height: 6)
                    RoundedRectangle(cornerRadius: 3)
                        .fill(progressColor(pct))
                        .frame(width: geo.size.width * pct, height: 6)
                }
            }
            .frame(height: 6)

            Text("\(pace) · \(pctInt)%")
                .font(.system(size: 11))
                .foregroundColor(.secondary)

            if family == .systemMedium {
                Spacer().frame(height: 4)
                mediumDetails(data, symbol: symbol)
            }
        }
        .padding(12)
    }

    @ViewBuilder
    private func mediumDetails(_ data: WidgetDataReader.WidgetData, symbol: String) -> some View {
        let available = max(data.monthlyBudget - data.monthlySpent, 0)
        let dayOfMonth = Calendar.current.component(.day, from: Date())
        let dailyAvg = dayOfMonth > 0 ? data.monthlySpent / Double(dayOfMonth) : 0

        HStack(spacing: 16) {
            VStack(alignment: .leading, spacing: 2) {
                Text("Disponible")
                    .font(.system(size: 10))
                    .foregroundColor(.secondary)
                Text(WidgetDataReader.formatAmount(available, currency: data.currency))
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(Color(red: 0.063, green: 0.725, blue: 0.506)) // emerald
            }
            VStack(alignment: .leading, spacing: 2) {
                Text("Prom/dia")
                    .font(.system(size: 10))
                    .foregroundColor(.secondary)
                Text(WidgetDataReader.formatAmount(dailyAvg, currency: data.currency))
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.primary)
            }
            VStack(alignment: .leading, spacing: 2) {
                Text("Dias rest.")
                    .font(.system(size: 10))
                    .foregroundColor(.secondary)
                Text("\(data.daysRemaining)")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.primary)
            }
        }
    }

    private var emptyView: some View {
        VStack(spacing: 8) {
            Image(systemName: "chart.bar.fill")
                .font(.system(size: 28))
                .foregroundColor(.blue)
            Text("FinanzaApp")
                .font(.system(size: 14, weight: .semibold))
            Text("Abri la app para comenzar")
                .font(.system(size: 11))
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
    }

    private func paceLabel(_ pct: Double) -> String {
        if pct >= 1.0 { return "Excedido" }
        if pct >= 0.8 { return "Cuidado" }
        return "En ritmo"
    }

    private func progressColor(_ pct: Double) -> Color {
        if pct >= 1.0 { return Color(.systemRed) }
        if pct >= 0.8 { return Color(.systemOrange) }
        return Color(red: 0.075, green: 0.498, blue: 0.925) // primary #137fec
    }
}
