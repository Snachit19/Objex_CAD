function getMoveSelectedObject() {
    if (typeof window.getSelectedCADObject === "function") {
        return window.getSelectedCADObject();
    }

    return window.selectedObject || null;
}


function setMoveStatus(message) {
    const statusText = document.getElementById("cadStatusText");

    if (statusText) {
        statusText.textContent = message;
    }
}


function getMoveStep() {
    const stepInput = document.getElementById("moveStepInput");

    if (!stepInput) {
        return 0.5;
    }

    const value = Number(stepInput.value);

    if (isNaN(value) || value <= 0) {
        return 0.5;
    }

    return value;
}


function getMoveWorkspace() {
    return window.CADWorkspace || null;
}


function updateMoveInputs(object) {
    const xInput = document.getElementById("moveXInput");
    const yInput = document.getElementById("moveYInput");
    const zInput = document.getElementById("moveZInput");

    if (!xInput || !yInput || !zInput) {
        return;
    }

    if (!object) {
        xInput.value = "";
        yInput.value = "";
        zInput.value = "";
        return;
    }

    xInput.value = object.position.x.toFixed(2);
    yInput.value = object.position.y.toFixed(2);
    zInput.value = object.position.z.toFixed(2);
}


function refreshAfterMove(object) {
    if (!object) {
        return;
    }

    if (typeof window.refreshSelectedObjectPanel === "function") {
        window.refreshSelectedObjectPanel();
    }

    updateMoveInputs(object);
}


const dragRaycaster = new THREE.Raycaster();
const dragPointer = new THREE.Vector2();
const dragPlane = new THREE.Plane();
const dragPlaneNormal = new THREE.Vector3(0, 1, 0);
const dragIntersection = new THREE.Vector3();
const dragOffset = new THREE.Vector3();

let activeDragObject = null;
let dragStartPosition = null;
let dragStartPointer = null;
let dragPointerId = null;
let dragControlsEnabled = true;
let hasDragMoved = false;
let selectedObjectDragInitialized = false;


function setDragPointerFromEvent(event, canvas) {
    const rect = canvas.getBoundingClientRect();

    dragPointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    dragPointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}


function getDragPlaneIntersection(event) {
    const workspace = getMoveWorkspace();

    if (!workspace || !workspace.camera || !workspace.renderer) {
        return null;
    }

    setDragPointerFromEvent(event, workspace.renderer.domElement);
    dragRaycaster.setFromCamera(dragPointer, workspace.camera);

    return dragRaycaster.ray.intersectPlane(dragPlane, dragIntersection);
}


function didPointerMoveEnough(event) {
    if (!dragStartPointer) {
        return false;
    }

    return (
        Math.abs(event.clientX - dragStartPointer.x) > 3 ||
        Math.abs(event.clientY - dragStartPointer.y) > 3
    );
}


function isPointerOnObject(event, object) {
    const workspace = getMoveWorkspace();

    if (!workspace || !workspace.camera || !workspace.renderer || !object) {
        return false;
    }

    setDragPointerFromEvent(event, workspace.renderer.domElement);
    dragRaycaster.setFromCamera(dragPointer, workspace.camera);

    return dragRaycaster.intersectObject(object, true).length > 0;
}


function capturePosition(object) {
    return {
        x: object.position.x,
        y: object.position.y,
        z: object.position.z
    };
}


function positionsAreEqual(firstPosition, secondPosition) {
    return (
        firstPosition.x === secondPosition.x &&
        firstPosition.y === secondPosition.y &&
        firstPosition.z === secondPosition.z
    );
}


function applyPositionSnapshot(object, position) {
    object.position.set(position.x, position.y, position.z);
    refreshAfterMove(object);
}


function getMoveStatusMessage(object) {
    const objectName = object.name || "Selected object";

    return (
        objectName +
        " moved to X: " +
        object.position.x.toFixed(2) +
        ", Y: " +
        object.position.y.toFixed(2) +
        ", Z: " +
        object.position.z.toFixed(2)
    );
}


function recordMoveHistory(object, previousPosition, nextPosition) {
    if (!window.CADHistory || typeof window.CADHistory.push !== "function") {
        return;
    }

    const objectName = object.name || "Selected object";

    window.CADHistory.push({
        label: "Move " + objectName,
        undo: function () {
            applyPositionSnapshot(object, previousPosition);
            setMoveStatus(objectName + " move undone.");
        },
        redo: function () {
            applyPositionSnapshot(object, nextPosition);
            setMoveStatus(objectName + " move redone.");
        }
    });
}


function applyMoveChange(object, changePosition, successMessage) {
    const previousPosition = capturePosition(object);

    changePosition();

    const nextPosition = capturePosition(object);

    if (positionsAreEqual(previousPosition, nextPosition)) {
        refreshAfterMove(object);
        setMoveStatus((object.name || "Selected object") + " position unchanged.");
        return;
    }

    refreshAfterMove(object);
    recordMoveHistory(object, previousPosition, nextPosition);
    setMoveStatus(successMessage || getMoveStatusMessage(object));
}


function beginSelectedObjectDrag(event) {
    const object = getMoveSelectedObject();
    const workspace = getMoveWorkspace();

    if (!object || !workspace || !workspace.renderer || !workspace.controls) {
        return;
    }

    if (event.button !== 0 || !isPointerOnObject(event, object)) {
        return;
    }

    dragPlane.set(dragPlaneNormal, -object.position.y);

    const intersection = getDragPlaneIntersection(event);

    if (!intersection) {
        return;
    }

    activeDragObject = object;
    dragStartPosition = capturePosition(object);
    dragStartPointer = {
        x: event.clientX,
        y: event.clientY
    };
    dragPointerId = event.pointerId;
    hasDragMoved = false;

    dragOffset.copy(intersection).sub(object.position);

    dragControlsEnabled = workspace.controls.enabled;
    workspace.controls.enabled = false;
    workspace.renderer.domElement.setPointerCapture(event.pointerId);
}


function updateSelectedObjectDrag(event) {
    if (!activeDragObject || event.pointerId !== dragPointerId) {
        return;
    }

    if (!hasDragMoved && !didPointerMoveEnough(event)) {
        return;
    }

    const intersection = getDragPlaneIntersection(event);

    if (!intersection) {
        return;
    }

    hasDragMoved = true;
    event.preventDefault();

    activeDragObject.position.copy(intersection.sub(dragOffset));
    activeDragObject.position.y = dragStartPosition.y;

    refreshAfterMove(activeDragObject);
    setMoveStatus(getMoveStatusMessage(activeDragObject));
}


function finishSelectedObjectDrag(event) {
    if (!activeDragObject || event.pointerId !== dragPointerId) {
        return;
    }

    const workspace = getMoveWorkspace();
    const object = activeDragObject;
    const previousPosition = dragStartPosition;
    const nextPosition = capturePosition(object);

    if (workspace && workspace.controls) {
        workspace.controls.enabled = dragControlsEnabled;
    }

    if (workspace && workspace.renderer && workspace.renderer.domElement.hasPointerCapture(event.pointerId)) {
        workspace.renderer.domElement.releasePointerCapture(event.pointerId);
    }

    activeDragObject = null;
    dragStartPosition = null;
    dragStartPointer = null;
    dragPointerId = null;

    if (!hasDragMoved || positionsAreEqual(previousPosition, nextPosition)) {
        hasDragMoved = false;
        refreshAfterMove(object);
        return;
    }

    hasDragMoved = false;
    recordMoveHistory(object, previousPosition, nextPosition);
    setMoveStatus(getMoveStatusMessage(object));
}


function initSelectedObjectDrag() {
    if (selectedObjectDragInitialized) {
        return;
    }

    const workspace = getMoveWorkspace();

    if (!workspace || !workspace.renderer) {
        return;
    }

    selectedObjectDragInitialized = true;

    const canvas = workspace.renderer.domElement;

    canvas.addEventListener("pointerdown", beginSelectedObjectDrag);
    canvas.addEventListener("pointermove", updateSelectedObjectDrag);
    canvas.addEventListener("pointerup", finishSelectedObjectDrag);
    canvas.addEventListener("pointercancel", finishSelectedObjectDrag);
}


function moveSelectedObject(dx, dy, dz) {
    const object = getMoveSelectedObject();

    if (!object) {
        setMoveStatus("Please select an object before moving.");
        return;
    }

    applyMoveChange(object, function () {
        object.position.x = object.position.x + dx;
        object.position.y = object.position.y + dy;
        object.position.z = object.position.z + dz;
    });
}


function connectMoveButton(buttonId, dx, dy, dz) {
    const button = document.getElementById(buttonId);

    if (!button) {
        return;
    }

    button.addEventListener("click", function () {
        const step = getMoveStep();

        moveSelectedObject(dx * step, dy * step, dz * step);
    });
}


function applyManualPosition() {
    const object = getMoveSelectedObject();

    if (!object) {
        setMoveStatus("Please select an object before setting position.");
        return;
    }

    const xInput = document.getElementById("moveXInput");
    const yInput = document.getElementById("moveYInput");
    const zInput = document.getElementById("moveZInput");

    if (!xInput || !yInput || !zInput) {
        setMoveStatus("Position input fields are missing.");
        return;
    }

    const x = Number(xInput.value);
    const y = Number(yInput.value);
    const z = Number(zInput.value);

    if (isNaN(x) || isNaN(y) || isNaN(z)) {
        setMoveStatus("Please enter valid X, Y and Z values.");
        return;
    }

    applyMoveChange(
        object,
        function () {
            object.position.set(x, y, z);
        },
        object.name +
        " position set to X: " +
        x.toFixed(2) +
        ", Y: " +
        y.toFixed(2) +
        ", Z: " +
        z.toFixed(2)
    );
}



function initMoveObjectControls() {
    connectMoveButton("moveForwardBtn", 0, 0, -1);
    connectMoveButton("moveBackwardBtn", 0, 0, 1);
    connectMoveButton("moveLeftBtn", -1, 0, 0);
    connectMoveButton("moveRightBtn", 1, 0, 0);
    connectMoveButton("moveUpBtn", 0, 1, 0);
    connectMoveButton("moveDownBtn", 0, -1, 0);

    const setPositionBtn = document.getElementById("setPositionBtn");

    if (setPositionBtn) {
        setPositionBtn.addEventListener("click", applyManualPosition);
    }

    window.addEventListener("cad:selectionChanged", function (event) {
        if (event.detail && event.detail.object) {
            updateMoveInputs(event.detail.object);
        } else {
            updateMoveInputs(null);
        }
    });

    window.addEventListener("cad:ready", initSelectedObjectDrag);

    if (window.CADWorkspace) {
        initSelectedObjectDrag();
    }
}


document.addEventListener("DOMContentLoaded", function () {
    initMoveObjectControls();
});


window.moveSelectedObject = moveSelectedObject;
window.applyManualPosition = applyManualPosition;