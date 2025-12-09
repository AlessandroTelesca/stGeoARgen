import "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "a-scene": any;
      "a-assets": any;
      "a-entity": any;
      "a-plane": any;
      "a-camera": any;
      "a-asset-item":any;
      "a-gltf-model": any;
      // optional weitere A-Frame Tags hinzufügen
    }
  }
}