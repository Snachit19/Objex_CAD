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
const projectsPageMeta = document.getElementById("projectsPageMeta");

function isProjectsPage() {
  return document.body.classList.contains("projects-page");
}

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
  if (projectList) {
    projectList.textContent = "";
  }
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

  return "Last opened: " + (latestProject.name || "Untitled Project");
}

function getAllProjectsSummary(projects) {
  const projectCount = Array.isArray(projects) ? projects.length : 0;

  if (projectCount === 0) {
    return "No projects yet";
  }

  if (projectCount === 1) {
    return "1 project";
  }

  return projectCount + " projects";
}

function updateProjectSummary(projects) {
  const projectCount = Array.isArray(projects) ? projects.length : 0;

  if (projectCountBadge) {
    projectCountBadge.textContent = String(projectCount);
  }

  if (isProjectsPage()) {
    if (projectsPageMeta) {
      projectsPageMeta.textContent = getAllProjectsSummary(projects);
    }
    return;
  }

  if (recentProjectsMeta) {
    recentProjectsMeta.textContent = getRecentProjectSummary(projects);
  }
}

function openProject(projectId) {
  if (!projectId) {
    return;
  }

  window.location.assign("/cad/" + projectId);
}

function createProjectListItem(project, isRecentProject) {
  const item = document.createElement("div");
  item.className = "mock-project";
  item.style.cursor = "pointer";
  item.setAttribute("role", "button");
  item.setAttribute("tabindex", "0");

  if (isRecentProject) {
    item.classList.add("is-recent-project");
  }

  const name = document.createElement("strong");
  name.textContent = project.name || "Untitled Project";

  const action = document.createElement("button");
  action.type = "button";
  action.textContent = "Open";

  item.appendChild(name);
  item.appendChild(action);

  item.addEventListener("click", function () {
    openProject(project.id);
  });

  item.addEventListener("keydown", function (event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openProject(project.id);
    }
  });

  action.addEventListener("click", function (event) {
    event.stopPropagation();
    openProject(project.id);
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

function renderAllProjects(projects, highlightProjectId) {
  if (!projectList) {
    return;
  }

  let latestProject = getLatestDashboardProject(projects);

  if (highlightProjectId) {
    latestProject = projects.find(function (project) {
      return Number(project.id) === Number(highlightProjectId);
    }) || latestProject;
  }

  projects.forEach(function (project) {
    const isRecentProject = Boolean(latestProject && latestProject.id === project.id);
    projectList.appendChild(createProjectListItem(project, isRecentProject));
  });
}

function renderRecentProjectOnly(projects) {
  if (!projectList) {
    return;
  }

  const latestProject = getLatestDashboardProject(projects);

  if (!latestProject) {
    projectList.appendChild(createEmptyProjectState());
    return;
  }

  projectList.appendChild(createProjectListItem(latestProject, true));
}

async function loadProjects(highlightProjectId) {
  try {
    const response = await fetch("/api/projects");
    const data = await response.json();

    if (!response.ok || !data.success) {
      console.error("Could not load projects");
      updateProjectSummary([]);
      return;
    }

    const projects = data.projects || [];

    clearProjectList();
    updateProjectSummary(projects);

    if (projects.length === 0) {
      if (projectList) {
        projectList.appendChild(createEmptyProjectState());
      }

      if (!isProjectsPage()) {
        refreshRecentProjectPreview([]);
      }

      return;
    }

    if (isProjectsPage()) {
      renderAllProjects(projects, highlightProjectId);
      return;
    }

    renderRecentProjectOnly(projects);

    const latestProject = highlightProjectId
      ? projects.find(function (project) {
        return Number(project.id) === Number(highlightProjectId);
      }) || getLatestDashboardProject(projects)
      : getLatestDashboardProject(projects);

    if (latestProject) {
      refreshRecentProjectPreview([
        latestProject
      ].concat(projects.filter(function (project) {
        return Number(project.id) !== Number(latestProject.id);
      })));
    } else {
      refreshRecentProjectPreview(projects);
    }

  } catch (error) {
    console.error("Could not load projects:", error);
    updateProjectSummary([]);

    if (!isProjectsPage()) {
      refreshRecentProjectPreview([]);
    }
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

    if (isProjectsPage()) {
      await loadProjects(data.project && data.project.id ? data.project.id : null);
    } else {
      window.location.assign("/cad/" + data.project.id);
    }

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

window.loadProjects = loadProjects;

if (projectList) {
  loadProjects();
}
