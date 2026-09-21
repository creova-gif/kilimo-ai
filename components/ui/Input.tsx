/**
 * Back-compat entry point. `Input` is now the Figma-styled `TextField`
 * (flat field, 14 SemiBold label, hint/error, disabled state). Existing
 * `<Input label error leftIcon rightIcon style />` call sites keep working.
 */
export { TextField as Input } from './TextField';
export type { TextFieldProps as InputProps } from './TextField';
