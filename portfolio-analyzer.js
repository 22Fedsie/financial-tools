const csvInput = document.querySelector("#analyzer-csv");
const fileInput = document.querySelector("#analyzer-file");
const errorOutput = document.querySelector("#analyzer-error");
const quantitySection = document.querySelector("#analyzer-quantities-section");
const quantityRows = document.querySelector("#analyzer-quantity-rows");
const resultsSection = document.querySelector("#analyzer-results");
let priceData = null;

const samplePrices = `Date,AAPL,MSFT,RY.TO
2025-01-02,243.85,418.58,172.40
2025-01-03,243.36,423.35,173.10
2025-01-06,245.00,426.59,174.25
2025-01-07,242.21,424.56,173.70
2025-01-08,242.70,424.56,174.80`;

function splitCsvLine(line) {
  const cells = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && quoted && line[index + 1] === '"') {
      cell += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      cells.push(cell.trim());
      cell = "";
    } else {
      cell += character;
    }
  }
  if (quoted) throw new Error("A quoted value in the CSV is not closed. Check the file and try again.");
  cells.push(cell.trim());
  return cells;
}

function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length < 3) throw new Error("Add a header row and at least two dates of price history.");
  if (lines.length > 10001) throw new Error("This first version supports up to 10,000 price dates at a time.");
  const headers = splitCsvLine(lines[0]).map((header) => header.trim());
  if (headers.length < 2 || headers.length > 21 || headers.some((header) => !header)) throw new Error("Use a Date column and between one and 20 ticker columns. Every column needs a header.");
  if (headers[0].toLowerCase() !== "date") throw new Error("The first column heading must be Date.");
  const tickers = headers.slice(1);
  if (new Set(tickers.map((ticker) => ticker.toUpperCase())).size !== tickers.length) throw new Error("Each ticker column must have a unique name.");

  const observations = [];
  const seenDates = new Set();
  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const cells = splitCsvLine(lines[lineIndex]);
    if (cells.length !== headers.length) throw new Error(`Row ${lineIndex + 1} has ${cells.length} columns. The header has ${headers.length}.`);
    const dateText = cells[0];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) throw new Error(`Row ${lineIndex + 1} needs a date in YYYY-MM-DD format.`);
    const date = new Date(`${dateText}T00:00:00Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== dateText) throw new Error(`Row ${lineIndex + 1} has an invalid date.`);
    if (seenDates.has(dateText)) throw new Error(`The date ${dateText} appears more than once.`);
    seenDates.add(dateText);
    const prices = cells.slice(1).map((raw, tickerIndex) => {
      const cleaned = raw.replace(/[,$\s]/g, "");
      const value = Number(cleaned);
      if (cleaned === "" || !Number.isFinite(value) || value <= 0) throw new Error(`Row ${lineIndex + 1} needs a positive price for ${tickers[tickerIndex]}.`);
      return value;
    });
    observations.push({ date, dateText, prices });
  }
  observations.sort((left, right) => left.date - right.date);
  return { tickers, observations };
}

function showError(message) {
  errorOutput.textContent = message;
  errorOutput.hidden = false;
}

function readPriceData() {
  errorOutput.hidden = true;
  resultsSection.hidden = true;
  try {
    priceData = parseCsv(csvInput.value);
    quantityRows.replaceChildren();
    priceData.tickers.forEach((ticker, index) => {
      const row = document.createElement("tr");
      const tickerCell = document.createElement("th");
      tickerCell.scope = "row";
      tickerCell.textContent = ticker;
      row.append(tickerCell);
      const firstPriceCell = document.createElement("td");
      firstPriceCell.textContent = priceData.observations[0].prices[index].toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
      row.append(firstPriceCell);
      const quantityCell = document.createElement("td");
      const quantity = document.createElement("input");
      quantity.type = "number";
      quantity.min = "0.000001";
      quantity.step = "any";
      quantity.value = "1";
      quantity.id = `analyzer-shares-${index}`;
      quantity.setAttribute("aria-label", `Shares held of ${ticker}`);
      quantityCell.append(quantity);
      row.append(quantityCell);
      quantityRows.append(row);
    });
    quantitySection.hidden = false;
    quantitySection.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (error) {
    priceData = null;
    quantitySection.hidden = true;
    showError(error instanceof Error ? error.message : "The CSV could not be read. Check its format and try again.");
  }
}

function formatPercent(value) {
  return Number.isFinite(value) ? `${(value * 100).toFixed(2)}%` : "Not available";
}

function renderChart(series) {
  const svg = document.querySelector("#analyzer-chart");
  const width = 760;
  const height = 260;
  const pad = { left: 55, right: 18, top: 22, bottom: 28 };
  const values = series.flatMap((item) => item.values);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const spread = maximum - minimum || Math.max(1, Math.abs(maximum) * 0.05);
  const minValue = minimum - spread * 0.08;
  const maxValue = maximum + spread * 0.08;
  const x = (index) => pad.left + index * (width - pad.left - pad.right) / Math.max(1, priceData.observations.length - 1);
  const y = (value) => pad.top + (maxValue - value) * (height - pad.top - pad.bottom) / (maxValue - minValue);
  const grid = [];
  for (let index = 0; index < 4; index += 1) {
    const value = maxValue - (maxValue - minValue) * index / 3;
    const position = y(value);
    grid.push(`<line x1="${pad.left}" y1="${position}" x2="${width - pad.right}" y2="${position}" class="gridline"/><text x="${pad.left - 8}" y="${position + 4}" text-anchor="end">${value.toFixed(0)}</text>`);
  }
  const colors = ["#105546", "#3d82a3", "#be7d36", "#9364a5", "#d05d55", "#6b813e", "#417d72", "#7b728d", "#d08d57", "#5c79a9"];
  const lines = series.map((item, index) => {
    const path = item.values.map((value, pointIndex) => `${pointIndex ? "L" : "M"}${x(pointIndex).toFixed(1)},${y(value).toFixed(1)}`).join(" ");
    return `<path d="${path}" class="analyzer-line" style="stroke:${colors[index % colors.length]}${index === 0 ? ";stroke-width:3.7" : ""}"/>`;
  });
  svg.innerHTML = `<title id="analyzer-chart-title">Normalized portfolio and holding performance</title><desc id="analyzer-chart-description">Historical indexed adjusted closing price series. Each line starts at 100.</desc>${grid.join("")}<line x1="${pad.left}" y1="${height - pad.bottom}" x2="${width - pad.right}" y2="${height - pad.bottom}" class="zero-line"/>${lines.join("")}`;
  const legendElement = document.querySelector("#analyzer-legend");
  legendElement.replaceChildren();
  series.forEach((item, index) => {
    const entry = document.createElement("span");
    const key = document.createElement("i");
    key.style.backgroundColor = colors[index % colors.length];
    key.setAttribute("aria-hidden", "true");
    entry.append(key, document.createTextNode(item.name));
    legendElement.append(entry);
  });
}

function analyzePortfolio() {
  errorOutput.hidden = true;
  if (!priceData) {
    showError("Read the price history first, then enter the share quantities.");
    return;
  }
  const quantities = priceData.tickers.map((_, index) => Number(document.querySelector(`#analyzer-shares-${index}`).value));
  if (quantities.some((quantity) => !Number.isFinite(quantity) || quantity <= 0)) {
    showError("Enter a positive share quantity for every holding.");
    return;
  }
  const observations = priceData.observations;
  const tickerCount = priceData.tickers.length;
  const portfolioValues = observations.map((observation) => observation.prices.reduce((sum, price, index) => sum + price * quantities[index], 0));
  const beginningValue = portfolioValues[0];
  const endingValue = portfolioValues.at(-1);
  const elapsedDays = (observations.at(-1).date - observations[0].date) / (24 * 60 * 60 * 1000);
  const totalReturn = endingValue / beginningValue - 1;
  const cagr = elapsedDays > 0 ? (endingValue / beginningValue) ** (365.25 / elapsedDays) - 1 : NaN;
  const periodicReturns = portfolioValues.slice(1).map((value, index) => value / portfolioValues[index] - 1);
  const mean = periodicReturns.reduce((sum, value) => sum + value, 0) / periodicReturns.length;
  const sampleVariance = periodicReturns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(1, periodicReturns.length - 1);
  const volatility = periodicReturns.length > 1 ? Math.sqrt(sampleVariance) * Math.sqrt(252) : NaN;
  let peak = portfolioValues[0];
  let maximumDrawdown = 0;
  portfolioValues.forEach((value) => {
    peak = Math.max(peak, value);
    maximumDrawdown = Math.min(maximumDrawdown, value / peak - 1);
  });

  document.querySelector("#analyzer-total-return").textContent = formatPercent(totalReturn);
  document.querySelector("#analyzer-cagr").textContent = formatPercent(cagr);
  document.querySelector("#analyzer-volatility").textContent = formatPercent(volatility);
  document.querySelector("#analyzer-drawdown").textContent = formatPercent(maximumDrawdown);
  document.querySelector("#analyzer-date-range").textContent = `${observations[0].dateText} to ${observations.at(-1).dateText}`;

  const holdingRows = priceData.tickers.map((ticker, index) => {
    const firstValue = observations[0].prices[index] * quantities[index];
    const lastValue = observations.at(-1).prices[index] * quantities[index];
    const holdingReturn = lastValue / firstValue - 1;
    const startingWeight = firstValue / beginningValue;
    const endingWeight = lastValue / endingValue;
    const contribution = startingWeight * holdingReturn;
    return { ticker, quantity: quantities[index], firstValue, lastValue, holdingReturn, endingWeight, contribution };
  });
  const resultsBody = document.querySelector("#analyzer-results-rows");
  resultsBody.replaceChildren();
  holdingRows.forEach((holding) => {
    const row = document.createElement("tr");
    const values = [holding.ticker, String(holding.quantity), formatPercent(holding.firstValue / beginningValue), formatPercent(holding.endingWeight), formatPercent(holding.holdingReturn), formatPercent(holding.contribution)];
    values.forEach((value, index) => {
      const cell = document.createElement(index === 0 ? "th" : "td");
      if (index === 0) cell.scope = "row";
      cell.textContent = value;
      row.append(cell);
    });
    resultsBody.append(row);
  });

  const chartSeries = [{ name: "Portfolio", values: portfolioValues.map((value) => value / beginningValue * 100) }];
  priceData.tickers.forEach((ticker, index) => chartSeries.push({ name: ticker, values: observations.map((observation) => observation.prices[index] / observations[0].prices[index] * 100) }));
  renderChart(chartSeries);
  document.querySelector("#analyzer-method-note").textContent = `${observations.length.toLocaleString()} price observations across ${tickerCount} holdings. Annualized volatility treats each successive row as one trading session and uses 252 trading sessions per year. Include every trading session in the period for this measure to be useful. A short history can make annualized figures especially sensitive to individual price changes.`;
  resultsSection.hidden = false;
}

document.querySelector("#analyzer-load-sample").addEventListener("click", () => {
  csvInput.value = samplePrices;
  fileInput.value = "";
  errorOutput.hidden = true;
  readPriceData();
});
document.querySelector("#analyzer-read-data").addEventListener("click", readPriceData);
document.querySelector("#analyzer-calculate").addEventListener("click", analyzePortfolio);
fileInput.addEventListener("change", async () => {
  const file = fileInput.files?.[0];
  if (!file) return;
  if (file.size > 5_000_000) {
    showError("Choose a CSV smaller than 5 MB.");
    fileInput.value = "";
    return;
  }
  try {
    csvInput.value = await file.text();
    errorOutput.hidden = true;
    readPriceData();
  } catch {
    showError("The selected file could not be read. Choose a CSV file and try again.");
  }
});
