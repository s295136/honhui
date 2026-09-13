// state.js
import { fallbackData } from "./config.js";

export const state = {
  ganttData: [...fallbackData],
  currentOwnerFilter: "all",
  baseDate: null,
  sessionToken: "unlocked" // 永久保持已授權狀態
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
  return "unlocked";
}

// 直接解鎖 UI，不需密碼
export function updateAuthUI() {
  const dateInput = document.getElementById("base-date-input");
  const clearBtn = document.getElementById("btn-clear-date");
  const lockBox = document.getElementById("date-picker-box");
  const authBtn = document.getElementById("btn-auth-toggle");

  if (dateInput) dateInput.disabled = false;
  if (clearBtn) clearBtn.disabled = false;
  if (lockBox) lockBox.classList.remove("locked");
  
  // 直接隱藏不需要的管理授權按鈕（若保留按鈕可讓它顯示已解鎖）
  if (authBtn) {
    authBtn.style.display = "none"; 
  }
}

// 點擊直接略過密碼
export function toggleAuth(onAuthSuccess) {
  if (typeof onAuthSuccess === "function") onAuthSuccess();
}