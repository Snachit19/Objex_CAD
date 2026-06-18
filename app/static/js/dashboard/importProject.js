(function () {
    "use strict";

    const importProjectBtn = document.getElementById("importProjectBtn");
    const importProjectFileInput = document.getElementById("importProjectFileInput");
    const recentProjectsMeta = document.getElementById("recentProjectsMeta");
    const importProjectError = document.getElementById("importProjectError");

    function setImportMessage(message) {
        if (recentProjectsMeta) {
            recentProjectsMeta.textContent = message;
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

    function resolveProjectName(parsed, filename) {
        if (parsed.name) {
            return parsed.name;
        }

        if (window.CADDesignValidator && typeof window.CADDesignValidator.getNameFromFilename === "function") {
            const nameFromFile = window.CADDesignValidator.getNameFromFilename(filename);

            if (nameFromFile) {
                return nameFromFile;
            }
        }

        const fallbackName = window.prompt("Enter a project name for the imported design:", "Imported Project");
        return fallbackName ? fallbackName.trim() : "";
    }

    async function importProjectFile(file) {
        if (!file) {
            return;
        }

        const validator = window.CADDesignValidator;

        if (!validator || typeof validator.parseDesignFileText !== "function") {
            setImportError("Import validator is not ready. Refresh the page and try again.");
            return;
        }

        if (importProjectBtn) {
            importProjectBtn.disabled = true;
            importProjectBtn.textContent = "Importing...";
        }

        setImportError("");
        setImportMessage("Reading import file...");

        try {
            const fileText = await file.text();
            const parsed = validator.parseDesignFileText(fileText);

            if (!parsed.valid) {
                setImportError(parsed.errors.join(" "));
                return;
            }

            const projectName = resolveProjectName(parsed, file.name);

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
                    description: parsed.description || "",
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

    if (importProjectBtn && importProjectFileInput) {
        importProjectBtn.addEventListener("click", function () {
            importProjectFileInput.click();
        });

        importProjectFileInput.addEventListener("change", function (event) {
            const file = event.target.files && event.target.files[0];

            if (file) {
                importProjectFile(file);
            }
        });
    }
})();
