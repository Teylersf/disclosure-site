// Type declarations for exifr's deep import paths.
// The package only ships types for the main entry; the lite/mini bundles
// share the same default export shape, so we just re-export it.
declare module "exifr/dist/lite.esm.mjs" {
  export { default } from "exifr";
}
declare module "exifr/dist/mini.esm.mjs" {
  export { default } from "exifr";
}
