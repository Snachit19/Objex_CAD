(function () {
    "use strict";

    let importUiInitialized = false;

    function getImportDesignButton() {
        return document.getElementById("importDesignBtn");
    }

    function getImportDesignMenu() {
        return document.getElementById("importDesignMenuOptions");
    }

    function getImportModelFileInput() {
        return document.getElementById("importModelFileInput");
    }

    function getImportFormatSelect() {
        return document.getElementById("importModelFormatSelect");
    }

    function getSelectedImportFormat() {
        const formatSelect = getImportFormatSelect();
        const formatApi = window.CADModelFormats;

        if (!formatSelect) {
            return "glb";
        }

        if (formatApi && typeof formatApi.normalizeModelFormat === "function") {
            return formatApi.normalizeModelFormat(formatSelect.value);
        }

        return formatSelect.value || "glb";
    }

    function updateImportFileAccept() {
        const fileInput = getImportModelFileInput();
        const formatApi = window.CADModelFormats;
        const format = getSelectedImportFormat();

        if (!fileInput || !formatApi || typeof formatApi.getAcceptForModelFormat !== "function") {
            return;
        }

        fileInput.accept = formatApi.getAcceptForModelFormat(format);
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

    async function handleModelImport(file) {
        if (!window.CADImportModel || typeof window.CADImportModel.importModelFromFile !== "function") {
            setStatus("Model import module is not ready.");
            return;
        }

        const format = getSelectedImportFormat();
        setStatus("Importing " + format.toUpperCase() + " model...");

        const result = await window.CADImportModel.importModelFromFile(file, {
            format: format
        });

        setStatus(result.success ? result.message : (result.message || "Model import failed."));
    }

    function initializeImportUi() {
        if (importUiInitialized) {
            return;
        }

        const importButton = getImportDesignButton();
        const importMenu = getImportDesignMenu();
        const importModelConfirmBtn = document.getElementById("importModelConfirmBtn");
        const importModelFileInput = getImportModelFileInput();
        const importFormatSelect = getImportFormatSelect();

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

        if (importFormatSelect) {
            importFormatSelect.addEventListener("change", function () {
                updateImportFileAccept();
            });
        }

        if (importModelConfirmBtn && importModelFileInput) {
            importModelConfirmBtn.addEventListener("click", function () {
                updateImportFileAccept();
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

        document.addEventListener("click", function (event) {
            if (!importMenu.contains(event.target) && event.target !== importButton && !importButton.contains(event.target)) {
                setImportMenuOpen(false);
            }
        });

        updateImportFileAccept();
        importUiInitialized = true;
    }

    document.addEventListener("DOMContentLoaded", initializeImportUi);
})();
