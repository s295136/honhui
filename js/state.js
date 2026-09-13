import { fallbackData } from "./config.js";

export const state = {
  ganttData: [...fallbackData],
  currentOwnerFilter: "all",
  baseDate: null,
  sessionToken: sessionStorage.getItem("gantt_session_auth") || ""
};

export function setBaseDate(date) {
  state.baseDate = date;
}

export function setFilter(owner) {
  state.currentOwnerFilter = owner;
}

export function setGanttData(data) {
  state.ganttData = data;
}

export function getSessionKey() {
  return state.sessionToken;
}

export function updateAuthUI() {
  const token = getSessionKey();
  const dateInput = document.getElementById("base-date-input");
  const clearBtn = document.getElementById("btn-clear-date");
  const lockBox = document.getElementById("date-picker-box");
  const authBtn = document.getElementById("btn-auth-toggle");
  const authIcon = document.getElementById("auth-icon");
  const authText = document.getElementById("auth-text");

  if (token) {
    dateInput.disabled = false;
    clearBtn.disabled = false;
    lockBox.classList.remove("locked");
    authBtn.classList.add("authorized");
    authIcon.textContent = "🔓";
    authText.textContent = "登出授權";
  } else {
    dateInput.disabled = true;
    clearBtn.disabled = true;
    lockBox.classList.add("locked");
    authBtn.classList.remove("authorized");
    authIcon.textContent = "🔒";
    authText.textContent = "管理授權";
  }
}

export function toggleAuth(onAuthSuccess) {
  if (state.sessionToken) {
    if (confirm("是否要清除授權並登出？")) {
      state.sessionToken = "";
      sessionStorage.removeItem("gantt_session_auth");
      updateAuthUI();
      alert("已安全登出，回到唯讀模式。");
    }
  } else {
    const inputKey = prompt("請輸入專案管理密鑰以啟用修改權限：");
    if (inputKey && inputKey.trim()) {
      state.sessionToken = inputKey.trim();
      sessionStorage.setItem("gantt_session_auth", state.sessionToken);
      updateAuthUI();
      if (typeof onAuthSuccess === "function") onAuthSuccess();
    }
  }
}
