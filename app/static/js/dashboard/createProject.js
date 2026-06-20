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
const projectSearchInput = document.getElementById("projectSearchInput");
const projectSearchClear = document.getElementById("projectSearchClear");

let cachedProjects = [];
let activeHighlightProjectId = null;
let pendingDeleteProject = null;

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

function formatSearchMetaQuery(query) {
  if (query.length <= 36) {
    return query;
  }

  return query.slice(0, 33) + "...";
}

function getProjectsPageSearchSummary(totalCount, filteredCount, query) {
  if (!query) {
    if (totalCount === 0) {
      return "No projects yet";
    }

    if (totalCount === 1) {
      return "1 project";
    }

    return totalCount + " projects";
  }

  const safeQuery = formatSearchMetaQuery(query);

  if (filteredCount === 0) {
    return "No projects found for \"" + safeQuery + "\"";
  }

  if (filteredCount === 1) {
    return "1 of " + totalCount + " projects matching \"" + safeQuery + "\"";
  }

  return filteredCount + " of " + totalCount + " projects matching \"" + safeQuery + "\"";
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

function getProjectSearchQuery() {
  return projectSearchInput ? projectSearchInput.value.trim() : "";
}

function getProjectSearchTokens() {
  const query = getProjectSearchQuery().toLowerCase();

  if (!query) {
    return [];
  }

  return query.split(/\s+/).filter(Boolean);
}

function getProjectSearchText(project) {
  return [
    project.name,
    project.description,
    project.id,
    project.created_at,
    project.updated_at,
    project.last_opened_at
  ].filter(Boolean).join(" ").toLowerCase();
}

function filterProjectsForSearch(projects) {
  const searchTokens = getProjectSearchTokens();

  if (searchTokens.length === 0) {
    return projects.slice();
  }

  return projects.filter(function (project) {
    const searchableText = getProjectSearchText(project);

    return searchTokens.every(function (token) {
      return searchableText.indexOf(token) !== -1;
    });
  });
}

function updateProjectSearchClearButton() {
  if (!projectSearchClear) {
    return;
  }

  projectSearchClear.hidden = getProjectSearchQuery() === "";
}

function clearProjectSearch() {
  if (!projectSearchInput) {
    return;
  }

  projectSearchInput.value = "";
  updateProjectSearchClearButton();
  renderProjectsPage(cachedProjects, activeHighlightProjectId);
  projectSearchInput.focus();
}

function openProject(projectId) {
  if (!projectId) {
    return;
  }

  window.location.assign("/cad/" + projectId);
}

function createProjectActionButton(className, label, iconSrc) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "project-action-btn " + className;
  button.title = label;
  button.setAttribute("aria-label", label);

  const icon = document.createElement("img");
  icon.src = iconSrc;
  icon.alt = "";
  icon.setAttribute("aria-hidden", "true");

  button.appendChild(icon);
  return button;
}

function openRenameProjectModal(project) {
  const renameModal = document.getElementById("renameProjectModal");
  const renameProjectIdInput = document.getElementById("renameProjectId");
  const renameProjectNameInput = document.getElementById("renameProjectName");
  const renameProjectDescriptionInput = document.getElementById("renameProjectDescription");
  const renameProjectError = document.getElementById("renameProjectError");

  if (!renameModal || !renameProjectIdInput || !renameProjectNameInput) {
    const fallbackName = window.prompt("Rename project:", project.name || "Untitled Project");
    if (fallbackName && fallbackName.trim()) {
      renameProject(project.id, fallbackName.trim(), project.description || "");
    }
    return;
  }

  renameProjectIdInput.value = String(project.id);
  renameProjectNameInput.value = project.name || "";

  if (renameProjectDescriptionInput) {
    renameProjectDescriptionInput.value = project.description || "";
  }

  if (renameProjectError) {
    renameProjectError.style.display = "none";
    renameProjectError.textContent = "";
  }

  renameModal.style.display = "flex";
  renameProjectNameInput.focus();
}

function closeRenameProjectModal() {
  const renameModal = document.getElementById("renameProjectModal");

  if (renameModal) {
    renameModal.style.display = "none";
  }
}

function showRenameProjectError(message) {
  const renameProjectError = document.getElementById("renameProjectError");

  if (renameProjectError) {
    renameProjectError.textContent = message;
    renameProjectError.style.display = "block";
  }
}

async function renameProject(projectId, name, description) {
  const response = await fetch("/api/projects/" + projectId, {
    method: "PATCH",
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
    throw new Error(data.message || "Could not rename project.");
  }

  return data;
}

async function deleteProject(projectId) {
  const response = await fetch("/api/projects/" + projectId, {
    method: "DELETE"
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Could not delete project.");
  }

  return data;
}

function showDeleteProjectError(message) {
  const errorBox = document.getElementById("deleteProjectError");

  if (errorBox) {
    errorBox.textContent = message;
    errorBox.style.display = "block";
  }
}

function closeDeleteProjectModal() {
  const deleteModal = document.getElementById("deleteProjectModal");

  pendingDeleteProject = null;

  if (deleteModal) {
    deleteModal.style.display = "none";
  }
}

async function confirmPendingProjectDelete() {
  const confirmDeleteProjectBtn = document.getElementById("confirmDeleteProjectBtn");

  if (!pendingDeleteProject) {
    closeDeleteProjectModal();
    return;
  }

  if (confirmDeleteProjectBtn) {
    confirmDeleteProjectBtn.disabled = true;
    confirmDeleteProjectBtn.textContent = "Deleting...";
  }

  try {
    await deleteProject(pendingDeleteProject.id);
    closeDeleteProjectModal();
    await loadProjects();
  } catch (error) {
    showDeleteProjectError(error.message || "Could not delete project.");
  }

  if (confirmDeleteProjectBtn) {
    confirmDeleteProjectBtn.disabled = false;
    confirmDeleteProjectBtn.textContent = "Delete Project";
  }
}

function openDeleteProjectModal(project) {
  const deleteModal = document.getElementById("deleteProjectModal");
  const confirmText = document.getElementById("deleteProjectConfirmText");
  const errorBox = document.getElementById("deleteProjectError");

  if (!deleteModal) {
    if (window.confirm("Delete \"" + (project.name || "this project") + "\"? This cannot be undone.")) {
      deleteProject(project.id)
        .then(function () {
          return loadProjects();
        })
        .catch(function (error) {
          window.alert(error.message || "Could not delete project.");
        });
    }
    return;
  }

  pendingDeleteProject = project;

  if (confirmText) {
    confirmText.textContent = "Delete \"" + (project.name || "this project") + "\" permanently? This cannot be undone.";
  }

  if (errorBox) {
    errorBox.style.display = "none";
    errorBox.textContent = "";
  }

  deleteModal.style.display = "flex";
}

async function handleRenameProjectSubmit() {
  const renameProjectIdInput = document.getElementById("renameProjectId");
  const renameProjectNameInput = document.getElementById("renameProjectName");
  const renameProjectDescriptionInput = document.getElementById("renameProjectDescription");
  const saveRenameProjectBtn = document.getElementById("saveRenameProjectBtn");

  if (!renameProjectIdInput || !renameProjectNameInput) {
    return;
  }

  const projectId = renameProjectIdInput.value;
  const name = renameProjectNameInput.value.trim();
  const description = renameProjectDescriptionInput
    ? renameProjectDescriptionInput.value.trim()
    : "";

  if (!name) {
    showRenameProjectError("Project name is required.");
    return;
  }

  if (saveRenameProjectBtn) {
    saveRenameProjectBtn.disabled = true;
    saveRenameProjectBtn.textContent = "Saving...";
  }

  try {
    await renameProject(projectId, name, description);
    closeRenameProjectModal();
    await loadProjects(Number(projectId));
  } catch (error) {
    showRenameProjectError(error.message || "Could not rename project.");
  }

  if (saveRenameProjectBtn) {
    saveRenameProjectBtn.disabled = false;
    saveRenameProjectBtn.textContent = "Save Changes";
  }
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

  const actions = document.createElement("div");
  actions.className = "project-row-actions";

  const renameButton = createProjectActionButton(
    "project-rename-btn",
    "Rename project",
    "/static/images/project-rename.svg"
  );
  const deleteButton = createProjectActionButton(
    "project-delete-btn",
    "Delete project",
    "/static/images/project-delete.svg"
  );

  renameButton.addEventListener("click", function (event) {
    event.stopPropagation();
    openRenameProjectModal(project);
  });

  deleteButton.addEventListener("click", async function (event) {
    event.stopPropagation();
    openDeleteProjectModal(project);
  });

  actions.appendChild(renameButton);
  actions.appendChild(deleteButton);

  item.appendChild(name);
  item.appendChild(actions);

  item.addEventListener("click", function () {
    openProject(project.id);
  });

  item.addEventListener("keydown", function (event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openProject(project.id);
    }
  });

  return item;
}

function createEmptyProjectState(titleText, actionText, actionHandler) {
  const item = document.createElement("div");
  item.className = "mock-project project-empty-state";

  const title = document.createElement("strong");
  title.textContent = titleText || "No projects yet";

  const action = document.createElement(actionHandler ? "button" : "span");
  action.textContent = actionText || "Create one";

  if (actionHandler) {
    action.type = "button";
    action.addEventListener("click", actionHandler);
  }

  item.appendChild(title);
  item.appendChild(action);

  return item;
}

function renderProjectsPage(projects, highlightProjectId) {
  if (!projectList) {
    return;
  }

  const safeProjects = Array.isArray(projects) ? projects : [];
  const filteredProjects = filterProjectsForSearch(safeProjects);
  const searchQuery = getProjectSearchQuery();

  clearProjectList();
  updateProjectSearchClearButton();

  if (projectsPageMeta) {
    projectsPageMeta.textContent = getProjectsPageSearchSummary(
      safeProjects.length,
      filteredProjects.length,
      searchQuery
    );
  }

  if (filteredProjects.length === 0) {
    if (safeProjects.length === 0) {
      projectList.appendChild(createEmptyProjectState());
    } else {
      projectList.appendChild(createEmptyProjectState(
        "No matching projects",
        "Clear search",
        clearProjectSearch
      ));
    }

    return;
  }

  let latestProject = getLatestDashboardProject(filteredProjects);

  if (highlightProjectId) {
    latestProject = filteredProjects.find(function (project) {
      return Number(project.id) === Number(highlightProjectId);
    }) || latestProject;
  }

  filteredProjects.forEach(function (project) {
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

    cachedProjects = projects;
    activeHighlightProjectId = highlightProjectId || null;

    clearProjectList();
    updateProjectSummary(projects);

    if (projects.length === 0) {
      if (isProjectsPage()) {
        renderProjectsPage(projects, highlightProjectId);
        return;
      }

      if (projectList) {
        projectList.appendChild(createEmptyProjectState());
      }

      if (!isProjectsPage()) {
        refreshRecentProjectPreview([]);
      }

      return;
    }

    if (isProjectsPage()) {
      renderProjectsPage(projects, highlightProjectId);
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

const dashboardQuery = new URLSearchParams(window.location.search);

if (projectModal && dashboardQuery.get("newProject") === "1") {
  openProjectModal();
  window.history.replaceState(null, "", window.location.pathname);
}

window.addEventListener("click", (event) => {
  if (event.target === projectModal) {
    closeProjectModal();
  }

  const renameModal = document.getElementById("renameProjectModal");

  if (renameModal && event.target === renameModal) {
    closeRenameProjectModal();
  }

  const deleteModal = document.getElementById("deleteProjectModal");

  if (deleteModal && event.target === deleteModal) {
    closeDeleteProjectModal();
  }
});

const cancelRenameProjectBtn = document.getElementById("cancelRenameProjectBtn");
const saveRenameProjectBtn = document.getElementById("saveRenameProjectBtn");
const cancelDeleteProjectBtn = document.getElementById("cancelDeleteProjectBtn");
const confirmDeleteProjectBtn = document.getElementById("confirmDeleteProjectBtn");

if (cancelRenameProjectBtn) {
  cancelRenameProjectBtn.addEventListener("click", closeRenameProjectModal);
}

if (saveRenameProjectBtn) {
  saveRenameProjectBtn.addEventListener("click", handleRenameProjectSubmit);
}

if (cancelDeleteProjectBtn) {
  cancelDeleteProjectBtn.addEventListener("click", closeDeleteProjectModal);
}

if (confirmDeleteProjectBtn) {
  confirmDeleteProjectBtn.addEventListener("click", confirmPendingProjectDelete);
}

const renameProjectNameInput = document.getElementById("renameProjectName");

if (renameProjectNameInput) {
  renameProjectNameInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      handleRenameProjectSubmit();
    }
  });
}

if (projectSearchInput) {
  projectSearchInput.addEventListener("input", function () {
    renderProjectsPage(cachedProjects, activeHighlightProjectId);
  });

  projectSearchInput.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && getProjectSearchQuery()) {
      event.preventDefault();
      clearProjectSearch();
    }
  });
}

if (projectSearchClear) {
  projectSearchClear.addEventListener("click", clearProjectSearch);
}

window.loadProjects = loadProjects;

if (projectList) {
  loadProjects();
}
