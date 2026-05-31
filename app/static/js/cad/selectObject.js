let selectedObject = null;
let selectionBox = null;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

let pointerStart = {
  x: 0,
  y: 0
};

function getSelectionWorkspace() {
  return window.CADWorkspace;
}

function getSelectableRoot(object) {
  let current = object;

  while (current) {
    if (current.userData && current.userData.selectable) {
      return current;
    }

    current = current.parent;
  }

  return null;
}

function updateSelectedObjectPanel(object) {
  const nameText = document.getElementById("selectedObjectName");
  const typeText = document.getElementById("selectedObjectType");
  const positionText = document.getElementById("selectedObjectPosition");
  const scaleText = document.getElementById("selectedObjectScale");

  if (!nameText || !typeText || !positionText || !scaleText) {
    return;
  }

  if (!object) {
    nameText.textContent = "None";
    typeText.textContent = "None";
    positionText.textContent = "None";
    scaleText.textContent = "None";
    return;
  }

  nameText.textContent = object.name || "Unnamed Object";
  typeText.textContent = object.userData?.type || "Unknown";

  positionText.textContent =
    `X: ${object.position.x.toFixed(2)}, ` +
    `Y: ${object.position.y.toFixed(2)}, ` +
    `Z: ${object.position.z.toFixed(2)}`;

  scaleText.textContent =
    `X: ${object.scale.x.toFixed(2)}, ` +
    `Y: ${object.scale.y.toFixed(2)}, ` +
    `Z: ${object.scale.z.toFixed(2)}`;
}

function clearSelection() {
  const workspace = getSelectionWorkspace();

  if (selectionBox && workspace && workspace.scene) {
    workspace.scene.remove(selectionBox);
    selectionBox = null;
  }

  selectedObject = null;
  window.selectedObject = null;

  updateSelectedObjectPanel(null);
}

function selectObject(object) {
  const workspace = getSelectionWorkspace();

  if (!workspace || !workspace.scene || !object) {
    return;
  }

  clearSelection();

  selectedObject = object;
  window.selectedObject = object;

  selectionBox = new THREE.BoxHelper(object, 0x60a5fa);
  workspace.scene.add(selectionBox);

  updateSelectedObjectPanel(object);

  const statusText = document.getElementById("cadStatusText");
  if (statusText) {
    statusText.textContent = `${object.name} selected.`;
  }
}

function getObjectFromPointer(event) {
  const workspace = getSelectionWorkspace();

  if (!workspace || !workspace.camera || !workspace.renderer) {
    return null;
  }

  const canvas = workspace.renderer.domElement;
  const rect = canvas.getBoundingClientRect();

  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, workspace.camera);

  const objects = window.cadObjects || [];
  const intersections = raycaster.intersectObjects(objects, true);

  if (intersections.length === 0) {
    return null;
  }

  return getSelectableRoot(intersections[0].object);
}

function handlePointerDown(event) {
  pointerStart.x = event.clientX;
  pointerStart.y = event.clientY;
}

function handlePointerUp(event) {
  const moveX = Math.abs(event.clientX - pointerStart.x);
  const moveY = Math.abs(event.clientY - pointerStart.y);

  if (moveX > 5 || moveY > 5) {
    return;
  }

  const clickedObject = getObjectFromPointer(event);

  if (clickedObject) {
    selectObject(clickedObject);
  } else {
    clearSelection();
  }
}

function initObjectSelection() {
  const workspace = getSelectionWorkspace();

  if (!workspace || !workspace.renderer) {
    return;
  }

  const canvas = workspace.renderer.domElement;

  canvas.addEventListener("pointerdown", handlePointerDown);
  canvas.addEventListener("pointerup", handlePointerUp);
}

window.selectObject = selectObject;
window.clearSelection = clearSelection;

document.addEventListener("DOMContentLoaded", () => {
  window.addEventListener("cad:ready", initObjectSelection);

  if (window.CADWorkspace) {
    initObjectSelection();
  }
});