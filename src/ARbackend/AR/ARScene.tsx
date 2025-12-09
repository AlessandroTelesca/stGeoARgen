import React from "react";
import "aframe";
import "mind-ar/dist/mindar-image-aframe.prod.js";
import ARAssets from "./ARAssets";
import ARObjects from "./ARObjects";
import { markerNames } from "./markers.ts";

interface ARSceneProps {
  markerName: string;
}

const ARScene: React.FC<ARSceneProps> = ({ markerName }) => {
  const targetIndex = Number(
    Object.keys(markerNames).find(
      (key) => markerNames[Number(key)] === markerName
    )
  );

  if (isNaN(targetIndex)) {
    console.warn(`Marker "${markerName}" nicht gefunden!`);
    return null;
  }

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <a-scene
        mindar-image="imageTargetSrc: ./targets.mind; showStats: true;"
        color-space="sRGB"
        renderer="colorManagement: true, physicallyCorrectLights"
        vr-mode-ui="enabled: false"
        device-orientation-permission-ui="enabled: false"
        style={{ width: "100%", height: "100%" }}
      >
        <ARAssets />
        <a-camera position="0 0 0" look-controls="enabled: false" />
        <ARObjects targetIndex={targetIndex} />
      </a-scene>
    </div>
  );
};

export default ARScene;
