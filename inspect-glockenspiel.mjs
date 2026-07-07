import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
const url = new URL('./src/components/ARComponents/glockenspiel/models/glockenturm.glb', import.meta.url).href;

loader.load(url, (gltf) => {
  const names = [];
  gltf.scene.traverse((child) => {
    if (child.isMesh) {
      names.push(child.name || child.type);
    }
  });
  const unique = [...new Set(names)];
  console.log(unique.slice(0, 200));
}, undefined, (err) => {
  console.error(err);
  process.exit(1);
});
