import "bootstrap/dist/css/bootstrap.min.css";
import "./styles/style.css";
import "./styles/kanban.css";

import taskFieldTemplate from "./templates/taskField.html";
import taskDetailsTemplate from "./templates/taskDetails.html";
import usersAdminTemplate from "./templates/usersAdmin.html";

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
  const allTasks = Task.getAll();

  const tasks =
    appState.currentUser?.role === "admin"
      ? allTasks
      : allTasks.filter((task) => task.userId === appState.currentUser?.login);

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

      const card = document.createElement("article");
      card.className = "task-card";
      card.dataset.taskId = task.id; // <-- вот это добавляем
      card.textContent = task.title;

      li.appendChild(card);
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

  // <-- добавляем навешивание обработчиков карточек прямо здесь
  initTaskCards();
}

function initTaskCards() {
  document.querySelectorAll(".task-card").forEach((card) => {
    card.addEventListener("click", () => {
      const taskId = card.dataset.taskId;
      const task = Task.getAll().find((t) => t.id === taskId);

      // Загружаем шаблон страницы задачи
      document.querySelector("#content").innerHTML = taskDetailsTemplate;

      const allTasks = Task.getAll();

      const tasks =
        appState.currentUser?.role === "admin"
          ? allTasks
          : allTasks.filter((t) => t.userId === appState.currentUser?.login);

      const active = tasks.filter((t) => t.status === "backlog").length;
      const finished = tasks.filter((t) => t.status === "finished").length;

      document.getElementById("active-tasks-count").textContent = active;
      document.getElementById("finished-tasks-count").textContent = finished;

      // Подставляем данные задачи
      document.querySelector("#task-title").textContent = task.title;

      document.querySelector("#task-description").value =
        task.description || "";

      document.querySelector("#task-description").focus();

      // Закрыть
      document
        .querySelector(".task-details__close")
        .addEventListener("click", () => {
          document.querySelector("#content").innerHTML = taskFieldTemplate;

          renderTasks();
          initButtons();
          initTaskCards(); // <-- навесили клики снова
        });

      // Сохранить описание
      document
        .querySelector(".task-details__save")
        .addEventListener("click", () => {
          const description = document.querySelector("#task-description").value;

          Task.updateDescription(task.id, description);
        });

      // Удалить задачу
      document
        .querySelector(".task-details__delete")
        .addEventListener("click", () => {
          if (confirm(`Удалить задачу "${task.title}"?`)) {
            Task.delete(task.id);

            document.querySelector("#content").innerHTML = taskFieldTemplate;

            renderTasks();
            initButtons();
            initTaskCards(); // <-- навесили клики снова
          }
        });
    });
  });
}

function renderUsers() {
  const tbody = document.querySelector("#users-list");

  if (!tbody) return;

  tbody.innerHTML = "";

  User.getAll().forEach((user) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${user.login}</td>
      <td>${user.role}</td>
      <td>
        ${
          user.login !== "admin"
            ? `<button class="delete-user-btn" data-login="${user.login}">Delete</button>`
            : ""
        }
      </td>
    `;

    tbody.appendChild(row);
  });

  document.querySelectorAll(".delete-user-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const login = btn.dataset.login;

      if (confirm(`Удалить пользователя ${login}?`)) {
        User.delete(login);
        renderUsers();
      }
    });
  });
}

function initUsersAdmin() {
  renderUsers();

  document.querySelector("#add-user-btn").addEventListener("click", () => {
    const login = prompt("Логин");

    if (!login) return;

    const password = prompt("Пароль");

    if (!password) return;

    const role = prompt("Роль (user/admin)", "user");

    const user = new User(login, password, role || "user");

    User.save(user);

    renderUsers();
  });
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
function addTask(title, status, userId = appState.currentUser.login) {
  const newTask = new Task(title, status, userId);
  Task.save(newTask);
  renderTasks();
  initButtons();
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
        form.innerHTML = `<input type="text" class="add-card-input" placeholder="Название задачи" />
          <button class="submit-card-btn">Submit</button>
        `;
        const input = form.querySelector(".add-card-input");
        const submitBtn = form.querySelector(".submit-card-btn");
        input.focus();

        const saveHandler = () => {
          const title = input.value.trim();
          if (!title) return;
          const newTask = new Task(title, status, appState.currentUser.login);
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
    // Скрываем форму входа
    loginForm.classList.add("d-none");

    // Показываем панель пользователя
    const userPanel = document.getElementById("user-panel");
    userPanel.style.display = "flex";

    // Подставляем имя пользователя
    document.getElementById("user-greeting").textContent =
      `Здравствуйте, ${appState.currentUser.login}`;

    // Вставляем шаблон канбан-доски
    document.querySelector("#content").innerHTML = taskFieldTemplate;

    // Рендерим задачи и кнопки
    renderTasks();
    initButtons();
    initTaskCards();

    // ===== User Menu =====
    const userMenuList = document.querySelector(".user-menu__dropdown");

    if (appState.currentUser.role === "admin") {
      userMenuList.insertAdjacentHTML(
        "afterbegin",
        `
    <li class="user-menu__item">
      <button id="users-admin-btn" class="user-menu__action">
        Users
      </button>
    </li>
    `,
      );

      const usersBtn = document.querySelector("#users-admin-btn");
      usersBtn.addEventListener("click", () => {
        document.querySelector("#content").innerHTML = usersAdminTemplate;
        initUsersAdmin();
      });
    }

    // ===== Кнопка Sign Out =====
    document.getElementById("logout-btn").addEventListener("click", () => {
      appState.currentUser = null;

      // Скрываем панель пользователя
      userPanel.style.display = "none";

      // Показываем форму входа
      loginForm.classList.remove("d-none");

      // Очищаем доску и возвращаем сообщение
      document.getElementById("content").innerHTML =
        "Please Sign In to see your tasks!";
    });
  } else {
    // Всплывающее сообщение при неверных данных
    alert("Доступ запрещен. Неверный логин или пароль.");
  }
});

// ======================= MENU USER (КЛИК НА АВАТАР) =======================
document.addEventListener("click", (e) => {
  const userMenuBtn = e.target.closest(".user-menu__trigger");
  if (!userMenuBtn) return;

  const userMenuList = document.querySelector(".user-menu__dropdown");
  const arrow = userMenuBtn.querySelector(".user-menu__arrow");

  const isOpen = userMenuList.style.display === "block";
  userMenuList.style.display = isOpen ? "none" : "block";
  arrow.style.transform = isOpen ? "rotate(-45deg)" : "rotate(135deg)";
});
