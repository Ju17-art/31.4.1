import "bootstrap/dist/css/bootstrap.min.css";
import "./styles/style.css";
import "./styles/kanban.css";

import taskFieldTemplate from "./templates/taskField.html";
import noAccessTemplate from "./templates/noAccess.html";

import { User } from "./models/User";
import { generateTestUser } from "./utils";
import { State } from "./state";
import { authUser } from "./services/auth";
import { Task } from "./models/Task";

export const appState = new State();

const loginForm = document.querySelector("#app-login-form");
generateTestUser(User);

// ======================= ФУНКЦИИ =======================

// ====== Рендер задач ======
function renderTasks() {
  const tasks = Task.getAll(); // всегда массив

  // очищаем все списки
  document
    .querySelectorAll(".task-list")
    .forEach((list) => (list.innerHTML = ""));

  // раскладываем задачи по колонкам
  tasks.forEach((task) => {
    const container = document.querySelector(
      `.task-list[data-status="${task.status}"]`,
    );
    if (container) {
      const li = document.createElement("li");
      li.className = "task-list__item";
      li.innerHTML = `<article class="task-card">${task.title}</article>`;
      container.appendChild(li);
    }
  });

  // обновляем счётчики
  const active = tasks.filter((t) => t.status === "backlog").length;
  const finished = tasks.filter((t) => t.status === "finished").length;

  const activeSpan = document.getElementById("active-tasks-count");
  const finishedSpan = document.getElementById("finished-tasks-count");
  if (activeSpan) activeSpan.textContent = active;
  if (finishedSpan) finishedSpan.textContent = finished;

  // Обновляем состояние кнопок
  updateAddButtonState();
}

// ====== Обновление состояния кнопок ======
function updateAddButtonState() {
  const setButtonState = (button, enabled) => {
    if (!button) return;

    button.disabled = !enabled;

    button.classList.toggle("add-card-button--active", enabled);
    button.classList.toggle("add-card-button--disabled", !enabled);
  };

  const backlogBtn = document.querySelector(
    '.task-list[data-status="backlog"] + .add-card-button',
  );

  const readyBtn = document.querySelector(
    '.task-list[data-status="ready"] + .add-card-button',
  );

  const inprogressBtn = document.querySelector(
    '.task-list[data-status="inprogress"] + .add-card-button',
  );

  const finishedBtn = document.querySelector(
    '.task-list[data-status="finished"] + .add-card-button',
  );

  const backlogTasks = Task.getAll().filter((t) => t.status === "backlog");

  const readyTasks = Task.getAll().filter((t) => t.status === "ready");

  const inprogressTasks = Task.getAll().filter(
    (t) => t.status === "inprogress",
  );

  setButtonState(backlogBtn, true);
  setButtonState(readyBtn, backlogTasks.length > 0);
  setButtonState(inprogressBtn, readyTasks.length > 0);
  setButtonState(finishedBtn, inprogressTasks.length > 0);
}

// ====== Добавление задачи ======
function addTask(title, status, userId = "test") {
  const newTask = new Task(title, status, userId);
  Task.save(newTask);
  renderTasks();
  initButtons(); // переинициализация кнопок
}

// ====== Кнопки + Add с дропдаунами ======
function initButtons() {
  document.querySelectorAll(".add-card-button").forEach((button) => {
    if (button._addHandler)
      button.removeEventListener("click", button._addHandler);

    const handler = (e) => {
      const btn = e.currentTarget;

      // Закрываем все открытые формы
      document.querySelectorAll(".add-card-form").forEach((f) => {
        f.remove();
      });

      // Показываем обратно все скрытые кнопки
      document.querySelectorAll(".add-card-button").forEach((b) => {
        b.style.display = "";
      });

      if (btn.disabled) return;

      const column = btn.closest(".board__column");
      const taskList = column.querySelector(".task-list");
      const status = taskList.dataset.status;

      btn.style.display = "none";
      const form = document.createElement("div");
      form.className = "add-card-form";
      column.querySelector(".column").appendChild(form);

      // Для Backlog — обычная форма
      if (status === "backlog") {
        form.innerHTML = `
          <input type="text" class="add-card-input" placeholder="Название задачи" />
          <button class="submit-card-btn">Submit</button>
        `;
        const input = form.querySelector(".add-card-input");
        const submitBtn = form.querySelector(".submit-card-btn");
        input.focus();

        const saveHandler = () => {
          const title = input.value.trim();
          if (!title) return;
          const newTask = new Task(title, status, "test");
          Task.save(newTask);
          renderTasks();
          initButtons();
          form.remove();
          btn.style.display = "";
        };

        submitBtn.addEventListener("click", saveHandler);
        input.addEventListener("keypress", (e) => {
          if (e.key === "Enter") saveHandler();
        });
        input.addEventListener("blur", saveHandler);
      } else {
        // Для остальных колонок — дропдаун из предыдущей колонки
        let options = [];
        if (status === "ready")
          options = Task.getAll().filter((t) => t.status === "backlog");
        if (status === "inprogress")
          options = Task.getAll().filter((t) => t.status === "ready");
        if (status === "finished")
          options = Task.getAll().filter((t) => t.status === "inprogress");

        if (options.length === 0) {
          btn.style.display = "";
          btn.disabled = true;
          form.remove();
          return;
        }

        form.innerHTML = `
          <select class="select-task">
            <option value="">-- Выберите задачу --</option>
            ${options.map((t) => `<option value="${t.id}">${t.title}</option>`).join("")}
          </select>
          <button class="submit-card-btn">Submit</button>
        `;

        const select = form.querySelector(".select-task");
        const submitBtn = form.querySelector(".submit-card-btn");

        submitBtn.addEventListener("click", () => {
          const selectedId = select.value;
          if (!selectedId) return;
          const task = Task.getAll().find((t) => t.id === selectedId);
          if (task) Task.updateStatus(task.id, status);
          renderTasks();
          initButtons();
          form.remove();
          btn.style.display = "";
        });
      }
    };

    button.addEventListener("click", handler);
    button._addHandler = handler;
  });
}

// ======================= ВХОД В СИСТЕМУ =======================
loginForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const login = loginForm.querySelector("[name='login']").value;
  const password = loginForm.querySelector("[name='password']").value;

  if (authUser(login, password)) {
    Task.getAll();

    // Вставляем шаблон канбан-доски
    document.querySelector("#content").innerHTML = taskFieldTemplate;

    // Рендерим существующие задачи
    renderTasks();

    initButtons();
  } else {
    document.querySelector("#content").innerHTML = noAccessTemplate;
  }
});
