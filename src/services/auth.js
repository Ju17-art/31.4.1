import { appState } from "../app";
import { User } from "../models/User";
import { getFromStorage } from "../utils";

export const authUser = function (login, password) {
  const users = getFromStorage("users");
  const found = users.find(u => u.login === login && u.password === password);

  if (!found) return false;

  // создаём объект User с правильной ролью
  const user = new User(found.login, found.password, found.role);

  appState.currentUser = user;
  return true;
};
