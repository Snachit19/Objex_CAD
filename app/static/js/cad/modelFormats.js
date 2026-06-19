(function () {
    "use strict";

    const SUPPORTED_MODEL_FORMATS = ["glb", "gltf", "obj"];

    const MODEL_FORMAT_ACCEPT = {
        glb: ".glb,model/gltf-binary",
        gltf: ".gltf,.json,model/gltf+json,application/json",
        obj: ".obj,text/plain"
    };

    function normalizeModelFormat(format) {
        const value = String(format || "glb").toLowerCase();
        return SUPPORTED_MODEL_FORMATS.indexOf(value) !== -1 ? value : "glb";
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

    function getAcceptForModelFormat(format) {
        return MODEL_FORMAT_ACCEPT[normalizeModelFormat(format)] || MODEL_FORMAT_ACCEPT.glb;
    }

    function getModelNameFromFilename(filename) {
        if (typeof filename !== "string" || filename.trim() === "") {
            return "";
        }

        const baseName = filename.split(/[\\/]/).pop() || "";
        return baseName.replace(/\.[^.]+$/, "").trim();
    }

    function arrayBufferToBase64(arrayBuffer) {
        const bytes = new Uint8Array(arrayBuffer);
        let binary = "";

        bytes.forEach(function (byte) {
            binary += String.fromCharCode(byte);
        });

        return btoa(binary);
    }

    window.CADModelFormats = {
        SUPPORTED_MODEL_FORMATS: SUPPORTED_MODEL_FORMATS,
        normalizeModelFormat: normalizeModelFormat,
        detectModelFormat: detectModelFormat,
        getAcceptForModelFormat: getAcceptForModelFormat,
        getModelNameFromFilename: getModelNameFromFilename,
        arrayBufferToBase64: arrayBufferToBase64
    };
})();
