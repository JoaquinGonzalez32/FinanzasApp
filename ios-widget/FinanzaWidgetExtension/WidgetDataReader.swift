import Foundation

/// Reads WidgetData from App Groups shared UserDefaults.
/// React Native writes JSON via the bridge module; widgets read it here.
struct WidgetDataReader {

    static let appGroupId = "group.com.joacobaffe.finanzasapp"
    static let dataKey = "widget_data_json"

    struct WidgetData: Codable {
        let monthlyBudget: Double
        let monthlySpent: Double
        let dailySpent: Double
        let daysRemaining: Int
        let monthlyIncome: Double
        let topCategories: [CategorySummary]
        let frequentCategories: [CategoryQuick]
        let lastTransaction: LastTransaction?
        let defaultAccountId: String?
        let currency: String
        let updatedAt: String
    }

    struct CategorySummary: Codable {
        let id: String
        let name: String
        let icon: String
        let color: String
        let spent: Double
        let budget: Double
    }

    struct CategoryQuick: Codable {
        let id: String
        let name: String
        let icon: String
        let color: String
        let accountId: String?
    }

    struct LastTransaction: Codable {
        let categoryName: String
        let categoryIcon: String
        let amount: Double
        let description: String?
        let time: String
        let type: String // "expense" | "income"
    }

    static func load() -> WidgetData? {
        guard let defaults = UserDefaults(suiteName: appGroupId),
              let jsonString = defaults.string(forKey: dataKey),
              let jsonData = jsonString.data(using: .utf8) else {
            return nil
        }

        return try? JSONDecoder().decode(WidgetData.self, from: jsonData)
    }

    static func currencySymbol(for currency: String) -> String {
        switch currency {
        case "USD": return "US$"
        case "EUR": return "€"
        default: return "$U"
        }
    }

    static func formatAmount(_ amount: Double, currency: String) -> String {
        let symbol = currencySymbol(for: currency)
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.maximumFractionDigits = 0
        formatter.groupingSeparator = ","
        let formatted = formatter.string(from: NSNumber(value: amount)) ?? "\(Int(amount))"
        return "\(symbol)\(formatted)"
    }
}
