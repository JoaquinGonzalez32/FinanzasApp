import WidgetKit
import SwiftUI

// MARK: - Summary Widget (small + medium)

struct SummaryWidget: Widget {
    let kind = "SummaryWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: FinanceTimelineProvider()) { entry in
            SummaryWidgetView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Resumen del mes")
        .description("Gasto mensual, presupuesto y ritmo de gasto")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// MARK: - Quick Add Widget (medium only)

struct QuickAddWidget: Widget {
    let kind = "QuickAddWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: FinanceTimelineProvider()) { entry in
            QuickAddWidgetView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Registro rapido")
        .description("Registra gastos con tus categorias mas usadas")
        .supportedFamilies([.systemMedium])
    }
}

// MARK: - Last Transaction Widget (small only)

struct LastTransactionWidget: Widget {
    let kind = "LastTransactionWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: FinanceTimelineProvider()) { entry in
            LastTransactionView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Ultimo movimiento")
        .description("Tu ultimo gasto o ingreso registrado")
        .supportedFamilies([.systemSmall])
    }
}

// MARK: - Widget Bundle

@main
struct FinanzaWidgetBundle: WidgetBundle {
    var body: some Widget {
        SummaryWidget()
        QuickAddWidget()
        LastTransactionWidget()
    }
}
