function getDeleteSelectedObject() {
    if (typeof window.getSelectedCADObject === "function") {
        return window.getSelectedCADObject();
    }

    return window.selectedObject || null;
}


function setDeleteStatus(message) {
    const statusText = document.getElementById("cadStatusText");

    if (statusText) {
        statusText.textContent = message;
    }
}


function removeObjectForDelete(object) {
    if (typeof window.removeObjectFromCADScene === "function") {
        return window.removeObjectFromCADScene(object);
    }

    const workspace = window.CADWorkspace;
    const cadObjects = window.cadObjects || [];

    if (!workspace || !workspace.scene || !object) {
        return false;
    }

    workspace.scene.remove(object);

    const objectIndex = cadObjects.indexOf(object);

    if (objectIndex !== -1) {
        cadObjects.splice(objectIndex, 1);
    }

    if (typeof window.clearSelection === "function") {
        window.clearSelection();
    } else {
        window.selectedObject = null;

        window.dispatchEvent(new CustomEvent("cad:selectionChanged", {
            detail: { object: null }
        }));
    }

    return true;
}


function restoreDeletedObject(object, objectIndex) {
    if (typeof window.addObjectToCADScene === "function") {
        return window.addObjectToCADScene(object, {
            index: objectIndex
        });
    }

    const workspace = window.CADWorkspace;
    window.cadObjects = window.cadObjects || [];

    if (!workspace || !workspace.scene || !object) {
        return false;
    }

    workspace.scene.add(object);

    if (window.cadObjects.indexOf(object) === -1) {
        if (objectIndex >= 0 && objectIndex <= window.cadObjects.length) {
            window.cadObjects.splice(objectIndex, 0, object);
        } else {
            window.cadObjects.push(object);
        }
    }

    return true;
}


function selectRestoredObject(object) {
    if (typeof window.selectObject === "function") {
        window.selectObject(object);
        return;
    }

    window.selectedObject = object;

    if (typeof window.refreshSelectedObjectPanel === "function") {
        window.refreshSelectedObjectPanel();
    }

    window.dispatchEvent(new CustomEvent("cad:selectionChanged", {
        detail: {
            object: object
        }
    }));
}


function recordDeleteHistory(object, objectName, objectIndex) {
    if (!window.CADHistory || typeof window.CADHistory.push !== "function") {
        return;
    }

    window.CADHistory.push({
        label: "Delete " + objectName,
        undo: function () {
            if (restoreDeletedObject(object, objectIndex)) {
                selectRestoredObject(object);
                setDeleteStatus(objectName + " restored.");
            }
        },
        redo: function () {
            if (removeObjectForDelete(object)) {
                setDeleteStatus(objectName + " deleted.");
            }
        }
    });
}


function deleteSelectedObject() {
    const object = getDeleteSelectedObject();

    if (!object) {
        setDeleteStatus("Please select an object before deleting.");
        return;
    }

    const workspace = window.CADWorkspace;
    const cadObjects = window.cadObjects || [];

    if (!workspace || !workspace.scene) {
        console.error("CAD Scene not found.");
        setDeleteStatus("CAD scene is not available.");
        return;
    }

    const objectName = object.name || "Object";
    const objectIndex = cadObjects.indexOf(object);

    if (!removeObjectForDelete(object)) {
        setDeleteStatus("Could not delete " + objectName + ".");
        return;
    }

    recordDeleteHistory(object, objectName, objectIndex);
    setDeleteStatus(objectName + " deleted successfully.");
}


function initDeleteObjectControls() {
    const deleteObjectBtn = document.getElementById("deleteObjectBtn");
    const dashboardDeleteBtn = document.getElementById("dashboardDeleteBtn");

    if (deleteObjectBtn) {
        deleteObjectBtn.addEventListener("click", deleteSelectedObject);
    }

    if (dashboardDeleteBtn) {
        dashboardDeleteBtn.addEventListener("click", deleteSelectedObject);
    }

    window.addEventListener("cad:selectionChanged", function (event) {
        const hint = document.getElementById("deleteObjectHint");
        const panel = document.getElementById("deleteObjectPanel");

        if (event.detail && event.detail.object) {
            if (hint) hint.classList.add("tool-panel-hidden");
        } else {
            if (hint) hint.classList.remove("tool-panel-hidden");
        }
    });
}


document.addEventListener("DOMContentLoaded", function () {
    initDeleteObjectControls();
});