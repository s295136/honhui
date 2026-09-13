import { TOTAL_DAYS, ownerClassMap } from "./config.js";
import { state, setFilter } from "./state.js";
import { formatOffsetDate, getTodayOffsetDays } from "./utils.js";

export function updateStats() {
  document.getElementById("stat-total-rows").textContent = `${state.ganttData.length} 項`;
  const milestones = new Set(state.ganttData.filter(d => d.type === 'milestone').map(d => d.id)).size;
  document.getElementById("stat-total-milestones").textContent = `${milestones} 次`;
  
  const delayCount = state.ganttData.filter(d => d.delayDays !== null && d.delayDays > 0).length;
  document.getElementById("stat-total-delays").textContent = `${delayCount} 項`;

  const todayOffset = getTodayOffsetDays();
  const todayStatusEl = document.getElementById("stat-today-status");
  const timelineTitleEl = document.getElementById("timeline-title-text");

  if (state.baseDate && !isNaN(state.baseDate.getTime())) {
    const startDateStr = formatOffsetDate(0);
    const endDateStr = formatOffsetDate(TOTAL_DAYS);
    if (timelineTitleEl) timelineTitleEl.textContent = `時程軸 (${startDateStr} ~ ${endDateStr})`;

    if (todayOffset !== null) {
      const now = new Date();
      const todayStr = `${now.getMonth() + 1}/${now.getDate()}`;
      if (todayOffset >= 0 && todayOffset <= TOTAL_DAYS) {
        todayStatusEl.textContent = `今日 ${todayStr} (第 ${todayOffset} 天 / D+${todayOffset})`;
      } else if (todayOffset < 0) {
        todayStatusEl.textContent = `今日 ${todayStr} (距離啟動尚有 ${Math.abs(todayOffset)} 天)`;
      } else {
        todayStatusEl.textContent = `今日 ${todayStr} (專案已完結)`;
      }
    }
  } else {
    if (timelineTitleEl) timelineTitleEl.textContent = `時程軸 (相對日 D+0 ~ D+98)`;
    todayStatusEl.textContent = "相對日模式 (未設定基準日)";
  }
}

export function buildDynamicFilters(onFilterChange) {
  const owners = Array.from(new Set(state.ganttData.map(d => d.owner).filter(Boolean)));
  const container = document.getElementById("filter-container");
  container.replaceChildren();

  const label = document.createElement("span");
  label.className = "filter-label";
  label.textContent = "負責單位篩選：";
  container.appendChild(label);

  const allBtn = document.createElement("button");
  allBtn.className = `filter-btn ${state.currentOwnerFilter === 'all' ? 'active' : ''}`;
  allBtn.dataset.owner = "all";
  allBtn.textContent = "全部單位";
  container.appendChild(allBtn);

  owners.forEach(owner => {
    const config = ownerClassMap[owner] || { bar: "bar-default" };
    const btn = document.createElement("button");
    btn.className = `filter-btn ${state.currentOwnerFilter === owner ? 'active' : ''}`;
    btn.dataset.owner = owner;

    const dot = document.createElement("span");
    dot.className = `legend-indicator ${config.bar}`;
    btn.appendChild(dot);
    btn.appendChild(document.createTextNode(owner));
    container.appendChild(btn);
  });

  container.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      container.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      setFilter(btn.getAttribute("data-owner"));
      if (typeof onFilterChange === "function") onFilterChange();
    });
  });
}

export function initRuler() {
  const ruler = document.getElementById("ruler-container");
  if (!ruler) return;
  ruler.replaceChildren();
  
  for (let d = 0; d <= TOTAL_DAYS; d += 7) {
    const mark = document.createElement("div");
    mark.className = "ruler-mark";
    const percent = (d / TOTAL_DAYS) * 100;
    mark.style.left = `${percent}%`;
    const labelSpan = document.createElement("span");
    labelSpan.textContent = (state.baseDate && !isNaN(state.baseDate.getTime())) ? formatOffsetDate(d, true) : `D+${d}`;
    mark.appendChild(labelSpan);
    ruler.appendChild(mark);
  }

  const todayOffset = getTodayOffsetDays();
  if (todayOffset !== null && todayOffset >= 0 && todayOffset <= TOTAL_DAYS) {
    const todayPercent = (todayOffset / TOTAL_DAYS) * 100;
    const todayMarker = document.createElement("div");
    todayMarker.className = "today-ruler-marker";
    todayMarker.style.left = `${todayPercent}%`;
    todayMarker.textContent = `今日 (D+${todayOffset})`;
    ruler.appendChild(todayMarker);
  }
}

export function renderGantt() {
  const tbody = document.getElementById("gantt-tbody");
  tbody.replaceChildren();

  let currentSection = "";
  const todayOffset = getTodayOffsetDays();
  const showTodayLine = (todayOffset !== null && todayOffset >= 0 && todayOffset <= TOTAL_DAYS);
  const todayPercent = showTodayLine ? (todayOffset / TOTAL_DAYS) * 100 : 0;

  state.ganttData.forEach((item, index) => {
    if (state.currentOwnerFilter !== "all" && item.owner !== state.currentOwnerFilter) return;

    if (item.section !== currentSection) {
      currentSection = item.section;
      const secRow = document.createElement("tr");
      secRow.className = "section-header-row";
      const secTd = document.createElement("td");
      secTd.colSpan = 7;
      secTd.textContent = currentSection;
      secRow.appendChild(secTd);
      tbody.appendChild(secRow);
    }

    const row = document.createElement("tr");
    row.className = `gantt-row ${item.type === 'milestone' ? 'milestone-row' : ''}`;

    const colorConfig = ownerClassMap[item.owner] || { tag: "owner-default", bar: "bar-default", hex: "#475569" };
    const leftPercent = (item.start / TOTAL_DAYS) * 100;
    const widthPercent = (item.duration / TOTAL_DAYS) * 100;

    // ID
    const tdId = document.createElement("td");
    tdId.className = "col-id";
    const badgeId = document.createElement("span");
    badgeId.className = "task-id-badge";
    badgeId.textContent = item.id;
    tdId.appendChild(badgeId);

    // Task Name
    const tdTask = document.createElement("td");
    tdTask.className = "col-task";
    const taskTitle = document.createElement("div");
    taskTitle.className = "task-title";
    taskTitle.textContent = item.name;
    tdTask.appendChild(taskTitle);

    // Owner
    const tdOwner = document.createElement("td");
    tdOwner.className = "col-owner";
    const ownerTag = document.createElement("span");
    ownerTag.className = `owner-tag ${colorConfig.tag}`;
    ownerTag.textContent = item.owner;
    tdOwner.appendChild(ownerTag);

    // Actual Finish
    const tdActual = document.createElement("td");
    tdActual.className = "col-actual";
    if (item.actualFinish) {
      const actSpan = document.createElement("span");
      actSpan.className = "actual-date-text";
      actSpan.textContent = item.actualFinish;
      tdActual.appendChild(actSpan);
    } else {
      const emptySpan = document.createElement("span");
      emptySpan.className = "delay-badge empty";
      emptySpan.textContent = "-";
      tdActual.appendChild(emptySpan);
    }

    // Delay Status
    const tdDelay = document.createElement("td");
    tdDelay.className = "col-delay";
    const delaySpan = document.createElement("span");
    if (item.delayDays !== null && !isNaN(item.delayDays)) {
      if (item.delayDays > 0) {
        delaySpan.className = "delay-badge delayed";
        delaySpan.textContent = `+${item.delayDays} 天`;
      } else {
        delaySpan.className = "delay-badge on-time";
        delaySpan.textContent = "準時";
      }
    } else {
      delaySpan.className = "delay-badge empty";
      delaySpan.textContent = "-";
    }
    tdDelay.appendChild(delaySpan);

    // Deliverables
    const tdDeliv = document.createElement("td");
    tdDeliv.className = "col-deliverable";
    const delivSpan = document.createElement("span");
    delivSpan.className = "deliverable-text";
    delivSpan.textContent = item.deliverable;
    tdDeliv.appendChild(delivSpan);

    // Timeline Track
    const tdTimeline = document.createElement("td");
    tdTimeline.className = "col-timeline";
    const track = document.createElement("div");
    track.className = "timeline-track";

    if (showTodayLine) {
      const todayLine = document.createElement("div");
      todayLine.className = "today-vertical-line";
      todayLine.style.left = `${todayPercent}%`;
      track.appendChild(todayLine);
    }

    if (item.type === "milestone") {
      const markerLabel = (state.baseDate && !isNaN(state.baseDate.getTime())) ? formatOffsetDate(item.start, true) : `D+${item.start}`;
      const marker = document.createElement("div");
      marker.className = `milestone-marker ${colorConfig.bar}`;
      marker.style.left = `${leftPercent}%`;
      marker.dataset.index = index;

      const label = document.createElement("span");
      label.className = "milestone-label";
      label.style.left = `calc(${leftPercent}% + 14px)`;
      label.style.color = colorConfig.hex;
      label.textContent = markerLabel;

      track.appendChild(marker);
      track.appendChild(label);
    } else {
      const barText = (state.baseDate && !isNaN(state.baseDate.getTime()))
        ? `${item.duration}d (${formatOffsetDate(item.start, true)}~${formatOffsetDate(item.end, true)})`
        : `${item.duration}d (D+${item.start}~D+${item.end})`;

      const bar = document.createElement("div");
      bar.className = `task-bar ${colorConfig.bar}`;
      bar.style.left = `${leftPercent}%`;
      bar.style.width = `${Math.max(widthPercent, 1.5)}%`;
      bar.dataset.index = index;
      bar.textContent = barText;

      track.appendChild(bar);
    }
    tdTimeline.appendChild(track);

    row.append(tdId, tdTask, tdOwner, tdActual, tdDelay, tdDeliv, tdTimeline);
    tbody.appendChild(row);
  });

  bindTooltipEvents();
}

function bindTooltipEvents() {
  const tooltip = document.getElementById("tooltip");
  const interactiveEls = document.querySelectorAll(".task-bar, .milestone-marker");

  interactiveEls.forEach(el => {
    el.addEventListener("mouseenter", (e) => {
      const idx = e.currentTarget.getAttribute("data-index");
      const item = state.ganttData[idx];
      if (!item) return;

      let periodStr = "";
      if (item.type === "milestone") {
        periodStr = (state.baseDate && !isNaN(state.baseDate.getTime())) ? `${formatOffsetDate(item.start)} (會議日)` : `D+${item.start} (會議日)`;
      } else {
        periodStr = (state.baseDate && !isNaN(state.baseDate.getTime()))
          ? `${formatOffsetDate(item.start)} 至 ${formatOffsetDate(item.end)} (${item.duration} 天)`
          : `D+${item.start} 至 D+${item.end} (${item.duration} 天)`;
      }

      document.getElementById("tt-title").textContent = `[${item.id}] ${item.name}`;
      document.getElementById("tt-section").textContent = item.section;
      document.getElementById("tt-owner").textContent = item.owner;
      document.getElementById("tt-period").textContent = periodStr;
      document.getElementById("tt-actual-finish").textContent = item.actualFinish || "未填寫";

      const delayContainer = document.getElementById("tt-delay-status");
      delayContainer.replaceChildren();
      const statusSpan = document.createElement("span");
      if (item.delayDays !== null && !isNaN(item.delayDays)) {
        if (item.delayDays > 0) {
          statusSpan.style.color = "#f87171";
          statusSpan.style.fontWeight = "bold";
          statusSpan.textContent = `落後 ${item.delayDays} 天`;
        } else {
          statusSpan.style.color = "#4ade80";
          statusSpan.style.fontWeight = "bold";
          statusSpan.textContent = "準時 / 超前完成";
        }
      } else {
        statusSpan.textContent = "尚未完成 / 進行中";
      }
      delayContainer.appendChild(statusSpan);

      document.getElementById("tt-deps").textContent = item.deps || "無";
      document.getElementById("tt-deliverable").textContent = item.deliverable;

      tooltip.style.display = "block";
    });

    el.addEventListener("mousemove", (e) => {
      tooltip.style.left = `${e.clientX + 15}px`;
      tooltip.style.top = `${e.clientY + 15}px`;
    });

    el.addEventListener("mouseleave", () => {
      tooltip.style.display = "none";
    });
  });
}
