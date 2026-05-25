import SwiftUI
import WatchKit

/// SwiftUI `.textContentType(_:)`. On watchOS this takes a `WKTextContentType`
/// (from WatchKit), hinting the system about the field's semantic content for
/// autofill / QuickType. The modifier overload is watchOS 6+, well under the
/// deployment target.
///
/// LIMITED: watchOS does not expose the full `UITextContentType` surface, so
/// only the broadly-available cases below are mapped. An unrecognized `type`
/// leaves the view unchanged. Every mapped case exists at the watchOS 9
/// deployment target.
enum RNWTextContentTypeModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("textContentType") { view, params, _ in
            guard let type = parse(params.string("type")) else { return view }
            return AnyView(view.textContentType(type))
        }
    }

    private static func parse(_ s: String?) -> WKTextContentType? {
        switch s {
        case "username":        return .username
        case "password":        return .password
        case "newPassword":     return .newPassword
        case "oneTimeCode":     return .oneTimeCode
        case "emailAddress":    return .emailAddress
        case "telephoneNumber": return .telephoneNumber
        case "name":            return .name
        case "URL":             return .URL
        default:                return nil
        }
    }
}
