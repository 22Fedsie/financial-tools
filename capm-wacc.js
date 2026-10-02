const capmFields = ["capm-risk-free", "capm-beta", "capm-premium", "capm-debt-cost", "capm-tax", "capm-equity-weight"];
const capmError = document.querySelector("#capm-error");
const capmResults = document.querySelector("#capm-results");
const percent = (value) => `${(value * 100).toFixed(2)}%`;
const read = (id) => {
  const element = document.getElementById(id);
  return element.value.trim() === "" ? NaN : Number(element.value);
};

function calculateCapmWacc() {
  capmError.hidden = true;
  capmResults.hidden = true;
  const values = capmFields.map(read);
  if (values.some((value) => !Number.isFinite(value))) {
    capmError.textContent = "Enter a valid number in every field.";
    capmError.hidden = false;
    return;
  }
  const [riskFreePct, beta, premiumPct, debtCostPct, taxPct, equityWeightPct] = values;
  if (riskFreePct < 0 || premiumPct < 0 || debtCostPct < 0 || taxPct < 0 || taxPct > 100 || equityWeightPct < 0 || equityWeightPct > 100) {
    capmError.textContent = "Rates and capital weights must be within their stated ranges. Tax and equity weight must be between 0% and 100%.";
    capmError.hidden = false;
    return;
  }
  const riskFree = riskFreePct / 100;
  const marketPremium = premiumPct / 100;
  const debtCost = debtCostPct / 100;
  const tax = taxPct / 100;
  const equityWeight = equityWeightPct / 100;
  const debtWeight = 1 - equityWeight;
  const costOfEquity = riskFree + beta * marketPremium;
  const afterTaxDebt = debtCost * (1 - tax);
  const wacc = equityWeight * costOfEquity + debtWeight * afterTaxDebt;
  if (![costOfEquity, afterTaxDebt, wacc].every(Number.isFinite)) {
    capmError.textContent = "These inputs produce an out-of-range result. Review beta and rate assumptions.";
    capmError.hidden = false;
    return;
  }
  document.querySelector("#capm-output-equity").textContent = percent(costOfEquity);
  document.querySelector("#capm-output-after-tax").textContent = percent(afterTaxDebt);
  document.querySelector("#capm-output-debt-weight").textContent = percent(debtWeight);
  document.querySelector("#capm-output-wacc").textContent = percent(wacc);
  document.querySelector("#capm-equation").textContent = `CAPM: ${percent(riskFree)} + ${beta.toFixed(2)} × ${percent(marketPremium)} = ${percent(costOfEquity)}. WACC: ${percent(equityWeight)} × ${percent(costOfEquity)} + ${percent(debtWeight)} × ${percent(debtCost)} × (1 − ${percent(tax)}) = ${percent(wacc)}.`;
  capmResults.hidden = false;
}

document.querySelector("#capm-calculate").addEventListener("click", calculateCapmWacc);
calculateCapmWacc();
