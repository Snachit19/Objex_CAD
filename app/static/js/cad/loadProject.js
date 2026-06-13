let loadedProjectDesignData = [];
let savedObjectsRestored = false;
let restoreRetryCount = 0;

function setTextById(elementId, text) {
    const element = document.getElementById(elementId);

    if (element) {
        element.textContent = text;
    }
}

function parseDesignData(designData) {
    if (Array.isArray(designData)) {
        return designData;
    }

    if (typeof designData === "string") {
        try {
            const parsedData = JSON.parse(designData);

            if (Array.isArray(parsedData)) {
                return parsedData;
            }

            return [];
        } catch (error) {
            console.error("Could not parse design data:", error);
            return [];
        }
    }

    return [];
}

async function loadProject() {
    const projectId = window.PROJECT_ID;

    if (!projectId) {
        setTextById("cadStatusText", "Project ID missing.");
        return;
    }

    try {
        const response = await fetch("/api/projects/" + projectId);
        const data = await response.json();

        if (!response.ok || !data.success) {
            setTextById("cadStatusText", data.message || "Could not open project.");
            return;
        }

        const project = data.project;

        setTextById("cadProjectName", project.name);
        setTextById(
            "cadProjectDescription",
            project.description || "No description added."
        );

        setTextById("projectNameText", project.name);
        setTextById(
            "projectDescriptionText",
            project.description || "No description added."
        );

        loadedProjectDesignData = parseDesignData(project.design_data);

        setTextById("cadStatusText", "Saved project opened successfully.");

        restoreSavedCADObjects();

        console.log("Loaded project:", project);

    } catch (error) {
        console.error("Project loading error:", error);
        setTextById("cadStatusText", "Server error while opening project.");
    }
}

function applySavedColour(object, colour) {
    if (!object || !object.material || !colour) {
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
}

function restoreSingleObject(savedObject) {
    if (!savedObject || !savedObject.type) {
        return null;
    }

    const beforeCount = window.cadObjects.length;
    const createdObject = addShape(savedObject.type);

    let object = createdObject;

    if (!object && window.cadObjects.length > beforeCount) {
        object = window.cadObjects[window.cadObjects.length - 1];
    }

    if (!object) {
        return null;
    }

    object.name = savedObject.name || object.name || "Unnamed Object";

    object.userData = object.userData || {};
    object.userData.id = savedObject.id || object.userData.id || "";
    object.userData.type = savedObject.type || object.userData.type || "unknown";
    object.userData.selectable = true;
    object.userData.color = savedObject.color || object.userData.color || "#ffffff";
    object.userData.materialType = savedObject.materialType || "default";
    object.userData.materialName = savedObject.materialName || "Default";

    if (savedObject.position) {
        object.position.set(
            Number(savedObject.position.x) || 0,
            Number(savedObject.position.y) || 0,
            Number(savedObject.position.z) || 0
        );
    }

    if (savedObject.rotation) {
        object.rotation.set(
            Number(savedObject.rotation.x) || 0,
            Number(savedObject.rotation.y) || 0,
            Number(savedObject.rotation.z) || 0
        );
    }

    if (savedObject.scale) {
        object.scale.set(
            Number(savedObject.scale.x) || 1,
            Number(savedObject.scale.y) || 1,
            Number(savedObject.scale.z) || 1
        );
    }

    applySavedColour(object, object.userData.color);

    return object;
}

function restoreSavedCADObjects() {
    if (savedObjectsRestored) {
        return;
    }

    if (!Array.isArray(loadedProjectDesignData)) {
        savedObjectsRestored = true;
        return;
    }

    if (loadedProjectDesignData.length === 0) {
        savedObjectsRestored = true;
        setTextById("cadStatusText", "Saved project opened successfully. No objects saved yet.");
        return;
    }

    if (typeof addShape !== "function" || !window.cadObjects || !window.CADWorkspace) {
        restoreRetryCount = restoreRetryCount + 1;

        if (restoreRetryCount <= 10) {
            setTimeout(restoreSavedCADObjects, 300);
        } else {
            setTextById("cadStatusText", "Project loaded, but CAD scene is not ready.");
        }

        return;
    }

    loadedProjectDesignData.forEach(function (savedObject) {
        restoreSingleObject(savedObject);
    });

    savedObjectsRestored = true;

    setTextById(
        "cadStatusText",
        "Saved project opened successfully. Objects loaded: " +
        loadedProjectDesignData.length
    );

    if (typeof window.clearSelection === "function") {
        window.clearSelection();
    }
}

document.addEventListener("DOMContentLoaded", function () {
    if (window.isCADSceneReady && window.isCADSceneReady()) {
        loadProject();
        return;
    }

    window.addEventListener("cad:ready", function () {
        loadProject();
    }, { once: true });
});

window.loadProject = loadProject;
window.restoreSavedCADObjects = restoreSavedCADObjects;