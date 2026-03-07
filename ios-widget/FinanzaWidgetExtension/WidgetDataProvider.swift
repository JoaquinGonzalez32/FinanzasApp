import WidgetKit
import SwiftUI

/// Timeline entry containing a snapshot of financial data
struct FinanceEntry: TimelineEntry {
    let date: Date
    let data: WidgetDataReader.WidgetData?
}

/// Provides timeline entries for all FinanzaApp widgets
struct FinanceTimelineProvider: TimelineProvider {

    func placeholder(in context: Context) -> FinanceEntry {
        FinanceEntry(date: Date(), data: nil)
    }

    func getSnapshot(in context: Context, completion: @escaping (FinanceEntry) -> Void) {
        let data = WidgetDataReader.load()
        completion(FinanceEntry(date: Date(), data: data))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<FinanceEntry>) -> Void) {
        let data = WidgetDataReader.load()
        let entry = FinanceEntry(date: Date(), data: data)

        // Refresh every 30 minutes
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }
}
