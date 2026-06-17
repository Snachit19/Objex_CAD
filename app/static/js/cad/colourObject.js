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


function getMaterialList(material) {
    if (Array.isArray(material)) {
        return material;
    }

    return material ? [material] : [];
}


function captureColourState(object) {
    const materialColours = getMaterialList(object.material).map(function (material) {
        if (!material || !material.color) {
            return null;
        }

        return "#" + material.color.getHexString();
    });

    return {
        userDataColour: object.userData && object.userData.color
            ? normaliseHexColour(object.userData.color)
            : null,
        materialColours: materialColours
    };
}


function colourStatesAreEqual(firstState, secondState) {
    if (firstState.userDataColour !== secondState.userDataColour) {
        return false;
    }

    if (firstState.materialColours.length !== secondState.materialColours.length) {
        return false;
    }

    return firstState.materialColours.every(function (colour, index) {
        return colour === secondState.materialColours[index];
    });
}


function refreshAfterColourChange(object) {
    updateColourInputs(object);

    if (typeof window.refreshSelectedObjectPanel === "function") {
        window.refreshSelectedObjectPanel();
    }
}


function applyColourState(object, colourState) {
    getMaterialList(object.material).forEach(function (material, index) {
        const colour = colourState.materialColours[index];

        if (material && material.color && colour) {
            material.color.set(colour);
            material.needsUpdate = true;
        }
    });

    object.userData = object.userData || {};

    if (colourState.userDataColour) {
        object.userData.color = colourState.userDataColour;
    } else {
        delete object.userData.color;
    }

    refreshAfterColourChange(object);
}


function applyColourValue(object, colour) {
    getMaterialList(object.material).forEach(function (material) {
        if (material && material.color) {
            material.color.set(colour);
            material.needsUpdate = true;
        }
    });

    object.userData = object.userData || {};
    object.userData.color = colour;

    refreshAfterColourChange(object);
}


function recordColourHistory(object, previousColourState, nextColourState) {
    if (!window.CADHistory || typeof window.CADHistory.push !== "function") {
        return;
    }

    const objectName = object.name || "Selected object";

    window.CADHistory.push({
        label: "Change colour " + objectName,
        undo: function () {
            applyColourState(object, previousColourState);
            setColourStatus(objectName + " colour undone.");
        },
        redo: function () {
            applyColourState(object, nextColourState);
            setColourStatus(objectName + " colour redone.");
        }
    });
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

    const previousColourState = captureColourState(object);

    applyColourValue(object, selectedColour);

    const nextColourState = captureColourState(object);

    if (colourStatesAreEqual(previousColourState, nextColourState)) {
        setColourStatus((object.name || "Selected object") + " colour unchanged.");
        return;
    }

    recordColourHistory(object, previousColourState, nextColourState);
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

    window.addEventListener("cad:selectionChanged", function (event) {
        if (event.detail && event.detail.object) {
            updateColourInputs(event.detail.object);
        } else {
            updateColourInputs(null);
        }
    });

    updateColourInputs(getColourSelectedObject());
}


window.applyObjectColour = applyObjectColour;

document.addEventListener("DOMContentLoaded", function () {
    initColourObjectControls();
});