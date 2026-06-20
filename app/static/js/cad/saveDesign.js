let cadDesignHasUnsavedChanges = false;


function isSaveReminderEnabled() {
    if (!window.ObjexCADSettings) {
        return true;
    }

    return window.ObjexCADSettings.load().saveReminder !== false;
}


function markCADDesignDirty() {
    cadDesignHasUnsavedChanges = true;
}


function markCADDesignSaved() {
    cadDesignHasUnsavedChanges = false;
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

    if (typeof window.getCADObjectsForSaving !== "function") {
        if (statusText) {
            statusText.textContent = "Save tools are not ready. Refresh the CAD page and try again.";
        }

        return;
    }

    const designData = window.getCADObjectsForSaving();

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

        markCADDesignSaved();

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

    window.addEventListener("cad:objectChanged", markCADDesignDirty);
    window.addEventListener("cad:historyChanged", markCADDesignDirty);
    window.addEventListener("beforeunload", function (event) {
        if (!cadDesignHasUnsavedChanges || !isSaveReminderEnabled()) {
            return;
        }

        event.preventDefault();
        event.returnValue = "";
    });
});


window.markCADDesignDirty = markCADDesignDirty;
window.markCADDesignSaved = markCADDesignSaved;
