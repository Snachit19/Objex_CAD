let selectedObject = null;
let selectionBox = null;

function getSelectionWorkspace() {
  return window.CADWorkspace;
}

function clearSelection() {
  const workspace = getSelectionWorkspace();

  if (selectionBox && workspace && workspace.scene) {
    workspace.scene.remove(selectionBox);
    selectionBox = null;
  }

  selectedObject = null;
  updateSelectedObjectPanel(null);
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

  if (object.userData && object.userData.type) {
    typeText.textContent = object.userData.type;
  } else {
    typeText.textContent = "Unknown";
  }

  positionText.textContent =
    `X: ${object.position.x.toFixed(2)}, Y: ${object.position.y.toFixed(2)}, Z: ${object.position.z.toFixed(2)}`;

  scaleText.textContent =
    `X: ${object.scale.x.toFixed(2)}, Y: ${object.scale.y.toFixed(2)}, Z: ${object.scale.z.toFixed(2)}`;
}

function selectObject(object) {
  const workspace = getSelectionWorkspace();

  if (!workspace || !workspace.scene || !object) {
    return;
  }

  clearSelection();

  selectedObject = object;

  selectionBox = new THREE.BoxHelper(object, 0x60a5fa);
  workspace.scene.add(selectionBox);

  updateSelectedObjectPanel(object);
}

window.selectObject = selectObject;
window.clearSelection = clearSelection;