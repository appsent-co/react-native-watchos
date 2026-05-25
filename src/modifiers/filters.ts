// "Filters & effects" modifiers.
//
// `visualEffect` is intentionally omitted: SwiftUI's
// `.visualEffect { content, proxy in … }` takes a closure that mutates
// the content using live `GeometryProxy` values, which has no static
// JSON equivalent the bridge can express.
export { blur, type BlurParams } from './blur';
export { brightness } from './brightness';
export { contrast } from './contrast';
export { saturation } from './saturation';
export { grayscale } from './grayscale';
export { hueRotation, type HueRotationParams } from './hueRotation';
export { colorInvert } from './colorInvert';
export { colorMultiply } from './colorMultiply';
export { blendMode, type BlendModeValue } from './blendMode';
export { luminanceToAlpha } from './luminanceToAlpha';
export { compositingGroup } from './compositingGroup';
export { drawingGroup, type DrawingGroupParams } from './drawingGroup';
export { geometryGroup } from './geometryGroup';
