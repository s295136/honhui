// config.js
export const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS2HF_-rYF_R-hNUK1bsCoiTm_UxIvyXNgeB_ie6uxg9Gi0cdsoa3tUfbr9C_SPRjd6SrUUkjJ7lT0e/pub?output=csv";
export const GAS_API_URL = "https://script.google.com/macros/s/AKfycbxANanQakAzjD8csDMcBFvD1ndEJi5OTNsBM9klRi6uLdDrjDWWq9jFcVJjGyEBWVxUMg/exec";
export const TOTAL_DAYS = 98;

export const ownerClassMap = {
  "設計專案": { tag: "owner-design", bar: "bar-design", hex: "#0284c7" },
  "土開": { tag: "owner-land", bar: "bar-land", hex: "#d97706" },
  "行銷/企劃": { tag: "owner-marketing", bar: "bar-marketing", hex: "#e11d48" },
  "客服": { tag: "owner-service", bar: "bar-service", hex: "#16a34a" },
  "顧問群(BIM)": { tag: "owner-bim", bar: "bar-bim", hex: "#9333ea" },
  "建築師": { tag: "owner-architect", bar: "bar-architect", hex: "#0d9488" },
  "結構技師": { tag: "owner-structure", bar: "bar-structure", hex: "#4f46e5" },
  "機電技師": { tag: "owner-mep", bar: "bar-mep", hex: "#ea580c" }
};

// 若有需要，也可以一併調整 fallbackData 或維持預設離線備用資料
export const fallbackData = [
  // ... (依您的需求保留或更新備用資料)
];