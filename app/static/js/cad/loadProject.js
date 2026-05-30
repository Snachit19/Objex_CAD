async function loadProject() {
  const projectId = window.PROJECT_ID;

  if (!projectId) {
    document.getElementById("cadStatusText").textContent = "Project ID missing.";
    return;
  }

  try {
    const response = await fetch(`/api/projects/${projectId}`);
    const data = await response.json();

    if (!response.ok || !data.success) {
      document.getElementById("cadStatusText").textContent =
        data.message || "Could not open project.";
      return;
    }

    const project = data.project;

    document.getElementById("cadProjectName").textContent = project.name;
    document.getElementById("cadProjectDescription").textContent =
      project.description || "No description added.";

    document.getElementById("projectNameText").textContent = project.name;
    document.getElementById("projectDescriptionText").textContent =
      project.description || "No description added.";

    document.getElementById("cadStatusText").textContent =
      "Saved project opened successfully.";

    console.log("Loaded project:", project);

  } catch (error) {
    console.log("Project loading error:", error);
    document.getElementById("cadStatusText").textContent =
      "Server error while opening project.";
  }
}

document.addEventListener("DOMContentLoaded", loadProject);