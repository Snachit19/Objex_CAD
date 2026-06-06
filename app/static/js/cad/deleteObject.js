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


function deleteSelectedObject() {
    const object = getDeleteSelectedObject();

    if (!object) {
        setDeleteStatus("Please select an object before deleting.");
        return;
    }

    const { scene } = window.CADWorkspace;
    const cadObjects = window.cadObjects || [];

    if (!scene) {
        console.error("CAD Scene not found.");
        return;
    }

    // Confirm deletion
    const objectName = object.name || "Object";

    // Remove from scene
    scene.remove(object);

    // Remove from cadObjects array
    const objIndex = cadObjects.indexOf(object);

    if (objIndex !== -1) {
        cadObjects.splice(objIndex, 1);
    }

    // Set selection to null
    if (typeof window.setSelectedCADObject === "function") {
        window.setSelectedCADObject(null);
    } else {
        window.selectedObject = null;
    }

    // Notify others that selection changed to null
    window.dispatchEvent(new CustomEvent("cad:selectionChanged", {
        detail: { object: null }
    }));

    // Fresh UI
    if (typeof window.refreshSelectedObjectPanel === "function") {
        window.refreshSelectedObjectPanel();
    }

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
