// Tells `react-native config` (used by RN's iOS autolinker AND this
// package's `use_watchos_modules!`) where to find the podspec for the
// WatchConnectivity module. Both autolinkers walk the same dependency
// graph; the podspec's `:ios` / `:watchos` platform declarations
// determine which targets it gets compiled into.

const path = require('path');

module.exports = {
  dependency: {
    platforms: {
      ios: {
        podspecPath: path.join(__dirname, 'RNWatchConnectivity.podspec'),
      },
    },
  },
};
