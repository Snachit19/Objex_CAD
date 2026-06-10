(function () {
    "use strict";

    const DEFAULT_RESIZE_STEP = 0.1;
    const MINIMUM_SCALE = 0.01;
    const RESIZE_AXES = ["x", "y", "z"];

    let resizeControlsInitialized = false;

    function getSelectedObject() {
        if (typeof window.getSelectedCADObject === "function") {
            return window.getSelectedCADObject();
        }

        return window.selectedObject || null;
    }

    function setStatus(message) {
        const statusText = document.getElementById("cadStatusText");

        if (statusText) {
            statusText.textContent = message;
        }
    }

    function getInputNumber(inputId, fallbackValue, requirePositive) {
        const input = document.getElementById(inputId);

        if (!input) {
            return fallbackValue;
        }

        const value = Number(input.value);

        if (Number.isNaN(value)) {
            return fallbackValue;
        }

        if (requirePositive && value <= 0) {
            return fallbackValue;
        }

        return value;
    }

    function getResizeStep() {
        return getInputNumber("resizeStepInput", DEFAULT_RESIZE_STEP, true);
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

    function isValidScale(xScale, yScale, zScale) {
        return (
            xScale >= MINIMUM_SCALE &&
            yScale >= MINIMUM_SCALE &&
            zScale >= MINIMUM_SCALE
        );
    }

    function getScaleStatusMessage(object) {
        const objectName = object.name || "Selected object";

        return (
            objectName +
            " scale set to X: " +
            object.scale.x.toFixed(2) +
            ", Y: " +
            object.scale.y.toFixed(2) +
            ", Z: " +
            object.scale.z.toFixed(2)
        );
    }

    function resizeSelectedObject(axis, amount) {
        const object = getSelectedObject();

        if (!object) {
            setStatus("Please select an object before resizing.");
            return;
        }

        const resizeAmount = Number(amount);

        if (Number.isNaN(resizeAmount)) {
            setStatus("Please enter a valid resize amount.");
            return;
        }

        const newScale = {
            x: object.scale.x,
            y: object.scale.y,
            z: object.scale.z
        };

        if (axis === "all") {
            newScale.x += resizeAmount;
            newScale.y += resizeAmount;
            newScale.z += resizeAmount;
        } else if (RESIZE_AXES.includes(axis)) {
            newScale[axis] += resizeAmount;
        } else {
            setStatus("Invalid resize axis.");
            return;
        }

        if (!isValidScale(newScale.x, newScale.y, newScale.z)) {
            setStatus("Scale values must be greater than zero.");
            return;
        }

        object.scale.set(newScale.x, newScale.y, newScale.z);

        refreshAfterResize(object);
        setStatus(getScaleStatusMessage(object));
    }

    function applyManualResize() {
        const object = getSelectedObject();

        if (!object) {
            setStatus("Please select an object before setting scale.");
            return;
        }

        const xInput = document.getElementById("resizeXInput");
        const yInput = document.getElementById("resizeYInput");
        const zInput = document.getElementById("resizeZInput");

        if (!xInput || !yInput || !zInput) {
            setStatus("Scale input fields are missing.");
            return;
        }

        const xScale = Number(xInput.value);
        const yScale = Number(yInput.value);
        const zScale = Number(zInput.value);

        if (
            Number.isNaN(xScale) ||
            Number.isNaN(yScale) ||
            Number.isNaN(zScale)
        ) {
            setStatus("Please enter valid X, Y and Z scale values.");
            return;
        }

        if (!isValidScale(xScale, yScale, zScale)) {
            setStatus("Scale values must be greater than zero.");
            return;
        }

        object.scale.set(xScale, yScale, zScale);

        refreshAfterResize(object);
        setStatus(getScaleStatusMessage(object));
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

    function handleSelectionChanged(event) {
        const selectedObject = event.detail ? event.detail.object : null;
        updateResizeInputs(selectedObject);
    }

    function initResizeObjectControls() {
        if (resizeControlsInitialized) {
            return;
        }

        resizeControlsInitialized = true;

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

        window.addEventListener("cad:selectionChanged", handleSelectionChanged);

        updateResizeInputs(getSelectedObject());
    }

    window.resizeSelectedObject = resizeSelectedObject;
    window.applyManualResize = applyManualResize;
    window.updateResizeInputs = updateResizeInputs;

    document.addEventListener("DOMContentLoaded", initResizeObjectControls);
})();