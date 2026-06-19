(function () {
    "use strict";

    function getExistingObjectIds() {
        const ids = new Set();

        (window.cadObjects || []).forEach(function (object) {
            if (object && object.userData && object.userData.id) {
                ids.add(object.userData.id);
            }
        });

        return ids;
    }

    function createUniqueObjectId(preferredId, existingIds) {
        const baseId = preferredId || ("obj-" + Date.now() + "-" + Math.floor(Math.random() * 1000));

        if (!existingIds.has(baseId)) {
            existingIds.add(baseId);
            return baseId;
        }

        let suffix = 1;
        let nextId = baseId + "-import-" + suffix;

        while (existingIds.has(nextId)) {
            suffix += 1;
            nextId = baseId + "-import-" + suffix;
        }

        existingIds.add(nextId);
        return nextId;
    }

    function deduplicateImportedObjects(objects) {
        const existingIds = getExistingObjectIds();

        return (objects || []).map(function (object) {
            const clonedObject = Object.assign({}, object);
            clonedObject.id = createUniqueObjectId(object.id, existingIds);
            return clonedObject;
        });
    }

    function removeObjectsFromWorkspace(objects) {
        const workspace = window.CADWorkspace;

        if (!workspace || !workspace.scene || !Array.isArray(objects)) {
            return;
        }

        objects.forEach(function (object) {
            workspace.scene.remove(object);

            const objectIndex = (window.cadObjects || []).indexOf(object);

            if (objectIndex !== -1) {
                window.cadObjects.splice(objectIndex, 1);
            }
        });

        if (typeof window.clearSelection === "function") {
            window.clearSelection();
        }
    }

    function clearUserObjectsFromWorkspace() {
        const currentObjects = (window.cadObjects || []).slice();
        removeObjectsFromWorkspace(currentObjects);
        return currentObjects;
    }

    function setImportStatus(message) {
        const statusText = document.getElementById("cadStatusText");

        if (statusText) {
            statusText.textContent = message;
        }
    }

    function recordImportHistory(previousRecords, importedRecords, modeLabel) {
        if (!window.CADHistory || typeof window.CADHistory.push !== "function") {
            return;
        }

        window.CADHistory.push({
            label: modeLabel,
            undo: function () {
                removeObjectsFromWorkspace(importedRecords.map(function (record) {
                    return record.object;
                }));

                previousRecords.forEach(function (record) {
                    if (typeof window.addObjectToCADScene === "function") {
                        window.addObjectToCADScene(record.object, {
                            index: record.index
                        });
                    }
                });

                setImportStatus("Import undone.");
            },
            redo: function () {
                if (modeLabel.indexOf("Replace") !== -1) {
                    clearUserObjectsFromWorkspace();
                }

                importedRecords.forEach(function (record) {
                    if (typeof window.addObjectToCADScene === "function") {
                        window.addObjectToCADScene(record.object, {
                            index: record.index
                        });
                    }
                });

                setImportStatus("Import redone.");
            }
        });
    }

    function restoreImportedObjects(objects, options) {
        const designDataApi = window.CADDesignData;
        const restoredRecords = [];
        const mode = options && options.mode === "replace" ? "replace" : "merge";
        let previousRecords = [];

        if (!designDataApi || typeof designDataApi.restoreObjectsFromData !== "function") {
            setImportStatus("Import module is not ready.");
            return {
                success: false,
                count: 0
            };
        }

        if (mode === "replace") {
            previousRecords = (window.cadObjects || []).map(function (object, index) {
                return {
                    object: object,
                    index: index
                };
            });
            clearUserObjectsFromWorkspace();
        }

        const normalizedObjects = deduplicateImportedObjects(objects);
        const restoredObjects = designDataApi.restoreObjectsFromData(normalizedObjects, {
            recordHistory: false
        });

        restoredObjects.forEach(function (object) {
            restoredRecords.push({
                object: object,
                index: (window.cadObjects || []).indexOf(object)
            });
        });

        recordImportHistory(
            previousRecords,
            restoredRecords,
            mode === "replace" ? "Import design (replace)" : "Import design (merge)"
        );

        return {
            success: true,
            count: restoredObjects.length
        };
    }

    function importDesignFromFile(file, options) {
        return new Promise(function (resolve) {
            if (!file) {
                resolve({
                    success: false,
                    message: "No file selected."
                });
                return;
            }

            const reader = new FileReader();

            reader.onload = function (event) {
                const validator = window.CADDesignValidator;

                if (!validator || typeof validator.parseDesignFileText !== "function") {
                    resolve({
                        success: false,
                        message: "Design validator is not ready."
                    });
                    return;
                }

                const parsed = validator.parseDesignFileText(event.target.result);

                if (!parsed.valid) {
                    resolve({
                        success: false,
                        message: parsed.errors.join(" ")
                    });
                    return;
                }

                const importResult = restoreImportedObjects(parsed.objects, options);

                if (!importResult.success) {
                    resolve({
                        success: false,
                        message: "Could not import design into workspace."
                    });
                    return;
                }

                resolve({
                    success: true,
                    message: "Imported " + importResult.count + " object(s).",
                    count: importResult.count
                });
            };

            reader.onerror = function () {
                resolve({
                    success: false,
                    message: "Could not read the selected file."
                });
            };

            reader.readAsText(file);
        });
    }

    window.CADImportDesign = {
        importDesignFromFile: importDesignFromFile,
        restoreImportedObjects: restoreImportedObjects,
        deduplicateImportedObjects: deduplicateImportedObjects
    };
})();
