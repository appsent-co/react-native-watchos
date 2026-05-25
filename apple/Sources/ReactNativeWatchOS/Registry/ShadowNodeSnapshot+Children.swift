import ReactNativeWatchOSCxx

extension RNWShadowNodeSnapshot {
    /// Children excluding `__ModifierContent` (sheet/overlay/toolbar
    /// bodies). Builders that walk children directly (Section, TabView,
    /// LabeledContent, …) must use this so modifier content doesn't leak
    /// into their layout — it's pulled on demand via `ctx.content(_:)`.
    public var viewChildren: [RNWShadowNodeSnapshot] {
        children.filter { $0.viewName != "__ModifierContent" }
    }
}
