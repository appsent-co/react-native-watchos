import ExpoModulesCore

public final class ExampleExpoModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExampleExpoModule")

    Function("hello") {
      "Hello from Expo Modules!"
    }

    AsyncFunction("echo") { (message: String) -> String in
      message
    }
  }
}
