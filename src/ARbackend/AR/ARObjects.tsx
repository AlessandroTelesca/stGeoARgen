import React from "react";

interface ARObjectsProps {
  targetIndex: number;
}

const ARObjects: React.FC<ARObjectsProps> = ({ targetIndex }) => {
  return (
    <a-entity mindar-image-target={`targetIndex: ${targetIndex}`}>
      <a-plane
        src="#card"
        position="0 0 0"
        height="0.552"
        width="1"
        rotation="0 0 0"
      />
      <a-gltf-model
        src="#avatarModel"
        position="0 0 0.1"
        rotation="0 0 0"
        scale="0.005 0.005 0.005"
        animation="property: position; to: 0 0.1 0.1; dur: 1000; easing: easeInOutQuad; loop: true; dir: alternate"
      />
    </a-entity>
  );
};

export default ARObjects;