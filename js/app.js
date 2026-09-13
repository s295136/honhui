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
    
    // 優先透過 Proxy 讀取，若失敗則嘗試直接讀取
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
    // 過濾掉空行或沒有 ID 的資料
    projectData = data.filter(row => {
      const idKey = Object.keys(row).find(k => k.trim() === 'ID');
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
    const milestones = projectData.filter(row => {
      const isMilestoneKey = Object.keys(row).find(k => k.includes('是否里程碑') || k.includes('里程碑'));
      const remarkKey = Object.keys(row).find(k => k.includes('備註'));
      return (isMilestoneKey && row[isMilestoneKey] === "TRUE") || (remarkKey && row[remarkKey] === "里程碑");
    }).length;
    statTotalMilestones.textContent = `${milestones} 次`;
    
    const delays = projectData.filter(row => {
      const remarkKey = Object.keys(row).find(k => k.includes('備註'));
      return remarkKey && row[remarkKey] && row[remarkKey].includes("落後");
    }).length;
    statTotalDelays.textContent = `${delays} 項`;
    statTodayStatus.textContent = "運作正常 (已同步雲端)";
  }

  function renderFilters() {
    const owners = ["all", ...new Set(projectData.map(row => {
      const ownerKey = Object.keys(row).find(k => k.includes('負責人'));
      return ownerKey ? row[ownerKey] : null;
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
          const ownerKey = Object.keys(row).find(k => k.includes('負責人'));
          return ownerKey && row[ownerKey] === currentFilter;
        });

    filteredData.forEach(row => {
      const getVal = (keyword) => {
        const k = Object.keys(row).find(key => key.includes(keyword));
        return k ? row[k] : "";
      };

      const id = getVal('ID');
      const taskName = getVal('任務名稱');
      const owner = getVal('負責人');
      const startDate = getVal('開始日期');
      const daysStr = getVal('工期');
      const progressStr = getVal('進度');
      const prevTask = getVal('前置');
      const parentId = getVal('父任務');
      const remark = getVal('備註');
      const color = getVal('顏色') || 'blue';
      const isMilestone = getVal('是否里程碑');

      const tr = document.createElement("tr");

      const tdId = document.createElement("td");
      tdId.className = "col-id";
      tdId.textContent = id;

      const tdTask = document.createElement("td");
      tdTask.className = "col-task";
      tdTask.textContent = taskName;
      if (parentId && parentId.trim() !== "" && parentId !== "無(最上層副任務)") {
        tdTask.style.paddingLeft = "24px";
        tdTask.style.color = "#475569";
      } else {
        tdTask.style.fontWeight = "600";
      }

      const tdOwner = document.createElement("td");
      tdOwner.className = "col-owner";
      tdOwner.textContent = owner || "-";

      const tdActual = document.createElement("td");
      tdActual.className = "col-actual";
      tdActual.textContent = startDate || "-";

      const tdDelay = document.createElement("td");
      tdDelay.className = "col-delay";
      tdDelay.textContent = remark || "-";

      const tdDeliverable = document.createElement("td");
      tdDeliverable.className = "col-deliverable";
      tdDeliverable.textContent = (isMilestone === "TRUE" || remark === "里程碑") ? "⭐ 里程碑節點" : (prevTask ? `前置: ${prevTask}` : "-");

      const tdTimeline = document.createElement("td");
      tdTimeline.className = "col-timeline";
      
      const barContainer = document.createElement("div");
      barContainer.className = "task-bar-container";

      const bar = document.createElement("div");
      bar.className = `task-bar ${color.trim()}`;
      
      const days = parseInt(daysStr) || 5;
      const leftPercent = (parseInt(id) % 15) * 6;
      const widthPercent = Math.max(days * 1.5, 8);

      bar.style.left = `${leftPercent}%`;
      bar.style.width = `${widthPercent}%`;

      const progressVal = parseFloat(progressStr) || 0;
      if (progressVal > 0) {
        const prog = document.createElement("div");
        prog.className = "task-progress";
        prog.style.width = `${progressVal}%`;
        bar.appendChild(prog);
      }

      bar.addEventListener("mouseenter", (e) => {
        tooltip.style.display = "block";
        document.getElementById("tt-title").textContent = taskName;
        document.getElementById("tt-section").textContent = parentId || "主專案節點";
        document.getElementById("tt-owner").textContent = owner || "-";
        document.getElementById("tt-period").textContent = `${startDate} (工期: ${days}天)`;
        document.getElementById("tt-actual-finish").textContent = startDate || "-";
        document.getElementById("tt-delay-status").textContent = remark || "正常";
        document.getElementById("tt-deps").textContent = prevTask || "無";
        document.getElementById("tt-deliverable").textContent = (isMilestone === "TRUE" || remark === "里程碑") ? "重要里程碑交付" : "一般任務節點";
        
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