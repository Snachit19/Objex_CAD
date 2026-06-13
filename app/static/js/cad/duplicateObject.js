function getDuplicateSelectedObject() {
    if (typeof window.getSelectedCADObject === "function") {
        return window.getSelectedCADObject();
    }

    return window.selectedObject || null;
}


function setDuplicateStatus(message) {
    const statusText = document.getElementById("cadStatusText");

    if (statusText) {
        statusText.textContent = message;
    }
}


function getDuplicateOffset() {
    const offsetInput = document.getElementById("duplicateOffsetInput");

    if (!offsetInput) {
        return 1;
    }

    const value = Number(offsetInput.value);

    if (isNaN(value) || value <= 0) {
        return 1;
    }

    return value;
}


function getDuplicateCount() {
    const countInput = document.getElementById("duplicateCountInput");

    if (!countInput) {
        return 1;
    }

    const value = Math.floor(Number(countInput.value));

    if (isNaN(value) || value <= 0) {
        return 1;
    }

    return Math.min(value, 50);
}


function getCADSceneForDuplicate() {
    if (typeof scene !== "undefined") {
        return scene;
    }

    if (window.scene) {
        return window.scene;
    }

    return null;
}


function getCADObjectListForDuplicate() {
    if (window.cadObjects && Array.isArray(window.cadObjects)) {
        return window.cadObjects;
    }

    if (typeof cadObjects !== "undefined" && Array.isArray(cadObjects)) {
        return cadObjects;
    }

    window.cadObjects = [];
    return window.cadObjects;
}


function cloneMaterialForDuplicate(material) {
    if (Array.isArray(material)) {
        return material.map(function (singleMaterial) {
            return singleMaterial.clone();
        });
    }

    if (material && typeof material.clone === "function") {
        return material.clone();
    }

    return material;
}


function createDuplicateName(originalName, copyNumber) {
    const baseName = originalName || "Object";
    return baseName + " Copy " + copyNumber;
}


function createDuplicateObjectId(copyNumber) {
    return "object-" + Date.now() + "-" + copyNumber + "-" + Math.floor(Math.random() * 1000);
}


function createDuplicatedObject(selectedObject, offset, copyNumber) {
    const duplicatedObject = new THREE.Mesh(
        selectedObject.geometry.clone(),
        cloneMaterialForDuplicate(selectedObject.material)
    );

    duplicatedObject.name = createDuplicateName(selectedObject.name, copyNumber);

    duplicatedObject.position.copy(selectedObject.position);
    duplicatedObject.position.x += offset * copyNumber;
    duplicatedObject.position.z += offset * copyNumber;

    duplicatedObject.rotation.copy(selectedObject.rotation);
    duplicatedObject.scale.copy(selectedObject.scale);

    duplicatedObject.userData = Object.assign({}, selectedObject.userData);
    duplicatedObject.userData.id = createDuplicateObjectId(copyNumber);
    duplicatedObject.userData.selectable = true;

    if (selectedObject.userData && selectedObject.userData.type) {
        duplicatedObject.userData.type = selectedObject.userData.type;
    }

    if (selectedObject.userData && selectedObject.userData.color) {
        duplicatedObject.userData.color = selectedObject.userData.color;
    } else if (duplicatedObject.material && duplicatedObject.material.color) {
        duplicatedObject.userData.color = "#" + duplicatedObject.material.color.getHexString();
    }

    return duplicatedObject;
}


function selectDuplicatedObject(duplicatedObject) {
    if (typeof window.selectObject === "function") {
        window.selectObject(duplicatedObject);
        return;
    }

    window.selectedObject = duplicatedObject;

    if (typeof window.refreshSelectedObjectPanel === "function") {
        window.refreshSelectedObjectPanel();
    }

    window.dispatchEvent(new CustomEvent("cad:selectionChanged", {
        detail: {
            object: duplicatedObject
        }
    }));
}


function duplicateSelectedObject() {
    const selectedObject = getDuplicateSelectedObject();

    if (!selectedObject) {
        setDuplicateStatus("Please select an object before duplicating.");
        return;
    }

    const cadScene = getCADSceneForDuplicate();

    if (!cadScene) {
        setDuplicateStatus("CAD scene is not available.");
        return;
    }

    if (!selectedObject.geometry || !selectedObject.material) {
        setDuplicateStatus("Selected object cannot be duplicated.");
        return;
    }

    const offset = getDuplicateOffset();
    const duplicateCount = getDuplicateCount();

    const cadObjects = getCADObjectListForDuplicate();
    let lastDuplicatedObject = null;

    for (let copyNumber = 1; copyNumber <= duplicateCount; copyNumber++) {
        const duplicatedObject = createDuplicatedObject(
            selectedObject,
            offset,
            copyNumber
        );

        cadScene.add(duplicatedObject);
        cadObjects.push(duplicatedObject);
        lastDuplicatedObject = duplicatedObject;
    }

    if (lastDuplicatedObject) {
        selectDuplicatedObject(lastDuplicatedObject);
    }

    if (duplicateCount === 1) {
        setDuplicateStatus(lastDuplicatedObject.name + " duplicated successfully.");
    } else {
        setDuplicateStatus(
            duplicateCount +
            " duplicates created from " +
            (selectedObject.name || "selected object") +
            "."
        );
    }
}


function initDuplicateObjectControls() {
    const duplicateObjectBtn = document.getElementById("duplicateObjectBtn");

    if (duplicateObjectBtn) {
        duplicateObjectBtn.addEventListener("click", duplicateSelectedObject);
    }
}


window.duplicateSelectedObject = duplicateSelectedObject;

document.addEventListener("DOMContentLoaded", function () {
    initDuplicateObjectControls();
});
