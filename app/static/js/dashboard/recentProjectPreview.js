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