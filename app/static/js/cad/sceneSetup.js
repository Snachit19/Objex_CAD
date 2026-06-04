let scene;
let camera;
let renderer;
let controls;

function initCADScene() {
  const canvas = document.getElementById("cadCanvas");

  if (!canvas) {
    console.error("CAD canvas not found.");
    return;
  }

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x090b15);

  camera = new THREE.PerspectiveCamera(
    60,
    canvas.clientWidth / canvas.clientHeight,
    0.1,
    1000
  );

  camera.position.set(5, 5, 8);

  renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true
  });

  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  const grid = new THREE.GridHelper(40, 40, 0x1f2937, 0x111827);
  scene.add(grid);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
  directionalLight.position.set(6, 10, 6);
  scene.add(directionalLight);

  window.cadObjects = window.cadObjects || [];

  window.CADWorkspace = {
    scene: scene,
    camera: camera,
    renderer: renderer,
    controls: controls
  };

  window.dispatchEvent(new Event("cad:ready"));

  animateCADScene();
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

  if (!camera || !renderer || !canvas) {
    return;
  }

  camera.aspect = canvas.clientWidth / canvas.clientHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
}

window.addEventListener("resize", resizeCADScene);
document.addEventListener("DOMContentLoaded", initCADScene);