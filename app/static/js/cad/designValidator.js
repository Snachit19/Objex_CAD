(function () {
    "use strict";

    function getPrimitiveTypes() {
        if (window.CADDesignSchema && Array.isArray(window.CADDesignSchema.PRIMITIVE_SHAPE_TYPES)) {
            return window.CADDesignSchema.PRIMITIVE_SHAPE_TYPES.slice();
        }

        return ["cube", "sphere", "cylinder", "cone", "torus", "pyramid", "plane"];
    }

    function normalizeVector3(value, fallback) {
        const defaults = fallback || { x: 0, y: 0, z: 0 };

        if (!value || typeof value !== "object") {
            return {
                x: defaults.x,
                y: defaults.y,
                z: defaults.z
            };
        }

        return {
            x: Number(value.x),
            y: Number(value.y),
            z: Number(value.z)
        };
    }

    function normalizeScale(value) {
        const scale = normalizeVector3(value, { x: 1, y: 1, z: 1 });

        if (!Number.isFinite(scale.x) || scale.x === 0) {
            scale.x = 1;
        }

        if (!Number.isFinite(scale.y) || scale.y === 0) {
            scale.y = 1;
        }

        if (!Number.isFinite(scale.z) || scale.z === 0) {
            scale.z = 1;
        }

        return scale;
    }

    function normalizeObjectEntry(entry, index) {
        const primitiveTypes = getPrimitiveTypes();
        const errors = [];

        if (!entry || typeof entry !== "object") {
            return {
                valid: false,
                errors: ["Object at index " + index + " is not a valid object."],
                object: null
            };
        }

        const type = typeof entry.type === "string" ? entry.type.trim().toLowerCase() : "";

        if (!type) {
            errors.push("Object at index " + index + " is missing a type.");
        } else if (primitiveTypes.indexOf(type) === -1 && type !== "imported") {
            errors.push("Object at index " + index + " has unsupported type: " + type + ".");
        }

        if (errors.length > 0) {
            return {
                valid: false,
                errors: errors,
                object: null
            };
        }

        return {
            valid: true,
            errors: [],
            object: {
                id: typeof entry.id === "string" ? entry.id : "",
                name: typeof entry.name === "string" && entry.name.trim() !== ""
                    ? entry.name.trim()
                    : type + "-" + (index + 1),
                type: type,
                position: normalizeVector3(entry.position, { x: 0, y: 1, z: 0 }),
                rotation: normalizeVector3(entry.rotation, { x: 0, y: 0, z: 0 }),
                scale: normalizeScale(entry.scale),
                color: typeof entry.color === "string" ? entry.color : "#ffffff",
                materialType: typeof entry.materialType === "string" ? entry.materialType : "default",
                materialName: typeof entry.materialName === "string" ? entry.materialName : "Default",
                materialDescription: typeof entry.materialDescription === "string" ? entry.materialDescription : "",
                materialData: entry.materialData && typeof entry.materialData === "object"
                    ? entry.materialData
                    : null,
                importFormat: typeof entry.importFormat === "string" ? entry.importFormat : null,
                importPayload: typeof entry.importPayload === "string" ? entry.importPayload : null
            }
        };
    }

    function normalizeObjectsArray(objects) {
        const normalizedObjects = [];
        const errors = [];

        if (!Array.isArray(objects)) {
            return {
                valid: false,
                errors: ["Design data must be an array of objects."],
                objects: []
            };
        }

        objects.forEach(function (entry, index) {
            const result = normalizeObjectEntry(entry, index);

            if (!result.valid) {
                errors.push.apply(errors, result.errors);
                return;
            }

            normalizedObjects.push(result.object);
        });

        return {
            valid: errors.length === 0,
            errors: errors,
            objects: normalizedObjects
        };
    }

    function parseDesignPayload(parsedJson) {
        if (Array.isArray(parsedJson)) {
            const objectsResult = normalizeObjectsArray(parsedJson);

            return {
                valid: objectsResult.valid,
                errors: objectsResult.errors,
                name: "",
                description: "",
                objects: objectsResult.objects
            };
        }

        if (!parsedJson || typeof parsedJson !== "object") {
            return {
                valid: false,
                errors: ["Imported file must be a JSON object or array."],
                name: "",
                description: "",
                objects: []
            };
        }

        const format = typeof parsedJson.format === "string" ? parsedJson.format : "";
        const objects = parsedJson.objects || parsedJson.design_data;
        const project = parsedJson.project && typeof parsedJson.project === "object"
            ? parsedJson.project
            : {};

        if (format && format !== "objex-design") {
            return {
                valid: false,
                errors: ["Unsupported design format: " + format + "."],
                name: "",
                description: "",
                objects: []
            };
        }

        const objectsResult = normalizeObjectsArray(objects);

        return {
            valid: objectsResult.valid,
            errors: objectsResult.errors,
            name: typeof project.name === "string" ? project.name.trim() : "",
            description: typeof project.description === "string" ? project.description.trim() : "",
            objects: objectsResult.objects
        };
    }

    function parseDesignFileText(fileText) {
        if (typeof fileText !== "string" || fileText.trim() === "") {
            return {
                valid: false,
                errors: ["Imported file is empty."],
                name: "",
                description: "",
                objects: []
            };
        }

        let parsedJson;

        try {
            parsedJson = JSON.parse(fileText);
        } catch (error) {
            return {
                valid: false,
                errors: ["Imported file is not valid JSON."],
                name: "",
                description: "",
                objects: []
            };
        }

        return parseDesignPayload(parsedJson);
    }

    function getNameFromFilename(filename) {
        if (typeof filename !== "string" || filename.trim() === "") {
            return "";
        }

        const baseName = filename.split(/[\\/]/).pop() || "";
        return baseName
            .replace(/\.objex\.json$/i, "")
            .replace(/\.json$/i, "")
            .trim();
    }

    window.CADDesignValidator = {
        parseDesignFileText: parseDesignFileText,
        parseDesignPayload: parseDesignPayload,
        normalizeObjectsArray: normalizeObjectsArray,
        getNameFromFilename: getNameFromFilename
    };
})();
