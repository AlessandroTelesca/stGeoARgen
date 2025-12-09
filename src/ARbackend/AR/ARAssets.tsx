import React from "react";

const ARAssets: React.FC = () => {
  return (
    <a-assets>
      <img
        id="card"
        src="https://cdn.jsdelivr.net/gh/hiukim/mind-ar-js@1.2.5/examples/image-tracking/assets/card-example/card.png"
        alt=""
      />
      <a-asset-item
        id="avatarModel"
        src="https://cdn.jsdelivr.net/gh/hiukim/mind-ar-js@1.2.5/examples/image-tracking/assets/card-example/softmind/scene.gltf"
      />
    </a-assets>
  );
};

export default ARAssets;