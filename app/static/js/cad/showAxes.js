function getAxesScene() {
    if (window.scene) {
        return window.scene;
    }

    if (typeof scene !== "undefined") {
        return scene;
    }

    return null;
}


function setAxesStatus(message) {
    const statusText = document.getElementById("cadStatusText");

    if (statusText) {
        statusText.textContent = message;
    }
}


function getAxesSize() {
    const input = document.getElementById("axesSizeInput");
    const value = input ? Number(input.value) : 5;

    if (isNaN(value) || value < 1) {
        return 5;
    }

    return value;
}


function findCADAxesHelper() {
    const cadScene = getAxesScene();

    if (!cadScene) {
        return null;
    }

    if (window.cadAxesHelper) {
        return window.cadAxesHelper;
    }

    for (let i = 0; i < cadScene.children.length; i++) {
        const child = cadScene.children[i];

        if (child.name === "CADAxesHelper" || child.type === "AxesHelper") {
            window.cadAxesHelper = child;
            return child;
        }
    }

    return null;
}


function createCADAxesHelper() {
    const cadScene = getAxesScene();

    if (!cadScene || typeof THREE === "undefined") {
        return null;
    }

    const axesHelper = new THREE.AxesHelper(getAxesSize());

    axesHelper.name = "CADAxesHelper";
    axesHelper.position.set(0, 0.03, 0);
    axesHelper.userData = {
        systemObject: true,
        type: "axes"
    };

    cadScene.add(axesHelper);
    window.cadAxesHelper = axesHelper;

    return axesHelper;
}


function getOrCreateCADAxesHelper() {
    let axesHelper = findCADAxesHelper();

    if (!axesHelper) {
        axesHelper = createCADAxesHelper();
    }

    return axesHelper;
}


function updateAxesButtonText() {
    const toggleAxesBtn = document.getElementById("toggleAxesBtn");
    const axesHelper = findCADAxesHelper();

    if (!toggleAxesBtn || !axesHelper) {
        return;
    }

    toggleAxesBtn.textContent = axesHelper.visible ? "Hide Axes" : "Show Axes";
}


function toggleCADAxes() {
    const axesHelper = getOrCreateCADAxesHelper();

    if (!axesHelper) {
        setAxesStatus("Axes could not be created because scene is not ready.");
        return;
    }

    axesHelper.visible = !axesHelper.visible;
    updateAxesButtonText();

    setAxesStatus(axesHelper.visible ? "X, Y and Z axes are now visible." : "X, Y and Z axes are now hidden.");
}


function disposeAxesHelper(axesHelper) {
    if (!axesHelper) {
        return;
    }

    if (axesHelper.geometry) {
        axesHelper.geometry.dispose();
    }

    if (axesHelper.material) {
        if (Array.isArray(axesHelper.material)) {
            axesHelper.material.forEach(function (material) {
                if (material && typeof material.dispose === "function") {
                    material.dispose();
                }
            });
        } else if (typeof axesHelper.material.dispose === "function") {
            axesHelper.material.dispose();
        }
    }
}


function updateCADAxes() {
    const cadScene = getAxesScene();

    if (!cadScene) {
        setAxesStatus("Scene is not ready. Axes cannot be updated.");
        return;
    }

    const oldAxes = findCADAxesHelper();

    if (oldAxes) {
        cadScene.remove(oldAxes);
        disposeAxesHelper(oldAxes);
    }

    window.cadAxesHelper = null;

    const newAxes = createCADAxesHelper();

    if (!newAxes) {
        setAxesStatus("Axes could not be updated.");
        return;
    }

    newAxes.visible = true;
    updateAxesButtonText();

    setAxesStatus("Axes updated. Size: " + getAxesSize());
}


function initShowAxesControls() {
    const toggleAxesBtn = document.getElementById("toggleAxesBtn");
    const updateAxesBtn = document.getElementById("updateAxesBtn");

    getOrCreateCADAxesHelper();
    updateAxesButtonText();

    if (toggleAxesBtn) {
        toggleAxesBtn.addEventListener("click", toggleCADAxes);
    }

    if (updateAxesBtn) {
        updateAxesBtn.addEventListener("click", updateCADAxes);
    }
}


window.toggleCADAxes = toggleCADAxes;
window.updateCADAxes = updateCADAxes;

document.addEventListener("DOMContentLoaded", function () {
    initShowAxesControls();
});