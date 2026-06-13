function getWorkspace() {
    return window.CADWorkspace;
}

function normaliseShapeColour(color) {
    if (typeof color === "number") {
        return "#" + color.toString(16).padStart(6, "0");
    }

    if (typeof color === "string") {
        if (color.charAt(0) === "#") {
            return color.toLowerCase();
        }

        return "#" + color.toLowerCase();
    }

    return "#ffffff";
}

function createMaterial(color) {
    return new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.45,
        metalness: 0.15
    });
}

function randomPosition() {
    return {
        x: Math.random() * 4 - 2,
        y: 1,
        z: Math.random() * 4 - 2
    };
}

function createObjectId() {
    return "obj-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
}

function registerShape(mesh, type, colour) {
    const workspace = getWorkspace();

    if (!workspace || !workspace.scene) {
        console.error("CAD workspace is not ready.");
        return null;
    }

    window.cadObjects = window.cadObjects || [];

    const position = randomPosition();
    mesh.position.set(position.x, position.y, position.z);

    mesh.name = type + "-" + (window.cadObjects.length + 1);

    const hexColour = normaliseShapeColour(colour);

    mesh.userData = {
        id: createObjectId(),
        type: type,
        selectable: true,
        color: hexColour,
        materialType: "default",
        materialName: "Default"
    };

    workspace.scene.add(mesh);
    window.cadObjects.push(mesh);

    return mesh;
}

function addShape(type) {
    let geometry = null;
    let material = null;
    let colour = 0xffffff;

    if (type === "cube") {
        geometry = new THREE.BoxGeometry(1.4, 1.4, 1.4);
        colour = 0x3b82f6;
        material = createMaterial(colour);
    }

    if (type === "sphere") {
        geometry = new THREE.SphereGeometry(0.8, 32, 32);
        colour = 0xef4444;
        material = createMaterial(colour);
    }

    if (type === "cylinder") {
        geometry = new THREE.CylinderGeometry(0.7, 0.7, 1.6, 32);
        colour = 0x22c55e;
        material = createMaterial(colour);
    }

    if (type === "cone") {
        geometry = new THREE.ConeGeometry(0.8, 1.7, 32);
        colour = 0xf97316;
        material = createMaterial(colour);
    }

    if (type === "torus") {
        geometry = new THREE.TorusGeometry(0.75, 0.25, 16, 80);
        colour = 0x60a5fa;
        material = createMaterial(colour);
    }

    if (type === "pyramid") {
        geometry = new THREE.ConeGeometry(0.9, 1.6, 4);
        colour = 0x22c55e;
        material = createMaterial(colour);
    }

    if (type === "plane") {
        geometry = new THREE.BoxGeometry(2.2, 0.08, 1.4);
        colour = 0xf59e0b;
        material = createMaterial(colour);
    }

    if (!geometry || !material) {
        console.error("Unknown shape type:", type);
        return null;
    }

    const mesh = new THREE.Mesh(geometry, material);
    return registerShape(mesh, type, colour);
}

function initAddShapeMenu() {
    const addShapeBtn = document.getElementById("addShapeBtn");
    const shapeMenuOptions = document.getElementById("shapeMenuOptions");

    if (!addShapeBtn || !shapeMenuOptions) {
        console.error("Add Shape button or menu not found.");
        return;
    }

    addShapeBtn.addEventListener("click", function (event) {
        event.stopPropagation();
        shapeMenuOptions.classList.toggle("show");
    });

    const buttons = shapeMenuOptions.querySelectorAll("button");

    buttons.forEach(function (button) {
        button.addEventListener("click", function (event) {
            event.stopPropagation();

            const shapeType = button.getAttribute("data-shape");
            const newObject = addShape(shapeType);

            if (newObject && typeof window.selectObject === "function") {
                window.selectObject(newObject);
            }

            shapeMenuOptions.classList.remove("show");
        });
    });

    document.addEventListener("click", function () {
        shapeMenuOptions.classList.remove("show");
    });
}

window.addShape = addShape;
window.createMaterial = createMaterial;

document.addEventListener("DOMContentLoaded", function () {
    initAddShapeMenu();
});