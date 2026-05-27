// No-op stub for `<cxxreact/TraceSection.h>` — we don't ship FBSystrace.

#pragma once

namespace facebook::react {

class TraceSection {
 public:
  template <typename... Args>
  explicit TraceSection(Args&&...) noexcept {}
};

}  // namespace facebook::react
