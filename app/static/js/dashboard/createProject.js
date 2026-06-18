const newProjectBtn = document.getElementById("newProjectBtn");
const projectModal = document.getElementById("projectModal");
const cancelProjectBtn = document.getElementById("cancelProjectBtn");
const saveProjectBtn = document.getElementById("saveProjectBtn");
const projectNameInput = document.getElementById("projectName");
const projectDescriptionInput = document.getElementById("projectDescription");
const projectError = document.getElementById("projectError");
const projectList = document.getElementById("projectList");
const projectCountBadge = document.getElementById("projectCountBadge");
const recentProjectsMeta = document.getElementById("recentProjectsMeta");

function openProjectModal() {
  projectModal.style.display = "flex";
  projectNameInput.value = "";
  projectDescriptionInput.value = "";
  projectError.style.display = "none";
  projectError.textContent = "";
}

function closeProjectModal() {
  projectModal.style.display = "none";
}

function showProjectError(message) {
  projectError.textContent = message;
  projectError.style.display = "block";
}

function clearProjectList() {
  projectList.textContent = "";
}

function refreshRecentProjectPreview(projects) {
  if (typeof window.loadRecentProjectPreview === "function") {
    window.loadRecentProjectPreview(projects);
  }
}

function getProjectDate(project) {
  const projectDate = new Date(project.last_opened_at || project.updated_at || project.created_at || 0);
  const projectTimestamp = projectDate.getTime();

  return Number.isFinite(projectTimestamp) ? projectTimestamp : 0;
}

function getLatestDashboardProject(projects) {
  if (!Array.isArray(projects) || projects.length === 0) {
    return null;
  }

  return projects.slice().sort(function (firstProject, secondProject) {
    return getProjectDate(secondProject) - getProjectDate(firstProject);
  })[0];
}

function getRecentProjectSummary(projects) {
  if (!Array.isArray(projects) || projects.length === 0) {
    return "No saved projects yet";
  }

  const latestProject = getLatestDashboardProject(projects);

  if (!latestProject) {
    return projects.length + " projects";
  }

  return "Latest: " + (latestProject.name || "Untitled Project");
}

function updateProjectSummary(projects) {
  const projectCount = Array.isArray(projects) ? projects.length : 0;

  if (projectCountBadge) {
    projectCountBadge.textContent = String(projectCount);
  }

  if (recentProjectsMeta) {
    recentProjectsMeta.textContent = getRecentProjectSummary(projects);
  }
}

function createProjectListItem(project, isRecentProject) {
  const item = document.createElement("div");
  item.className = "mock-project";
  item.style.cursor = "pointer";

  if (isRecentProject) {
    item.classList.add("is-recent-project");
  }

  const name = document.createElement("strong");
  name.textContent = project.name || "Untitled Project";

  const action = document.createElement("span");
  action.textContent = "Open";

  item.appendChild(name);
  item.appendChild(action);

  item.addEventListener("click", () => {
    window.location.href = `/cad/${project.id}`;
  });

  return item;
}

function createEmptyProjectState() {
  const item = document.createElement("div");
  item.className = "mock-project";

  const title = document.createElement("strong");
  title.textContent = "No projects yet";

  const action = document.createElement("span");
  action.textContent = "Create one";

  item.appendChild(title);
  item.appendChild(action);

  return item;
}

async function loadProjects() {
  try {
    const response = await fetch("/api/projects");
    const data = await response.json();

    if (!data.success) {
      console.error("Could not load projects");
      updateProjectSummary([]);
      return;
    }

    clearProjectList();
    updateProjectSummary(data.projects || []);

    if (!data.projects || data.projects.length === 0) {
      projectList.appendChild(createEmptyProjectState());
      refreshRecentProjectPreview([]);
      return;
    }

    const latestProject = getLatestDashboardProject(data.projects);

    data.projects.forEach((project) => {
      const isRecentProject = Boolean(latestProject && latestProject.id === project.id);
      projectList.appendChild(createProjectListItem(project, isRecentProject));
    });

    refreshRecentProjectPreview(data.projects);

  } catch (error) {
    console.error("Could not load projects:", error);
    updateProjectSummary([]);
    refreshRecentProjectPreview([]);
  }
}

async function createProject() {
  const name = projectNameInput.value.trim();
  const description = projectDescriptionInput.value.trim();

  projectError.style.display = "none";
  projectError.textContent = "";

  if (!name) {
    showProjectError("Project name is required.");
    return;
  }

  saveProjectBtn.disabled = true;
  saveProjectBtn.textContent = "Creating...";

  try {
    const response = await fetch("/api/projects/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: name,
        description: description
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      showProjectError(data.message || "Project creation failed.");
      saveProjectBtn.disabled = false;
      saveProjectBtn.textContent = "Create Project";
      return;
    }

    closeProjectModal();
    await loadProjects();

  } catch (error) {
    console.error("Create project error:", error);
    showProjectError("Server error. Please try again.");
  }

  saveProjectBtn.disabled = false;
  saveProjectBtn.textContent = "Create Project";
}

if (newProjectBtn) {
  newProjectBtn.addEventListener("click", openProjectModal);
}

if (cancelProjectBtn) {
  cancelProjectBtn.addEventListener("click", closeProjectModal);
}

if (saveProjectBtn) {
  saveProjectBtn.addEventListener("click", createProject);
}

window.addEventListener("click", (event) => {
  if (event.target === projectModal) {
    closeProjectModal();
  }
});

loadProjects();