(function () {
    "use strict";

    function sanitizeFilenamePart(value) {
        const cleaned = String(value || "objex-project")
            .trim()
            .replace(/[<>:"/\\|?*]+/g, "-")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "");

        return cleaned || "objex-project";
    }

    function createObjexFilename(projectName) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        return sanitizeFilenamePart(projectName) + "-" + timestamp + ".objex.json";
    }

    function downloadJsonFile(filename, payload) {
        const blob = new Blob([JSON.stringify(payload, null, 2)], {
            type: "application/json"
        });
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = objectUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(objectUrl);
    }

    function exportCADDesign(options) {
        const designDataApi = window.CADDesignData;
        const statusText = document.getElementById("cadStatusText");

        if (!designDataApi || typeof designDataApi.buildObjexDesignFile !== "function") {
            if (statusText) {
                statusText.textContent = "Design export module is not ready.";
            }
            return false;
        }

        const projectNameElement = document.getElementById("projectNameText");
        const projectDescriptionElement = document.getElementById("projectDescriptionText");
        const projectName = options && options.name
            ? options.name
            : (projectNameElement ? projectNameElement.textContent : "Untitled Project");
        const projectDescription = options && options.description
            ? options.description
            : (projectDescriptionElement ? projectDescriptionElement.textContent : "");

        const objects = typeof window.getCADObjectsForSaving === "function"
            ? window.getCADObjectsForSaving()
            : designDataApi.serializeCADObjects(window.cadObjects || []);

        const payload = designDataApi.buildObjexDesignFile({
            name: projectName,
            description: projectDescription === "No description added." ? "" : projectDescription
        }, objects);

        const filename = createObjexFilename(projectName);
        downloadJsonFile(filename, payload);

        if (statusText) {
            statusText.textContent = "Design exported. Objects: " + objects.length + ".";
        }

        return true;
    }

    window.exportCADDesign = exportCADDesign;
    window.createObjexDesignFilename = createObjexFilename;
})();
