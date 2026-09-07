import ExpoModulesCore

public final class FixtureExpoModule: Module {
  public func definition() -> ModuleDefinition {
    Name("RNWFixtureExpoModule")

    Function("answer") {
      42
    }

    Function("legacyServices") { [weak self] () -> Bool in
      guard let context = self?.appContext, let fileSystem = context.fileSystem else { return false }
      let resolved: FileSystemManager? = context.legacyModule(implementing: EXFileSystemInterface.self)
      return resolved === fileSystem && context.permissions != nil
    }

    AsyncFunction("echo") { (value: String) -> String in
      value
    }
  }
}
