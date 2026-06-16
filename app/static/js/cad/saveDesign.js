function getCADObjectsForSaving() {
    const objects = window.cadObjects || [];

    return objects.map(function (object) {
        let color = "#ffffff";

        if (object.userData && object.userData.color) {
            color = object.userData.color;
        } else if (object.material && object.material.color) {
            color = "#" + object.material.color.getHexString();
        }

        return {
            id: object.userData && object.userData.id ? object.userData.id : "",
            name: object.name || "Unnamed Object",
            type: object.userData && object.userData.type ? object.userData.type : "unknown",

            position: {
                x: object.position.x,
                y: object.position.y,
                z: object.position.z
            },

            rotation: {
                x: object.rotation.x,
                y: object.rotation.y,
                z: object.rotation.z
            },

            scale: {
                x: object.scale.x,
                y: object.scale.y,
                z: object.scale.z
            },

            color: color,
            materialType: (object.userData && object.userData.materialType) || "default",
            materialName: (object.userData && object.userData.materialName) || "Default",
            materialDescription: (object.userData && object.userData.materialDescription) || "",
            materialData: object.userData.materialData || null
        };
    });
}


async function saveDesign() {
    const saveButton = document.getElementById("saveDesignBtn");
    const statusText = document.getElementById("cadStatusText");
    const projectId = window.PROJECT_ID;

    if (!projectId) {
        if (statusText) {
            statusText.textContent = "Project ID missing. Cannot save design.";
        }
        return;
    }

    const designData = getCADObjectsForSaving();

    try {
        if (saveButton) {
            saveButton.disabled = true;
            saveButton.textContent = "Saving...";
        }

        if (statusText) {
            statusText.textContent = "Saving design...";
        }

        const response = await fetch("/api/projects/" + projectId + "/save", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                design_data: designData
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            if (statusText) {
                statusText.textContent = data.message || "Could not save design.";
            }
            return;
        }

        if (statusText) {
            statusText.textContent =
                "Design saved successfully. Objects saved: " + data.object_count;
        }

        console.log("Saved design:", designData);

    } catch (error) {
        console.error("Save design error:", error);

        if (statusText) {
            statusText.textContent = "Server error while saving design.";
        }

    } finally {
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent = "Save Design";
        }
    }
}


document.addEventListener("DOMContentLoaded", function () {
    const saveButton = document.getElementById("saveDesignBtn");

    if (!saveButton) {
        console.error("Save Design button not found.");
        return;
    }

    saveButton.addEventListener("click", saveDesign);
});
