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

        console.log("Loaded project:", project);

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

    if (typeof addShape !== "function" || !window.cadObjects) {
        restoreRetryCount = restoreRetryCount + 1;

        if (restoreRetryCount <= 10) {
            setTimeout(restoreSavedCADObjects, 300);
        } else {
            setTextById("cadStatusText", "Project loaded, but CAD scene is not ready.");
        }

        return;
    }

    loadedProjectDesignData.forEach(function (savedObject) {
        if (!savedObject || !savedObject.type) {
            return;
        }

        const beforeCount = window.cadObjects.length;

        const createdObject = addShape(savedObject.type, {
            recordHistory: false
        });

        let object = createdObject;

        if (!object && window.cadObjects.length > beforeCount) {
            object = window.cadObjects[window.cadObjects.length - 1];
        }

        if (!object) {
            return;
        }

        object.name = savedObject.name || object.name || "Unnamed Object";

        object.userData = object.userData || {};
        object.userData.id = savedObject.id || object.userData.id || "";
        object.userData.type = savedObject.type || object.userData.type || "unknown";
        object.userData.selectable = true;
        object.userData.color = savedObject.color || "#ffffff";

        if (savedObject.materialType) {
            object.userData.materialType = savedObject.materialType;
        } else {
            object.userData.materialType = "default";
        }

        if (savedObject.materialName) {
            object.userData.materialName = savedObject.materialName;
        } else {
            object.userData.materialName = "Default";
        }

        if (savedObject.materialDescription) {
            object.userData.materialDescription = savedObject.materialDescription;
        }

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

        if (savedObject.color && object.material) {
            if (Array.isArray(object.material)) {
                object.material.forEach(function (material) {
                    if (material && material.color) {
                        material.color.set(savedObject.color);
                        material.needsUpdate = true;
                    }
                });
            } else if (object.material.color) {
                object.material.color.set(savedObject.color);
                object.material.needsUpdate = true;
            }
        }

        if (savedObject.materialData) {
            object.userData.materialData = savedObject.materialData;

            const matData = savedObject.materialData;
            let newMaterial;
            const emissiveColor = savedObject.materialType === "neon"
                ? savedObject.color
                : (matData.emissive || 0x000000);

            const materialParams = {
                color: savedObject.color || 0xcccccc,
                roughness: matData.roughness === undefined ? 0.5 : Number(matData.roughness),
                metalness: matData.metalness === undefined ? 0.5 : Number(matData.metalness),
                opacity: matData.opacity === undefined ? 1.0 : Number(matData.opacity),
                transparent: matData.transparent || false,
                emissive: new THREE.Color(emissiveColor || 0x000000),
                emissiveIntensity: matData.emissiveIntensity === undefined ? 1.0 : Number(matData.emissiveIntensity),
                depthWrite: matData.depthWrite !== undefined ? matData.depthWrite : true
            };

            newMaterial = new THREE.MeshStandardMaterial(materialParams);

            object.material = newMaterial;
            object.material.needsUpdate = true;
        }
    });

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