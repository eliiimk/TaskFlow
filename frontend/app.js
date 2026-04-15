const API = window.API_URL || "http://localhost:3001";
let allTasks = [];
let currentFilter = "all";

async function fetchHealth() {
  try {
    const r = await fetch(`${API}/health`);
    const d = await r.json();
    const badge = document.getElementById("status-badge");
    badge.textContent = `${d.env} · ${d.version} · Redis ${d.redis}`;
    badge.className = "status-ok";
    document.getElementById("version-info").textContent =
      `TaskFlow ${d.version} · env: ${d.env} · ${d.stats.totalCreated} créées, ${d.stats.totalCompleted} terminées`;
  } catch {
    const badge = document.getElementById("status-badge");
    badge.textContent = "API indisponible";
    badge.className = "status-err";
  }
}

async function fetchTasks() {
  try {
    const r = await fetch(`${API}/tasks`);
    const d = await r.json();
    allTasks = d.tasks || [];
    renderBoard();
  } catch (e) {
    console.error("Erreur chargement tâches:", e);
  }
}

function setFilter(f, btn) {
  currentFilter = f;
  document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  renderBoard();
}

function filteredTasks() {
  if (currentFilter === "all") return allTasks;
  return allTasks.filter(t => t.priority === currentFilter);
}

function renderBoard() {
  const tasks = filteredTasks();
  const todo = tasks.filter(t => t.status === "todo");
  const inprogress = tasks.filter(t => t.status === "in-progress");
  const done = tasks.filter(t => t.status === "done");

  document.getElementById("count-todo").textContent = todo.length;
  document.getElementById("count-inprogress").textContent = inprogress.length;
  document.getElementById("count-done").textContent = done.length;
  document.getElementById("task-count").textContent = `${tasks.length} tâche(s)`;

  document.getElementById("stat-todo").textContent = allTasks.filter(t => t.status === "todo").length;
  document.getElementById("stat-inprogress").textContent = allTasks.filter(t => t.status === "in-progress").length;
  document.getElementById("stat-done").textContent = allTasks.filter(t => t.status === "done").length;
  document.getElementById("stat-total").textContent = allTasks.length;

  document.getElementById("col-todo").innerHTML = todo.map(cardHTML).join("") || empty();
  document.getElementById("col-inprogress").innerHTML = inprogress.map(cardHTML).join("") || empty();
  document.getElementById("col-done").innerHTML = done.map(cardHTML).join("") || empty();
}

function empty() {
  return `<div class="empty"><div class="empty-icon">○</div>Aucune tâche</div>`;
}

function cardHTML(t) {
  const prioLabel = { low: "Basse", medium: "Moyenne", high: "Haute" }[t.priority] || t.priority;
  return `
    <div class="task-card prio-${t.priority}-card" id="task-${t.id}">
      <div class="task-header">
        <span class="task-title">${esc(t.title)}</span>
      </div>
      ${t.description ? `<div class="task-desc">${esc(t.description)}</div>` : ""}
      <div class="task-footer">
        <span class="prio-badge prio-${t.priority}">${prioLabel}</span>
        <select class="status-select" onchange="changeStatus('${t.id}', this.value)">
          <option value="todo"        ${t.status==="todo"?"selected":""}>À faire</option>
          <option value="in-progress" ${t.status==="in-progress"?"selected":""}>En cours</option>
          <option value="done"        ${t.status==="done"?"selected":""}>Terminé</option>
        </select>
        <div class="task-actions">
          <button class="btn-icon btn-del" onclick="deleteTask('${t.id}')" title="Supprimer">✕</button>
        </div>
      </div>
    </div>`;
}

function esc(s) {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

async function addTask() {
  const title = document.getElementById("input-title").value.trim();
  const description = document.getElementById("input-desc").value.trim();
  const priority = document.getElementById("input-prio").value;
  if (!title) { document.getElementById("input-title").focus(); return; }
  await fetch(`${API}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, description, priority })
  });
  document.getElementById("input-title").value = "";
  document.getElementById("input-desc").value = "";
  fetchTasks();
  fetchHealth();
}

async function changeStatus(id, status) {
  await fetch(`${API}/tasks/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status })
  });
  fetchTasks();
  fetchHealth();
}

async function deleteTask(id) {
  await fetch(`${API}/tasks/${id}`, { method: "DELETE" });
  fetchTasks();
}

document.getElementById("input-title").addEventListener("keydown", (e) => {
  if (e.key === "Enter") addTask();
});

fetchHealth();
fetchTasks();
setInterval(fetchHealth, 30000);
