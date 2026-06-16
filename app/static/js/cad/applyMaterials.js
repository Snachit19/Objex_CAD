(function () {
    "use strict";

    const MATERIAL_PRESETS = {
        default: {
            name: "Default",
            description: "Balanced matte surface",
            config: {
                roughness: 0.45,
                metalness: 0.15,
                transparent: false,
                opacity: 1
            }
        },
        solid: {
            name: "Solid",
            description: "Clean opaque finish",
            config: {
                roughness: 0.28,
                metalness: 0,
                transparent: false,
                opacity: 1
            }
        },
        plastic: {
            name: "Plastic",
            description: "Soft synthetic surface",
            config: {
                roughness: 0.5,
                metalness: 0.03,
                transparent: false,
                opacity: 1
            }
        },
        metal: {
            name: "Metal",
            description: "Reflective hard surface",
            config: {
                roughness: 0.16,
                metalness: 0.95,
                transparent: false,
                opacity: 1
            }
        },
        glass: {
            name: "Glass",
            description: "Clear transparent surface",
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
            description: "Warm rough surface",
            config: {
                color: "#8b4513",
                roughness: 0.85,
                metalness: 0.02,
                transparent: false,
                opacity: 1
            }
        },
        neon: {
            name: "Neon",
            description: "Bright glowing surface",
            config: {
                emissiveIntensity: 1.15,
                roughness: 0.2,
                metalness: 0,
                transparent: false,
                opacity: 1
            }
        },
        transparent: {
            name: "Transparent",
            description: "Tinted see-through surface",
            config: {
                roughness: 0.25,
                metalness: 0.05,
                transparent: true,
                opacity: 0.35,
                depthWrite: false
            }
        }
    };

    let materialButtonsInitialized = false;

    function getMaterialPreset(presetKey) {
        return MATERIAL_PRESETS[presetKey] || MATERIAL_PRESETS.default;
    }

    function getMaterialDisplayName(presetKey) {
        return getMaterialPreset(presetKey).name;
    }

    function formatMaterialValue(value) {
        return Number(value).toFixed(2);
    }

    function clampMaterialValue(value, min, max, fallback) {
        const numberValue = Number(value);

        if (Number.isNaN(numberValue)) {
            return fallback;
        }

        return Math.min(Math.max(numberValue, min), max);
    }

    function normaliseMaterialConfig(config) {
        const sourceConfig = config || {};
        const opacity = clampMaterialValue(sourceConfig.opacity, 0, 1, 1);
        const transparent = Boolean(sourceConfig.transparent) || opacity < 1;
        const emissiveIntensity = clampMaterialValue(sourceConfig.emissiveIntensity, 0, 2, 0);
        const materialConfig = Object.assign({}, sourceConfig, {
            roughness: clampMaterialValue(sourceConfig.roughness, 0, 1, 0.45),
            metalness: clampMaterialValue(sourceConfig.metalness, 0, 1, 0),
            opacity: opacity,
            transparent: transparent,
            depthWrite: transparent
                ? false
                : (sourceConfig.depthWrite === undefined ? true : Boolean(sourceConfig.depthWrite))
        });

        if (emissiveIntensity > 0) {
            materialConfig.emissiveIntensity = emissiveIntensity;
        } else {
            delete materialConfig.emissiveIntensity;
        }

        return materialConfig;
    }

    function getMaterialPropertySummary(presetKey, materialConfig) {
        const preset = getMaterialPreset(presetKey);
        const config = normaliseMaterialConfig(Object.assign({}, preset.config, materialConfig || {}));
        const details = [
            preset.description,
            "Roughness " + formatMaterialValue(config.roughness || 0),
            "Metalness " + formatMaterialValue(config.metalness || 0),
            "Opacity " + formatMaterialValue(config.opacity === undefined ? 1 : config.opacity)
        ];

        if (config.transparent) {
            details.push("Transparent");
        }

        if (config.emissiveIntensity) {
            details.push("Glow " + formatMaterialValue(config.emissiveIntensity));
        }

        return details.join(" | ");
    }

    function showMaterialToast(message, duration) {
        if (typeof window.showToast === "function") {
            window.showToast(message, duration || 3000);
            return;
        }

        const container = document.getElementById("toastContainer");

        if (!container) {
            return;
        }

        const toast = document.createElement("div");
        toast.className = "toast";
        toast.textContent = message;

        container.appendChild(toast);

        setTimeout(function () {
            toast.remove();
        }, duration || 3000);
    }

    function setTextValue(elementId, value) {
        const element = document.getElementById(elementId);

        if (element) {
            element.textContent = value;
        }
    }

    function setInputValue(elementId, value) {
        const input = document.getElementById(elementId);

        if (input) {
            input.value = value;
        }
    }

    function setCheckboxValue(elementId, value) {
        const input = document.getElementById(elementId);

        if (input) {
            input.checked = Boolean(value);
        }
    }

    function getInputNumber(elementId, fallback, min, max) {
        const input = document.getElementById(elementId);

        if (!input) {
            return fallback;
        }

        return clampMaterialValue(input.value, min, max, fallback);
    }

    function getCheckboxValue(elementId, fallback) {
        const input = document.getElementById(elementId);

        if (!input) {
            return fallback;
        }

        return input.checked;
    }

    function getSelectedObject() {
        if (typeof window.getSelectedCADObject === "function") {
            return window.getSelectedCADObject();
        }

        return window.selectedObject || null;
    }

    function updateMaterialControls(config) {
        const materialConfig = normaliseMaterialConfig(config);

        setInputValue("materialRoughnessInput", formatMaterialValue(materialConfig.roughness));
        setInputValue("materialMetalnessInput", formatMaterialValue(materialConfig.metalness));
        setInputValue("materialOpacityInput", formatMaterialValue(materialConfig.opacity));
        setInputValue("materialGlowInput", formatMaterialValue(materialConfig.emissiveIntensity || 0));
        setCheckboxValue("materialTransparentInput", materialConfig.transparent);
    }

    function getMaterialControlConfig(presetKey) {
        const baseConfig = getMaterialPreset(presetKey).config;
        const opacity = getInputNumber("materialOpacityInput", baseConfig.opacity === undefined ? 1 : baseConfig.opacity, 0, 1);
        const transparentInput = document.getElementById("materialTransparentInput");

        if (transparentInput && opacity < 1) {
            transparentInput.checked = true;
        }

        return normaliseMaterialConfig(Object.assign({}, baseConfig, {
            roughness: getInputNumber("materialRoughnessInput", baseConfig.roughness || 0, 0, 1),
            metalness: getInputNumber("materialMetalnessInput", baseConfig.metalness || 0, 0, 1),
            opacity: opacity,
            transparent: getCheckboxValue("materialTransparentInput", Boolean(baseConfig.transparent)) || opacity < 1,
            emissiveIntensity: getInputNumber("materialGlowInput", baseConfig.emissiveIntensity || 0, 0, 2)
        }));
    }

    function updateMaterialPanelReadout(presetKey, materialConfig, options) {
        const materialKey = MATERIAL_PRESETS[presetKey] ? presetKey : "default";
        const settings = options || {};
        const displayConfig = normaliseMaterialConfig(Object.assign(
            {},
            getMaterialPreset(materialKey).config,
            materialConfig || {}
        ));
        const materialSelect = document.getElementById("materialPresetSelect");

        if (materialSelect) {
            materialSelect.value = materialKey;
        }

        if (settings.updateControls !== false) {
            updateMaterialControls(displayConfig);
        }

        setTextValue("materialsPanelMaterialName", getMaterialDisplayName(materialKey));
        setTextValue("materialsPanelMaterialDetails", getMaterialPropertySummary(materialKey, displayConfig));
    }

    function syncMaterialPanelWithObject(object) {
        if (!object || !object.userData) {
            updateMaterialPanelReadout("default");
            return;
        }

        updateMaterialPanelReadout(
            object.userData.materialType || "default",
            object.userData.materialData || null
        );
    }

    function getCurrentMaterialColour(object, config) {
        if (config.color) {
            return new THREE.Color(config.color);
        }

        if (object.material && object.material.color) {
            return object.material.color.clone();
        }

        if (object.userData && object.userData.color) {
            return new THREE.Color(object.userData.color);
        }

        return new THREE.Color(0xcccccc);
    }

    function createMaterialFromPreset(object, presetKey, materialConfig) {
        const preset = MATERIAL_PRESETS[presetKey];
        const config = normaliseMaterialConfig(Object.assign({}, preset.config, materialConfig || {}));
        const materialColour = getCurrentMaterialColour(object, config);
        const materialParams = Object.assign({}, config, {
            color: materialColour
        });

        if (config.emissiveIntensity) {
            materialParams.emissive = materialColour.clone();
        }

        return new THREE.MeshStandardMaterial(materialParams);
    }

    function refreshMaterialUI(object) {
        if (typeof window.refreshSelectedObjectPanel === "function") {
            window.refreshSelectedObjectPanel();
            return;
        }

        if (typeof window.updateObjectPropertiesPanel === "function") {
            window.updateObjectPropertiesPanel(object);
        }

        if (typeof window.dispatchObjectChanged === "function") {
            window.dispatchObjectChanged(object);
        }
    }

    function applyMaterialPreset(presetKey, options) {
        const object = getSelectedObject();
        const preset = MATERIAL_PRESETS[presetKey];
        const settings = options || {};

        if (!object) {
            showMaterialToast("No object selected");
            return false;
        }

        if (!preset) {
            return false;
        }

        const materialConfig = normaliseMaterialConfig(Object.assign(
            {},
            preset.config,
            settings.materialConfig || {}
        ));

        object.material = createMaterialFromPreset(object, presetKey, materialConfig);
        object.material.needsUpdate = true;

        object.userData = object.userData || {};
        object.userData.materialType = presetKey;
        object.userData.materialName = preset.name;
        object.userData.materialData = Object.assign({}, materialConfig);
        object.userData.materialDescription = preset.description;
        object.userData.color = "#" + object.material.color.getHexString();

        updateMaterialPanelReadout(presetKey, materialConfig);
        refreshMaterialUI(object);

        if (settings.showNotification !== false) {
            showMaterialToast(preset.name + " material applied.");
        }

        return true;
    }

    function initMaterialButtons() {
        if (materialButtonsInitialized) {
            return;
        }

        const buttons = document.querySelectorAll("[data-mat-preset]");
        const materialSelect = document.getElementById("materialPresetSelect");
        const applySelectedButton = document.getElementById("applySelectedMaterialBtn");
        const materialControls = [
            "materialRoughnessInput",
            "materialMetalnessInput",
            "materialOpacityInput",
            "materialGlowInput",
            "materialTransparentInput"
        ];

        materialButtonsInitialized = true;

        buttons.forEach(function (button) {
            button.addEventListener("click", function () {
                const presetKey = button.getAttribute("data-mat-preset");
                updateMaterialPanelReadout(presetKey);
                applyMaterialPreset(presetKey);
            });
        });

        if (materialSelect) {
            materialSelect.addEventListener("change", function () {
                updateMaterialPanelReadout(materialSelect.value);
            });
        }

        materialControls.forEach(function (controlId) {
            const control = document.getElementById(controlId);

            if (control) {
                control.addEventListener("input", function () {
                    const presetKey = materialSelect ? materialSelect.value : "default";
                    updateMaterialPanelReadout(presetKey, getMaterialControlConfig(presetKey), {
                        updateControls: false
                    });
                });
            }
        });

        if (applySelectedButton) {
            applySelectedButton.addEventListener("click", function () {
                const presetKey = materialSelect ? materialSelect.value : "default";
                applyMaterialPreset(presetKey, {
                    materialConfig: getMaterialControlConfig(presetKey)
                });
            });
        }

        window.addEventListener("cad:selectionChanged", function (event) {
            syncMaterialPanelWithObject(event.detail ? event.detail.object : null);
        });

        window.addEventListener("cad:objectChanged", function (event) {
            if (event.detail && event.detail.object) {
                syncMaterialPanelWithObject(event.detail.object);
            }
        });

        syncMaterialPanelWithObject(getSelectedObject());
    }

    window.MATERIAL_PRESETS = MATERIAL_PRESETS;
    window.getMaterialPreset = getMaterialPreset;
    window.getMaterialDisplayName = getMaterialDisplayName;
    window.getMaterialPropertySummary = getMaterialPropertySummary;
    window.applyMaterialPreset = applyMaterialPreset;

    document.addEventListener("DOMContentLoaded", initMaterialButtons);

    if (document.readyState !== "loading") {
        initMaterialButtons();
    }
})();
