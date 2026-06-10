let scene;
let camera;
let renderer;
let controls;

const DEFAULT_CAMERA_POSITION = {
  x: 5,
  y: 5,
  z: 8
};

const DEFAULT_CAMERA_TARGET = {
  x: 0,
  y: 0,
  z: 0
};

let cadSceneInitialized = false;

function initCADScene() {
  if (cadSceneInitialized) {
    return;
  }

  const canvas = document.getElementById("cadCanvas");

  if (!canvas) {
    console.error("CAD canvas not found.");
    return;
  }

  if (typeof THREE === "undefined") {
    console.error("Three.js is not loaded.");
    return;
  }

  cadSceneInitialized = true;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x090b15);

  const width = canvas.clientWidth || canvas.parentElement.clientWidth || window.innerWidth;
  const height = canvas.clientHeight || canvas.parentElement.clientHeight || window.innerHeight;

  camera = new THREE.PerspectiveCamera(
    60,
    width / height,
    0.1,
    1000
  );

  camera.position.set(
    DEFAULT_CAMERA_POSITION.x,
    DEFAULT_CAMERA_POSITION.y,
    DEFAULT_CAMERA_POSITION.z
  );

  renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true
  });

  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio || 1);

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = true;
  controls.screenSpacePanning = true;
  controls.panSpeed = 1.0;

  controls.target.set(
    DEFAULT_CAMERA_TARGET.x,
    DEFAULT_CAMERA_TARGET.y,
    DEFAULT_CAMERA_TARGET.z
  );

  controls.update();

  addDefaultLights();
  addDefaultGrid();

  window.cadObjects = window.cadObjects || [];

  window.CADWorkspace = {
    scene: scene,
    camera: camera,
    renderer: renderer,
    controls: controls
  };

  window.scene = scene;
  window.camera = camera;
  window.renderer = renderer;
  window.controls = controls;

  window.dispatchEvent(new Event("cad:ready"));

  animateCADScene();

  const statusText = document.getElementById("cadStatusText");
  if (statusText && statusText.textContent.includes("not ready")) {
    statusText.textContent = "CAD scene ready.";
  }
}

function addDefaultLights() {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
  ambientLight.name = "DefaultAmbientLight";
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
  directionalLight.name = "DefaultDirectionalLight";
  directionalLight.position.set(6, 10, 6);
  scene.add(directionalLight);
}

function addDefaultGrid() {
  const existingGrid = scene.getObjectByName("CADGridHelper");

  if (existingGrid) {
    return;
  }

  const grid = new THREE.GridHelper(40, 40, 0x1f2937, 0x111827);
  grid.name = "CADGridHelper";
  grid.visible = true;

  scene.add(grid);

  window.gridHelper = grid;
}

function animateCADScene() {
  requestAnimationFrame(animateCADScene);

  if (controls) {
    controls.update();
  }

  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

function resizeCADScene() {
  const canvas = document.getElementById("cadCanvas");

  if (!canvas || !camera || !renderer) {
    return;
  }

  const width = canvas.clientWidth || canvas.parentElement.clientWidth;
  const height = canvas.clientHeight || canvas.parentElement.clientHeight;

  if (!width || !height) {
    return;
  }

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
}

function resetCADCameraView() {
  if (!camera || !controls) {
    return false;
  }

  camera.position.set(
    DEFAULT_CAMERA_POSITION.x,
    DEFAULT_CAMERA_POSITION.y,
    DEFAULT_CAMERA_POSITION.z
  );

  camera.zoom = 1;
  camera.updateProjectionMatrix();

  controls.target.set(
    DEFAULT_CAMERA_TARGET.x,
    DEFAULT_CAMERA_TARGET.y,
    DEFAULT_CAMERA_TARGET.z
  );

  controls.update();

  return true;
}

function isCADSceneReady() {
  return !!(scene && camera && renderer && controls);
}

function getCADScene() {
  return scene || null;
}

function getCADCamera() {
  return camera || null;
}

function getCADRenderer() {
  return renderer || null;
}

function getCADControls() {
  return controls || null;
}

window.initCADScene = initCADScene;
window.resizeCADScene = resizeCADScene;
window.resetCADCameraView = resetCADCameraView;
window.isCADSceneReady = isCADSceneReady;

window.getCADScene = getCADScene;
window.getCADCamera = getCADCamera;
window.getCADRenderer = getCADRenderer;
window.getCADControls = getCADControls;

window.addEventListener("resize", resizeCADScene);
document.addEventListener("DOMContentLoaded", initCADScene);