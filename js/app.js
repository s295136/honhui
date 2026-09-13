const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS2HF_-rYF_R-hNUK1bsCoiTm_UxIvyXNgeB_ie6uxg9Gi0cdsoa3tUfbr9C_SPRjd6SrUUkjJ7lT0e/pub?output=csv";

// 使用 CORS 代理避免瀏覽器跨域阻擋
const PROXY_URL = "https://api.allorigins.win/raw?url=" + encodeURIComponent(CSV_URL);

document.addEventListener("DOMContentLoaded", () => {
  const loadingOverlay = document.getElementById("loading-overlay");
  const tbody = document.getElementById("gantt-tbody");
  const filterContainer = document.getElementById("filter-container");
  const rulerContainer = document.getElementById("ruler-container");
  const timelineTitleText = document.getElementById("timeline-title-text");
  const btnReload = document.getElementById("btn-reload");
  const tooltip = document.getElementById("tooltip");

  const statTotalRows = document.getElementById("stat-total-rows");
  const statTotalMilestones = document.getElementById("stat-total-milestones");
  const statTotalDelays = document.getElementById("stat-total-delays");
  const statTodayStatus = document.getElementById("stat-today-status");

  let projectData = [];
  let currentFilter = "all";

  function loadData() {
    loadingOverlay.style.display = "flex";
    
    Papa.parse(PROXY_URL, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: function(results) {
        processData(results.data);
      },
      error: function(err) {
        console.warn("Proxy 讀取失敗，嘗試直接讀取...", err);
        fallbackDirectLoad();
      }
    });
  }

  function fallbackDirectLoad() {
    Papa.parse(CSV_URL, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: function(results) {
        processData(results.data);
      },
      error: function(err) {
        console.error("載入 CSV 失敗:", err);
        loadingOverlay.innerHTML = `<div style="color: #dc2626; font-weight: bold; text-align: center; padding: 20px;">
          雲端資料載入失敗（可能是 CORS 限制或網址失效）。<br>請確認 Google 試算表已發布至網路，且連結正確。
        </div>`;
      }
    });
  }

  function processData(data) {
    // 過濾掉空行或沒有 id 的資料
    projectData = data.filter(row => {
      const idKey = Object.keys(row).find(k => k.trim().toLowerCase() === 'id');
      return idKey && row[idKey] && row[idKey].trim() !== "";
    });

    loadingOverlay.style.display = "none";
    initApp();
  }

  function initApp() {
    renderStats();
    renderFilters();
    renderTimelineRuler();
    renderTable();
  }

  function renderStats() {
    statTotalRows.textContent = `${projectData.length} 項`;
    
    // 計算里程碑數量 (type === 'milestone')
    const milestones = projectData.filter(row => {
      const typeKey = Object.keys(row).find(k => k.trim().toLowerCase() === 'type');
      return typeKey && row[typeKey] && row[typeKey].trim().toLowerCase() === 'milestone';
    }).length;
    statTotalMilestones.textContent = `${milestones} 次`;
    
    // 計算落後項目 (delayDays > 0)
    const delays = projectData.filter(row => {
      const delayKey = Object.keys(row).find(k => k.trim().toLowerCase().includes('delay') || k.trim().includes('落後'));
      const val = delayKey ? parseFloat(row[delayKey]) : 0;
      return !isNaN(val) && val > 0;
    }).length;
    statTotalDelays.textContent = `${delays} 項`;
    statTodayStatus.textContent = "運作正常 (已同步雲端)";
  }

  function renderFilters() {
    const owners = ["all", ...new Set(projectData.map(row => {
      const ownerKey = Object.keys(row).find(k => k.trim().toLowerCase() === 'owner');
      return ownerKey ? row[ownerKey].trim() : null;
    }).filter(Boolean))];

    filterContainer.innerHTML = '<span class="filter-label">負責單位篩選：</span>';
    
    owners.forEach(owner => {
      const btn = document.createElement("button");
      btn.className = `filter-btn ${owner === currentFilter ? "active" : ""}`;
      btn.textContent = owner === "all" ? "全部單位" : owner;
      btn.dataset.owner = owner;
      btn.addEventListener("click", () => {
        document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentFilter = owner;
        renderTable();
      });
      filterContainer.appendChild(btn);
    });
  }

  function renderTimelineRuler() {
    timelineTitleText.textContent = "時程軸 (依開始日期與工期展開)";
    rulerContainer.innerHTML = "";
    for (let i = 1; i <= 10; i++) {
      const div = document.createElement("div");
      div.className = "ruler-day";
      div.textContent = `T${i}`;
      rulerContainer.appendChild(div);
    }
  }

  function renderTable() {
    tbody.innerHTML = "";
    
    const filteredData = currentFilter === "all" 
      ? projectData 
      : projectData.filter(row => {
          const ownerKey = Object.keys(row).find(k => k.trim().toLowerCase() === 'owner');
          return ownerKey && row[ownerKey].trim() === currentFilter;
        });

    filteredData.forEach((row, index) => {
      const getVal = (keyword) => {
        const k = Object.keys(row).find(key => key.trim().toLowerCase() === keyword.toLowerCase());
        return k ? row[k] : "";
      };

      const id = getVal('id');
      const taskName = getVal('name');
      const section = getVal('section');
      const owner = getVal('owner');
      const startDate = getVal('start_day');
      const endDate = getVal('end_day');
      const daysStr = getVal('duration');
      const type = getVal('type');
      const prevTask = getVal('dependencies');
      const deliverable = getVal('deliverables');
      const actualFinish = getVal('actualfinish') || getVal('af(actual finish date)') || getVal('af');
      const delayDays = getVal('delay days') || getVal('delay_days');

      const tr = document.createElement("tr");

      const tdId = document.createElement("td");
      tdId.className = "col-id";
      tdId.textContent = id;

      const tdTask = document.createElement("td");
      tdTask.className = "col-task";
      tdTask.textContent = taskName;
      tdTask.style.fontWeight = "600";

      const tdOwner = document.createElement("td");
      tdOwner.className = "col-owner";
      tdOwner.textContent = owner || "-";

      const tdActual = document.createElement("td");
      tdActual.className = "col-actual";
      tdActual.textContent = actualFinish || "-";

      const tdDelay = document.createElement("td");
      tdDelay.className = "col-delay";
      const delayNum = parseFloat(delayDays);
      if (!isNaN(delayNum) && delayNum > 0) {
        tdDelay.innerHTML = `<span style="color: #dc2626; font-weight: bold;">+${delayNum} 天</span>`;
      } else {
        tdDelay.textContent = "準時";
      }

      const tdDeliverable = document.createElement("td");
      tdDeliverable.className = "col-deliverable";
      const isMilestone = type.toLowerCase() === 'milestone';
      tdDeliverable.textContent = isMilestone ? "⭐ 里程碑節點" : (deliverable || (prevTask ? `前置: ${prevTask}` : "-"));

      const tdTimeline = document.createElement("td");
      tdTimeline.className = "col-timeline";
      
      const barContainer = document.createElement("div");
      barContainer.className = "task-bar-container";

      const bar = document.createElement("div");
      bar.className = `task-bar ${isMilestone ? 'amber' : 'blue'}`;
      
      const days = parseInt(daysStr) || 5;
      const leftPercent = (index % 15) * 6;
      const widthPercent = Math.max(days * 1.5, 8);

      bar.style.left = `${leftPercent}%`;
      bar.style.width = `${widthPercent}%`;
      bar.textContent = `${days}d (${startDate})`;

      bar.addEventListener("mouseenter", (e) => {
        tooltip.style.display = "block";
        document.getElementById("tt-title").textContent = `[${id}] ${taskName}`;
        document.getElementById("tt-section").textContent = section || "專案階段";
        document.getElementById("tt-owner").textContent = owner || "-";
        document.getElementById("tt-period").textContent = `${startDate} ~ ${endDate} (工期: ${days}天)`;
        document.getElementById("tt-actual-finish").textContent = actualFinish || "未填寫";
        document.getElementById("tt-delay-status").textContent = !isNaN(delayNum) && delayNum > 0 ? `落後 ${delayNum} 天` : "正常";
        document.getElementById("tt-deps").textContent = prevTask || "無";
        document.getElementById("tt-deliverable").textContent = deliverable || (isMilestone ? "重要里程碑交付" : "一般任務節點");
        
        tooltip.style.left = `${e.pageX + 15}px`;
        tooltip.style.top = `${e.pageY + 15}px`;
      });

      bar.addEventListener("mousemove", (e) => {
        tooltip.style.left = `${e.pageX + 15}px`;
        tooltip.style.top = `${e.pageY + 15}px`;
      });

      bar.addEventListener("mouseleave", () => {
        tooltip.style.display = "none";
      });

      barContainer.appendChild(bar);
      tdTimeline.appendChild(barContainer);

      tr.appendChild(tdId);
      tr.appendChild(tdTask);
      tr.appendChild(tdOwner);
      tr.appendChild(tdActual);
      tr.appendChild(tdDelay);
      tr.appendChild(tdDeliverable);
      tr.appendChild(tdTimeline);

      tbody.appendChild(tr);
    });
  }

  btnReload.addEventListener("click", () => {
    loadData();
  });

  loadData();
});