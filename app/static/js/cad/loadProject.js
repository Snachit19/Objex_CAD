let loadedProjectDesignData = [];
let savedObjectsRestored = false;
let restoreRetryCount = 0;


function setTextById(elementId, text) {
    const element = document.getElementById(elementId);

    if (element) {
        element.textContent = text;
    }
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

        if (Array.isArray(project.design_data)) {
            loadedProjectDesignData = project.design_data;
        } else if (typeof project.design_data === "string") {
            try {
                loadedProjectDesignData = JSON.parse(project.design_data);
            } catch (error) {
                loadedProjectDesignData = [];
            }
        } else {
            loadedProjectDesignData = [];
        }

        setTextById("cadStatusText", "Saved project opened successfully.");

        restoreSavedCADObjects();

    } catch (error) {
        console.error("Project loading error:", error);
        setTextById("cadStatusText", "Server error while opening project.");
    }
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
        return;
    }

    if (
        (typeof addShape !== "function" || !window.cadObjects) &&
        (!window.CADDesignData || typeof window.CADDesignData.restoreObjectsFromData !== "function")
    ) {
        restoreRetryCount = restoreRetryCount + 1;

        if (restoreRetryCount <= 10) {
            setTimeout(restoreSavedCADObjects, 300);
        } else {
            setTextById("cadStatusText", "Project loaded, but CAD scene is not ready.");
        }

        return;
    }

    if (window.CADDesignData && typeof window.CADDesignData.restoreObjectsFromData === "function") {
        window.CADDesignData.restoreObjectsFromData(loadedProjectDesignData, {
            recordHistory: false
        });
    } else {
        loadedProjectDesignData.forEach(function (savedObject) {
            if (window.CADDesignData && typeof window.CADDesignData.restoreObjectFromData === "function") {
                window.CADDesignData.restoreObjectFromData(savedObject, {
                    recordHistory: false
                });
            }
        });
    }

    savedObjectsRestored = true;

    setTextById(
        "cadStatusText",
        "Saved project opened successfully. Objects loaded: " +
        loadedProjectDesignData.length
    );
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
