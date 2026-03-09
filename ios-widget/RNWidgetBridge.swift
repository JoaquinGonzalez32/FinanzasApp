import Foundation
import WidgetKit
import React

/// Native module bridge: React Native → iOS widgets via App Groups UserDefaults
@objc(RNWidgetBridge)
class RNWidgetBridge: NSObject {

    static let appGroupId = "group.com.joacobaffe.finanzasapp"
    static let dataKey = "widget_data_json"

    @objc
    func updateWidgetData(_ json: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        guard let defaults = UserDefaults(suiteName: RNWidgetBridge.appGroupId) else {
            reject("APP_GROUP_ERROR", "Could not access App Group UserDefaults", nil)
            return
        }
        defaults.set(json, forKey: RNWidgetBridge.dataKey)
        defaults.synchronize()
        resolve(nil)
    }

    @objc
    func reloadWidgets(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
        resolve(nil)
    }

    @objc
    func getInstalledWidgets(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.getCurrentConfigurations { result in
                switch result {
                case .success(let widgets):
                    let kinds = widgets.map { $0.kind }
                    let result: [String: Bool] = [
                        "quickAdd": kinds.contains("QuickAddWidget"),
                        "summary": kinds.contains("SummaryWidget"),
                        "lastTransaction": kinds.contains("LastTransactionWidget")
                    ]
                    resolve(result)
                case .failure:
                    resolve(["quickAdd": false, "summary": false, "lastTransaction": false])
                }
            }
        } else {
            resolve(["quickAdd": false, "summary": false, "lastTransaction": false])
        }
    }

    @objc
    static func requiresMainQueueSetup() -> Bool { return false }
}
