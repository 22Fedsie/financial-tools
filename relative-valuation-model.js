const relativeError = document.querySelector("#relative-error");
const relativeResults = document.querySelector("#relative-results");
const peerInputs = document.querySelector("#peer-inputs");
const profileGuidance = document.querySelector("#relative-profile-guidance");
let activeCurrency = "CAD";

const methods = [
  { key: "pe", label: "P/E", field: "relative-eps", price: (multiple, eps) => multiple * eps },
  { key: "ev", label: "EV/EBITDA", field: "relative-ebitda", enterprise: true },
  { key: "evsales", label: "EV/Sales", field: "relative-revenue", enterprise: true },
  { key: "ps", label: "P/S", field: "relative-revenue" },
  { key: "pb", label: "P/B", field: "relative-book-equity" },
  { key: "ptbv", label: "P/TBV", field: "relative-tangible-book" },
];

const exampleMultiples = [
  [14, 8.5, 1.8, 1.8, 1.4, 1.7, 0.4],
  [16, 9, 2, 2, 1.5, 1.8, 0.5],
  [18, 10, 2.3, 2.3, 1.6, 1.9, 0.6],
  [15.5, 8.8, 1.9, 1.9, 1.45, 1.75, 0.45],
  [null, null, null, null, null, null, null],
];

exampleMultiples.forEach((multiples, index) => {
  const row = document.createElement("tr");
  const name = document.createElement("th");
  name.scope = "row";
  name.textContent = `Peer ${index + 1}`;
  row.append(name);
  [...methods.map((method) => method.label), "D/E"].forEach((method, methodIndex) => {
    const cell = document.createElement("td");
    const input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.step = "0.1";
    input.setAttribute("aria-label", `Peer ${index + 1} ${method} ${method === "D/E" ? "ratio" : "multiple"}`);
    input.value = multiples[methodIndex] ?? "";
    cell.append(input);
    row.append(cell);
  });
  peerInputs.append(row);
});

function readRelativeNumber(id) {
  const field = document.getElementById(id);
  if (!field || field.value.trim() === "") return NaN;
  return Number(field.value);
}

function asCurrency(amount) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: activeCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function writeRelativeOutput(id, value) {
  document.getElementById(id).textContent = value;
}

function displayRatio(value) {
  return Number.isFinite(value) ? `${value.toFixed(2)}x` : "Not available";
}

function calculateMethod({ values, outputPrefix, sharePrice }) {
  const positiveMultiples = values.filter((value) => Number.isFinite(value) && value > 0);
  if (positiveMultiples.length === 0 || sharePrice === null) {
    ["range", "median", "price-range", "price-median"].forEach((suffix) => writeRelativeOutput(`relative-${outputPrefix}-${suffix}`, "Not available"));
    return;
  }
  const low = Math.min(...positiveMultiples);
  const high = Math.max(...positiveMultiples);
  const center = median(positiveMultiples);
  const lowPrice = sharePrice(low);
  const highPrice = sharePrice(high);
  const medianPrice = sharePrice(center);
  const multipleFormat = (value) => `${value.toFixed(1)}x`;
  writeRelativeOutput(`relative-${outputPrefix}-range`, `${multipleFormat(low)} to ${multipleFormat(high)}`);
  writeRelativeOutput(`relative-${outputPrefix}-median`, `${multipleFormat(center)} (${positiveMultiples.length} peers)`);
  writeRelativeOutput(`relative-${outputPrefix}-price-range`, `${asCurrency(Math.min(lowPrice, highPrice))} to ${asCurrency(Math.max(lowPrice, highPrice))}`);
  writeRelativeOutput(`relative-${outputPrefix}-price-median`, asCurrency(medianPrice));
}

const profileNotes = {
  general: "Start with P/E if earnings are positive and comparable. EV/EBITDA can help compare non-financial businesses with different financing. EV/Sales or P/S may help when earnings are temporarily low, but interpret revenue multiples with margins and growth.",
  growth: "For early-stage or high-growth technology, EV/Sales or P/S can be useful when revenue is meaningful. Negative EPS makes P/E unusable, and negative EBITDA makes EV/EBITDA unusable. Compare growth, gross margin, retention, and funding needs. Revenue multiples do not measure profitability.",
  bank: "For a bank or financial institution, consider P/B, P/TBV, and P/E when earnings are positive. Debt and deposits are part of operations, so EV/EBITDA is usually a poor fit. Review return on equity, capital adequacy, asset quality, and net interest margin. D/E is only rough context here.",
  asset: "For an asset-heavy company, P/B or P/TBV may help when book values reflect economic assets. EV/EBITDA can also be useful if EBITDA is positive. Consider asset age, maintenance spending, impairments, and differences in depreciation policy.",
};

function updateProfileGuidance() {
  profileGuidance.textContent = profileNotes[document.querySelector("#relative-profile").value];
}

function calculateRelativeValuation() {
  const ids = ["relative-eps", "relative-ebitda", "relative-revenue", "relative-net-debt", "relative-shares"];
  const target = Object.fromEntries(ids.map((id) => [id, readRelativeNumber(id)]));
  const bookEquity = readRelativeNumber("relative-book-equity");
  const tangibleBook = readRelativeNumber("relative-tangible-book");
  const totalDebt = readRelativeNumber("relative-total-debt");
  activeCurrency = document.querySelector("#relative-currency").value;
  relativeResults.hidden = true;
  relativeError.hidden = true;

  if (!Number.isFinite(target["relative-shares"]) || target["relative-shares"] <= 0 || (Number.isFinite(totalDebt) && totalDebt < 0)) {
    relativeError.textContent = "Enter a positive diluted share count and a valid total debt amount if using the debt-to-equity context ratio.";
    relativeError.hidden = false;
    return;
  }

  const peerRows = [...peerInputs.querySelectorAll("tr")];
  const peerValues = peerRows.map((row) => [...row.querySelectorAll("input")].map((input) => input.value.trim() === "" ? NaN : Number(input.value)));
  const netDebt = target["relative-net-debt"];
  const shares = target["relative-shares"];

  methods.forEach((method, methodIndex) => {
    const metric = readRelativeNumber(method.field);
    const values = peerValues.map((row) => row[methodIndex]);
    let sharePrice = null;
    if (Number.isFinite(metric) && metric > 0 && (!method.enterprise || Number.isFinite(netDebt))) {
      if (method.key === "pe") sharePrice = (multiple) => method.price(multiple, metric);
      else if (method.enterprise) sharePrice = (multiple) => (multiple * metric - netDebt) / shares;
      else sharePrice = (multiple) => (multiple * metric) / shares;
    }
    calculateMethod({ values, outputPrefix: method.key, sharePrice });
  });

  const peerDebtEquity = peerValues.map((row) => row[methods.length]).filter((value) => Number.isFinite(value) && value >= 0);
  const targetDebtEquity = Number.isFinite(totalDebt) && Number.isFinite(bookEquity) && bookEquity > 0 ? totalDebt / bookEquity : NaN;
  writeRelativeOutput("relative-target-de", displayRatio(targetDebtEquity));
  writeRelativeOutput("relative-peer-de", peerDebtEquity.length ? displayRatio(median(peerDebtEquity)) : "Not available");
  relativeResults.hidden = false;
}

document.querySelector("#relative-profile").addEventListener("change", updateProfileGuidance);
document.querySelector("#relative-calculate").addEventListener("click", calculateRelativeValuation);
updateProfileGuidance();
calculateRelativeValuation();
