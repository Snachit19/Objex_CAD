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