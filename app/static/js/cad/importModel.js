(function () {
    "use strict";

    const OBJEX_EXPORT_METADATA_KEY = "objexCadExport";
    const OBJEX_OBJECT_METADATA_KEY = "objexCadObject";

    function getFormatApi() {
        return window.CADModelFormats || {};
    }

    function setImportStatus(message) {
        const statusText = document.getElementById("cadStatusText");

        if (statusText) {
            statusText.textContent = message;
        }
    }

    function normalizeFormat(format, filename) {
        const formatApi = getFormatApi();

        if (formatApi.normalizeModelFormat) {
            const normalized = formatApi.normalizeModelFormat(format);

            if (normalized) {
                return normalized;
            }
        }

        if (formatApi.detectModelFormat) {
            return formatApi.detectModelFormat(filename) || "glb";
        }

        return "glb";
    }

    function createImportedMeshName(filename, index) {
        const formatApi = getFormatApi();

        if (formatApi.getModelNameFromFilename) {
            const baseName = formatApi.getModelNameFromFilename(filename) || "model";
            return "imported-" + baseName + (index > 0 ? "-" + (index + 1) : "");
        }

        return "imported-model-" + (index + 1);
    }

    function collectMeshesFromObject(object, meshes) {
        if (!object) {
            return;
        }

        if (object.isMesh) {
            meshes.push(object);
            return;
        }

        object.traverse(function (child) {
            if (child.isMesh) {
                meshes.push(child);
            }
        });
    }

    function prepareMeshesForStandaloneUse(root, meshes) {
        if (!root || !Array.isArray(meshes)) {
            return;
        }

        if (typeof root.updateMatrixWorld === "function") {
            root.updateMatrixWorld(true);
        }

        meshes.forEach(function (mesh) {
            if (!mesh || !mesh.matrixWorld) {
                return;
            }

            mesh.updateMatrixWorld(true);
            mesh.matrixWorld.decompose(mesh.position, mesh.quaternion, mesh.scale);

            if (mesh.parent) {
                mesh.parent.remove(mesh);
            }

            mesh.updateMatrix();
            mesh.updateMatrixWorld(true);
        });
    }

    function hasObjexExportMetadata(exportMetadata) {
        return Boolean(
            exportMetadata &&
            Array.isArray(exportMetadata.objects) &&
            exportMetadata.objects.length > 0
        );
    }

    function centerMeshes(meshes) {
        if (!meshes.length) {
            return;
        }

        const box = new THREE.Box3();

        meshes.forEach(function (mesh) {
            box.expandByObject(mesh);
        });

        const center = box.getCenter(new THREE.Vector3());

        meshes.forEach(function (mesh) {
            mesh.position.sub(center);
            mesh.position.y += 1;
        });
    }

    function clonePlainValue(value) {
        if (value === undefined || value === null) {
            return value;
        }

        try {
            return JSON.parse(JSON.stringify(value));
        } catch (error) {
            return value;
        }
    }

    function isFiniteNumber(value) {
        return Number.isFinite(Number(value));
    }

    function createImportedObjectId(index) {
        return "obj-" + Date.now() + "-" + index + "-" + Math.floor(Math.random() * 1000);
    }

    function normalizeVector3(value, fallback) {
        const defaults = fallback || { x: 0, y: 0, z: 0 };
        const source = value && typeof value === "object" ? value : {};

        return {
            x: isFiniteNumber(source.x) ? Number(source.x) : defaults.x,
            y: isFiniteNumber(source.y) ? Number(source.y) : defaults.y,
            z: isFiniteNumber(source.z) ? Number(source.z) : defaults.z
        };
    }

    function normalizeScale(value, fallback) {
        const scale = normalizeVector3(value, fallback || { x: 1, y: 1, z: 1 });

        return {
            x: scale.x === 0 ? 1 : scale.x,
            y: scale.y === 0 ? 1 : scale.y,
            z: scale.z === 0 ? 1 : scale.z
        };
    }

    function getMeshColor(mesh) {
        if (mesh && mesh.material && mesh.material.color) {
            return "#" + mesh.material.color.getHexString();
        }

        if (mesh && mesh.userData && mesh.userData.color) {
            return mesh.userData.color;
        }

        return "#cccccc";
    }

    function createFallbackDesignObject(mesh, index, filename, importFormat, importPayload) {
        return {
            id: "obj-" + Date.now() + "-" + index + "-" + Math.floor(Math.random() * 1000),
            name: createImportedMeshName(filename, index),
            type: "imported",
            position: {
                x: mesh.position.x,
                y: mesh.position.y,
                z: mesh.position.z
            },
            rotation: {
                x: mesh.rotation.x,
                y: mesh.rotation.y,
                z: mesh.rotation.z
            },
            scale: {
                x: mesh.scale.x,
                y: mesh.scale.y,
                z: mesh.scale.z
            },
            color: getMeshColor(mesh),
            materialType: "default",
            materialName: "Default",
            materialDescription: "",
            materialData: null,
            importFormat: importFormat,
            importPayload: index === 0 ? importPayload : null
        };
    }

    function getMetadataObjectFromUserData(userData) {
        if (!userData || typeof userData !== "object") {
            return null;
        }

        const metadata = userData[OBJEX_OBJECT_METADATA_KEY];

        return metadata && typeof metadata === "object" ? metadata : null;
    }

    function getSceneExportMetadata(object) {
        let metadata = null;

        if (object && object.userData && object.userData[OBJEX_EXPORT_METADATA_KEY]) {
            metadata = object.userData[OBJEX_EXPORT_METADATA_KEY];
        }

        if (!metadata && object && typeof object.traverse === "function") {
            object.traverse(function (child) {
                if (!metadata && child.userData && child.userData[OBJEX_EXPORT_METADATA_KEY]) {
                    metadata = child.userData[OBJEX_EXPORT_METADATA_KEY];
                }
            });
        }

        return metadata && Array.isArray(metadata.objects) ? metadata : null;
    }

    function getExportedObjectMetadata(mesh, index, exportMetadata) {
        let current = mesh;

        while (current) {
            const objectMetadata = getMetadataObjectFromUserData(current.userData);

            if (objectMetadata) {
                return objectMetadata;
            }

            current = current.parent;
        }

        if (exportMetadata && Array.isArray(exportMetadata.objects)) {
            return exportMetadata.objects[index] || (exportMetadata.objects.length === 1
                ? exportMetadata.objects[0]
                : null);
        }

        return null;
    }

    function mergeExportedMetadata(fallback, exportedObject, importFormat, importPayload) {
        if (!exportedObject || typeof exportedObject !== "object") {
            return fallback;
        }

        const metadata = clonePlainValue(exportedObject) || {};

        return {
            id: fallback.id || createImportedObjectId(0),
            name: typeof metadata.name === "string" && metadata.name.trim() !== ""
                ? metadata.name.trim()
                : fallback.name,
            type: "imported",
            position: normalizeVector3(metadata.position, fallback.position),
            rotation: normalizeVector3(metadata.rotation, fallback.rotation),
            scale: normalizeScale(metadata.scale, fallback.scale),
            color: typeof metadata.color === "string" && metadata.color.trim() !== ""
                ? metadata.color
                : fallback.color,
            materialType: typeof metadata.materialType === "string" && metadata.materialType.trim() !== ""
                ? metadata.materialType
                : fallback.materialType,
            materialName: typeof metadata.materialName === "string" && metadata.materialName.trim() !== ""
                ? metadata.materialName
                : fallback.materialName,
            materialDescription: typeof metadata.materialDescription === "string"
                ? metadata.materialDescription
                : fallback.materialDescription,
            materialData: metadata.materialData && typeof metadata.materialData === "object"
                ? metadata.materialData
                : fallback.materialData,
            importFormat: importFormat,
            importPayload: fallback.importPayload || null
        };
    }

    function meshToDesignObject(mesh, index, filename, importFormat, importPayload, exportMetadata) {
        const fallback = createFallbackDesignObject(mesh, index, filename, importFormat, importPayload);
        const exportedObject = getExportedObjectMetadata(mesh, index, exportMetadata);

        return mergeExportedMetadata(fallback, exportedObject, importFormat, importPayload);
    }

    function decodeBase64Text(encoded) {
        const binary = atob(encoded);

        if (typeof TextDecoder === "function") {
            const bytes = new Uint8Array(binary.length);

            for (let index = 0; index < binary.length; index += 1) {
                bytes[index] = binary.charCodeAt(index);
            }

            return new TextDecoder().decode(bytes);
        }

        return decodeURIComponent(escape(binary));
    }

    function extractOBJExportMetadata(text) {
        if (typeof text !== "string") {
            return null;
        }

        const match = text.match(/^#\s*objex-cad-metadata:\s*([A-Za-z0-9+/=]+)\s*$/m);

        if (!match || !match[1]) {
            return null;
        }

        try {
            const metadata = JSON.parse(decodeBase64Text(match[1]));
            return metadata && Array.isArray(metadata.objects) ? metadata : null;
        } catch (error) {
            return null;
        }
    }

    function encodeImportPayload(data) {
        if (typeof data === "string") {
            return data;
        }

        if (getFormatApi().arrayBufferToBase64) {
            return getFormatApi().arrayBufferToBase64(data);
        }

        return "";
    }

    function registerImportedMesh(mesh, filename, index, importFormat, importPayload, exportMetadata) {
        if (!mesh) {
            return null;
        }

        const designObject = meshToDesignObject(
            mesh,
            index,
            filename,
            importFormat || "glb",
            importPayload,
            exportMetadata
        );

        mesh.name = designObject.name || createImportedMeshName(filename, index);
        applySavedTransforms(mesh, designObject);

        if (typeof window.addObjectToCADScene === "function") {
            window.addObjectToCADScene(mesh, {
                recordHistory: false
            });
        }

        return mesh;
    }

    function loadGLTFFromData(data, filename, options) {
        return new Promise(function (resolve, reject) {
            if (typeof THREE.GLTFLoader !== "function") {
                reject(new Error("GLTF loader is not available."));
                return;
            }

            const loader = new THREE.GLTFLoader();

            loader.parse(data, "", function (gltf) {
                const meshes = [];
                collectMeshesFromObject(gltf.scene, meshes);
                const exportMetadata = getSceneExportMetadata(gltf.scene);
                const preserveWorldSpace = hasObjexExportMetadata(exportMetadata);

                if (!meshes.length) {
                    reject(new Error("No mesh geometry found in model file."));
                    return;
                }

                prepareMeshesForStandaloneUse(gltf.scene, meshes);

                if (!preserveWorldSpace) {
                    centerMeshes(meshes);
                }

                if (options && options.designDataOnly) {
                    const importFormat = normalizeFormat(options.format, filename);
                    const payload = options.importPayload || encodeImportPayload(data);

                    resolve([meshToDesignObject(
                        meshes[0],
                        0,
                        filename,
                        importFormat,
                        payload,
                        exportMetadata
                    )]);
                    return;
                }

                const importFormat = normalizeFormat(options && options.format, filename);
                const payload = options && options.importPayload
                    ? options.importPayload
                    : encodeImportPayload(data);

                resolve(meshes.map(function (mesh, index) {
                    return registerImportedMesh(mesh, filename, index, importFormat, payload, exportMetadata);
                }).filter(Boolean));
            }, function (error) {
                reject(error || new Error("Could not parse GLTF/GLB file."));
            });
        });
    }

    function loadOBJFromText(text, filename, options) {
        return new Promise(function (resolve, reject) {
            if (typeof THREE.OBJLoader !== "function") {
                reject(new Error("OBJ loader is not available."));
                return;
            }

            const loader = new THREE.OBJLoader();
            const exportMetadata = extractOBJExportMetadata(text);
            const object = loader.parse(text);
            const meshes = [];
            const preserveWorldSpace = hasObjexExportMetadata(exportMetadata);

            collectMeshesFromObject(object, meshes);

            if (!meshes.length) {
                reject(new Error("No mesh geometry found in OBJ file."));
                return;
            }

            prepareMeshesForStandaloneUse(object, meshes);

            if (!preserveWorldSpace) {
                centerMeshes(meshes);
            }

            if (options && options.designDataOnly) {
                resolve([meshToDesignObject(meshes[0], 0, filename, "obj", text, exportMetadata)]);
                return;
            }

            const importPayload = options && options.importPayload ? options.importPayload : text;

            resolve(meshes.map(function (mesh, index) {
                return registerImportedMesh(mesh, filename, index, "obj", importPayload, exportMetadata);
            }).filter(Boolean));
        });
    }

    function readModelFile(file, format) {
        return new Promise(function (resolve, reject) {
            const reader = new FileReader();

            reader.onload = function (event) {
                resolve(event.target.result);
            };

            reader.onerror = function () {
                reject(new Error("Could not read the selected model file."));
            };

            if (format === "obj") {
                reader.readAsText(file);
            } else if (format === "gltf") {
                reader.readAsText(file);
            } else {
                reader.readAsArrayBuffer(file);
            }
        });
    }

    function parseModelFile(file, options) {
        return new Promise(function (resolve) {
            if (!file) {
                resolve({
                    success: false,
                    message: "No file selected."
                });
                return;
            }

            const formatApi = getFormatApi();
            let selectedFormat = normalizeFormat(options && options.format, file.name);
            const detectedFormat = formatApi.detectModelFormat
                ? formatApi.detectModelFormat(file.name)
                : "";

            if (detectedFormat && detectedFormat !== selectedFormat) {
                selectedFormat = detectedFormat;
            }

            readModelFile(file, selectedFormat).then(function (fileData) {
                const parseOptions = Object.assign({}, options || {}, {
                    format: selectedFormat
                });
                const onSuccess = function (result) {
                    resolve({
                        success: true,
                        format: selectedFormat,
                        objects: parseOptions.designDataOnly ? result : null,
                        meshes: parseOptions.designDataOnly ? null : result,
                        count: result.length
                    });
                };
                const onFailure = function (error) {
                    resolve({
                        success: false,
                        message: error && error.message ? error.message : "Could not import model file."
                    });
                };

                if (selectedFormat === "obj") {
                    loadOBJFromText(fileData, file.name, parseOptions).then(onSuccess).catch(onFailure);
                    return;
                }

                loadGLTFFromData(fileData, file.name, parseOptions).then(onSuccess).catch(onFailure);
            }).catch(function (error) {
                resolve({
                    success: false,
                    message: error && error.message ? error.message : "Could not read model file."
                });
            });
        });
    }

    function restoreImportedObjectFromData(savedObject, options) {
        if (!savedObject || savedObject.type !== "imported" || !savedObject.importPayload) {
            return Promise.resolve(null);
        }

        const importFormat = savedObject.importFormat || "glb";
        const filename = savedObject.name || "imported-model";
        const payload = savedObject.importPayload;

        return new Promise(function (resolve) {
            const registerOptions = {
                designDataOnly: false,
                format: importFormat,
                importPayload: payload
            };

            const onMeshes = function (meshes) {
                const restoredMeshes = (meshes || []).filter(Boolean);

                restoredMeshes.forEach(function (mesh, index) {
                    mesh.name = savedObject.name || mesh.name;

                    if (index === 0) {
                        applySavedTransforms(mesh, savedObject);
                    }
                });

                resolve(restoredMeshes[0] || null);
            };

            if (importFormat === "obj") {
                loadOBJFromText(payload, filename, registerOptions).then(onMeshes).catch(function () {
                    resolve(null);
                });
                return;
            }

            if (importFormat === "gltf") {
                loadGLTFFromData(payload, filename, registerOptions).then(onMeshes).catch(function () {
                    resolve(null);
                });
                return;
            }

            let arrayBuffer = null;

            try {
                const binary = atob(payload);
                const bytes = new Uint8Array(binary.length);

                for (let index = 0; index < binary.length; index += 1) {
                    bytes[index] = binary.charCodeAt(index);
                }

                arrayBuffer = bytes.buffer;
            } catch (error) {
                resolve(null);
                return;
            }

            loadGLTFFromData(arrayBuffer, filename, registerOptions).then(onMeshes).catch(function () {
                resolve(null);
            });
        });
    }

    function applySavedTransforms(mesh, savedObject) {
        if (!mesh || !savedObject) {
            return;
        }

        if (savedObject.position) {
            mesh.position.set(
                Number(savedObject.position.x) || 0,
                Number(savedObject.position.y) || 0,
                Number(savedObject.position.z) || 0
            );
        }

        if (savedObject.rotation) {
            mesh.rotation.set(
                Number(savedObject.rotation.x) || 0,
                Number(savedObject.rotation.y) || 0,
                Number(savedObject.rotation.z) || 0
            );
        }

        if (savedObject.scale) {
            mesh.scale.set(
                Number(savedObject.scale.x) || 1,
                Number(savedObject.scale.y) || 1,
                Number(savedObject.scale.z) || 1
            );
        }

        if (
            window.CADDesignData &&
            typeof window.CADDesignData.applyUserDataFromSavedData === "function"
        ) {
            window.CADDesignData.applyUserDataFromSavedData(mesh, savedObject);
        } else {
            mesh.userData = mesh.userData || {};
            mesh.userData.id = savedObject.id || mesh.userData.id;
            mesh.userData.type = "imported";
            mesh.userData.selectable = true;
            mesh.userData.color = savedObject.color || "#cccccc";
            mesh.userData.materialType = savedObject.materialType || "default";
            mesh.userData.materialName = savedObject.materialName || "Default";
            mesh.userData.materialData = savedObject.materialData || null;
            mesh.userData.materialDescription = savedObject.materialDescription || "";
            mesh.userData.importFormat = savedObject.importFormat || "glb";
            mesh.userData.importPayload = savedObject.importPayload || null;
        }

        if (
            window.CADDesignData &&
            typeof window.CADDesignData.applyMaterialFromSavedData === "function"
        ) {
            window.CADDesignData.applyMaterialFromSavedData(mesh, savedObject);
        } else if (savedObject.color && mesh.material && mesh.material.color) {
            mesh.material.color.set(savedObject.color);
            mesh.material.needsUpdate = true;
        }
    }

    function importModelFromFile(file, options) {
        return parseModelFile(file, options).then(function (result) {
            if (!result.success || !result.meshes) {
                return result;
            }

            if (window.CADHistory && typeof window.CADHistory.push === "function") {
                const records = result.meshes.map(function (mesh) {
                    return {
                        object: mesh,
                        index: (window.cadObjects || []).indexOf(mesh)
                    };
                });

                window.CADHistory.push({
                    label: "Import " + (result.format || "model").toUpperCase(),
                    undo: function () {
                        records.forEach(function (record) {
                            const workspace = window.CADWorkspace;

                            if (workspace && workspace.scene) {
                                workspace.scene.remove(record.object);
                            }

                            const objectIndex = (window.cadObjects || []).indexOf(record.object);

                            if (objectIndex !== -1) {
                                window.cadObjects.splice(objectIndex, 1);
                            }
                        });

                        setImportStatus("Model import undone.");
                    },
                    redo: function () {
                        records.forEach(function (record) {
                            if (typeof window.addObjectToCADScene === "function") {
                                window.addObjectToCADScene(record.object, {
                                    index: record.index
                                });
                            }
                        });

                        setImportStatus("Model import redone.");
                    }
                });
            }

            return {
                success: true,
                message: "Imported " + result.count + " mesh object(s) as " +
                    String(result.format || "model").toUpperCase() + ".",
                count: result.count
            };
        });
    }

    function parseModelFileToDesignData(file, options) {
        return parseModelFile(file, Object.assign({}, options || {}, {
            designDataOnly: true
        }));
    }

    window.CADImportModel = {
        importModelFromFile: importModelFromFile,
        parseModelFileToDesignData: parseModelFileToDesignData,
        restoreImportedObjectFromData: restoreImportedObjectFromData
    };
})();
