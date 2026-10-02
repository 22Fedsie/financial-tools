const portfolioCurrency = document.querySelector("#portfolio-currency");
const portfolioError = document.querySelector("#portfolio-error");
const portfolioResults = document.querySelector("#portfolio-results");
const cashflowBody = document.querySelector("#portfolio-cashflows");
const periodBody = document.querySelector("#portfolio-periods");
const portfolioMoney = (value) => new Intl.NumberFormat("en-CA", { style: "currency", currency: portfolioCurrency.value, maximumFractionDigits: 2 }).format(value);
const portfolioPercent = (value) => Number.isFinite(value) ? `${(value * 100).toFixed(2)}%` : "Not available";
const readPortfolioNumber = (id) => {
  const input = document.getElementById(id);
  return input.value.trim() === "" ? NaN : Number(input.value);
};
const cashflowDefaults = ["", "", "", ""];
cashflowDefaults.forEach((_, index) => {
  const row = document.createElement("tr");
  const heading = document.createElement("th");
  heading.scope = "row";
  heading.textContent = `Flow ${index + 1}`;
  row.append(heading);
  const dateCell = document.createElement("td");
  const date = document.createElement("input");
  date.type = "date";
  date.id = `portfolio-flow-date-${index + 1}`;
  date.setAttribute("aria-label", `Cash flow ${index + 1} date`);
  dateCell.append(date);
  row.append(dateCell);
  const amountCell = document.createElement("td");
  const amount = document.createElement("input");
  amount.type = "number";
  amount.step = "0.01";
  amount.id = `portfolio-flow-amount-${index + 1}`;
  amount.setAttribute("aria-label", `Cash flow ${index + 1} amount`);
  amountCell.append(amount);
  row.append(amountCell);
  cashflowBody.append(row);
});
const periodDefaults = [
  [10000, 10270, 0],
  [10270, 10545, 0],
  [10545, 10820, 0],
  [10820, 11200, 0]
];
periodDefaults.forEach(([begin, end, flow], index) => {
  const row = document.createElement("tr");
  const heading = document.createElement("th");
  heading.scope = "row";
  heading.textContent = `Period ${index + 1}`;
  row.append(heading);
  [begin, end, flow].forEach((value, column) => {
    const cell = document.createElement("td");
    const input = document.createElement("input");
    input.type = "number";
    if (column < 2) input.min = "0";
    input.step = "0.01";
    input.value = String(value);
    input.id = `portfolio-period-${index + 1}-${column + 1}`;
    const descriptions = ["beginning value", "ending value", "end-period external flow"];
    input.setAttribute("aria-label", `Period ${index + 1} ${descriptions[column]}`);
    cell.append(input);
    row.append(cell);
  });
  periodBody.append(row);
});

function yearFraction(start, end) {
  return (end - start) / (365.25 * 24 * 60 * 60 * 1000);
}

function xirr(cashflows) {
  const npv = (rate) => cashflows.reduce((sum, flow) => sum + flow.amount / (1 + rate) ** flow.years, 0);
  const lowLog = Math.log(0.0001);
  const highLog = Math.log(1001);
  let previousRate = Math.exp(lowLog) - 1;
  let previousNpv = npv(previousRate);
  const brackets = [];
  const steps = 800;
  for (let index = 1; index <= steps; index += 1) {
    const rate = Math.exp(lowLog + (highLog - lowLog) * index / steps) - 1;
    const currentNpv = npv(rate);
    if (Number.isFinite(previousNpv) && Number.isFinite(currentNpv) && previousNpv * currentNpv <= 0) brackets.push([previousRate, rate]);
    previousRate = rate;
    previousNpv = currentNpv;
  }
  if (!brackets.length) return NaN;
  const [start, end] = brackets.reduce((closest, bracket) => Math.abs((bracket[0] + bracket[1]) / 2 - 0.1) < Math.abs((closest[0] + closest[1]) / 2 - 0.1) ? bracket : closest, brackets[0]);
  let low = start;
  let high = end;
  let lowValue = npv(low);
  for (let index = 0; index < 120; index += 1) {
    const middle = (low + high) / 2;
    const middleValue = npv(middle);
    if (Math.abs(middleValue) < 1e-9) return middle;
    if (lowValue * middleValue <= 0) high = middle;
    else {
      low = middle;
      lowValue = middleValue;
    }
  }
  return (low + high) / 2;
}

function calculatePortfolio() {
  portfolioError.hidden = true;
  portfolioResults.hidden = true;
  const beginning = readPortfolioNumber("portfolio-begin");
  const ending = readPortfolioNumber("portfolio-end");
  const income = readPortfolioNumber("portfolio-income");
  const periodsPerYear = readPortfolioNumber("portfolio-periods-per-year");
  const startDate = document.querySelector("#portfolio-start-date").value;
  const endDate = document.querySelector("#portfolio-end-date").value;
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  const years = yearFraction(start, end);
  if (![beginning, ending, income, periodsPerYear].every(Number.isFinite) || beginning <= 0 || ending < 0 || periodsPerYear < 1 || periodsPerYear > 365 || !Number.isInteger(periodsPerYear) || !startDate || !endDate || !Number.isFinite(years) || years <= 0) {
    portfolioError.textContent = "Enter valid values, a positive beginning value, and an ending date after the beginning date.";
    portfolioError.hidden = false;
    return;
  }

  const hpr = (ending - beginning + income) / beginning;
  const annualized = hpr <= -1 ? NaN : (1 + hpr) ** (1 / years) - 1;
  document.querySelector("#portfolio-hpr").textContent = portfolioPercent(hpr);
  document.querySelector("#portfolio-annualized").textContent = portfolioPercent(annualized);
  document.querySelector("#portfolio-gain").textContent = portfolioMoney(ending - beginning + income);

  const flows = [{ date: start, amount: -beginning }];
  let flowError = "";
  for (let index = 1; index <= 4; index += 1) {
    const dateValue = document.querySelector(`#portfolio-flow-date-${index}`).value;
    const amountField = document.querySelector(`#portfolio-flow-amount-${index}`);
    const amountValue = amountField.value.trim();
    if (dateValue || amountValue !== "") {
      const date = new Date(`${dateValue}T00:00:00Z`);
      const amount = amountValue === "" ? NaN : Number(amountValue);
      if (!dateValue || !Number.isFinite(amount) || date <= start || date >= end) flowError = "Each interim cash flow needs a valid amount and a date strictly between the beginning and ending dates.";
      else flows.push({ date, amount });
    }
  }
  flows.push({ date: end, amount: ending });
  if (flowError) {
    portfolioError.textContent = flowError;
    portfolioError.hidden = false;
    return;
  }
  const xirrFlows = flows.map((flow) => ({ amount: flow.amount, years: yearFraction(start, flow.date) }));
  const moneyWeighted = xirr(xirrFlows);
  document.querySelector("#portfolio-xirr").textContent = portfolioPercent(moneyWeighted);

  const subperiodReturns = [];
  for (let index = 1; index <= 4; index += 1) {
    const periodBeginning = readPortfolioNumber(`portfolio-period-${index}-1`);
    const periodEnding = readPortfolioNumber(`portfolio-period-${index}-2`);
    const periodFlow = readPortfolioNumber(`portfolio-period-${index}-3`);
    if (![periodBeginning, periodEnding, periodFlow].every(Number.isFinite) || periodBeginning <= 0 || periodEnding < 0) {
      portfolioError.textContent = "Each time-weighted period needs a positive beginning value and valid ending value and external flow.";
      portfolioError.hidden = false;
      return;
    }
    const periodReturn = (periodEnding - periodFlow) / periodBeginning - 1;
    if (!Number.isFinite(periodReturn) || periodReturn < -1) {
      portfolioError.textContent = "A period's cash flow implies a loss below 100%. Check the time-weighted inputs.";
      portfolioError.hidden = false;
      return;
    }
    subperiodReturns.push(periodReturn);
  }
  const linkedTwr = subperiodReturns.reduce((product, value) => product * (1 + value), 1) - 1;
  const annualizedTwr = linkedTwr <= -1 ? NaN : (1 + linkedTwr) ** (periodsPerYear / subperiodReturns.length) - 1;
  document.querySelector("#portfolio-twr").textContent = portfolioPercent(linkedTwr);
  document.querySelector("#portfolio-twr-annualized").textContent = portfolioPercent(annualizedTwr);

  const benchmarkBeginning = readPortfolioNumber("benchmark-begin");
  const benchmarkEnding = readPortfolioNumber("benchmark-end");
  const benchmarkIncome = readPortfolioNumber("benchmark-income");
  const benchmarkOutput = document.querySelector("#benchmark-result");
  if (![benchmarkBeginning, benchmarkEnding, benchmarkIncome].every(Number.isFinite) || benchmarkBeginning <= 0 || benchmarkEnding < 0) {
    portfolioError.textContent = "Benchmark values must include a positive beginning value, nonnegative ending value, and valid income amount.";
    portfolioError.hidden = false;
    return;
  }
  const benchmarkHpr = (benchmarkEnding - benchmarkBeginning + benchmarkIncome) / benchmarkBeginning;
  benchmarkOutput.textContent = `Benchmark total return: ${portfolioPercent(benchmarkHpr)}. Portfolio less benchmark: ${portfolioPercent(hpr - benchmarkHpr)}.`;
  portfolioResults.hidden = false;
}

document.querySelector("#portfolio-calculate").addEventListener("click", calculatePortfolio);
calculatePortfolio();
