function getRotateSelectedObject() {
    if (typeof window.getSelectedCADObject === "function") {
        return window.getSelectedCADObject();
    }

    return window.selectedObject || null;
}


function setRotateStatus(message) {
    const statusText = document.getElementById("cadStatusText");

    if (statusText) {
        statusText.textContent = message;
    }
}


function degreeToRadian(degree) {
    return degree * Math.PI / 180;
}


function radianToDegree(radian) {
    return radian * 180 / Math.PI;
}


function getRotateStep() {
    const stepInput = document.getElementById("rotateStepInput");

    if (!stepInput) {
        return 15;
    }

    const value = Number(stepInput.value);

    if (isNaN(value) || value <= 0) {
        return 15;
    }

    return value;
}


function updateRotateInputs(object) {
    const xInput = document.getElementById("rotateXInput");
    const yInput = document.getElementById("rotateYInput");
    const zInput = document.getElementById("rotateZInput");

    if (!xInput || !yInput || !zInput) {
        return;
    }

    if (!object) {
        xInput.value = "";
        yInput.value = "";
        zInput.value = "";
        return;
    }

    xInput.value = radianToDegree(object.rotation.x).toFixed(0);
    yInput.value = radianToDegree(object.rotation.y).toFixed(0);
    zInput.value = radianToDegree(object.rotation.z).toFixed(0);
}


function refreshAfterRotate(object) {
    if (!object) {
        return;
    }

    if (typeof window.refreshSelectedObjectPanel === "function") {
        window.refreshSelectedObjectPanel();
    }

    updateRotateInputs(object);
}