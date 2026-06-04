function getResizeSelectedObject() {
    if (typeof window.getSelectedCADObject === "function") {
        return window.getSelectedCADObject();
    }

    return window.selectedObject || null;
}


function setResizeStatus(message) {
    const statusText = document.getElementById("cadStatusText");

    if (statusText) {
        statusText.textContent = message;
    }
}


function getResizeStep() {
    const stepInput = document.getElementById("resizeStepInput");

    if (!stepInput) {
        return 0.1;
    }

    const value = Number(stepInput.value);

    if (isNaN(value) || value <= 0) {
        return 0.1;
    }

    return value;
}


function updateResizeInputs(object) {
    const xInput = document.getElementById("resizeXInput");
    const yInput = document.getElementById("resizeYInput");
    const zInput = document.getElementById("resizeZInput");

    if (!xInput || !yInput || !zInput) {
        return;
    }

    if (!object) {
        xInput.value = "";
        yInput.value = "";
        zInput.value = "";
        return;
    }

    xInput.value = object.scale.x.toFixed(2);
    yInput.value = object.scale.y.toFixed(2);
    zInput.value = object.scale.z.toFixed(2);
}


function refreshAfterResize(object) {
    if (!object) {
        return;
    }

    if (typeof window.refreshSelectedObjectPanel === "function") {
        window.refreshSelectedObjectPanel();
    }

    updateResizeInputs(object);
}


function resizeSelectedObject(axis, amount) {
    const object = getResizeSelectedObject();

    if (!object) {
        setResizeStatus("Please select an object before resizing.");
        return;
    }

    if (axis === "x") {
        const newScale = object.scale.x + amount;
        if (newScale <= 0) {
            setResizeStatus("Scale cannot be zero or negative.");
            return;
        }
        object.scale.x = newScale;
    }

    if (axis === "y") {
        const newScale = object.scale.y + amount;
        if (newScale <= 0) {
            setResizeStatus("Scale cannot be zero or negative.");
            return;
        }
        object.scale.y = newScale;
    }

    if (axis === "z") {
        const newScale = object.scale.z + amount;
        if (newScale <= 0) {
            setResizeStatus("Scale cannot be zero or negative.");
            return;
        }
        object.scale.z = newScale;
    }

    if (axis === "all") {
        const newX = object.scale.x + amount;
        const newY = object.scale.y + amount;
        const newZ = object.scale.z + amount;
        if (newX <= 0 || newY <= 0 || newZ <= 0) {
            setResizeStatus("Scale cannot be zero or negative.");
            return;
        }
        object.scale.x = newX;
        object.scale.y = newY;
        object.scale.z = newZ;
    }

    refreshAfterResize(object);

    setResizeStatus(
        object.name +
        " scale set to X: " +
        object.scale.x.toFixed(2) +
        ", Y: " +
        object.scale.y.toFixed(2) +
        ", Z: " +
        object.scale.z.toFixed(2)
    );
}


function connectResizeButton(buttonId, axis, direction) {
    const button = document.getElementById(buttonId);

    if (!button) {
        return;
    }

    button.addEventListener("click", function () {
        const step = getResizeStep();
        resizeSelectedObject(axis, step * direction);
    });
}


function applyManualResize() {
    const object = getResizeSelectedObject();

    if (!object) {
        setResizeStatus("Please select an object before setting scale.");
        return;
    }

    const xInput = document.getElementById("resizeXInput");
    const yInput = document.getElementById("resizeYInput");
    const zInput = document.getElementById("resizeZInput");

    if (!xInput || !yInput || !zInput) {
        setResizeStatus("Scale input fields are missing.");
        return;
    }

    const xScale = Number(xInput.value);
    const yScale = Number(yInput.value);
    const zScale = Number(zInput.value);

    if (isNaN(xScale) || isNaN(yScale) || isNaN(zScale)) {
        setResizeStatus("Please enter valid X, Y and Z scale values.");
        return;
    }

    if (xScale <= 0 || yScale <= 0 || zScale <= 0) {
        setResizeStatus("Scale values must be greater than zero.");
        return;
    }

    object.scale.set(xScale, yScale, zScale);

    refreshAfterResize(object);

    setResizeStatus(
        object.name +
        " scale set to X: " +
        xScale.toFixed(2) +
        ", Y: " +
        yScale.toFixed(2) +
        ", Z: " +
        zScale.toFixed(2)
    );
}


function initResizeObjectControls() {
    connectResizeButton("resizeXPlusBtn", "x", 1);
    connectResizeButton("resizeXMinusBtn", "x", -1);

    connectResizeButton("resizeYPlusBtn", "y", 1);
    connectResizeButton("resizeYMinusBtn", "y", -1);

    connectResizeButton("resizeZPlusBtn", "z", 1);
    connectResizeButton("resizeZMinusBtn", "z", -1);

    connectResizeButton("resizeAllPlusBtn", "all", 1);
    connectResizeButton("resizeAllMinusBtn", "all", -1);

    const setScaleBtn = document.getElementById("setScaleBtn");

    if (setScaleBtn) {
        setScaleBtn.addEventListener("click", applyManualResize);
    }

    window.addEventListener("cad:selectionChanged", function (event) {
        if (event.detail && event.detail.object) {
            updateResizeInputs(event.detail.object);
        } else {
            updateResizeInputs(null);
        }
    });
}


document.addEventListener("DOMContentLoaded", function () {
    initResizeObjectControls();
});