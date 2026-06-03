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



function moveSelectedObject(dx, dy, dz) {
    const object = getMoveSelectedObject();

    if (!object) {
        setMoveStatus("Please select an object before moving.");
        return;
    }

    object.position.x = object.position.x + dx;
    object.position.y = object.position.y + dy;
    object.position.z = object.position.z + dz;

    refreshAfterMove(object);

    setMoveStatus(
        object.name +
        " moved to X: " +
        object.position.x.toFixed(2) +
        ", Y: " +
        object.position.y.toFixed(2) +
        ", Z: " +
        object.position.z.toFixed(2)
    );
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

    object.position.set(x, y, z);

    refreshAfterMove(object);

    setMoveStatus(
        object.name +
        " position set to X: " +
        x.toFixed(2) +
        ", Y: " +
        y.toFixed(2) +
        ", Z: " +
        z.toFixed(2)
    );
}