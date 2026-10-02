const relativeError = document.querySelector("#relative-error");
const relativeResults = document.querySelector("#relative-results");
const peerInputs = document.querySelector("#peer-inputs");
let activeCurrency = "CAD";

const exampleMultiples = [
  [14, 8.5, 1.8],
  [16, 9, 2],
  [18, 10, 2.3],
  [15.5, 8.8, 1.9],
  [null, null, null],
];

exampleMultiples.forEach((multiples, index) => {
  const row = document.createElement("tr");
  const name = document.createElement("th");
  name.scope = "row";
  name.textContent = `Peer ${index + 1}`;
  row.append(name);
  ["P/E", "EV/EBITDA", "P/S"].forEach((method, methodIndex) => {
    const cell = document.createElement("td");
    const input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.step = "0.1";
    input.setAttribute("aria-label", `Peer ${index + 1} ${method} multiple`);
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

function calculateRelativeValuation() {
  const eps = readRelativeNumber("relative-eps");
  const ebitda = readRelativeNumber("relative-ebitda");
  const revenue = readRelativeNumber("relative-revenue");
  const netDebt = readRelativeNumber("relative-net-debt");
  const shares = readRelativeNumber("relative-shares");
  activeCurrency = document.querySelector("#relative-currency").value;
  relativeResults.hidden = true;
  relativeError.hidden = true;

  if ([eps, ebitda, revenue, netDebt, shares].some((value) => !Number.isFinite(value)) || shares <= 0) {
    relativeError.textContent = "Enter a number in each company field and use a positive diluted share count.";
    relativeError.hidden = false;
    return;
  }

  const multiples = { pe: [], ev: [], ps: [] };
  [...peerInputs.querySelectorAll("tr")].forEach((row) => {
    const [pe, ev, ps] = [...row.querySelectorAll("input")].map((input) => input.value.trim() === "" ? NaN : Number(input.value));
    multiples.pe.push(pe);
    multiples.ev.push(ev);
    multiples.ps.push(ps);
  });

  calculateMethod({ values: multiples.pe, outputPrefix: "pe", sharePrice: eps > 0 ? (multiple) => multiple * eps : null });
  calculateMethod({ values: multiples.ev, outputPrefix: "ev", sharePrice: ebitda > 0 ? (multiple) => (multiple * ebitda - netDebt) / shares : null });
  calculateMethod({ values: multiples.ps, outputPrefix: "ps", sharePrice: revenue > 0 ? (multiple) => (multiple * revenue) / shares : null });
  relativeResults.hidden = false;
}

document.querySelector("#relative-calculate").addEventListener("click", calculateRelativeValuation);
calculateRelativeValuation();
