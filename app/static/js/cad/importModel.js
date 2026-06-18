(function () {
    "use strict";

    function setImportStatus(message) {
        const statusText = document.getElementById("cadStatusText");

        if (statusText) {
            statusText.textContent = message;
        }
    }

    function detectModelFormat(filename) {
        const lowerName = String(filename || "").toLowerCase();

        if (lowerName.endsWith(".glb")) {
            return "glb";
        }

        if (lowerName.endsWith(".gltf")) {
            return "gltf";
        }

        if (lowerName.endsWith(".obj")) {
            return "obj";
        }

        return "";
    }

    function createImportedMeshName(filename, index) {
        const baseName = String(filename || "model")
            .split(/[\\/]/)
            .pop()
            .replace(/\.[^.]+$/, "");

        return "imported-" + baseName + (index > 0 ? "-" + (index + 1) : "");
    }

    function registerImportedMesh(mesh, filename, index) {
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

    function collectMeshesFromObject(object, meshes, filename) {
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

    function loadGLTFFromArrayBuffer(arrayBuffer, filename) {
        return new Promise(function (resolve, reject) {
            if (typeof THREE.GLTFLoader !== "function") {
                reject(new Error("GLTF loader is not available."));
                return;
            }

            const loader = new THREE.GLTFLoader();

            loader.parse(arrayBuffer, "", function (gltf) {
                const meshes = [];
                collectMeshesFromObject(gltf.scene, meshes, filename);

                if (!meshes.length) {
                    reject(new Error("No mesh geometry found in model file."));
                    return;
                }

                centerMeshes(meshes);

                const importedMeshes = meshes.map(function (mesh, index) {
                    return registerImportedMesh(mesh, filename, index);
                }).filter(Boolean);

                resolve(importedMeshes);
            }, function (error) {
                reject(error || new Error("Could not parse GLTF/GLB file."));
            });
        });
    }

    function loadOBJFromText(text, filename) {
        return new Promise(function (resolve, reject) {
            if (typeof THREE.OBJLoader !== "function") {
                reject(new Error("OBJ loader is not available."));
                return;
            }

            const loader = new THREE.OBJLoader();
            const object = loader.parse(text);
            const meshes = [];

            collectMeshesFromObject(object, meshes, filename);

            if (!meshes.length) {
                reject(new Error("No mesh geometry found in OBJ file."));
                return;
            }

            centerMeshes(meshes);

            const importedMeshes = meshes.map(function (mesh, index) {
                return registerImportedMesh(mesh, filename, index);
            }).filter(Boolean);

            resolve(importedMeshes);
        });
    }

    function importModelFromFile(file) {
        return new Promise(function (resolve) {
            if (!file) {
                resolve({
                    success: false,
                    message: "No file selected."
                });
                return;
            }

            const format = detectModelFormat(file.name);

            if (!format) {
                resolve({
                    success: false,
                    message: "Unsupported model format. Use GLB, GLTF, or OBJ."
                });
                return;
            }

            const reader = new FileReader();

            reader.onload = function (event) {
                const onSuccess = function (importedMeshes) {
                    if (window.CADHistory && typeof window.CADHistory.push === "function") {
                        const records = importedMeshes.map(function (mesh) {
                            return {
                                object: mesh,
                                index: (window.cadObjects || []).indexOf(mesh)
                            };
                        });

                        window.CADHistory.push({
                            label: "Import model",
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

                    resolve({
                        success: true,
                        message: "Imported " + importedMeshes.length + " mesh object(s).",
                        count: importedMeshes.length
                    });
                };

                const onFailure = function (error) {
                    resolve({
                        success: false,
                        message: error && error.message ? error.message : "Could not import model file."
                    });
                };

                if (format === "obj") {
                    loadOBJFromText(event.target.result, file.name).then(onSuccess).catch(onFailure);
                    return;
                }

                loadGLTFFromArrayBuffer(event.target.result, file.name).then(onSuccess).catch(onFailure);
            };

            reader.onerror = function () {
                resolve({
                    success: false,
                    message: "Could not read the selected model file."
                });
            };

            if (format === "obj") {
                reader.readAsText(file);
            } else {
                reader.readAsArrayBuffer(file);
            }
        });
    }

    window.CADImportModel = {
        importModelFromFile: importModelFromFile
    };
})();
