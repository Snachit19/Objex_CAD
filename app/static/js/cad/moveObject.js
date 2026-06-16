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
}


document.addEventListener("DOMContentLoaded", function () {
    initMoveObjectControls();
});


window.moveSelectedObject = moveSelectedObject;
window.applyManualPosition = applyManualPosition;