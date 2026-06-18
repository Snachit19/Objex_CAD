(function () {
    "use strict";

    let importUiInitialized = false;
    const importOptions = {
        mode: "merge"
    };

    function getImportDesignButton() {
        return document.getElementById("importDesignBtn");
    }

    function getImportDesignMenu() {
        return document.getElementById("importDesignMenuOptions");
    }

    function getImportDesignFileInput() {
        return document.getElementById("importDesignFileInput");
    }

    function getImportModelFileInput() {
        return document.getElementById("importModelFileInput");
    }

    function getStatusElement() {
        return document.getElementById("cadStatusText");
    }

    function setStatus(message) {
        const statusText = getStatusElement();

        if (statusText) {
            statusText.textContent = message;
        }
    }

    function closeOtherMenus() {
        if (typeof window.closeCADDropdownMenus === "function") {
            window.closeCADDropdownMenus();
        }
    }

    function setImportMenuOpen(isOpen) {
        const importButton = getImportDesignButton();
        const importMenu = getImportDesignMenu();

        if (!importMenu || !importButton) {
            return;
        }

        importMenu.classList.toggle("show", isOpen);
        importButton.classList.toggle("active-tool-btn", isOpen);
        importButton.setAttribute("aria-expanded", isOpen ? "true" : "false");
    }

    function updateImportModeButtons() {
        document.querySelectorAll("[data-import-design-mode]").forEach(function (button) {
            const isActive = button.getAttribute("data-import-design-mode") === importOptions.mode;
            button.classList.toggle("active-export-model-option", isActive);
            button.setAttribute("aria-checked", isActive ? "true" : "false");
        });
    }

    async function handleDesignImport(file) {
        if (!window.CADImportDesign || typeof window.CADImportDesign.importDesignFromFile !== "function") {
            setStatus("Design import module is not ready.");
            return;
        }

        setStatus("Importing design...");

        const result = await window.CADImportDesign.importDesignFromFile(file, {
            mode: importOptions.mode
        });

        setStatus(result.success ? result.message : (result.message || "Design import failed."));
    }

    async function handleModelImport(file) {
        if (!window.CADImportModel || typeof window.CADImportModel.importModelFromFile !== "function") {
            setStatus("Model import module is not ready.");
            return;
        }

        setStatus("Importing model...");

        const result = await window.CADImportModel.importModelFromFile(file);

        setStatus(result.success ? result.message : (result.message || "Model import failed."));
    }

    function initializeImportUi() {
        if (importUiInitialized) {
            return;
        }

        const importButton = getImportDesignButton();
        const importMenu = getImportDesignMenu();
        const importDesignConfirmBtn = document.getElementById("importDesignConfirmBtn");
        const importModelConfirmBtn = document.getElementById("importModelConfirmBtn");
        const exportDesignBtn = document.getElementById("exportDesignBtn");
        const importDesignFileInput = getImportDesignFileInput();
        const importModelFileInput = getImportModelFileInput();

        if (!importButton || !importMenu) {
            return;
        }

        importButton.addEventListener("click", function (event) {
            event.stopPropagation();

            if (typeof window.hideCADToolPanels === "function") {
                window.hideCADToolPanels();
            }

            const isOpen = importMenu.classList.contains("show");
            closeOtherMenus();
            setImportMenuOpen(!isOpen);
        });

        document.querySelectorAll("[data-import-design-mode]").forEach(function (button) {
            button.addEventListener("click", function (event) {
                event.stopPropagation();
                importOptions.mode = button.getAttribute("data-import-design-mode") || "merge";
                updateImportModeButtons();
            });
        });

        if (importDesignConfirmBtn && importDesignFileInput) {
            importDesignConfirmBtn.addEventListener("click", function () {
                importDesignFileInput.click();
            });

            importDesignFileInput.addEventListener("change", async function (event) {
                const file = event.target.files && event.target.files[0];

                if (file) {
                    await handleDesignImport(file);
                }

                importDesignFileInput.value = "";
                setImportMenuOpen(false);
            });
        }

        if (importModelConfirmBtn && importModelFileInput) {
            importModelConfirmBtn.addEventListener("click", function () {
                importModelFileInput.click();
            });

            importModelFileInput.addEventListener("change", async function (event) {
                const file = event.target.files && event.target.files[0];

                if (file) {
                    await handleModelImport(file);
                }

                importModelFileInput.value = "";
                setImportMenuOpen(false);
            });
        }

        if (exportDesignBtn) {
            exportDesignBtn.addEventListener("click", function (event) {
                event.stopPropagation();
                closeOtherMenus();
                setImportMenuOpen(false);

                if (typeof window.exportCADDesign === "function") {
                    window.exportCADDesign();
                } else {
                    setStatus("Design export module is not ready.");
                }
            });
        }

        document.addEventListener("click", function (event) {
            if (!importMenu.contains(event.target) && event.target !== importButton && !importButton.contains(event.target)) {
                setImportMenuOpen(false);
            }
        });

        updateImportModeButtons();
        importUiInitialized = true;
    }

    document.addEventListener("DOMContentLoaded", initializeImportUi);
})();
