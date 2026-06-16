(function () {
    "use strict";

    const DEFAULT_ROTATE_STEP = 15;
    const ROTATE_AXES = ["x", "y", "z"];

    let rotateControlsInitialized = false;

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

    function degreeToRadian(degree) {
        return degree * Math.PI / 180;
    }

    function radianToDegree(radian) {
        return radian * 180 / Math.PI;
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

    function getRotateStep() {
        return getInputNumber("rotateStepInput", DEFAULT_ROTATE_STEP, true);
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

    function getRotationStatusMessage(object) {
        const objectName = object.name || "Selected object";

        return (
            objectName +
            " rotation set to X: " +
            radianToDegree(object.rotation.x).toFixed(0) +
            "°, Y: " +
            radianToDegree(object.rotation.y).toFixed(0) +
            "°, Z: " +
            radianToDegree(object.rotation.z).toFixed(0) +
            "°"
        );
    }

    function captureRotation(object) {
        return {
            x: object.rotation.x,
            y: object.rotation.y,
            z: object.rotation.z,
            order: object.rotation.order
        };
    }

    function rotationsAreEqual(firstRotation, secondRotation) {
        const tolerance = 0.0000001;

        return (
            Math.abs(firstRotation.x - secondRotation.x) <= tolerance &&
            Math.abs(firstRotation.y - secondRotation.y) <= tolerance &&
            Math.abs(firstRotation.z - secondRotation.z) <= tolerance &&
            firstRotation.order === secondRotation.order
        );
    }

    function applyRotationSnapshot(object, rotation) {
        object.rotation.set(
            rotation.x,
            rotation.y,
            rotation.z,
            rotation.order
        );

        refreshAfterRotate(object);
    }

    function recordRotationHistory(object, previousRotation, nextRotation) {
        if (!window.CADHistory || typeof window.CADHistory.push !== "function") {
            return;
        }

        const objectName = object.name || "Selected object";

        window.CADHistory.push({
            label: "Rotate " + objectName,
            undo: function () {
                applyRotationSnapshot(object, previousRotation);
                setStatus(objectName + " rotation undone.");
            },
            redo: function () {
                applyRotationSnapshot(object, nextRotation);
                setStatus(objectName + " rotation redone.");
            }
        });
    }

    function applyRotationChange(object, changeRotation) {
        const previousRotation = captureRotation(object);

        changeRotation();

        const nextRotation = captureRotation(object);

        if (rotationsAreEqual(previousRotation, nextRotation)) {
            refreshAfterRotate(object);
            setStatus((object.name || "Selected object") + " rotation unchanged.");
            return;
        }

        refreshAfterRotate(object);
        recordRotationHistory(object, previousRotation, nextRotation);
        setStatus(getRotationStatusMessage(object));
    }

    function rotateSelectedObject(axis, degreeAmount) {
        const object = getSelectedObject();

        if (!object) {
            setStatus("Please select an object before rotating.");
            return;
        }

        if (!ROTATE_AXES.includes(axis)) {
            setStatus("Invalid rotation axis.");
            return;
        }

        const amount = Number(degreeAmount);

        if (Number.isNaN(amount)) {
            setStatus("Please enter a valid rotation amount.");
            return;
        }

        applyRotationChange(object, function () {
            object.rotation[axis] += degreeToRadian(amount);
        });
    }

    function applyManualRotation() {
        const object = getSelectedObject();

        if (!object) {
            setStatus("Please select an object before setting rotation.");
            return;
        }

        const xInput = document.getElementById("rotateXInput");
        const yInput = document.getElementById("rotateYInput");
        const zInput = document.getElementById("rotateZInput");

        if (!xInput || !yInput || !zInput) {
            setStatus("Rotation input fields are missing.");
            return;
        }

        const xDegree = Number(xInput.value);
        const yDegree = Number(yInput.value);
        const zDegree = Number(zInput.value);

        if (
            Number.isNaN(xDegree) ||
            Number.isNaN(yDegree) ||
            Number.isNaN(zDegree)
        ) {
            setStatus("Please enter valid X, Y and Z rotation values.");
            return;
        }

        applyRotationChange(object, function () {
            object.rotation.set(
                degreeToRadian(xDegree),
                degreeToRadian(yDegree),
                degreeToRadian(zDegree)
            );
        });
    }

    function connectRotateButton(buttonId, axis, direction) {
        const button = document.getElementById(buttonId);

        if (!button) {
            return;
        }

        button.addEventListener("click", function () {
            const step = getRotateStep();
            rotateSelectedObject(axis, step * direction);
        });
    }

    function handleSelectionChanged(event) {
        const selectedObject = event.detail ? event.detail.object : null;
        updateRotateInputs(selectedObject);
    }

    function initRotateObjectControls() {
        if (rotateControlsInitialized) {
            return;
        }

        rotateControlsInitialized = true;

        connectRotateButton("rotateXPlusBtn", "x", 1);
        connectRotateButton("rotateXMinusBtn", "x", -1);

        connectRotateButton("rotateYPlusBtn", "y", 1);
        connectRotateButton("rotateYMinusBtn", "y", -1);

        connectRotateButton("rotateZPlusBtn", "z", 1);
        connectRotateButton("rotateZMinusBtn", "z", -1);

        const setRotationBtn = document.getElementById("setRotationBtn");

        if (setRotationBtn) {
            setRotationBtn.addEventListener("click", applyManualRotation);
        }

        window.addEventListener("cad:selectionChanged", handleSelectionChanged);

        updateRotateInputs(getSelectedObject());
    }

    window.rotateSelectedObject = rotateSelectedObject;
    window.applyManualRotation = applyManualRotation;
    window.updateRotateInputs = updateRotateInputs;

    document.addEventListener("DOMContentLoaded", initRotateObjectControls);
})();