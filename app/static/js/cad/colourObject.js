function getColourSelectedObject() {
    if (typeof window.getSelectedCADObject === "function") {
        return window.getSelectedCADObject();
    }

    return window.selectedObject || null;
}


function setColourStatus(message) {
    const statusText = document.getElementById("cadStatusText");

    if (statusText) {
        statusText.textContent = message;
    }
}


function normaliseHexColour(value) {
    if (!value) {
        return null;
    }

    let hex = value.trim().toLowerCase();

    if (hex.charAt(0) !== "#") {
        hex = "#" + hex;
    }

    const validHex = /^#[0-9a-f]{6}$/;

    if (!validHex.test(hex)) {
        return null;
    }

    return hex;
}


function getObjectColour(object) {
    if (!object || !object.material || !object.material.color) {
        return "#ffffff";
    }

    return "#" + object.material.color.getHexString();
}


function updateColourInputs(object) {
    const colourInput = document.getElementById("objectColourInput");
    const hexInput = document.getElementById("objectHexInput");

    let colour = "#ff0000";

    if (object) {
        colour = getObjectColour(object);
    }

    if (colourInput) {
        colourInput.value = colour;
    }

    if (hexInput) {
        hexInput.value = colour;
    }
}


function applyObjectColour() {
    const object = getColourSelectedObject();
    const colourInput = document.getElementById("objectColourInput");
    const hexInput = document.getElementById("objectHexInput");

    if (!object) {
        setColourStatus("Please select an object before changing colour.");
        return;
    }

    if (!object.material) {
        setColourStatus("Selected object does not support colour changes.");
        return;
    }

    let selectedColour = null;

    if (hexInput && hexInput.value) {
        selectedColour = normaliseHexColour(hexInput.value);
    }

    if (!selectedColour && colourInput) {
        selectedColour = normaliseHexColour(colourInput.value);
    }

    if (!selectedColour) {
        setColourStatus("Invalid hex colour. Use format like #ff0000 or 00ff00.");
        return;
    }

    if (colourInput) {
        colourInput.value = selectedColour;
    }

    if (hexInput) {
        hexInput.value = selectedColour;
    }

    if (Array.isArray(object.material)) {
        object.material.forEach(function (material) {
            if (material && material.color) {
                material.color.set(selectedColour);
                material.needsUpdate = true;
            }
        });
    } else {
        if (object.material.color) {
            object.material.color.set(selectedColour);
            object.material.needsUpdate = true;
        }
    }

    object.userData = object.userData || {};
    object.userData.color = selectedColour;

    setColourStatus(object.name + " colour changed to " + selectedColour);
}


function initColourObjectControls() {
    const applyColourBtn = document.getElementById("applyColourBtn");
    const colourInput = document.getElementById("objectColourInput");
    const hexInput = document.getElementById("objectHexInput");

    if (applyColourBtn) {
        applyColourBtn.addEventListener("click", applyObjectColour);
    }

    if (colourInput && hexInput) {
        colourInput.addEventListener("input", function () {
            hexInput.value = colourInput.value;
        });

        hexInput.addEventListener("input", function () {
            const validColour = normaliseHexColour(hexInput.value);

            if (validColour) {
                colourInput.value = validColour;
            }
        });
    }

    updateColourInputs(getColourSelectedObject());
}


document.addEventListener("DOMContentLoaded", function () {
    initColourObjectControls();
});