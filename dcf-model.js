const dcfError = document.querySelector("#dcf-error");
const dcfResults = document.querySelector("#dcf-results");
let modelCurrency = "CAD";
const formatCurrency = (value, fractionDigits) => new Intl.NumberFormat("en-CA", { style: "currency", currency: modelCurrency, minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits }).format(value);
const percentFormat = new Intl.NumberFormat("en-CA", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 });
const forecastDefaults = [
  { growth: 0.1, margin: 0.16, da: 0.04, capex: 0.06, nwc: 0.12 },
  { growth: 0.09, margin: 0.17, da: 0.04, capex: 0.06, nwc: 0.12 },
  { growth: 0.08, margin: 0.18, da: 0.04, capex: 0.055, nwc: 0.12 },
  { growth: 0.07, margin: 0.18, da: 0.04, capex: 0.05, nwc: 0.12 },
  { growth: 0.06, margin: 0.19, da: 0.04, capex: 0.05, nwc: 0.12 }
];
const assumptionLabels = ["Revenue growth", "EBIT margin", "Depreciation and amortization as a percentage of revenue", "Capital spending as a percentage of revenue", "Working capital investment as a percentage of revenue change"];
const forecastBody = document.querySelector("#dcf-forecast-inputs");
forecastDefaults.forEach((defaults, index) => {
  const row = document.createElement("tr");
  const year = document.createElement("th");
  year.scope = "row";
  year.textContent = `Year ${index + 1}`;
  row.append(year);
  ["growth", "margin", "da", "capex", "nwc"].forEach((key, col) => {
    const cell = document.createElement("td");
    const input = document.createElement("input");
    input.type = "number";
    input.min = "-99";
    input.max = "500";
    input.step = "0.1";
    input.value = String(defaults[key] * 100);
    input.id = `dcf-${key}-${index + 1}`;
    input.setAttribute("aria-label", `Year ${index + 1} ${assumptionLabels[col]} (%)`);
    cell.append(input);
    row.append(cell);
  });
  forecastBody.append(row);
});

function readNumber(id) {
  const field = document.getElementById(id);
  if (!field || field.value.trim() === "") return NaN;
  return Number(field.value);
}

function setOutput(id, value) {
  document.getElementById(id).textContent = value;
}

function dcfEnterpriseValue(cashFlows, wacc, growth) {
  if (wacc <= 0 || wacc - growth < 1e-9) return NaN;
  const presentValueForecast = cashFlows.reduce((sum, cashFlow, index) => sum + cashFlow / (1 + wacc) ** (index + 1), 0);
  const terminalValue = cashFlows.at(-1) * (1 + growth) / (wacc - growth);
  const presentValueTerminal = terminalValue / (1 + wacc) ** cashFlows.length;
  return { presentValueForecast, presentValueTerminal, enterpriseValue: presentValueForecast + presentValueTerminal };
}

function buildForecast(currentRevenue, tax) {
  let priorRevenue = currentRevenue;
  const forecast = [];
  for (let index = 1; index <= 5; index += 1) {
    const growth = readNumber(`dcf-growth-${index}`) / 100;
    const margin = readNumber(`dcf-margin-${index}`) / 100;
    const daRate = readNumber(`dcf-da-${index}`) / 100;
    const capexRate = readNumber(`dcf-capex-${index}`) / 100;
    const nwcRate = readNumber(`dcf-nwc-${index}`) / 100;
    if (![growth, margin, daRate, capexRate, nwcRate].every(Number.isFinite)) return null;
    const revenue = priorRevenue * (1 + growth);
    const ebit = revenue * margin;
    const depreciation = revenue * daRate;
    const capex = revenue * capexRate;
    const workingCapitalInvestment = (revenue - priorRevenue) * nwcRate;
    const fcff = ebit * (1 - tax) + depreciation - capex - workingCapitalInvestment;
    forecast.push({ revenue, fcff });
    priorRevenue = revenue;
  }
  return forecast;
}

function calculateDcf() {
  const currentRevenue = readNumber("dcf-current-revenue");
  const taxPercent = readNumber("dcf-tax-rate");
  const tax = taxPercent / 100;
  const wacc = readNumber("dcf-wacc") / 100;
  const growth = readNumber("dcf-growth") / 100;
  const netDebt = readNumber("dcf-net-debt");
  const shares = readNumber("dcf-shares");
  modelCurrency = document.querySelector("#dcf-currency").value;
  dcfResults.hidden = true;
  dcfError.hidden = true;
  const forecast = buildForecast(currentRevenue, tax);
  if (!Number.isFinite(currentRevenue) || currentRevenue < 0 || !Number.isFinite(taxPercent) || taxPercent < 0 || taxPercent > 100 || !forecast || !Number.isFinite(wacc) || !Number.isFinite(growth) || !Number.isFinite(netDebt) || !Number.isFinite(shares) || shares <= 0) {
    dcfError.textContent = "Enter valid values in every field. Revenue must be zero or more, tax must be between 0% and 100%, and diluted shares must be positive.";
    dcfError.hidden = false;
    return;
  }
  if (wacc <= 0 || wacc - growth < 1e-9) {
    dcfError.textContent = "The discount rate must be greater than the perpetual growth rate for the terminal value formula to work.";
    dcfError.hidden = false;
    return;
  }
  const cashFlows = forecast.map((year) => year.fcff);
  const base = dcfEnterpriseValue(cashFlows, wacc, growth);
  const equityValue = base.enterpriseValue - netDebt;
  const valuePerShare = equityValue / shares;
  const terminalShare = base.enterpriseValue <= 0 ? null : base.presentValueTerminal / base.enterpriseValue;
  if (![base.presentValueForecast, base.presentValueTerminal, base.enterpriseValue, equityValue, valuePerShare].every(Number.isFinite)) {
    dcfError.textContent = "These inputs produce an out-of-range result. Review the forecast and valuation assumptions.";
    dcfError.hidden = false;
    return;
  }

  setOutput("dcf-revenue-1", formatCurrency(forecast[0].revenue, 1));
  setOutput("dcf-revenue-5", formatCurrency(forecast[4].revenue, 1));
  setOutput("dcf-fcf-1", formatCurrency(cashFlows[0], 1));
  setOutput("dcf-fcf-5", formatCurrency(cashFlows[4], 1));
  setOutput("dcf-pv-cash-flows", formatCurrency(base.presentValueForecast, 1));
  setOutput("dcf-pv-terminal", formatCurrency(base.presentValueTerminal, 1));
  setOutput("dcf-enterprise-value", formatCurrency(base.enterpriseValue, 1));
  setOutput("dcf-equity-value", formatCurrency(equityValue, 1));
  setOutput("dcf-value-per-share", formatCurrency(valuePerShare, 2));
  setOutput("dcf-terminal-share", terminalShare === null ? "Not available" : percentFormat.format(terminalShare));

  const offsets = [-0.01, -0.005, 0, 0.005, 0.01];
  const rates = offsets.map((offset) => wacc + offset);
  const growthRates = offsets.map((offset) => growth + offset);
  const table = document.querySelector("#dcf-sensitivity");
  const head = table.querySelector("thead");
  const body = table.querySelector("tbody");
  head.replaceChildren();
  body.replaceChildren();
  const headerRow = document.createElement("tr");
  const corner = document.createElement("th");
  corner.scope = "col";
  corner.textContent = "WACC / Growth";
  headerRow.append(corner);
  growthRates.forEach((rate) => {
    const cell = document.createElement("th");
    cell.scope = "col";
    cell.textContent = percentFormat.format(rate);
    headerRow.append(cell);
  });
  head.append(headerRow);
  rates.forEach((rate) => {
    const row = document.createElement("tr");
    const label = document.createElement("th");
    label.scope = "row";
    label.textContent = percentFormat.format(rate);
    row.append(label);
    growthRates.forEach((growthRate) => {
      const cell = document.createElement("td");
      const scenario = dcfEnterpriseValue(cashFlows, rate, growthRate);
      cell.textContent = scenario && Number.isFinite(scenario.enterpriseValue) ? formatCurrency(scenario.enterpriseValue, 1) : "Not available";
      if (Math.abs(rate - wacc) < 0.000001 && Math.abs(growthRate - growth) < 0.000001) {
        cell.classList.add("is-base-case");
        cell.setAttribute("aria-label", `Base case, ${cell.textContent}`);
      }
      row.append(cell);
    });
    body.append(row);
  });
  dcfResults.hidden = false;
}

document.querySelector("#dcf-calculate").addEventListener("click", calculateDcf);
calculateDcf();
