/**
 * SIMPLE TEST VERSION
 * This version has LOTS of logging to verify it's working
 * Replace your applyMaterials.js with this temporarily
 */

console.log("🟢 applyMaterials.js LOADED");

(function () {
    /**
     * Material Presets Configuration
     */
    const MATERIAL_PRESETS = {
        default: {
            name: "Default",
            config: {
                roughness: 0.45,
                metalness: 0.15
            }
        },
        solid: {
            name: "Solid",
            config: {
                roughness: 0.35,
                metalness: 0.05,
                transparent: false,
                opacity: 1
            }
        },
        plastic: {
            name: "Plastic",
            config: {
                roughness: 0.55,
                metalness: 0.05
            }
        },
        metal: {
            name: "Metal",
            config: {
                roughness: 0.18,
                metalness: 0.85
            }
        },
        glass: {
            name: "Glass",
            config: {
                roughness: 0.05,
                metalness: 0,
                transparent: true,
                opacity: 0.28,
                depthWrite: false
            }
        },
        wood: {
            name: "Wood",
            config: {
                color: "#8b4513",
                roughness: 0.85,
                metalness: 0.02
            }
        },
        neon: {
            name: "Neon",
            config: {
                emissiveIntensity: 0.85,
                roughness: 0.25,
                metalness: 0
            }
        },
        transparent: {
            name: "Transparent",
            config: {
                roughness: 0.25,
                metalness: 0.05,
                transparent: true,
                opacity: 0.35,
                depthWrite: false
            }
        }
    };

    console.log("🟢 Material presets defined");

    /**
     * Toast Notification Helper
     */
    function showToast(message, duration = 3000) {
        console.log("🟢 Toast message:", message);
        const container = document.getElementById("toastContainer");
        if (!container) {
            console.warn("⚠️ Toast container not found");
            return;
        }

        const toast = document.createElement("div");
        toast.className = "toast";
        toast.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <span>${message}</span>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add("hiding");
            toast.addEventListener("animationend", () => {
                toast.remove();
            });
        }, duration);
    }

    /**
     * Get the currently selected CAD object
     */
    function getSelectedObject() {
        const obj = window.selectedObject || (window.getSelectedCADObject ? window.getSelectedCADObject() : null);
        console.log("🟢 getSelectedObject returned:", obj ? obj.name : "NULL");
        return obj;
    }

    /**
     * Apply a material preset to the selected object
     */
    function applyMaterialPreset(presetKey) {
        console.log("🟡 applyMaterialPreset called with:", presetKey);
        
        const object = getSelectedObject();
        
        if (!object) {
            console.error("❌ NO OBJECT SELECTED");
            showToast("No object selected", 3000);
            return;
        }

        if (!MATERIAL_PRESETS[presetKey]) {
            console.error("❌ UNKNOWN PRESET:", presetKey);
            return;
        }

        console.log("🟢 Applying material to:", object.name);

        const preset = MATERIAL_PRESETS[presetKey];
        const config = preset.config;
        
        // Get current color    
        let currentColor = 0xcccccc;
        if (object.material && object.material.color) {
            currentColor = object.material.color.clone();
        } else if (object.userData && object.userData.color) {
            currentColor = new THREE.Color(object.userData.color);
        }

        // Special handling for wood
        if (presetKey === "wood") {
            currentColor = new THREE.Color(config.color);
        }

        // Create material params
        const materialParams = {
            color: currentColor,
            ...config
        };

        // For neon, set emissive
        if (presetKey === "neon") {
            materialParams.emissive = currentColor.clone();
        }

        // Create and apply material
        const newMaterial = new THREE.MeshStandardMaterial(materialParams);
        object.material = newMaterial;
        object.material.needsUpdate = true;

        console.log("🟢 Material applied successfully");

        // Store metadata
        object.userData = object.userData || {};
        object.userData.materialType = presetKey;
        object.userData.materialName = preset.name; 
        object.userData.materialData = config;
        
        console.log("🟢 userData updated");

        // Update properties panel if it exists
        if (window.refreshPropertiesUI) {
            window.refreshPropertiesUI(object);
            console.log("🟢 Properties UI refreshed");
        }

        // Show success notification
        showToast(`Material Applied Successfully`);
    }

    /**
     * Initialize event listeners for material buttons
     */
    function initMaterialButtons() {
        console.log("🟡 Initializing material buttons...");
        
        const buttons = document.querySelectorAll("[data-mat-preset]");
        console.log("🟢 Found", buttons.length, "material buttons");

        if (buttons.length === 0) {
            console.error("❌ NO MATERIAL BUTTONS FOUND IN DOM");
            console.error("Looking for elements with data-mat-preset attribute");
            return;
        }

        buttons.forEach((button, index) => {
            const presetKey = button.getAttribute("data-mat-preset");
            console.log(`  Button ${index}: data-mat-preset="${presetKey}"`);
            
            button.addEventListener("click", () => {
                console.log(`🟡 BUTTON CLICKED: ${presetKey}`);
                applyMaterialPreset(presetKey);
            });
        });

        console.log("🟢 Material button event listeners attached");
    }

    // Export functions globally
    window.applyMaterialPreset = applyMaterialPreset;

    // Initialize on DOM ready
    document.addEventListener("DOMContentLoaded", initMaterialButtons);
    
    // Also try immediately in case DOM is already loaded
    setTimeout(initMaterialButtons, 100);
})();

console.log("🟢 applyMaterials.js SETUP COMPLETE");