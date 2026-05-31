function getWorkspace() {
  return window.CADWorkspace;
}

function createMaterial(color) {
  return new THREE.MeshStandardMaterial({
    color: color,
    roughness: 0.45,
    metalness: 0.15
  });
}

function randomPosition() {
  return {
    x: Math.random() * 4 - 2,
    y: 1,
    z: Math.random() * 4 - 2
  };
}

function registerShape(mesh, type) {
  const workspace = getWorkspace();

  if (!workspace || !workspace.scene) {
    console.error("CAD workspace is not ready.");
    return;
  }

  window.cadObjects = window.cadObjects || [];

  const position = randomPosition();
  mesh.position.set(position.x, position.y, position.z);

  mesh.name = `${type}-${window.cadObjects.length + 1}`;

  mesh.userData = {
    id: `obj-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    type: type,
    selectable: true
  };

  workspace.scene.add(mesh);
  window.cadObjects.push(mesh);
}

function addShape(type) {
  let geometry = null;
  let material = null;

  if (type === "cube") {
    geometry = new THREE.BoxGeometry(1.4, 1.4, 1.4);
    material = createMaterial(0x3b82f6);
  }

  if (type === "sphere") {
    geometry = new THREE.SphereGeometry(0.8, 32, 32);
    material = createMaterial(0xef4444);
  }

  if (type === "cylinder") {
    geometry = new THREE.CylinderGeometry(0.7, 0.7, 1.6, 32);
    material = createMaterial(0x22c55e);
  }

  if (type === "cone") {
    geometry = new THREE.ConeGeometry(0.8, 1.7, 32);
    material = createMaterial(0xf97316);
  }

  if (type === "torus") {
    geometry = new THREE.TorusGeometry(0.75, 0.25, 16, 80);
    material = createMaterial(0x60a5fa);
  }

  if (type === "pyramid") {
    geometry = new THREE.ConeGeometry(0.9, 1.6, 4);
    material = createMaterial(0x22c55e);
  }

  if (type === "plane") {
    geometry = new THREE.BoxGeometry(2.2, 0.08, 1.4);
    material = createMaterial(0xf59e0b);
  }

  if (!geometry || !material) {
    return;
  }

  const mesh = new THREE.Mesh(geometry, material);
  registerShape(mesh, type);
}

document.addEventListener("DOMContentLoaded", () => {
  const addShapeBtn = document.getElementById("addShapeBtn");
  const shapeMenuOptions = document.getElementById("shapeMenuOptions");

  if (!addShapeBtn || !shapeMenuOptions) {
    console.error("Add Shape button or menu not found.");
    return;
  }

  addShapeBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    shapeMenuOptions.classList.toggle("show");
  });

  shapeMenuOptions.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();

      const shapeType = button.getAttribute("data-shape");
      addShape(shapeType);

      shapeMenuOptions.classList.remove("show");
    });
  });

  document.addEventListener("click", () => {
    shapeMenuOptions.classList.remove("show");
  });
});