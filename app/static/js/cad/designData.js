(function () {
    "use strict";

    function getObjectColor(object) {
        const material = getFirstMaterial(object ? object.material : null);

        if (material && material.color) {
            return "#" + material.color.getHexString();
        }

        if (object.userData && object.userData.color) {
            return object.userData.color;
        }

        return "#ffffff";
    }

    function clonePlainValue(value) {
        if (value === undefined || value === null) {
            return value;
        }

        return JSON.parse(JSON.stringify(value));
    }

    function getMaterialList(material) {
        if (Array.isArray(material)) {
            return material;
        }

        return material ? [material] : [];
    }

    function getFirstMaterial(material) {
        return getMaterialList(material).find(function (singleMaterial) {
            return Boolean(singleMaterial);
        }) || null;
    }

    function isFiniteNumber(value) {
        return Number.isFinite(Number(value));
    }

    function getPresetMaterialConfig(materialType) {
        if (typeof window.getMaterialPreset === "function") {
            const preset = window.getMaterialPreset(materialType || "default");

            if (preset && preset.config) {
                return clonePlainValue(preset.config);
            }
        }

        return null;
    }

    function normaliseMaterialData(materialData, materialType) {
        const presetConfig = getPresetMaterialConfig(materialType) || {};
        const sourceData = Object.assign({}, presetConfig, materialData || {});
        const opacity = isFiniteNumber(sourceData.opacity) ? Number(sourceData.opacity) : 1;
        const transparent = Boolean(sourceData.transparent) || opacity < 1;

        const normalizedData = {
            roughness: isFiniteNumber(sourceData.roughness) ? Number(sourceData.roughness) : 0.45,
            metalness: isFiniteNumber(sourceData.metalness) ? Number(sourceData.metalness) : 0,
            opacity: opacity,
            transparent: transparent,
            depthWrite: transparent
                ? false
                : (sourceData.depthWrite === undefined ? true : Boolean(sourceData.depthWrite))
        };

        if (sourceData.emissive) {
            normalizedData.emissive = sourceData.emissive;
        }

        if (isFiniteNumber(sourceData.emissiveIntensity) && Number(sourceData.emissiveIntensity) > 0) {
            normalizedData.emissiveIntensity = Number(sourceData.emissiveIntensity);
        }

        return normalizedData;
    }

    function getMaterialDataForSaving(object) {
        if (!object) {
            return null;
        }

        const material = getFirstMaterial(object.material);
        const storedData = object.userData && object.userData.materialData
            ? clonePlainValue(object.userData.materialData)
            : {};
        const materialType = object.userData && object.userData.materialType
            ? object.userData.materialType
            : "default";
        const materialData = normaliseMaterialData(storedData, materialType);

        if (material) {
            if (isFiniteNumber(material.roughness)) {
                materialData.roughness = Number(material.roughness);
            }

            if (isFiniteNumber(material.metalness)) {
                materialData.metalness = Number(material.metalness);
            }

            if (isFiniteNumber(material.opacity)) {
                materialData.opacity = Number(material.opacity);
            }

            if (material.transparent !== undefined) {
                materialData.transparent = Boolean(material.transparent) || materialData.opacity < 1;
            }

            if (material.depthWrite !== undefined) {
                materialData.depthWrite = Boolean(material.depthWrite);
            }

            if (material.emissive) {
                materialData.emissive = "#" + material.emissive.getHexString();
            }

            if (isFiniteNumber(material.emissiveIntensity) && Number(material.emissiveIntensity) > 0) {
                materialData.emissiveIntensity = Number(material.emissiveIntensity);
            }
        }

        return materialData;
    }

    function serializeCADObject(object) {
        return {
            id: object.userData && object.userData.id ? object.userData.id : "",
            name: object.name || "Unnamed Object",
            type: object.userData && object.userData.type ? object.userData.type : "unknown",
            position: {
                x: object.position.x,
                y: object.position.y,
                z: object.position.z
            },
            rotation: {
                x: object.rotation.x,
                y: object.rotation.y,
                z: object.rotation.z
            },
            scale: {
                x: object.scale.x,
                y: object.scale.y,
                z: object.scale.z
            },
            color: getObjectColor(object),
            materialType: (object.userData && object.userData.materialType) || "default",
            materialName: (object.userData && object.userData.materialName) || "Default",
            materialDescription: (object.userData && object.userData.materialDescription) || "",
            materialData: getMaterialDataForSaving(object),
            importFormat: object.userData && object.userData.importFormat ? object.userData.importFormat : null,
            importPayload: object.userData && object.userData.importPayload ? object.userData.importPayload : null
        };
    }

    function serializeCADObjects(objects) {
        return (objects || []).map(serializeCADObject);
    }

    function applyTransformsFromSavedData(object, savedObject) {
        if (savedObject.position) {
            object.position.set(
                Number(savedObject.position.x) || 0,
                Number(savedObject.position.y) || 0,
                Number(savedObject.position.z) || 0
            );
        }

        if (savedObject.rotation) {
            object.rotation.set(
                Number(savedObject.rotation.x) || 0,
                Number(savedObject.rotation.y) || 0,
                Number(savedObject.rotation.z) || 0
            );
        }

        if (savedObject.scale) {
            object.scale.set(
                Number(savedObject.scale.x) || 1,
                Number(savedObject.scale.y) || 1,
                Number(savedObject.scale.z) || 1
            );
        }
    }

    function applyUserDataFromSavedData(object, savedObject) {
        object.userData = object.userData || {};
        object.userData.id = savedObject.id || object.userData.id || "";
        object.userData.type = savedObject.type || object.userData.type || "unknown";
        object.userData.selectable = true;
        object.userData.color = savedObject.color || "#ffffff";
        object.userData.materialType = savedObject.materialType || "default";
        object.userData.materialName = savedObject.materialName || "Default";
        object.userData.materialData = savedObject.materialData
            ? normaliseMaterialData(savedObject.materialData, object.userData.materialType)
            : normaliseMaterialData(null, object.userData.materialType);

        if (savedObject.materialDescription) {
            object.userData.materialDescription = savedObject.materialDescription;
        }

        if (savedObject.importFormat) {
            object.userData.importFormat = savedObject.importFormat;
        }

        if (savedObject.importPayload) {
            object.userData.importPayload = savedObject.importPayload;
        }
    }

    function applyMaterialFromSavedData(object, savedObject) {
        if (!savedObject || !object) {
            return;
        }

        if (savedObject.color && object.material) {
            if (Array.isArray(object.material)) {
                object.material.forEach(function (material) {
                    if (material && material.color) {
                        material.color.set(savedObject.color);
                        material.needsUpdate = true;
                    }
                });
            } else if (object.material.color) {
                object.material.color.set(savedObject.color);
                object.material.needsUpdate = true;
            }
        }

        const matData = savedObject.materialData
            ? normaliseMaterialData(savedObject.materialData, savedObject.materialType)
            : normaliseMaterialData(null, savedObject.materialType);

        if (!matData) {
            return;
        }

        object.userData = object.userData || {};
        object.userData.materialData = clonePlainValue(matData);

        const emissiveColor = savedObject.materialType === "neon"
            ? savedObject.color
            : (matData.emissive || 0x000000);

        const materialParams = {
            color: savedObject.color || 0xcccccc,
            roughness: matData.roughness,
            metalness: matData.metalness,
            opacity: matData.opacity,
            transparent: Boolean(matData.transparent) || matData.opacity < 1,
            emissive: new THREE.Color(emissiveColor || 0x000000),
            emissiveIntensity: matData.emissiveIntensity === undefined ? 0 : Number(matData.emissiveIntensity),
            depthWrite: matData.depthWrite !== undefined ? Boolean(matData.depthWrite) : true
        };

        object.material = new THREE.MeshStandardMaterial(materialParams);
        object.material.needsUpdate = true;
    }

    function restoreObjectFromData(savedObject, options) {
        if (!savedObject || !savedObject.type) {
            return null;
        }

        if (savedObject.type === "imported") {
            if (
                savedObject.importPayload &&
                window.CADImportModel &&
                typeof window.CADImportModel.restoreImportedObjectFromData === "function"
            ) {
                window.CADImportModel.restoreImportedObjectFromData(savedObject, options);
            }

            return null;
        }

        const primitiveTypes = window.CADDesignSchema
            ? window.CADDesignSchema.PRIMITIVE_SHAPE_TYPES
            : ["cube", "sphere", "cylinder", "cone", "torus", "pyramid", "plane"];

        if (primitiveTypes.indexOf(savedObject.type) === -1) {
            return null;
        }

        if (typeof addShape !== "function") {
            return null;
        }

        const recordHistory = Boolean(options && options.recordHistory);
        const beforeCount = (window.cadObjects || []).length;
        const createdObject = addShape(savedObject.type, {
            recordHistory: recordHistory
        });

        let object = createdObject;

        if (!object && window.cadObjects && window.cadObjects.length > beforeCount) {
            object = window.cadObjects[window.cadObjects.length - 1];
        }

        if (!object) {
            return null;
        }

        object.name = savedObject.name || object.name || "Unnamed Object";
        applyUserDataFromSavedData(object, savedObject);
        applyTransformsFromSavedData(object, savedObject);
        applyMaterialFromSavedData(object, savedObject);

        return object;
    }

    function restoreObjectsFromData(objects, options) {
        const restoredObjects = [];

        (objects || []).forEach(function (savedObject) {
            const restoredObject = restoreObjectFromData(savedObject, options);

            if (restoredObject) {
                restoredObjects.push(restoredObject);
            }
        });

        return restoredObjects;
    }

    function buildObjexDesignFile(projectMeta, objects) {
        const schema = window.CADDesignSchema || {};
        const project = projectMeta || {};

        return {
            format: schema.FORMAT || "objex-design",
            version: schema.VERSION || "1.0",
            exportedAt: new Date().toISOString(),
            application: schema.APPLICATION || "Objex CAD",
            project: {
                name: project.name || "Untitled Project",
                description: project.description || ""
            },
            objects: Array.isArray(objects) ? objects : []
        };
    }

    window.CADDesignData = {
        serializeCADObject: serializeCADObject,
        serializeCADObjects: serializeCADObjects,
        applyTransformsFromSavedData: applyTransformsFromSavedData,
        applyUserDataFromSavedData: applyUserDataFromSavedData,
        applyMaterialFromSavedData: applyMaterialFromSavedData,
        restoreObjectFromData: restoreObjectFromData,
        restoreObjectsFromData: restoreObjectsFromData,
        buildObjexDesignFile: buildObjexDesignFile
    };

    window.getCADObjectsForSaving = function () {
        return serializeCADObjects(window.cadObjects || []);
    };
})();
