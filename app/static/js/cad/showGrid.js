function getGridScene() {
    if (window.scene) {
        return window.scene;
    }

    if (typeof scene !== "undefined") {
        return scene;
    }

    return null;
}


function setGridStatus(message) {
    const statusText = document.getElementById("cadStatusText");

    if (statusText) {
        statusText.textContent = message;
    }
}


function getGridSize() {
    const input = document.getElementById("gridSizeInput");
    const value = input ? Number(input.value) : 20;

    if (isNaN(value) || value < 5) {
        return 20;
    }

    return value;
}


function getGridDivisions() {
    const input = document.getElementById("gridDivisionsInput");
    const value = input ? Number(input.value) : 20;

    if (isNaN(value) || value < 2) {
        return 20;
    }

    return value;
}


function findCADGridHelper() {
    const cadScene = getGridScene();

    if (!cadScene) {
        return null;
    }

    if (window.cadGridHelper) {
        return window.cadGridHelper;
    }

    for (let i = 0; i < cadScene.children.length; i++) {
        const child = cadScene.children[i];

        if (child.name === "CADGridHelper" || child.type === "GridHelper") {
            window.cadGridHelper = child;
            return child;
        }
    }

    return null;
}


function createCADGridHelper() {
    const cadScene = getGridScene();

    if (!cadScene || typeof THREE === "undefined") {
        return null;
    }

    const gridHelper = new THREE.GridHelper(
        getGridSize(),
        getGridDivisions(),
        0x334155,
        0x1e293b
    );

    gridHelper.name = "CADGridHelper";
    gridHelper.position.y = 0;
    gridHelper.userData = {
        systemObject: true,
        type: "grid"
    };

    cadScene.add(gridHelper);
    window.cadGridHelper = gridHelper;

    return gridHelper;
}


function getOrCreateCADGridHelper() {
    let gridHelper = findCADGridHelper();

    if (!gridHelper) {
        gridHelper = createCADGridHelper();
    }

    return gridHelper;
}


function updateGridButtonText() {
    const toggleGridBtn = document.getElementById("toggleGridBtn");
    const gridHelper = findCADGridHelper();

    if (!toggleGridBtn || !gridHelper) {
        return;
    }

    toggleGridBtn.textContent = gridHelper.visible ? "Hide Grid" : "Show Grid";
}


function toggleCADGrid() {
    const gridHelper = getOrCreateCADGridHelper();

    if (!gridHelper) {
        setGridStatus("Grid could not be created because scene is not ready.");
        return;
    }

    gridHelper.visible = !gridHelper.visible;
    updateGridButtonText();

    setGridStatus(gridHelper.visible ? "Grid is now visible." : "Grid is now hidden.");
}


function disposeGridHelper(gridHelper) {
    if (!gridHelper) {
        return;
    }

    if (gridHelper.geometry) {
        gridHelper.geometry.dispose();
    }

    if (gridHelper.material) {
        if (Array.isArray(gridHelper.material)) {
            gridHelper.material.forEach(function (material) {
                material.dispose();
            });
        } else {
            gridHelper.material.dispose();
        }
    }
}


function updateCADGrid() {
    const cadScene = getGridScene();

    if (!cadScene) {
        setGridStatus("Scene is not ready. Grid cannot be updated.");
        return;
    }

    const oldGrid = findCADGridHelper();

    if (oldGrid) {
        cadScene.remove(oldGrid);
        disposeGridHelper(oldGrid);
    }

    window.cadGridHelper = null;

    const newGrid = createCADGridHelper();

    if (!newGrid) {
        setGridStatus("Grid could not be updated.");
        return;
    }

    newGrid.visible = true;
    updateGridButtonText();

    setGridStatus(
        "Grid updated. Size: " +
        getGridSize() +
        ", Divisions: " +
        getGridDivisions()
    );
}


function initShowGridControls() {
    const toggleGridBtn = document.getElementById("toggleGridBtn");
    const updateGridBtn = document.getElementById("updateGridBtn");

    getOrCreateCADGridHelper();
    updateGridButtonText();

    if (toggleGridBtn) {
        toggleGridBtn.addEventListener("click", toggleCADGrid);
    }

    if (updateGridBtn) {
        updateGridBtn.addEventListener("click", updateCADGrid);
    }
}


window.toggleCADGrid = toggleCADGrid;
window.updateCADGrid = updateCADGrid;

document.addEventListener("DOMContentLoaded", function () {
    initShowGridControls();
});