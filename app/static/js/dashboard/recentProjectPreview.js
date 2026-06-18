function setDashboardPreviewText(elementId, text) {
  const element = document.getElementById(elementId);

  if (element) {
    element.textContent = text;
  }
}

function setDashboardPreviewValue(elementId, value) {
  const element = document.getElementById(elementId);

  if (element) {
    element.value = value;
  }
}

function parseProjectDesignData(designData) {
  if (Array.isArray(designData)) {
    return designData;
  }

  if (typeof designData === "string" && designData.trim()) {
    try {
      const parsedDesignData = JSON.parse(designData);
      return Array.isArray(parsedDesignData) ? parsedDesignData : [];
    } catch (error) {
      console.error("Could not parse dashboard preview design data:", error);
    }
  }

  return [];
}

function normaliseDashboardNumber(value, fallback) {
  const numberValue = Number(value);

  if (Number.isFinite(numberValue)) {
    return numberValue;
  }

  return fallback;
}

function formatDashboardNumber(value, fallback) {
  return normaliseDashboardNumber(value, fallback).toFixed(2);
}

function clampDashboardValue(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getDashboardObjectColor(savedObject) {
  if (savedObject && typeof savedObject.color === "string" && savedObject.color.trim()) {
    return savedObject.color;
  }

  return "#6366f1";
}

function getDashboardPreviewType(type) {
  const supportedTypes = [
    "cube",
    "sphere",
    "cylinder",
    "cone",
    "torus",
    "pyramid",
    "plane"
  ];

  return supportedTypes.indexOf(type) !== -1 ? type : "cube";
}

function getDashboardScale(savedObject) {
  const scale = savedObject && savedObject.scale ? savedObject.scale : {};
  const scaleX = normaliseDashboardNumber(scale.x, 1);
  const scaleY = normaliseDashboardNumber(scale.y, 1);
  const scaleZ = normaliseDashboardNumber(scale.z, 1);
  const averageScale = (Math.abs(scaleX) + Math.abs(scaleY) + Math.abs(scaleZ)) / 3;

  return clampDashboardValue(averageScale || 1, 0.55, 1.9);
}

function getDashboardPreviewPosition(savedObject, index, totalObjects) {
  const position = savedObject && savedObject.position ? savedObject.position : {};
  const fallbackStep = totalObjects > 1 ? index / (totalObjects - 1) : 0.5;
  const x = normaliseDashboardNumber(position.x, (fallbackStep - 0.5) * 6);
  const y = normaliseDashboardNumber(position.y, 0);
  const z = normaliseDashboardNumber(position.z, 0);

  return {
    left: clampDashboardValue(50 + (x * 11), 12, 88),
    top: clampDashboardValue(54 - (z * 9) - (y * 3), 16, 84)
  };
}

function createDashboardPreviewObject(savedObject, index, totalObjects) {
  const objectType = getDashboardPreviewType(savedObject.type);
  const objectElement = document.createElement("div");
  const position = getDashboardPreviewPosition(savedObject, index, totalObjects);
  const scale = getDashboardScale(savedObject);

  objectElement.className = "dashboard-preview-object dashboard-preview-" + objectType;
  objectElement.style.left = position.left + "%";
  objectElement.style.top = position.top + "%";
  objectElement.style.setProperty("--dashboard-object-color", getDashboardObjectColor(savedObject));
  objectElement.style.setProperty("--dashboard-object-scale", scale);
  objectElement.style.zIndex = String(index + 1);
  objectElement.title = savedObject.name || objectType;

  return objectElement;
}

function createDashboardPreviewEmptyState(message) {
  const emptyState = document.createElement("div");
  emptyState.className = "dashboard-preview-empty";
  emptyState.textContent = message;

  return emptyState;
}

function renderDashboardPreviewObjects(projectDesignData) {
  const previewScene = document.getElementById("dashboardPreviewScene");

  if (!previewScene) {
    return;
  }

  previewScene.textContent = "";

  if (!Array.isArray(projectDesignData) || projectDesignData.length === 0) {
    previewScene.appendChild(createDashboardPreviewEmptyState("No saved objects yet"));
    return;
  }

  const savedObjects = projectDesignData.filter(function (savedObject) {
    return savedObject && savedObject.type;
  }).slice(0, 12);

  if (savedObjects.length === 0) {
    previewScene.appendChild(createDashboardPreviewEmptyState("No previewable objects"));
    return;
  }

  const fragment = document.createDocumentFragment();

  savedObjects.forEach(function (savedObject, index) {
    fragment.appendChild(createDashboardPreviewObject(savedObject, index, savedObjects.length));
  });

  previewScene.appendChild(fragment);
}

function getLatestProject(projects) {
  if (!Array.isArray(projects) || projects.length === 0) {
    return null;
  }

  return projects.slice().sort(function (firstProject, secondProject) {
    const firstDate = new Date(firstProject.updated_at || firstProject.created_at || 0).getTime();
    const secondDate = new Date(secondProject.updated_at || secondProject.created_at || 0).getTime();

    return secondDate - firstDate;
  })[0];
}

function getObjectCountLabel(count) {
  return count === 1 ? "1 Object Saved" : count + " Objects Saved";
}

function getPreviewObject(projectDesignData) {
  return projectDesignData.find(function (savedObject) {
    return savedObject && savedObject.type;
  }) || null;
}

function updateDashboardPreviewProperties(savedObject) {
  const position = savedObject && savedObject.position ? savedObject.position : {};
  const rotation = savedObject && savedObject.rotation ? savedObject.rotation : {};
  const scale = savedObject && savedObject.scale ? savedObject.scale : {};

  setDashboardPreviewValue("dashboardPreviewPositionX", formatDashboardNumber(position.x, 0));
  setDashboardPreviewValue("dashboardPreviewPositionY", formatDashboardNumber(position.y, 0));
  setDashboardPreviewValue("dashboardPreviewPositionZ", formatDashboardNumber(position.z, 0));

  setDashboardPreviewValue("dashboardPreviewRotationX", formatDashboardNumber(rotation.x, 0));
  setDashboardPreviewValue("dashboardPreviewRotationY", formatDashboardNumber(rotation.y, 0));
  setDashboardPreviewValue("dashboardPreviewRotationZ", formatDashboardNumber(rotation.z, 0));

  setDashboardPreviewValue("dashboardPreviewScaleX", formatDashboardNumber(scale.x, 1));
  setDashboardPreviewValue("dashboardPreviewScaleY", formatDashboardNumber(scale.y, 1));
  setDashboardPreviewValue("dashboardPreviewScaleZ", formatDashboardNumber(scale.z, 1));

  setDashboardPreviewValue("dashboardPreviewColor", savedObject && savedObject.color ? savedObject.color : "#6366f1");
  setDashboardPreviewValue(
    "dashboardPreviewMaterial",
    savedObject && savedObject.materialName ? savedObject.materialName : "Default"
  );
}

function showEmptyDashboardPreview() {
  setDashboardPreviewText("recentPreviewTitle", "Perspective View");
  setDashboardPreviewText("recentPreviewProjectName", "No recent project");
  setDashboardPreviewText("recentPreviewProjectDescription", "Create a project to preview it here.");
  setDashboardPreviewText("recentPreviewObjectCount", "0 Objects Saved");
  updateDashboardPreviewProperties(null);
  renderDashboardPreviewObjects([]);
}

function updateDashboardPreview(project) {
  if (!project) {
    showEmptyDashboardPreview();
    return;
  }

  const projectDesignData = parseProjectDesignData(project.design_data);
  const previewObject = getPreviewObject(projectDesignData);

  setDashboardPreviewText("recentPreviewTitle", project.name || "Perspective View");
  setDashboardPreviewText("recentPreviewProjectName", project.name || "Untitled Project");
  setDashboardPreviewText(
    "recentPreviewProjectDescription",
    project.description || "No description added."
  );
  setDashboardPreviewText("recentPreviewObjectCount", getObjectCountLabel(projectDesignData.length));
  updateDashboardPreviewProperties(previewObject);
  renderDashboardPreviewObjects(projectDesignData);

  window.dispatchEvent(new CustomEvent("dashboard:recent-project-preview", {
    detail: {
      project: project,
      designData: projectDesignData,
      previewObject: previewObject
    }
  }));
}

async function loadRecentProjectPreview(projects) {
  const latestProject = getLatestProject(projects);

  if (!latestProject || !latestProject.id) {
    showEmptyDashboardPreview();
    return;
  }

  try {
    const response = await fetch("/api/projects/" + latestProject.id);
    const data = await response.json();

    if (!response.ok || !data.success) {
      updateDashboardPreview(latestProject);
      return;
    }

    updateDashboardPreview(data.project || latestProject);
  } catch (error) {
    console.error("Could not load recent project preview:", error);
    updateDashboardPreview(latestProject);
  }
}

window.loadRecentProjectPreview = loadRecentProjectPreview;
window.updateDashboardPreview = updateDashboardPreview;