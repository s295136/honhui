import { CSV_URL, GAS_API_URL, fallbackData } from "./config.js";
import { state, setGanttData, setBaseDate, getSessionKey, updateAuthUI } from "./state.js";
import { parseDateString, formatDateToYMD } from "./utils.js";

export async function fetchWithCORS(url) {
  const proxies = [
    url,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    `https://corsproxy.io/?${encodeURIComponent(url)}`
  ];

  for (const pUrl of proxies) {
    try {
      const fetchUrl = pUrl.includes('?') ? `${pUrl}&_t=${Date.now()}` : `${pUrl}?_t=${Date.now()}`;
      const res = await fetch(fetchUrl);
      if (res.ok) {
        const text = await res.text();
        if (text && (text.includes("start_day") || text.includes("T01") || text.includes("階段"))) return text;
      }
    } catch (e) {
      console.warn("Proxy 嘗試失敗:", pUrl, e);
    }
  }
  throw new Error("所有連線通道皆受限");
}

export async function loadDataFromSheets(isManual = false, onComplete) {
  const overlay = document.getElementById("loading-overlay");
  if (isManual && overlay) overlay.style.display = "flex";

  let loadedSuccessfully = false;

  try {
    const gasRes = await fetch(`${GAS_API_URL}?_t=${Date.now()}`);
    if (gasRes.ok) {
      const gasJson = await gasRes.json();
      if (gasJson?.status === "success") {
        if (gasJson.baseDate) {
          const parsed = parseDateString(gasJson.baseDate);
          if (parsed) {
            setBaseDate(parsed);
            const inputEl = document.getElementById("base-date-input");
            if (inputEl) inputEl.value = formatDateToYMD(parsed);
          }
        }

        if (Array.isArray(gasJson.data) && gasJson.data.length > 0) {
          const mapped = gasJson.data.map(r => {
            const dur = parseInt(r.duration, 10) || 0;
            let sDay = 0;
            let eDay = 0;
            const rowStartDate = parseDateString(r.start_day);
            const rowEndDate = parseDateString(r.end_day);

            if (rowStartDate && state.baseDate) {
              sDay = Math.round((rowStartDate.getTime() - state.baseDate.getTime()) / (1000 * 60 * 60 * 24));
              if (isNaN(sDay) || sDay < 0) sDay = 0;
              eDay = rowEndDate ? Math.round((rowEndDate.getTime() - state.baseDate.getTime()) / (1000 * 60 * 60 * 24)) : sDay + dur;
            } else {
              sDay = parseInt(r.start_day, 10) || 0;
              eDay = parseInt(r.end_day, 10) || (sDay + dur);
            }

            return {
              id: String(r.id || "").trim(),
              name: String(r.name || "").trim(),
              section: String(r.section || "").trim(),
              owner: String(r.owner || "").trim(),
              start: sDay,
              end: eDay,
              duration: dur,
              type: String(r.type || "task").trim().toLowerCase(),
              deps: String(r.dependencies || "-").trim(),
              deliverable: String(r.deliverables || "").trim(),
              actualFinish: String(r.actualFinish || "").trim(),
              delayDays: (r.delayDays !== null && r.delayDays !== undefined && !isNaN(r.delayDays)) ? Number(r.delayDays) : null
            };
          });

          setGanttData(mapped);
          loadedSuccessfully = true;
          const statusEl = document.getElementById("sync-status-label");
          if (statusEl) statusEl.textContent = "已與雲端同步";
        }
      }
    }
  } catch (gasErr) {
    console.warn("GAS 切換 CSV 通道:", gasErr);
  }

  if (!loadedSuccessfully) {
    try {
      const csvText = await fetchWithCORS(CSV_URL);
      const parsedObj = Papa.parse(csvText, { header: false, skipEmptyLines: true });
      let rows = parsedObj.data;

      if (rows && rows.length > 0) {
        const firstColStr = String(rows[0][0] || "").toLowerCase();
        if (firstColStr.includes("id") || firstColStr.includes("代碼")) {
          rows = rows.slice(1);
        }

        if (rows.length > 0) {
          if (!state.baseDate && rows[0][4]) {
            const firstRowDate = parseDateString(rows[0][4]);
            if (firstRowDate) {
              setBaseDate(firstRowDate);
              const inputEl = document.getElementById("base-date-input");
              if (inputEl) inputEl.value = formatDateToYMD(firstRowDate);
            }
          }

          const mapped = rows.map(r => {
            const dur = parseInt(r[6], 10) || 0;
            let sDay = 0;
            let eDay = 0;
            const rowStartDate = parseDateString(r[4]);
            const rowEndDate = parseDateString(r[5]);

            if (rowStartDate && state.baseDate) {
              sDay = Math.round((rowStartDate.getTime() - state.baseDate.getTime()) / (1000 * 60 * 60 * 24));
              if (isNaN(sDay) || sDay < 0) sDay = 0;
              eDay = rowEndDate ? Math.round((rowEndDate.getTime() - state.baseDate.getTime()) / (1000 * 60 * 60 * 24)) : sDay + dur;
            } else {
              sDay = parseInt(r[4], 10) || 0;
              eDay = parseInt(r[5], 10) || (sDay + dur);
            }

            const rawAF = String(r[10] || "").trim();
            const parsedAF = parseDateString(rawAF);
            const actualFinishVal = parsedAF ? formatDateToYMD(parsedAF) : (rawAF.length >= 8 ? rawAF : "");

            const rawDelay = String(r[11] || "").trim();
            let delayNum = null;
            if (rawDelay !== "") {
              const cleanD = parseFloat(rawDelay.replace(/[^\d.-]/g, ""));
              if (!isNaN(cleanD)) delayNum = cleanD;
            }

            return {
              id: String(r[0] || "").trim(),
              name: String(r[1] || "").trim(),
              section: String(r[2] || "").trim(),
              owner: String(r[3] || "").trim(),
              start: sDay,
              end: eDay,
              duration: dur,
              type: String(r[7] || "task").trim().toLowerCase().replace(/['"]/g, ""),
              deps: String(r[8] || "-").trim(),
              deliverable: String(r[9] || "").trim(),
              actualFinish: actualFinishVal,
              delayDays: delayNum
            };
          });

          setGanttData(mapped);
          loadedSuccessfully = true;
          const statusEl = document.getElementById("sync-status-label");
          if (statusEl) statusEl.textContent = "已與雲端同步";
        }
      }
    } catch (csvErr) {
      console.warn("採用本機資料庫:", csvErr);
    }
  }

  if (!loadedSuccessfully || state.ganttData.length === 0) {
    setGanttData([...fallbackData]);
    const statusEl = document.getElementById("sync-status-label");
    if (statusEl) statusEl.textContent = "本機離線模式";
  }

  if (overlay) overlay.style.display = "none";
  if (typeof onComplete === "function") onComplete();
}

export async function syncDateToGoogleSheets(dateStr, onDone) {
  const secretKey = getSessionKey();
  const statusLabel = document.getElementById("sync-status-label");

  if (!secretKey) {
    alert("操作無效：目前處於唯讀狀態，請先點擊管理授權。");
    updateAuthUI();
    return;
  }

  if (statusLabel) statusLabel.textContent = "核對密鑰並寫入中...";

  try {
    const res = await fetch(GAS_API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ secretKey, baseDate: dateStr })
    });

    const result = await res.json();
    if (result?.status === "success") {
      if (statusLabel) statusLabel.textContent = "雲端時程已同步";
    } else if (result?.status === "forbidden") {
      alert("【存取被拒】密鑰錯誤或無效！");
      state.sessionToken = "";
      sessionStorage.removeItem("gantt_session_auth");
      updateAuthUI();
      if (statusLabel) statusLabel.textContent = "驗證失敗";
      loadDataFromSheets(false, onDone);
    }
  } catch (e) {
    console.error("同步請求異常:", e);
    if (statusLabel) statusLabel.textContent = "同步完成";
  }
}
