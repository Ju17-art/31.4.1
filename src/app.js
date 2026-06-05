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

  // обновляем счётчики (если есть элементы)
  const active = tasks.filter((t) => t.status === "backlog").length;
  const finished = tasks.filter((t) => t.status === "finished").length;

  const activeSpan = document.getElementById("active-tasks-count");
  const finishedSpan = document.getElementById("finished-tasks-count");
  if (activeSpan) activeSpan.textContent = active;
  if (finishedSpan) finishedSpan.textContent = finished;
}

// ====== Добавление задачи ======
function addTask(title, status, userId = "test") {
  const newTask = new Task(title, status, userId);
  Task.save(newTask);
  renderTasks();
  initButtons(); // переинициализация кнопок
}

// ===== Кнопки + Add =====

function initButtons() {
  console.log("initButtons вызвана");
  document.querySelectorAll(".add-card-button").forEach((button) => {
    // удаляем старый обработчик
    if (button._addHandler)
      button.removeEventListener("click", button._addHandler);

    const handler = (e) => {
      console.log("Нажата кнопка Add card");

      const btn = e.currentTarget;
      if (btn.disabled) return;

      const column = btn.closest(".board__column");
      const taskList = column.querySelector(".task-list");
      const status = taskList.dataset.status;

      // скрываем кнопку
      btn.style.display = "none";

      // создаём форму
      const form = document.createElement("div");
      form.className = "add-card-form";
      form.innerHTML = `
        <input type="text" class="add-card-input" placeholder="Название задачи" />
        <button class="submit-card-btn">Submit</button>
      `;
      column.querySelector(".column").appendChild(form);

      const input = form.querySelector(".add-card-input");
      const saveBtn = form.querySelector(".submit-card-btn");

      input.focus();

      const saveHandler = () => {
        console.log("saveHandler сработал");

        const title = input.value.trim();
        console.log("title =", title);
        console.log("status =", status);

        if (!title) return;

        addTask(title, status);

        console.log("после addTask");

        form.remove();
        btn.style.display = "";
      };

      saveBtn.addEventListener("click", saveHandler);
      input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") saveHandler();
      });
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
    // Вставляем шаблон канбан-доски
    document.querySelector("#content").innerHTML = taskFieldTemplate;

    // Рендерим существующие задачи
    renderTasks();

    initButtons();
  } else {
    document.querySelector("#content").innerHTML = noAccessTemplate;
  }
});
