import { createNativeView } from '../createNativeView';

export interface FormProps {}

/// SwiftUI `Form`. Container for settings/data-entry screens. Children
/// render as grouped, scrolling rows — typically wrap them in `<Section>`
/// with `<Toggle>` / `<Slider>` / text controls inside.
export const Form = createNativeView<FormProps>('Form');
