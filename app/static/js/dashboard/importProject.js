(function () {
    "use strict";

    const importProjectBtn = document.getElementById("importProjectBtn");
    const importProjectFileInput = document.getElementById("importProjectFileInput");
    const importProjectFormatSelect = document.getElementById("importProjectFormatSelect");
    const recentProjectsMeta = document.getElementById("recentProjectsMeta");
    const importProjectError = document.getElementById("importProjectError");

    function getSelectedFormat() {
        const formatApi = window.CADModelFormats;

        if (!importProjectFormatSelect) {
            return "glb";
        }

        if (formatApi && typeof formatApi.normalizeModelFormat === "function") {
            return formatApi.normalizeModelFormat(importProjectFormatSelect.value);
        }

        return importProjectFormatSelect.value || "glb";
    }

    function updateFileAccept() {
        const formatApi = window.CADModelFormats;
        const format = getSelectedFormat();

        if (!importProjectFileInput || !formatApi || typeof formatApi.getAcceptForModelFormat !== "function") {
            return;
        }

        importProjectFileInput.accept = formatApi.getAcceptForModelFormat(format);
    }

    function setImportMessage(message) {
        if (recentProjectsMeta) {
            recentProjectsMeta.textContent = message;
        }

        const projectsPageMeta = document.getElementById("projectsPageMeta");

        if (projectsPageMeta) {
            projectsPageMeta.textContent = message;
        }
    }

    function setImportError(message) {
        if (importProjectError) {
            importProjectError.textContent = message;
            importProjectError.style.display = message ? "block" : "none";
            return;
        }

        setImportMessage(message);
    }

    function resolveProjectName(filename) {
        const formatApi = window.CADModelFormats;

        if (formatApi && typeof formatApi.getModelNameFromFilename === "function") {
            const nameFromFile = formatApi.getModelNameFromFilename(filename);

            if (nameFromFile) {
                return nameFromFile;
            }
        }

        const fallbackName = window.prompt("Enter a project name for the imported model:", "Imported Project");
        return fallbackName ? fallbackName.trim() : "";
    }

    async function importProjectFile(file) {
        if (!file) {
            return;
        }

        if (!window.CADImportModel || typeof window.CADImportModel.parseModelFileToDesignData !== "function") {
            setImportError("Model import module is not ready. Refresh the page and try again.");
            return;
        }

        const selectedFormat = getSelectedFormat();

        if (importProjectBtn) {
            importProjectBtn.disabled = true;
            importProjectBtn.textContent = "Importing...";
        }

        setImportError("");
        setImportMessage("Reading " + selectedFormat.toUpperCase() + " file...");

        try {
            const parsed = await window.CADImportModel.parseModelFileToDesignData(file, {
                format: selectedFormat
            });

            if (!parsed.success || !Array.isArray(parsed.objects)) {
                setImportError(parsed.message || "Could not parse model file.");
                return;
            }

            const projectName = resolveProjectName(file.name);

            if (!projectName) {
                setImportError("Project name is required to import.");
                return;
            }

            setImportMessage("Creating imported project...");

            const response = await fetch("/api/projects/import", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    name: projectName,
                    description: "Imported " + selectedFormat.toUpperCase() + " model",
                    design_data: parsed.objects
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                setImportError(data.message || "Project import failed.");
                return;
            }

            setImportMessage("Imported project: " + projectName);

            if (typeof window.loadProjects === "function") {
                await window.loadProjects(data.project && data.project.id ? data.project.id : null);
            }

        } catch (error) {
            console.error("Import project error:", error);
            setImportError("Server error while importing project.");
        } finally {
            if (importProjectBtn) {
                importProjectBtn.disabled = false;
                importProjectBtn.textContent = "Import Project";
            }

            if (importProjectFileInput) {
                importProjectFileInput.value = "";
            }
        }
    }

    if (importProjectFormatSelect) {
        importProjectFormatSelect.addEventListener("change", updateFileAccept);
    }

    if (importProjectBtn && importProjectFileInput) {
        importProjectBtn.addEventListener("click", function () {
            updateFileAccept();
            importProjectFileInput.click();
        });

        importProjectFileInput.addEventListener("change", function (event) {
            const file = event.target.files && event.target.files[0];

            if (file) {
                importProjectFile(file);
            }
        });
    }

    updateFileAccept();
})();
