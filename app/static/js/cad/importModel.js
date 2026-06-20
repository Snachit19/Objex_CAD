(function () {
    "use strict";

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

    function meshToDesignObject(mesh, index, filename, importFormat, importPayload) {
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
            color: mesh.material && mesh.material.color
                ? "#" + mesh.material.color.getHexString()
                : "#cccccc",
            materialType: "default",
            materialName: "Default",
            materialDescription: "",
            materialData: null,
            importFormat: importFormat,
            importPayload: index === 0 ? importPayload : null
        };
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

    function registerImportedMesh(mesh, filename, index, importFormat, importPayload) {
        if (!mesh) {
            return null;
        }

        mesh.name = createImportedMeshName(filename, index);
        mesh.userData = mesh.userData || {};
        mesh.userData.id = "obj-" + Date.now() + "-" + Math.floor(Math.random() * 10000);
        mesh.userData.type = "imported";
        mesh.userData.selectable = true;
        mesh.userData.materialType = "default";
        mesh.userData.materialName = "Default";
        mesh.userData.color = "#cccccc";
        mesh.userData.importFormat = importFormat || "glb";

        if (index === 0 && importPayload) {
            mesh.userData.importPayload = importPayload;
        }

        if (mesh.material && mesh.material.color) {
            mesh.userData.color = "#" + mesh.material.color.getHexString();
        }

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

                if (!meshes.length) {
                    reject(new Error("No mesh geometry found in model file."));
                    return;
                }

                centerMeshes(meshes);

                if (options && options.designDataOnly) {
                    const importFormat = normalizeFormat(options.format, filename);
                    const payload = options.importPayload || encodeImportPayload(data);

                    resolve([meshToDesignObject(meshes[0], 0, filename, importFormat, payload)]);
                    return;
                }

                const importFormat = normalizeFormat(options && options.format, filename);
                const payload = options && options.importPayload
                    ? options.importPayload
                    : encodeImportPayload(data);

                resolve(meshes.map(function (mesh, index) {
                    return registerImportedMesh(mesh, filename, index, importFormat, payload);
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
            const object = loader.parse(text);
            const meshes = [];

            collectMeshesFromObject(object, meshes);

            if (!meshes.length) {
                reject(new Error("No mesh geometry found in OBJ file."));
                return;
            }

            centerMeshes(meshes);

            if (options && options.designDataOnly) {
                resolve([meshToDesignObject(meshes[0], 0, filename, "obj", text)]);
                return;
            }

            const importPayload = options && options.importPayload ? options.importPayload : text;

            resolve(meshes.map(function (mesh, index) {
                return registerImportedMesh(mesh, filename, index, "obj", importPayload);
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
            const selectedFormat = normalizeFormat(options && options.format, file.name);
            const detectedFormat = formatApi.detectModelFormat
                ? formatApi.detectModelFormat(file.name)
                : "";

            if (detectedFormat && detectedFormat !== selectedFormat) {
                resolve({
                    success: false,
                    message: "Selected format is " + selectedFormat.toUpperCase() +
                        " but file appears to be " + detectedFormat.toUpperCase() + "."
                });
                return;
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
