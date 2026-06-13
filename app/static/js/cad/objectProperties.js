(function () {
    "use strict";

    let objectPropertiesInitialized = false;

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

    function radianToDegree(radian) {
        return radian * 180 / Math.PI;
    }

    function degreeToRadian(degree) {
        return degree * Math.PI / 180;
    }

    function setInputValue(id, value) {
        const input = document.getElementById(id);

        if (input) {
            input.value = value;
        }
    }

    function setTextValue(id, value) {
        const element = document.getElementById(id);

        if (element) {
            element.textContent = value;
        }
    }

    function getInputNumber(id, fallback) {
        const input = document.getElementById(id);

        if (!input) {
            return fallback;
        }

        const value = Number(input.value);

        if (Number.isNaN(value)) {
            return fallback;
        }

        return value;
    }

    function getInputText(id, fallback) {
        const input = document.getElementById(id);

        if (!input || input.value.trim() === "") {
            return fallback;
        }

        return input.value.trim();
    }

    function normaliseHexColour(value) {
        if (!value) {
            return null;
        }

        let hex = value.trim().toLowerCase();

        if (hex.charAt(0) !== "#") {
            hex = "#" + hex;
        }

        if (!/^#[0-9a-f]{6}$/.test(hex)) {
            return null;
        }

        return hex;
    }

    function getObjectColour(object) {
        if (!object) {
            return "#ffffff";
        }

        if (object.userData && object.userData.color) {
            return object.userData.color;
        }

        if (object.material && object.material.color) {
            return "#" + object.material.color.getHexString();
        }

        return "#ffffff";
    }

    function getObjectDimensions(object) {
        if (!object || typeof THREE === "undefined") {
            return {
                x: 0,
                y: 0,
                z: 0
            };
        }

        const box = new THREE.Box3().setFromObject(object);
        const size = new THREE.Vector3();

        box.getSize(size);

        return {
            x: size.x,
            y: size.y,
            z: size.z
        };
    }

    function updateObjectPropertiesPanel(object) {
        if (!object) {
            setInputValue("propertyObjectNameInput", "");
            setTextValue("propertyObjectTypeText", "None");

            setInputValue("propertyPositionXInput", "");
            setInputValue("propertyPositionYInput", "");
            setInputValue("propertyPositionZInput", "");

            setInputValue("propertyRotationXInput", "");
            setInputValue("propertyRotationYInput", "");
            setInputValue("propertyRotationZInput", "");

            setInputValue("propertyScaleXInput", "");
            setInputValue("propertyScaleYInput", "");
            setInputValue("propertyScaleZInput", "");

            setInputValue("propertyColourInput", "#ffffff");
            setInputValue("propertyHexInput", "#ffffff");

            setTextValue("propertyMaterialText", "Default");
            setTextValue("propertyDimensionsText", "None");

            return;
        }

        object.userData = object.userData || {};
        object.userData.materialType = object.userData.materialType || "default";
        object.userData.materialName = object.userData.materialName || "Default";

        const colour = getObjectColour(object);
        const dimensions = getObjectDimensions(object);

        setInputValue("propertyObjectNameInput", object.name || "Unnamed Object");

        setTextValue(
            "propertyObjectTypeText",
            object.userData.type || "Unknown"
        );

        setInputValue("propertyPositionXInput", object.position.x.toFixed(2));
        setInputValue("propertyPositionYInput", object.position.y.toFixed(2));
        setInputValue("propertyPositionZInput", object.position.z.toFixed(2));

        setInputValue("propertyRotationXInput", radianToDegree(object.rotation.x).toFixed(0));
        setInputValue("propertyRotationYInput", radianToDegree(object.rotation.y).toFixed(0));
        setInputValue("propertyRotationZInput", radianToDegree(object.rotation.z).toFixed(0));

        setInputValue("propertyScaleXInput", object.scale.x.toFixed(2));
        setInputValue("propertyScaleYInput", object.scale.y.toFixed(2));
        setInputValue("propertyScaleZInput", object.scale.z.toFixed(2));

        setInputValue("propertyColourInput", colour);
        setInputValue("propertyHexInput", colour);

        setTextValue("propertyMaterialText", object.userData.materialName || "Default");

        setTextValue(
            "propertyDimensionsText",
            "W: " + dimensions.x.toFixed(2) +
            ", H: " + dimensions.y.toFixed(2) +
            ", D: " + dimensions.z.toFixed(2)
        );
    }

    function applyColourToObject(object, colour) {
        if (!object || !object.material) {
            return;
        }

        if (Array.isArray(object.material)) {
            object.material.forEach(function (material) {
                if (material && material.color) {
                    material.color.set(colour);
                    material.needsUpdate = true;
                }
            });
        } else if (object.material.color) {
            object.material.color.set(colour);
            object.material.needsUpdate = true;
        }

        object.userData = object.userData || {};
        object.userData.color = colour;
    }

    function applyObjectProperties() {
        const object = getSelectedObject();

        if (!object) {
            setStatus("Please select an object before applying properties.");
            return;
        }

        const objectName = getInputText(
            "propertyObjectNameInput",
            object.name || "Unnamed Object"
        );

        const positionX = getInputNumber("propertyPositionXInput", object.position.x);
        const positionY = getInputNumber("propertyPositionYInput", object.position.y);
        const positionZ = getInputNumber("propertyPositionZInput", object.position.z);

        const rotationX = getInputNumber(
            "propertyRotationXInput",
            radianToDegree(object.rotation.x)
        );

        const rotationY = getInputNumber(
            "propertyRotationYInput",
            radianToDegree(object.rotation.y)
        );

        const rotationZ = getInputNumber(
            "propertyRotationZInput",
            radianToDegree(object.rotation.z)
        );

        const scaleX = getInputNumber("propertyScaleXInput", object.scale.x);
        const scaleY = getInputNumber("propertyScaleYInput", object.scale.y);
        const scaleZ = getInputNumber("propertyScaleZInput", object.scale.z);

        const hexInput = document.getElementById("propertyHexInput");
        const colourInput = document.getElementById("propertyColourInput");

        let selectedColour = null;

        if (hexInput) {
            selectedColour = normaliseHexColour(hexInput.value);
        }

        if (!selectedColour && colourInput) {
            selectedColour = normaliseHexColour(colourInput.value);
        }

        if (!selectedColour) {
            setStatus("Invalid colour value. Use format like #ff0000.");
            return;
        }

        if (scaleX <= 0 || scaleY <= 0 || scaleZ <= 0) {
            setStatus("Scale values must be greater than 0.");
            return;
        }

        object.name = objectName;
        object.position.set(positionX, positionY, positionZ);

        object.rotation.set(
            degreeToRadian(rotationX),
            degreeToRadian(rotationY),
            degreeToRadian(rotationZ)
        );

        object.scale.set(scaleX, scaleY, scaleZ);

        object.userData = object.userData || {};
        object.userData.materialType = object.userData.materialType || "default";
        object.userData.materialName = object.userData.materialName || "Default";

        applyColourToObject(object, selectedColour);
        updateObjectPropertiesPanel(object);

        if (typeof window.refreshSelectedObjectPanel === "function") {
            window.refreshSelectedObjectPanel();
        }

        setStatus(object.name + " properties updated.");
    }

    function connectColourInputs() {
        const colourInput = document.getElementById("propertyColourInput");
        const hexInput = document.getElementById("propertyHexInput");

        if (!colourInput || !hexInput) {
            return;
        }

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

    function initObjectProperties() {
        if (objectPropertiesInitialized) {
            return;
        }

        objectPropertiesInitialized = true;

        const applyButton = document.getElementById("applyObjectPropertiesBtn");

        if (applyButton) {
            applyButton.addEventListener("click", applyObjectProperties);
        }

        connectColourInputs();

        window.addEventListener("cad:selectionChanged", function (event) {
            if (event.detail && event.detail.object) {
                updateObjectPropertiesPanel(event.detail.object);
            } else {
                updateObjectPropertiesPanel(null);
            }
        });

        window.addEventListener("cad:objectChanged", function (event) {
            if (event.detail && event.detail.object) {
                updateObjectPropertiesPanel(event.detail.object);
            }
        });

        updateObjectPropertiesPanel(getSelectedObject());
    }

    window.updateObjectPropertiesPanel = updateObjectPropertiesPanel;
    window.applyObjectProperties = applyObjectProperties;

    document.addEventListener("DOMContentLoaded", initObjectProperties);
})();