(function () {
    "use strict";

    function getWorkspace() {
        return window.CADWorkspace || null;
    }

    function getCADObjects() {
        window.cadObjects = window.cadObjects || [];
        return window.cadObjects;
    }

    function setResetStatus(message) {
        const statusText = document.getElementById("cadStatusText");

        if (statusText) {
            statusText.textContent = message;
        }
    }

    function clearWorkspaceSelection() {
        if (typeof window.clearSelection === "function") {
            window.clearSelection();
            return;
        }

        window.selectedObject = null;

        if (typeof window.updateObjectPropertiesPanel === "function") {
            window.updateObjectPropertiesPanel(null);
        }
    }

    function removeWorkspaceObjects(objects) {
        const workspace = getWorkspace();
        const cadObjects = getCADObjects();

        if (!workspace || !workspace.scene) {
            return false;
        }

        objects.forEach(function (object) {
            workspace.scene.remove(object);

            const objectIndex = cadObjects.indexOf(object);

            if (objectIndex !== -1) {
                cadObjects.splice(objectIndex, 1);
            }
        });

        clearWorkspaceSelection();
        return true;
    }

    function addWorkspaceObject(object, index) {
        if (typeof window.addObjectToCADScene === "function") {
            return window.addObjectToCADScene(object, {
                index: index
            });
        }

        const workspace = getWorkspace();
        const cadObjects = getCADObjects();

        if (!workspace || !workspace.scene || !object) {
            return false;
        }

        workspace.scene.add(object);

        if (cadObjects.indexOf(object) === -1) {
            if (index >= 0 && index <= cadObjects.length) {
                cadObjects.splice(index, 0, object);
            } else {
                cadObjects.push(object);
            }
        }

        return true;
    }

    function restoreWorkspaceObjects(objectRecords) {
        let restoredCount = 0;

        objectRecords.forEach(function (record) {
            if (addWorkspaceObject(record.object, record.index)) {
                restoredCount += 1;
            }
        });

        clearWorkspaceSelection();
        return restoredCount;
    }

    function resetCameraView() {
        if (typeof window.resetCADCameraView === "function") {
            window.resetCADCameraView();
        }
    }

    function recordResetHistory(objectRecords) {
        if (!window.CADHistory || typeof window.CADHistory.push !== "function") {
            return;
        }

        window.CADHistory.push({
            label: "Reset workspace",
            undo: function () {
                const restoredCount = restoreWorkspaceObjects(objectRecords);
                resetCameraView();
                setResetStatus("Workspace reset undone. Restored objects: " + restoredCount + ".");
            },
            redo: function () {
                removeWorkspaceObjects(objectRecords.map(function (record) {
                    return record.object;
                }));
                resetCameraView();
                setResetStatus("Workspace reset redone.");
            }
        });
    }

    function shouldConfirmReset(options) {
        return !options || options.confirm !== false;
    }

    function resetCADWorkspace(options) {
        const workspace = getWorkspace();

        if (!workspace || !workspace.scene) {
            setResetStatus("CAD workspace is not ready.");
            return false;
        }

        const objects = getCADObjects().slice();

        if (objects.length === 0) {
            clearWorkspaceSelection();
            resetCameraView();
            setResetStatus("Workspace is already empty. Camera view reset.");
            return false;
        }

        if (
            shouldConfirmReset(options) &&
            !window.confirm("Reset workspace? This clears all objects from the scene. You can undo this before saving.")
        ) {
            return false;
        }

        const objectRecords = objects.map(function (object, index) {
            return {
                object: object,
                index: index
            };
        });

        if (!removeWorkspaceObjects(objects)) {
            setResetStatus("Workspace could not be reset.");
            return false;
        }

        resetCameraView();
        recordResetHistory(objectRecords);
        setResetStatus("Workspace reset. Objects removed: " + objects.length + ".");

        return true;
    }

    window.resetCADWorkspace = resetCADWorkspace;
})();