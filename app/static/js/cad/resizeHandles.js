(function () {
    "use strict";

    console.log("🎯 Resize handles module loading...");

    const HANDLE_SIZE = 0.15;
    const HANDLE_COLOR = 0x60a5fa; // Blue
    const HANDLE_HOVER_COLOR = 0xfbbf24; // Yellow/gold
    
    let handles = [];
    let selectedHandleIndex = -1;
    let isDraggingHandle = false;
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

    function createHandle(position) {
        const geometry = new THREE.SphereGeometry(HANDLE_SIZE, 16, 16);
        const material = new THREE.MeshBasicMaterial({ color: HANDLE_COLOR });
        const handle = new THREE.Mesh(geometry, material);
        
        handle.position.copy(position);
        handle.userData.isResizeHandle = true;
        handle.userData.originalPosition = position.clone();
        
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

        // Create 8 corner positions
        const corners = [
            [-size.x / 2, -size.y / 2, -size.z / 2],
            [size.x / 2, -size.y / 2, -size.z / 2],
            [-size.x / 2, size.y / 2, -size.z / 2],
            [size.x / 2, size.y / 2, -size.z / 2],
            [-size.x / 2, -size.y / 2, size.z / 2],
            [size.x / 2, -size.y / 2, size.z / 2],
            [-size.x / 2, size.y / 2, size.z / 2],
            [size.x / 2, size.y / 2, size.z / 2]
        ];

        // Create handle at each corner
        corners.forEach((cornerOffset) => {
            const handlePos = new THREE.Vector3(
                center.x + cornerOffset[0],
                center.y + cornerOffset[1],
                center.z + cornerOffset[2]
            );

            const handle = createHandle(handlePos);
            handle.userData.cornerOffset = cornerOffset;
            handle.userData.parentObject = object;
            
            workspace.scene.add(handle);
            handles.push(handle);
        });

        console.log("✅ Created " + handles.length + " resize handles");
    }

    function removeHandles() {
        const workspace = getWorkspace();
        if (!workspace || !workspace.scene) {
            return;
        }

        handles.forEach((handle) => {
            workspace.scene.remove(handle);
        });

        handles = [];
        selectedHandleIndex = -1;
    }

    function updateHandlePositions(object) {
        if (handles.length === 0 || !object) {
            return;
        }

        const bbox = new THREE.Box3().setFromObject(object);
        const size = bbox.getSize(new THREE.Vector3());
        const center = bbox.getCenter(new THREE.Vector3());

        handles.forEach((handle) => {
            const offset = handle.userData.cornerOffset;
            handle.position.set(
                center.x + offset[0],
                center.y + offset[1],
                center.z + offset[2]
            );
        });
    }

    function getHandleAtPointer(event) {
        const workspace = getWorkspace();
        if (!workspace || !workspace.camera || !workspace.renderer) {
            return -1;
        }

        const canvas = workspace.renderer.domElement;
        const rect = canvas.getBoundingClientRect();

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

    function recordResizeHistory(object, previousScale, nextScale) {
        if (!window.CADHistory || typeof window.CADHistory.push !== "function") {
            return;
        }

        const objectName = object.name || "Selected object";

        window.CADHistory.push({
            label: "Resize " + objectName,
            undo: function () {
                object.scale.set(previousScale.x, previousScale.y, previousScale.z);
                if (typeof window.refreshSelectedObjectPanel === "function") {
                    window.refreshSelectedObjectPanel();
                }
                if (typeof window.updateResizeInputs === "function") {
                    window.updateResizeInputs(object);
                }
                updateHandlePositions(object);
                setStatus(objectName + " resize undone.");
            },
            redo: function () {
                object.scale.set(nextScale.x, nextScale.y, nextScale.z);
                if (typeof window.refreshSelectedObjectPanel === "function") {
                    window.refreshSelectedObjectPanel();
                }
                if (typeof window.updateResizeInputs === "function") {
                    window.updateResizeInputs(object);
                }
                updateHandlePositions(object);
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

        console.log("✅ Dragging handle " + (handleIndex + 1));

        selectedHandleIndex = handleIndex;
        isDraggingHandle = true;
        dragStartPos = { x: event.clientX, y: event.clientY, z: 0 };
        dragStartScale = captureScale(object);

        document.body.style.cursor = "grab";
        setStatus("Resizing " + (object.name || "object") + "...");

        // Disable orbit controls while dragging
        const controls = getOrbitControls();
        if (controls) {
            console.log("✅ Disabled orbit controls");
            controls.enabled = false;
        }

        event.preventDefault();
        event.stopPropagation();
    }

    function onDocumentPointerMove(event) {
        const workspace = getWorkspace();
        if (!workspace || !workspace.camera) {
            return;
        }

        // Update handle hover effect
        if (!isDraggingHandle) {
            const handleIndex = getHandleAtPointer(event);

            handles.forEach((handle, index) => {
                if (index === handleIndex) {
                    handle.material.color.setHex(HANDLE_HOVER_COLOR);
                    document.body.style.cursor = "grab";
                } else {
                    handle.material.color.setHex(HANDLE_COLOR);
                }
            });
        }

        // Handle dragging
        if (!isDraggingHandle || selectedHandleIndex === -1) {
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

        // Calculate scale change (sensitivity)
        const sensitivity = 0.005;
        const totalDelta = Math.max(Math.abs(deltaX), Math.abs(deltaY));
        const direction = deltaX > 0 ? 1 : (deltaX < 0 ? -1 : (deltaY > 0 ? -1 : 1));
        const scaleChange = totalDelta * sensitivity * direction;

        // Apply uniform scale
        const newScale = Math.max(0.1, dragStartScale.x + scaleChange);
        object.scale.set(newScale, newScale, newScale);

        updateHandlePositions(object);

        if (typeof window.updateResizeInputs === "function") {
            window.updateResizeInputs(object);
        }

        setStatus("Size: " + newScale.toFixed(2));
    }

    function onDocumentPointerUp(event) {
        if (!isDraggingHandle || selectedHandleIndex === -1) {
            return;
        }

        const object = getSelectedObject();
        if (object) {
            const finalScale = captureScale(object);
            recordResizeHistory(object, dragStartScale, finalScale);

            if (typeof window.refreshSelectedObjectPanel === "function") {
                window.refreshSelectedObjectPanel();
            }
        }

        // Re-enable orbit controls
        const controls = getOrbitControls();
        if (controls) {
            console.log("✅ Re-enabled orbit controls");
            controls.enabled = true;
        }

        isDraggingHandle = false;
        selectedHandleIndex = -1;
        document.body.style.cursor = "default";

        setStatus("Resize complete.");
    }

    function onSelectionChanged(event) {
        const object = event.detail ? event.detail.object : null;

        if (object) {
            createHandlesForObject(object);
        } else {
            removeHandles();
        }
    }

    function initResizeHandles() {
        const workspace = getWorkspace();

        if (!workspace || !workspace.renderer) {
            console.warn("❌ Workspace or renderer not found");
            return;
        }

        const canvas = workspace.renderer.domElement;

        canvas.addEventListener("pointerdown", onCanvasPointerDown);
        document.addEventListener("pointermove", onDocumentPointerMove);
        document.addEventListener("pointerup", onDocumentPointerUp);

        // Listen for selection changes
        window.addEventListener("cad:selectionChanged", onSelectionChanged);

        console.log("✅ Resize handles initialized!");
    }

    window.createHandlesForObject = createHandlesForObject;
    window.removeHandles = removeHandles;

    document.addEventListener("DOMContentLoaded", function () {
        window.addEventListener("cad:ready", initResizeHandles);

        if (window.CADWorkspace) {
            initResizeHandles();
        }
    });
})();