import ExpoModulesCore

public final class FixtureExpoModule: Module {
  public func definition() -> ModuleDefinition {
    Name("RNWFixtureExpoModule")

    Function("answer") {
      42
    }

    AsyncFunction("echo") { (value: String) -> String in
      value
    }
  }
}
