/**
 * Object Properties Feature
 * Handles viewing and editing individual object properties like
 * Name, Type, Position, Rotation, Scale, Colour, Material and Dimensions.
 */

(function () {
    const propPanel = {
        name: document.getElementById("propObjectName"),
        type: document.getElementById("propObjectTypeBadge"),
        posX: document.getElementById("propPosX"),
        posY: document.getElementById("propPosY"),
        posZ: document.getElementById("propPosZ"),
        rotX: document.getElementById("propRotX"),
        rotY: document.getElementById("propRotY"),
        rotZ: document.getElementById("propRotZ"),
        scaleX: document.getElementById("propScaleX"),
        scaleY: document.getElementById("propScaleY"),
        scaleZ: document.getElementById("propScaleZ"),
        dimensions: document.getElementById("propDimensions"),
        colour: document.getElementById("propColourInput"),
        hex: document.getElementById("propHexInput"),
        material: document.getElementById("propMaterialSelect"),
        applyBtn: document.getElementById("applyPropertiesBtn")
    };

    let isUpdatingUI = false;

    /**
     * Toast Notification Helper
     */
    function showToast(message, duration = 3000) {
        const container = document.getElementById("toastContainer");
        if (!container) return;

        const toast = document.createElement("div");
        toast.className = "toast";
        toast.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <span>${message}</span>
        `;

        container.appendChild(toast);

        // Remove after duration
        setTimeout(() => {
            toast.classList.add("hiding");
            toast.addEventListener("animationend", () => {
                toast.remove();
            });
        }, duration);
    }

    // Helper to get selected object
    function getSelected() {
        return window.selectedObject || (window.getSelectedCADObject ? window.getSelectedCADObject() : null);
    }

    // Refresh the properties panel based on the newly selected object
    function refreshPropertiesUI(object) {
        const summaryPanel = document.getElementById("selectedObjectSummary");
        const noSelectionPanel = document.getElementById("noObjectSelected");

        if (!object) {
            if (summaryPanel) summaryPanel.style.display = "none";
            if (noSelectionPanel) noSelectionPanel.style.display = "block";
            return;
        }
        
        if (summaryPanel) summaryPanel.style.display = "block";
        if (noSelectionPanel) noSelectionPanel.style.display = "none";
        
        isUpdatingUI = true;

        // Name and Type
        if (propPanel.name) propPanel.name.value = object.name || "";
        if (propPanel.type) propPanel.type.textContent = (object.userData && object.userData.type) ? object.userData.type.toUpperCase() : "MESH";

        // Position
        if (propPanel.posX) propPanel.posX.value = object.position.x.toFixed(2);
        if (propPanel.posY) propPanel.posY.value = object.position.y.toFixed(2);
        if (propPanel.posZ) propPanel.posZ.value = object.position.z.toFixed(2);

        // Rotation (radians to degrees)
        if (propPanel.rotX) propPanel.rotX.value = Math.round(THREE.MathUtils.radToDeg(object.rotation.x));
        if (propPanel.rotY) propPanel.rotY.value = Math.round(THREE.MathUtils.radToDeg(object.rotation.y));
        if (propPanel.rotZ) propPanel.rotZ.value = Math.round(THREE.MathUtils.radToDeg(object.rotation.z));

        // Scale
        if (propPanel.scaleX) propPanel.scaleX.value = object.scale.x.toFixed(2);
        if (propPanel.scaleY) propPanel.scaleY.value = object.scale.y.toFixed(2);
        if (propPanel.scaleZ) propPanel.scaleZ.value = object.scale.z.toFixed(2);

        // Dimensions
        updateDimensionsUI(object);

        // Colour
        if (object.material && object.material.color) {
            const hex = "#" + object.material.color.getHexString();
            if (propPanel.colour) propPanel.colour.value = hex;
            if (propPanel.hex) propPanel.hex.value = hex;
        }

        // Material Type
        updateMaterialSelectUI(object);

        isUpdatingUI = false;

        // Visual Entrance
        if (summaryPanel) {
            summaryPanel.style.animation = "none";
            void summaryPanel.offsetWidth;
            summaryPanel.style.animation = "fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards";
        }
    }

    function updateDimensionsUI(object) {
        if (!propPanel.dimensions) return;

        const box = new THREE.Box3().setFromObject(object);
        const size = new THREE.Vector3();
        box.getSize(size);

        propPanel.dimensions.textContent = 
            `L: ${size.x.toFixed(2)}, W: ${size.z.toFixed(2)}, H: ${size.y.toFixed(2)}`;
    }

    function updateMaterialSelectUI(object) {
        if (!propPanel.material || !object.material) return;

        const mat = object.material;
        let matType = "standard";

        if (mat instanceof THREE.MeshBasicMaterial) matType = "basic";
        else if (mat instanceof THREE.MeshPhongMaterial) matType = "phong";
        else if (mat instanceof THREE.MeshLambertMaterial) matType = "lambert";
        else if (mat instanceof THREE.MeshStandardMaterial) matType = "standard";

        propPanel.material.value = matType;
    }

    // Apply changes from UI to Object
    function applyChangesToObject(triggerToast = false) {
        const object = getSelected();
        if (!object || isUpdatingUI) return;

        // Name
        if (propPanel.name) object.name = propPanel.name.value;

        // Position
        object.position.set(
            parseFloat(propPanel.posX.value) || 0,
            parseFloat(propPanel.posY.value) || 0,
            parseFloat(propPanel.posZ.value) || 0
        );

        // Rotation (degrees to radians)
        object.rotation.set(
            THREE.MathUtils.degToRad(parseFloat(propPanel.rotX.value) || 0),
            THREE.MathUtils.degToRad(parseFloat(propPanel.rotY.value) || 0),
            THREE.MathUtils.degToRad(parseFloat(propPanel.rotZ.value) || 0)
        );

        // Scale
        object.scale.set(
            parseFloat(propPanel.scaleX.value) || 1,
            parseFloat(propPanel.scaleY.value) || 1,
            parseFloat(propPanel.scaleZ.value) || 1
        );

        // Colour
        if (object.material && object.material.color) {
            object.material.color.set(propPanel.hex.value || propPanel.colour.value);
        }

        // Material Update if changed
        applyMaterialChange(object);

        // Sync material metadata for saving
        if (object.material) {
            const mat = object.material;
            object.userData.materialData = {
                type: propPanel.material ? propPanel.material.value : (mat.type.replace('Mesh', '').replace('Material', '')),
                roughness: mat.roughness !== undefined ? mat.roughness : 0.5,
                metalness: mat.metalness !== undefined ? mat.metalness : 0.15,
                opacity: mat.opacity,
                transparent: mat.transparent,
                emissive: mat.emissive ? "#" + mat.emissive.getHexString() : "#000000",
                emissiveIntensity: mat.emissiveIntensity !== undefined ? mat.emissiveIntensity : 1.0
            };
        }

        // Update other panels if they exist
        if (window.refreshSelectedObjectPanel) {
            window.refreshSelectedObjectPanel();
        }

        updateDimensionsUI(object);

        // Show success notification ONLY if triggered manually (not on every typo)
        if (triggerToast) {
            showToast("Changes Applied");
        }
    }

    function applyMaterialChange(object) {
        if (!propPanel.material) return;
        
        const selectedMatType = propPanel.material.value;
        const currentMat = object.material;
        let newMat;

        const params = {
            color: currentMat.color,
            map: currentMat.map,
            transparent: currentMat.transparent,
            opacity: currentMat.opacity
        };

        if (selectedMatType === "basic" && !(currentMat instanceof THREE.MeshBasicMaterial)) {
            newMat = new THREE.MeshBasicMaterial(params);
        } else if (selectedMatType === "phong" && !(currentMat instanceof THREE.MeshPhongMaterial)) {
            newMat = new THREE.MeshPhongMaterial(params);
        } else if (selectedMatType === "lambert" && !(currentMat instanceof THREE.MeshLambertMaterial)) {
            newMat = new THREE.MeshLambertMaterial(params);
        } else if (selectedMatType === "standard" && !(currentMat instanceof THREE.MeshStandardMaterial)) {
            newMat = new THREE.MeshStandardMaterial({
                ...params,
                roughness: 0.45,
                metalness: 0.15
            });
        }

        if (newMat) {
            object.material = newMat;
        }
    }

    /**
     * Material Presets Configuration
     */
    const materialPresets = {
        plastic: {
            roughness: 0.3,
            metalness: 0.1,
            opacity: 1,
            transparent: false,
            emissive: 0x000000,
            matType: "standard"
        },
        metal: {
            roughness: 0.15,
            metalness: 0.95,
            opacity: 1,
            transparent: false,
            emissive: 0x000000,
            matType: "standard"
        },
        glass: {
            roughness: 0.05,
            metalness: 0.1,
            opacity: 0.4,
            transparent: true,
            emissive: 0x000000,
            matType: "standard"
        },
        wood: {
            roughness: 0.9,
            metalness: 0.0,
            opacity: 1,
            transparent: false,
            emissive: 0x000000,
            matType: "lambert"
        },
        neon: {
            roughness: 0.5,
            metalness: 0.1,
            opacity: 1,
            transparent: false,
            emissiveIntensity: 1,
            matType: "phong"
        },
        default: {
            roughness: 0.45,
            metalness: 0.15,
            opacity: 1,
            transparent: false,
            emissive: 0x000000,
            matType: "standard"
        }
    };

    function applyMaterialPreset(presetName) {
        const object = getSelected();
        if (!object || !materialPresets[presetName]) return;

        const config = materialPresets[presetName];
        
        // Update the material type first
        if (propPanel.material) {
            propPanel.material.value = config.matType;
        }
        
        applyMaterialChange(object); // This creates the new material of correct type

        // Apply specific properties
        const mat = object.material;
        if (config.roughness !== undefined && mat.roughness !== undefined) mat.roughness = config.roughness;
        if (config.metalness !== undefined && mat.metalness !== undefined) mat.metalness = config.metalness;
        if (config.opacity !== undefined) mat.opacity = config.opacity;
        if (config.transparent !== undefined) mat.transparent = config.transparent;
        
        if (presetName === "neon") {
            mat.emissive = mat.color.clone();
        } else {
            mat.emissive = new THREE.Color(0x000000);
        }

        mat.needsUpdate = true;
        
        // Visual Feedback (Dynamic Ping)
        const summaryPanel = document.getElementById("selectedObjectSummary");
        if (summaryPanel) {
            summaryPanel.classList.remove("ping-animation");
            void summaryPanel.offsetWidth; // Trigger reflow
            summaryPanel.classList.add("ping-animation");
        }

        // Update UI
        if (window.cadStatusText) {
            window.cadStatusText.textContent = `Applied ${presetName} material to ${object.name}`;
        }
    }

    // Event Listeners for Inputs
    function initEventListeners() {
        // Sync colour picker and hex input
        if (propPanel.colour && propPanel.hex) {
            propPanel.colour.addEventListener("input", () => {
                propPanel.hex.value = propPanel.colour.value;
                if (!isUpdatingUI) applyChangesToObject();
            });
            propPanel.hex.addEventListener("input", () => {
                if (/^#[0-9A-F]{6}$/i.test(propPanel.hex.value)) {
                    propPanel.colour.value = propPanel.hex.value;
                    if (!isUpdatingUI) applyChangesToObject();
                }
            });
        }

        // Material Presets
        const presetButtons = document.querySelectorAll("[data-mat-preset]");
        presetButtons.forEach(btn => {
            btn.addEventListener("click", () => {
                const preset = btn.getAttribute("data-mat-preset");
                applyMaterialPreset(preset);
            });
        });

        // Real-time updates for numeric inputs
        const numericInputs = [
            propPanel.posX, propPanel.posY, propPanel.posZ,
            propPanel.rotX, propPanel.rotY, propPanel.rotZ,
            propPanel.scaleX, propPanel.scaleY, propPanel.scaleZ
        ];

        numericInputs.forEach(input => {
            if (input) {
                input.addEventListener("input", () => {
                    if (!isUpdatingUI) applyChangesToObject();
                });
            }
        });

        if (propPanel.name) {
            propPanel.name.addEventListener("input", () => {
                if (!isUpdatingUI) applyChangesToObject();
            });
        }

        if (propPanel.material) {
            propPanel.material.addEventListener("change", () => {
                if (!isUpdatingUI) applyChangesToObject();
            });
        }

        if (propPanel.applyBtn) {
            propPanel.applyBtn.addEventListener("click", () => applyChangesToObject(true));
        }

        // Listen for workspace selection changes with a slight protection for rapid clicks
        window.addEventListener("cad:selectionChanged", (event) => {
            if (event.detail && event.detail.object) {
                refreshPropertiesUI(event.detail.object);
            } else {
                refreshPropertiesUI(null);
            }
        });

        // Also check if something is already selected
        const current = getSelected();
        if (current) refreshPropertiesUI(current);
    }

    document.addEventListener("DOMContentLoaded", initEventListeners);

    // Export visibility for other scripts
    window.refreshPropertiesUI = refreshPropertiesUI;
})();
