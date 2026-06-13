const newProjectBtn = document.getElementById("newProjectBtn");
const projectModal = document.getElementById("projectModal");
const cancelProjectBtn = document.getElementById("cancelProjectBtn");
const saveProjectBtn = document.getElementById("saveProjectBtn");
const projectNameInput = document.getElementById("projectName");
const projectDescriptionInput = document.getElementById("projectDescription");
const projectError = document.getElementById("projectError");
const projectList = document.getElementById("projectList");

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

function createProjectListItem(project) {
  const item = document.createElement("div");
  item.className = "mock-project";
  item.style.cursor = "pointer";

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
      console.log("Could not load projects");
      return;
    }

    clearProjectList();

    if (!data.projects || data.projects.length === 0) {
      projectList.appendChild(createEmptyProjectState());
      return;
    }

    data.projects.forEach((project) => {
      projectList.appendChild(createProjectListItem(project));
    });

  } catch (error) {
    console.log("Could not load projects:", error);
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
    console.log("Create project error:", error);
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
