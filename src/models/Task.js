import { v4 as uuid } from "uuid";

export class Task {
  constructor(title, status, userId, description = "") {
    this.id = uuid();
    this.title = title;
    this.status = status;
    this.userId = userId;
    this.description = description;
  }

  // ===== Получить все задачи =====
  static getAll() {
    const data = localStorage.getItem("tasks");

    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  // ===== Сохранить новую задачу =====
  static save(task) {
    const tasks = Task.getAll();
    tasks.push(task);
    console.log("Сохраняем в localStorage:", tasks); // добавили эту строку
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }

  // ===== Получить задачи конкретного пользователя =====
  static getByUser(userId) {
    return Task.getAll().filter((task) => task.userId === userId);
  }

  // ===== Обновить статус =====
  static updateStatus(taskId, newStatus) {
    const tasks = Task.getAll();

    const index = tasks.findIndex((t) => t.id === taskId);

    if (index !== -1) {
      const task = tasks[index];

      // удаляем из старого места
      tasks.splice(index, 1);

      // меняем статус
      task.status = newStatus;

      // кладём в конец массива
      tasks.push(task);

      localStorage.setItem("tasks", JSON.stringify(tasks));
    }
  }

  // ===== Обновить описание =====
  static updateDescription(taskId, description) {
    const tasks = Task.getAll();

    const task = tasks.find((t) => t.id === taskId);

    if (task) {
      task.description = description;
      localStorage.setItem("tasks", JSON.stringify(tasks));
    }
  }

  // ===== Удалить задачу =====
  static delete(taskId) {
    const tasks = Task.getAll().filter((t) => t.id !== taskId);
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }
}
