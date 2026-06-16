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


function addDuplicateToCADScene(duplicatedObject, objectIndex) {
    if (typeof window.addObjectToCADScene === "function") {
        return window.addObjectToCADScene(duplicatedObject, {
            index: objectIndex
        });
    }

    const cadScene = getCADSceneForDuplicate();
    const cadObjects = getCADObjectListForDuplicate();

    if (!cadScene || !duplicatedObject) {
        return false;
    }

    cadScene.add(duplicatedObject);

    if (cadObjects.indexOf(duplicatedObject) === -1) {
        if (objectIndex >= 0 && objectIndex <= cadObjects.length) {
            cadObjects.splice(objectIndex, 0, duplicatedObject);
        } else {
            cadObjects.push(duplicatedObject);
        }
    }

    return true;
}


function removeDuplicateFromCADScene(duplicatedObject) {
    if (typeof window.removeObjectFromCADScene === "function") {
        return window.removeObjectFromCADScene(duplicatedObject);
    }

    const cadScene = getCADSceneForDuplicate();
    const cadObjects = getCADObjectListForDuplicate();

    if (!cadScene || !duplicatedObject) {
        return false;
    }

    if (typeof window.getSelectedCADObject === "function" && window.getSelectedCADObject() === duplicatedObject) {
        if (typeof window.clearSelection === "function") {
            window.clearSelection();
        } else {
            window.selectedObject = null;
        }
    }

    cadScene.remove(duplicatedObject);

    const objectIndex = cadObjects.indexOf(duplicatedObject);

    if (objectIndex !== -1) {
        cadObjects.splice(objectIndex, 1);
    }

    return true;
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


function getDuplicateHistoryLabel(sourceName, duplicateCount) {
    if (duplicateCount === 1) {
        return "Duplicate " + sourceName;
    }

    return "Duplicate " + sourceName + " x" + duplicateCount;
}


function setDuplicateSuccessStatus(sourceName, duplicatedObjectRecords) {
    if (duplicatedObjectRecords.length === 1) {
        setDuplicateStatus(duplicatedObjectRecords[0].object.name + " duplicated successfully.");
        return;
    }

    setDuplicateStatus(
        duplicatedObjectRecords.length +
        " duplicates created from " +
        sourceName +
        "."
    );
}


function recordDuplicateHistory(sourceName, duplicatedObjectRecords) {
    if (!window.CADHistory || typeof window.CADHistory.push !== "function") {
        return;
    }

    window.CADHistory.push({
        label: getDuplicateHistoryLabel(sourceName, duplicatedObjectRecords.length),
        undo: function () {
            duplicatedObjectRecords.slice().reverse().forEach(function (record) {
                removeDuplicateFromCADScene(record.object);
            });

            setDuplicateStatus("Duplicate removed.");
        },
        redo: function () {
            let lastRestoredObject = null;

            duplicatedObjectRecords.forEach(function (record) {
                if (addDuplicateToCADScene(record.object, record.index)) {
                    lastRestoredObject = record.object;
                }
            });

            if (lastRestoredObject) {
                selectDuplicatedObject(lastRestoredObject);
            }

            setDuplicateSuccessStatus(sourceName, duplicatedObjectRecords);
        }
    });
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
    const duplicatedObjectRecords = [];
    let lastDuplicatedObject = null;

    for (let copyNumber = 1; copyNumber <= duplicateCount; copyNumber++) {
        const duplicatedObject = createDuplicatedObject(
            selectedObject,
            offset,
            copyNumber
        );
        const objectIndex = cadObjects.length;

        if (addDuplicateToCADScene(duplicatedObject, objectIndex)) {
            duplicatedObjectRecords.push({
                object: duplicatedObject,
                index: objectIndex
            });
            lastDuplicatedObject = duplicatedObject;
        }
    }

    if (duplicatedObjectRecords.length === 0) {
        setDuplicateStatus("Could not duplicate selected object.");
        return;
    }

    if (lastDuplicatedObject) {
        selectDuplicatedObject(lastDuplicatedObject);
    }

    const sourceName = selectedObject.name || "selected object";

    recordDuplicateHistory(sourceName, duplicatedObjectRecords);
    setDuplicateSuccessStatus(sourceName, duplicatedObjectRecords);
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