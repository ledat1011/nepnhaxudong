// The page metadata of this segment sets its own openGraph, which hides the image of the parent
// segment. Re-export it so every page has the same image.
export { default, generateImageMetadata } from "../opengraph-image";
