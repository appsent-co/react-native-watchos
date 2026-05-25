import Foundation

/// Typed accessors over bridged `[String: Any]` dicts. Booleans must
/// route through `NSNumber.boolValue` or `true` silently becomes `1.0`.
extension Dictionary where Key == String, Value == Any {
    func string(_ key: String) -> String? {
        self[key] as? String
    }

    func double(_ key: String) -> Double? {
        (self[key] as? NSNumber)?.doubleValue
    }

    func cgFloat(_ key: String) -> CGFloat? {
        (self[key] as? NSNumber).map { CGFloat($0.doubleValue) }
    }

    func bool(_ key: String) -> Bool? {
        (self[key] as? NSNumber)?.boolValue
    }

    func int(_ key: String) -> Int? {
        (self[key] as? NSNumber)?.intValue
    }
}
