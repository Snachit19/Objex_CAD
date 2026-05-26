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
}

function closeProjectModal() {
  projectModal.style.display = "none";
}

async function loadProjects() {
  try {
    const response = await fetch("/api/projects");
    const data = await response.json();

    if (!data.success) {
      return;
    }

    projectList.innerHTML = "";

    if (data.projects.length === 0) {
      projectList.innerHTML = `
        <div class="mock-project">
          <strong>No projects yet</strong>
          <span>Create one</span>
        </div>
      `;
      return;
    }

    data.projects.forEach((project) => {
      const item = document.createElement("div");
      item.className = "mock-project";

      item.innerHTML = `
        <strong>${project.name}</strong>
        <span>Saved</span>
      `;

      projectList.appendChild(item);
    });

  } catch (error) {
    console.log("Could not load projects", error);
  }
}

async function createProject() {
  const name = projectNameInput.value.trim();
  const description = projectDescriptionInput.value.trim();

  projectError.style.display = "none";
  projectError.textContent = "";

  if (!name) {
    projectError.textContent = "Project name is required.";
    projectError.style.display = "block";
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
      projectError.textContent = data.message || "Project creation failed.";
      projectError.style.display = "block";
      saveProjectBtn.disabled = false;
      saveProjectBtn.textContent = "Create Project";
      return;
    }

    closeProjectModal();
    await loadProjects();

  } catch (error) {
    projectError.textContent = "Server error. Please try again.";
    projectError.style.display = "block";
  }

  saveProjectBtn.disabled = false;
  saveProjectBtn.textContent = "Create Project";
}

newProjectBtn.addEventListener("click", openProjectModal);
cancelProjectBtn.addEventListener("click", closeProjectModal);
saveProjectBtn.addEventListener("click", createProject);

loadProjects();