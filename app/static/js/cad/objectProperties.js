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

    function showToast(message, duration) {
        const toastDuration = duration || 3000;
        let container = document.getElementById("toastContainer");

        if (!container) {
            container = document.createElement("div");
            container.id = "toastContainer";
            container.className = "toast-container";
            document.body.appendChild(container);
        }

        const toast = document.createElement("div");
        toast.className = "toast";
        toast.textContent = message;
        toast.style.animation =
            "toastSlideIn 0.5s cubic-bezier(0.18, 0.89, 0.32, 1.28), " +
            "toastFadeOut 0.5s " +
            Math.max(toastDuration - 500, 500) +
            "ms forwards";

        container.appendChild(toast);

        setTimeout(function () {
            toast.remove();
        }, toastDuration);
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

    function titleCaseMaterialType(materialType) {
        return materialType.charAt(0).toUpperCase() + materialType.slice(1);
    }

    function getObjectMaterialType(object) {
        if (!object || !object.userData) {
            return "default";
        }

        return object.userData.materialType || "default";
    }

    function getMaterialName(materialType, object) {
        if (typeof window.getMaterialDisplayName === "function") {
            return window.getMaterialDisplayName(materialType);
        }

        if (object && object.userData && object.userData.materialName) {
            return object.userData.materialName;
        }

        return titleCaseMaterialType(materialType);
    }

    function getStoredMaterialPropertySummary(object) {
        if (!object || !object.userData || !object.userData.materialData) {
            return "";
        }

        const materialData = object.userData.materialData;
        const details = [
            "Roughness " + formatNumber(materialData.roughness || 0, 2),
            "Metalness " + formatNumber(materialData.metalness || 0, 2),
            "Opacity " + formatNumber(materialData.opacity === undefined ? 1 : materialData.opacity, 2)
        ];

        if (materialData.transparent) {
            details.push("Transparent");
        }

        if (materialData.emissiveIntensity) {
            details.push("Glow " + formatNumber(materialData.emissiveIntensity, 2));
        }

        return details.join(" | ");
    }

    function getMaterialDetails(materialType, object) {
        if (typeof window.getMaterialPropertySummary === "function") {
            return window.getMaterialPropertySummary(
                materialType,
                object && object.userData ? object.userData.materialData : null
            );
        }

        return getStoredMaterialPropertySummary(object) || "Material properties unavailable.";
    }

    function updateMaterialReadout(materialType, object) {
        setTextValue("propertyMaterialNameText", getMaterialName(materialType, object));
        setTextValue("propertyMaterialDetailsText", getMaterialDetails(materialType, object));
    }

    function formatNumber(value, decimals) {
        return Number(value).toFixed(decimals);
    }

    function valuesAreDifferent(oldValue, newValue, decimals) {
        return formatNumber(oldValue, decimals) !== formatNumber(newValue, decimals);
    }

    function addAxisChanges(changes, label, oldValues, newValues, decimals) {
        let hasChanges = false;

        ["x", "y", "z"].forEach(function (axis) {
            if (valuesAreDifferent(oldValues[axis], newValues[axis], decimals)) {
                hasChanges = true;
            }
        });

        if (hasChanges) {
            changes.push(label);
        }
    }

    function getObjectPropertyChanges(object, nextProperties) {
        const changes = [];
        const currentName = object.name || "Unnamed Object";
        const currentColour = getObjectColour(object);

        if (currentName !== nextProperties.name) {
            changes.push("Name");
        }

        addAxisChanges(
            changes,
            "Position",
            {
                x: object.position.x,
                y: object.position.y,
                z: object.position.z
            },
            nextProperties.position,
            2
        );

        addAxisChanges(
            changes,
            "Rotation",
            {
                x: radianToDegree(object.rotation.x),
                y: radianToDegree(object.rotation.y),
                z: radianToDegree(object.rotation.z)
            },
            nextProperties.rotation,
            0
        );

        addAxisChanges(
            changes,
            "Scale",
            {
                x: object.scale.x,
                y: object.scale.y,
                z: object.scale.z
            },
            nextProperties.scale,
            2
        );

        if (currentColour !== nextProperties.colour) {
            changes.push("Colour");
        }

        const currentMaterial = (object.userData && object.userData.materialType) || "default";

        if (currentMaterial !== nextProperties.material) {
            changes.push("Material");
        }

        if (changes.length === 0) {
            return "No changes applied.";
        }

        return "Changed: " + changes.join(", ");
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

            const materialSelect = document.getElementById("propertyMaterialSelect");
            if (materialSelect) materialSelect.value = "default";
            setTextValue("propertyMaterialNameText", "None");
            setTextValue("propertyMaterialDetailsText", "Select an object to view material properties.");

            setTextValue("propertyDimensionsText", "None");

            return;
        }

        object.userData = object.userData || {};
        const materialType = getObjectMaterialType(object);
        object.userData.materialType = materialType;
        object.userData.materialName = getMaterialName(materialType, object);

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

        const materialSelect = document.getElementById("propertyMaterialSelect");

        if (materialSelect) {
            materialSelect.value = materialType;
        }

        updateMaterialReadout(materialType, object);

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
            showToast("No object selected");
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
            showToast("Invalid colour");
            return;
        }

        if (scaleX <= 0 || scaleY <= 0 || scaleZ <= 0) {
            setStatus("Scale values must be greater than 0.");
            showToast("Invalid scale");
            return;
        }

        const materialSelect = document.getElementById("propertyMaterialSelect");
        const selectedMaterial = materialSelect
            ? materialSelect.value
            : (object.userData.materialType || "default");

        const changeMessage = getObjectPropertyChanges(object, {
            name: objectName,
            position: {
                x: positionX,
                y: positionY,
                z: positionZ
            },
            rotation: {
                x: rotationX,
                y: rotationY,
                z: rotationZ
            },
            scale: {
                x: scaleX,
                y: scaleY,
                z: scaleZ
            },
            colour: selectedColour,
            material: selectedMaterial
        });

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

        if (selectedMaterial !== (object.userData.materialType || "default") && typeof window.applyMaterialPreset === "function") {
            window.applyMaterialPreset(selectedMaterial, {
                recordHistory: false,
                showNotification: false
            });
        }

        applyColourToObject(object, selectedColour);
        updateObjectPropertiesPanel(object);

        if (typeof window.refreshSelectedObjectPanel === "function") {
            window.refreshSelectedObjectPanel();
        }

        setStatus(object.name + " properties updated.");
        showToast(changeMessage, 4200);
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

    function connectMaterialSelector() {
        const materialSelect = document.getElementById("propertyMaterialSelect");

        if (!materialSelect) {
            return;
        }

        materialSelect.addEventListener("change", function () {
            updateMaterialReadout(materialSelect.value, getSelectedObject());
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
        connectMaterialSelector();

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
    window.showToast = showToast;

    document.addEventListener("DOMContentLoaded", initObjectProperties);
})();