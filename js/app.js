const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS2HF_-rYF_R-hNUK1bsCoiTm_UxIvyXNgeB_ie6uxg9Gi0cdsoa3tUfbr9C_SPRjd6SrUUkjJ7lT0e/pub?output=csv";

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
    Papa.parse(CSV_URL, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: function(results) {
        projectData = results.data.filter(row => row.ID && row.ID.trim() !== "");
        loadingOverlay.style.display = "none";
        initApp();
      },
      error: function(err) {
        console.error("載入 CSV 失敗:", err);
        loadingOverlay.innerHTML = `<div style="color: #dc2626; font-weight: bold;">雲端資料載入失敗，請檢查網路或確認試算表公開發布連結是否正確。</div>`;
      }
    });
  }

  function initApp() {
    renderStats();
    renderFilters();
    renderTimelineRuler();
    renderTable();
  }

  function renderStats() {
    statTotalRows.textContent = `${projectData.length} 項`;
    const milestones = projectData.filter(row => row.是否里程碑 === "TRUE" || row.備註 === "里程碑").length;
    statTotalMilestones.textContent = `${milestones} 次`;
    const delays = projectData.filter(row => row.備註 && row.備註.includes("落後")).length;
    statTotalDelays.textContent = `${delays} 項`;
    statTodayStatus.textContent = "運作正常 (已同步雲端)";
  }

  function renderFilters() {
    const owners = ["all", ...new Set(projectData.map(r => r.負責人).filter(Boolean))];
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
      : projectData.filter(row => row.負責人 === currentFilter);

    filteredData.forEach(row => {
      const tr = document.createElement("tr");

      const tdId = document.createElement("td");
      tdId.className = "col-id";
      tdId.textContent = row.ID || "";

      const tdTask = document.createElement("td");
      tdTask.className = "col-task";
      tdTask.textContent = row.任務名稱 || "";
      if (row.父任務ID && row.父任務ID.trim() !== "" && row.父任務ID !== "無(最上層副任務)") {
        tdTask.style.paddingLeft = "24px";
        tdTask.style.color = "#475569";
      } else {
        tdTask.style.fontWeight = "600";
      }

      const tdOwner = document.createElement("td");
      tdOwner.className = "col-owner";
      tdOwner.textContent = row.負責人 || "-";

      const tdActual = document.createElement("td");
      tdActual.className = "col-actual";
      tdActual.textContent = row.開始日期 || "-";

      const tdDelay = document.createElement("td");
      tdDelay.className = "col-delay";
      tdDelay.textContent = row.備註 || "-";

      const tdDeliverable = document.createElement("td");
      tdDeliverable.className = "col-deliverable";
      tdDeliverable.textContent = row.是否里程碑 === "TRUE" ? "⭐ 里程碑節點" : (row.前置任務 ? `前置: ${row.前置任務}` : "-");

      const tdTimeline = document.createElement("td");
      tdTimeline.className = "col-timeline";
      
      const barContainer = document.createElement("div");
      barContainer.className = "task-bar-container";

      const bar = document.createElement("div");
      const colorClass = row.顏色 || "blue";
      bar.className = `task-bar ${colorClass}`;
      
      const days = parseInt(row["工期(天)"]) || 5;
      const leftPercent = (parseInt(row.ID) % 15) * 6;
      const widthPercent = Math.max(days * 1.5, 8);

      bar.style.left = `${leftPercent}%`;
      bar.style.width = `${widthPercent}%`;

      const progressVal = parseFloat(row["進度%"]) || 0;
      if (progressVal > 0) {
        const prog = document.createElement("div");
        prog.className = "task-progress";
        prog.style.width = `${progressVal}%`;
        bar.appendChild(prog);
      }

      bar.addEventListener("mouseenter", (e) => {
        tooltip.style.display = "block";
        document.getElementById("tt-title").textContent = row.任務名稱;
        document.getElementById("tt-section").textContent = row.父任務ID || "主專案節點";
        document.getElementById("tt-owner").textContent = row.負責人 || "-";
        document.getElementById("tt-period").textContent = `${row.開始日期} (工期: ${days}天)`;
        document.getElementById("tt-actual-finish").textContent = row.開始日期 || "-";
        document.getElementById("tt-delay-status").textContent = row.備註 || "正常";
        document.getElementById("tt-deps").textContent = row.前置任務 || "無";
        document.getElementById("tt-deliverable").textContent = row.是否里程碑 === "TRUE" ? "重要里程碑交付" : "一般任務節點";
        
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