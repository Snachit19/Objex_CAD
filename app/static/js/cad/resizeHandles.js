(function () {
    "use strict";

    const HANDLE_SIZE = 0.15;
    const HANDLE_COLOR = 0x60a5fa;
    const HANDLE_HOVER_COLOR = 0xfbbf24;
    const MINIMUM_SCALE = 0.01;
    const SCALE_DRAG_SENSITIVITY = 0.005;
    
    let handles = [];
    let selectedHandleIndex = -1;
    let isDraggingHandle = false;
    let resizeHandlesInitialized = false;
    let activePointerId = null;
    let dragStartPos = { x: 0, y: 0, z: 0 };
    let dragStartScale = { x: 0, y: 0, z: 0 };
    let raycaster = new THREE.Raycaster();
    let mouse = new THREE.Vector2();
    let orbitControls = null;

    function getSelectedObject() {
        return window.getSelectedCADObject ? window.getSelectedCADObject() : null;
    }

    function getWorkspace() {
        return window.CADWorkspace;
    }

    function setStatus(message) {
        const statusText = document.getElementById("cadStatusText");
        if (statusText) {
            statusText.textContent = message;
        }
    }

    function getOrbitControls() {
        // Try different possible locations
        if (orbitControls) {
            return orbitControls;
        }

        if (window.orbitControls) {
            orbitControls = window.orbitControls;
            return orbitControls;
        }

        const workspace = getWorkspace();
        if (workspace && workspace.controls) {
            orbitControls = workspace.controls;
            return orbitControls;
        }

        if (workspace && workspace.orbitControls) {
            orbitControls = workspace.orbitControls;
            return orbitControls;
        }

        return null;
    }

    function getCornerPosition(center, size, cornerSign) {
        return new THREE.Vector3(
            center.x + (size.x / 2) * cornerSign[0],
            center.y + (size.y / 2) * cornerSign[1],
            center.z + (size.z / 2) * cornerSign[2]
        );
    }

    function createHandle(position, cornerSign) {
        const geometry = new THREE.SphereGeometry(HANDLE_SIZE, 16, 16);
        const material = new THREE.MeshBasicMaterial({ color: HANDLE_COLOR });
        const handle = new THREE.Mesh(geometry, material);
        
        handle.position.copy(position);
        handle.userData.isResizeHandle = true;
        handle.userData.cornerSign = cornerSign.slice();
        
        return handle;
    }

    function createHandlesForObject(object) {
        // Clear old handles
        removeHandles();

        if (!object) {
            return;
        }

        const workspace = getWorkspace();
        if (!workspace || !workspace.scene) {
            return;
        }

        // Get bounding box
        const bbox = new THREE.Box3().setFromObject(object);
        const size = bbox.getSize(new THREE.Vector3());
        const center = bbox.getCenter(new THREE.Vector3());

        const cornerSigns = [
            [-1, -1, -1],
            [1, -1, -1],
            [-1, 1, -1],
            [1, 1, -1],
            [-1, -1, 1],
            [1, -1, 1],
            [-1, 1, 1],
            [1, 1, 1]
        ];

        cornerSigns.forEach((cornerSign) => {
            const handlePos = getCornerPosition(center, size, cornerSign);
            const handle = createHandle(handlePos, cornerSign);
            handle.userData.parentObject = object;
            
            workspace.scene.add(handle);
            handles.push(handle);
        });
    }

    function removeHandles() {
        const workspace = getWorkspace();
        if (!workspace || !workspace.scene) {
            return;
        }

        handles.forEach((handle) => {
            workspace.scene.remove(handle);

            if (handle.geometry && typeof handle.geometry.dispose === "function") {
                handle.geometry.dispose();
            }

            if (handle.material && typeof handle.material.dispose === "function") {
                handle.material.dispose();
            }
        });

        handles = [];
        selectedHandleIndex = -1;

        if (!isDraggingHandle) {
            document.body.style.cursor = "default";
        }
    }

    function updateHandlePositions(object) {
        if (handles.length === 0 || !object) {
            return;
        }

        const bbox = new THREE.Box3().setFromObject(object);
        const size = bbox.getSize(new THREE.Vector3());
        const center = bbox.getCenter(new THREE.Vector3());

        handles.forEach((handle) => {
            const cornerSign = handle.userData.cornerSign || [1, 1, 1];
            handle.position.copy(getCornerPosition(center, size, cornerSign));
        });
    }

    function getHandleAtPointer(event) {
        const workspace = getWorkspace();
        if (!workspace || !workspace.camera || !workspace.renderer) {
            return -1;
        }

        const canvas = workspace.renderer.domElement;
        const rect = canvas.getBoundingClientRect();

        if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
        ) {
            return -1;
        }

        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, workspace.camera);
        const intersections = raycaster.intersectObjects(handles, true);

        if (intersections.length > 0) {
            const hitHandle = intersections[0].object;
            return handles.indexOf(hitHandle);
        }

        return -1;
    }

    function captureScale(object) {
        return {
            x: object.scale.x,
            y: object.scale.y,
            z: object.scale.z
        };
    }

    function scalesAreEqual(firstScale, secondScale) {
        const tolerance = 0.0000001;

        return (
            Math.abs(firstScale.x - secondScale.x) <= tolerance &&
            Math.abs(firstScale.y - secondScale.y) <= tolerance &&
            Math.abs(firstScale.z - secondScale.z) <= tolerance
        );
    }

    function refreshAfterHandleResize(object) {
        if (typeof window.refreshSelectedObjectPanel === "function") {
            window.refreshSelectedObjectPanel();
        }

        if (typeof window.updateResizeInputs === "function") {
            window.updateResizeInputs(object);
        }

        updateHandlePositions(object);
    }

    function recordResizeHistory(object, previousScale, nextScale) {
        if (!window.CADHistory || typeof window.CADHistory.push !== "function") {
            return;
        }

        const objectName = object.name || "Selected object";

        window.CADHistory.push({
            label: "Resize " + objectName,
            undo: function () {
                object.scale.set(previousScale.x, previousScale.y, previousScale.z);
                refreshAfterHandleResize(object);
                setStatus(objectName + " resize undone.");
            },
            redo: function () {
                object.scale.set(nextScale.x, nextScale.y, nextScale.z);
                refreshAfterHandleResize(object);
                setStatus(objectName + " resize redone.");
            }
        });
    }

    function onCanvasPointerDown(event) {
        const handleIndex = getHandleAtPointer(event);

        if (handleIndex === -1) {
            return; // Not clicking a handle
        }

        const object = getSelectedObject();
        if (!object) {
            return;
        }

        selectedHandleIndex = handleIndex;
        isDraggingHandle = true;
        activePointerId = event.pointerId;
        window.isResizeHandleInteractionActive = true;
        dragStartPos = { x: event.clientX, y: event.clientY, z: 0 };
        dragStartScale = captureScale(object);

        document.body.style.cursor = "grabbing";
        setStatus("Resizing " + (object.name || "object") + "...");

        // Disable orbit controls while dragging
        const controls = getOrbitControls();
        if (controls) {
            controls.enabled = false;
        }

        const workspace = getWorkspace();
        if (workspace && workspace.renderer && workspace.renderer.domElement.setPointerCapture) {
            workspace.renderer.domElement.setPointerCapture(event.pointerId);
        }

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
    }

    function onDocumentPointerMove(event) {
        const workspace = getWorkspace();
        if (!workspace || !workspace.camera) {
            return;
        }

        // Update handle hover effect
        if (!isDraggingHandle) {
            const handleIndex = getHandleAtPointer(event);
            let isHoveringHandle = false;

            handles.forEach((handle, index) => {
                if (index === handleIndex) {
                    handle.material.color.setHex(HANDLE_HOVER_COLOR);
                    isHoveringHandle = true;
                } else {
                    handle.material.color.setHex(HANDLE_COLOR);
                }
            });

            document.body.style.cursor = isHoveringHandle ? "grab" : "default";
        }

        // Handle dragging
        if (!isDraggingHandle || selectedHandleIndex === -1) {
            return;
        }

        if (activePointerId !== null && event.pointerId !== activePointerId) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        const object = getSelectedObject();
        if (!object) {
            return;
        }

        const deltaX = event.clientX - dragStartPos.x;
        const deltaY = event.clientY - dragStartPos.y;

        const totalDelta = Math.max(Math.abs(deltaX), Math.abs(deltaY));
        const direction = deltaX > 0 ? 1 : (deltaX < 0 ? -1 : (deltaY > 0 ? -1 : 1));
        const scaleChange = totalDelta * SCALE_DRAG_SENSITIVITY * direction;

        object.scale.set(
            Math.max(MINIMUM_SCALE, dragStartScale.x + scaleChange),
            Math.max(MINIMUM_SCALE, dragStartScale.y + scaleChange),
            Math.max(MINIMUM_SCALE, dragStartScale.z + scaleChange)
        );

        refreshAfterHandleResize(object);

        setStatus(
            "Scale X: " + object.scale.x.toFixed(2) +
            ", Y: " + object.scale.y.toFixed(2) +
            ", Z: " + object.scale.z.toFixed(2)
        );
    }

    function onDocumentPointerUp(event) {
        if (!isDraggingHandle || selectedHandleIndex === -1) {
            return;
        }

        const object = getSelectedObject();
        if (object) {
            const finalScale = captureScale(object);

            if (scalesAreEqual(dragStartScale, finalScale)) {
                setStatus("Resize unchanged.");
            } else {
                recordResizeHistory(object, dragStartScale, finalScale);
                setStatus("Resize complete.");
            }

            refreshAfterHandleResize(object);
        }

        // Re-enable orbit controls
        const controls = getOrbitControls();
        if (controls) {
            controls.enabled = true;
        }

        const workspace = getWorkspace();
        if (
            workspace &&
            workspace.renderer &&
            workspace.renderer.domElement.hasPointerCapture &&
            workspace.renderer.domElement.hasPointerCapture(event.pointerId)
        ) {
            workspace.renderer.domElement.releasePointerCapture(event.pointerId);
        }

        isDraggingHandle = false;
        selectedHandleIndex = -1;
        activePointerId = null;
        document.body.style.cursor = "default";

        window.setTimeout(function () {
            window.isResizeHandleInteractionActive = false;
        }, 0);
    }

    function onSelectionChanged(event) {
        const object = event.detail ? event.detail.object : null;

        if (object) {
            createHandlesForObject(object);
        } else {
            removeHandles();
        }
    }

    function onObjectChanged(event) {
        const object = event.detail ? event.detail.object : null;
        const selectedObject = getSelectedObject();

        if (object && selectedObject && object === selectedObject) {
            updateHandlePositions(object);
        }
    }

    function initResizeHandles() {
        if (resizeHandlesInitialized) {
            return;
        }

        const workspace = getWorkspace();

        if (!workspace || !workspace.renderer) {
            return;
        }

        resizeHandlesInitialized = true;

        const canvas = workspace.renderer.domElement;

        canvas.addEventListener("pointerdown", onCanvasPointerDown);
        document.addEventListener("pointermove", onDocumentPointerMove);
        document.addEventListener("pointerup", onDocumentPointerUp);
        document.addEventListener("pointercancel", onDocumentPointerUp);

        // Listen for selection changes
        window.addEventListener("cad:selectionChanged", onSelectionChanged);
        window.addEventListener("cad:objectChanged", onObjectChanged);
    }

    window.createHandlesForObject = createHandlesForObject;
    window.removeHandles = removeHandles;
    window.refreshResizeHandles = function () {
        updateHandlePositions(getSelectedObject());
    };
    window.isResizeHandleInteractionActive = false;
    window.isPointerOnResizeHandle = function (event) {
        return getHandleAtPointer(event) !== -1;
    };

    document.addEventListener("DOMContentLoaded", function () {
        window.addEventListener("cad:ready", initResizeHandles);

        if (window.CADWorkspace) {
            initResizeHandles();
        }
    });
})();
