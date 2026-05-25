#!/bin/bash
# Patch Hermes source to support watchOS by adding guards similar to tvOS

set -e

HERMES_SOURCE_DIR="$1"

if [ -z "$HERMES_SOURCE_DIR" ]; then
  echo "Usage: $0 <hermes_source_dir>"
  exit 1
fi

echo "Patching Hermes for watchOS compatibility..."

# Patch 1: Program.inc - Add watchOS to the tvOS guard for fork/exec
PROGRAM_INC="$HERMES_SOURCE_DIR/external/llvh/lib/Support/Unix/Program.inc"
if [ -f "$PROGRAM_INC" ] && ! grep -q "TARGET_OS_WATCH" "$PROGRAM_INC"; then
  echo "Patching $PROGRAM_INC..."
  sed -i.bak 's/#if defined(TARGET_OS_TV) && TARGET_OS_TV/#if (defined(TARGET_OS_TV) \&\& TARGET_OS_TV) || (defined(TARGET_OS_WATCH) \&\& TARGET_OS_WATCH)/g' "$PROGRAM_INC"
  echo "  ✓ Added watchOS guard to fork/exec check"
fi

# Patch 2: Process.inc - Add watchOS to the tvOS guard for Mach exception ports
PROCESS_INC="$HERMES_SOURCE_DIR/external/llvh/lib/Support/Unix/Process.inc"
if [ -f "$PROCESS_INC" ] && ! grep -q "TARGET_OS_WATCH" "$PROCESS_INC"; then
  echo "Patching $PROCESS_INC..."
  # The line is: #if defined(HAVE_MACH_MACH_H) && !defined(__GNU__) && !(defined(TARGET_OS_TV) && TARGET_OS_TV)
  # Replace with: #if defined(HAVE_MACH_MACH_H) && !defined(__GNU__) && !((defined(TARGET_OS_TV) && TARGET_OS_TV) || (defined(TARGET_OS_WATCH) && TARGET_OS_WATCH))
  sed -i.bak 's/\&\& !(defined(TARGET_OS_TV) \&\& TARGET_OS_TV)/\&\& !((defined(TARGET_OS_TV) \&\& TARGET_OS_TV) || (defined(TARGET_OS_WATCH) \&\& TARGET_OS_WATCH))/g' "$PROCESS_INC"
  echo "  ✓ Added watchOS guard to Mach exception ports check"
fi

# Patch 3: API/hermes/CMakeLists.txt — Hermes 0.16+ renamed the framework
# target from `libhermes` to `hermesvm`, which produces hermesvm.framework.
# Hermes's own public headers (hermes.h, SynthTrace.h, etc.) use absolute
# `#include <hermes/Public/HermesExport.h>` style internal includes, which
# clang resolves via framework search paths to a framework literally named
# `hermes`. With the framework named `hermesvm`, those internal includes
# fail to resolve. Force OUTPUT_NAME=hermes so the produced framework is
# named `hermes.framework` regardless of the CMake target name.
API_HERMES_CMAKE="$HERMES_SOURCE_DIR/API/hermes/CMakeLists.txt"
if [ -f "$API_HERMES_CMAKE" ] && ! grep -q "OUTPUT_NAME hermes" "$API_HERMES_CMAKE"; then
  echo "Patching $API_HERMES_CMAKE..."
  sed -i.bak '/^add_library(hermesvm /a\
set_target_properties(hermesvm PROPERTIES OUTPUT_NAME hermes)
' "$API_HERMES_CMAKE"
  echo "  ✓ Set OUTPUT_NAME=hermes (produces hermes.framework, matches"
  echo "    Hermes's internal #include <hermes/...> framework references)"
fi

echo "Hermes patched successfully for watchOS!"
