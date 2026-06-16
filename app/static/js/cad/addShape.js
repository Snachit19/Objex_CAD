function getWorkspace() {
    return window.CADWorkspace;
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


function getCADObjectList() {
    window.cadObjects = window.cadObjects || [];
    return window.cadObjects;
}


function setAddShapeStatus(message) {
    const statusText = document.getElementById("cadStatusText");

    if (statusText) {
        statusText.textContent = message;
    }
}


function getShapeDisplayName(type) {
    if (!type) {
        return "Object";
    }

    return type.charAt(0).toUpperCase() + type.slice(1);
}


function addObjectToCADScene(object, options) {
    const workspace = getWorkspace();

    if (!workspace || !workspace.scene || !object) {
        return false;
    }

    const cadObjects = getCADObjectList();
    const restoreIndex = options && typeof options.index === "number"
        ? options.index
        : -1;

    workspace.scene.add(object);

    if (cadObjects.indexOf(object) === -1) {
        if (restoreIndex >= 0 && restoreIndex <= cadObjects.length) {
            cadObjects.splice(restoreIndex, 0, object);
        } else {
            cadObjects.push(object);
        }
    }

    return true;
}


function removeObjectFromCADScene(object) {
    const workspace = getWorkspace();

    if (!workspace || !workspace.scene || !object) {
        return false;
    }

    const selectedObject = typeof window.getSelectedCADObject === "function"
        ? window.getSelectedCADObject()
        : window.selectedObject;

    if (selectedObject === object) {
        if (typeof window.clearSelection === "function") {
            window.clearSelection();
        } else {
            window.selectedObject = null;
        }
    }

    workspace.scene.remove(object);

    const cadObjects = getCADObjectList();
    const objectIndex = cadObjects.indexOf(object);

    if (objectIndex !== -1) {
        cadObjects.splice(objectIndex, 1);
    }

    return true;
}


function shouldRecordShapeHistory(options) {
    return !options || options.recordHistory !== false;
}


function recordShapeCreationHistory(mesh, type) {
    if (!window.CADHistory || typeof window.CADHistory.push !== "function") {
        return;
    }

    const label = "Add " + getShapeDisplayName(type);

    window.CADHistory.push({
        label: label,
        undo: function () {
            if (removeObjectFromCADScene(mesh)) {
                setAddShapeStatus((mesh.name || getShapeDisplayName(type)) + " removed.");
            }
        },
        redo: function () {
            if (addObjectToCADScene(mesh)) {
                setAddShapeStatus((mesh.name || getShapeDisplayName(type)) + " restored.");
            }
        }
    });
}


function registerShape(mesh, type, options) {
    const workspace = getWorkspace();

    if (!workspace || !workspace.scene) {
        console.error("CAD workspace is not ready.");
        return null;
    }

    const cadObjects = getCADObjectList();

    const position = randomPosition();
    mesh.position.set(position.x, position.y, position.z);

    mesh.name = type + "-" + (cadObjects.length + 1);

    mesh.userData = {
        id: "obj-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
        type: type,
        selectable: true,
        materialType: "default",
        materialName: "Default"
    };

    addObjectToCADScene(mesh);

    if (shouldRecordShapeHistory(options)) {
        recordShapeCreationHistory(mesh, type);
    }

    return mesh;
}


function addShape(type, options) {
    let geometry = null;
    let material = null;

    if (type === "cube") {
        geometry = new THREE.BoxGeometry(1.4, 1.4, 1.4);
        material = createMaterial(0x3b82f6);
    }

    if (type === "sphere") {
        geometry = new THREE.SphereGeometry(0.8, 32, 32);
        material = createMaterial(0xef4444);
    }

    if (type === "cylinder") {
        geometry = new THREE.CylinderGeometry(0.7, 0.7, 1.6, 32);
        material = createMaterial(0x22c55e);
    }

    if (type === "cone") {
        geometry = new THREE.ConeGeometry(0.8, 1.7, 32);
        material = createMaterial(0xf97316);
    }

    if (type === "torus") {
        geometry = new THREE.TorusGeometry(0.75, 0.25, 16, 80);
        material = createMaterial(0x60a5fa);
    }

    if (type === "pyramid") {
        geometry = new THREE.ConeGeometry(0.9, 1.6, 4);
        material = createMaterial(0x22c55e);
    }

    if (type === "plane") {
        geometry = new THREE.BoxGeometry(2.2, 0.08, 1.4);
        material = createMaterial(0xf59e0b);
    }

    if (!geometry || !material) {
        console.error("Unknown shape type:", type);
        return null;
    }

    const mesh = new THREE.Mesh(geometry, material);
    return registerShape(mesh, type, options);
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
            addShape(shapeType);

            shapeMenuOptions.classList.remove("show");
        });
    });

    document.addEventListener("click", function () {
        shapeMenuOptions.classList.remove("show");
    });
}


window.addShape = addShape;
window.createMaterial = createMaterial;
window.addObjectToCADScene = addObjectToCADScene;
window.removeObjectFromCADScene = removeObjectFromCADScene;

document.addEventListener("DOMContentLoaded", function () {
    initAddShapeMenu();
});