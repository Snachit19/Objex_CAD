(function () {
    "use strict";

    const OBJEX_FORMAT = "objex-design";
    const OBJEX_VERSION = "1.0";
    const OBJEX_APPLICATION = "Objex CAD";

    const SUPPORTED_SHAPE_TYPES = [
        "cube",
        "sphere",
        "cylinder",
        "cone",
        "torus",
        "pyramid",
        "plane",
        "imported"
    ];

    const PRIMITIVE_SHAPE_TYPES = [
        "cube",
        "sphere",
        "cylinder",
        "cone",
        "torus",
        "pyramid",
        "plane"
    ];

    window.CADDesignSchema = {
        FORMAT: OBJEX_FORMAT,
        VERSION: OBJEX_VERSION,
        APPLICATION: OBJEX_APPLICATION,
        SUPPORTED_SHAPE_TYPES: SUPPORTED_SHAPE_TYPES,
        PRIMITIVE_SHAPE_TYPES: PRIMITIVE_SHAPE_TYPES
    };
})();
