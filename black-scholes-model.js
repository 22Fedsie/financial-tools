const bsError = document.querySelector("#bs-error");
const bsResults = document.querySelector("#bs-results");
const bsRead = (id) => {
  const field = document.getElementById(id);
  return field.value.trim() === "" ? NaN : Number(field.value);
};

function normalCdf(value) {
  // Abramowitz and Stegun 7.1.26 approximation for the standard normal CDF.
  const sign = value < 0 ? -1 : 1;
  const x = Math.abs(value) / Math.sqrt(2);
  const t = 1 / (1 + 0.3275911 * x);
  const erf = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return 0.5 * (1 + sign * erf);
}

function calculateBlackScholes() {
  bsError.hidden = true;
  bsResults.hidden = true;
  const type = document.querySelector("#bs-type").value;
  const spot = bsRead("bs-spot");
  const strike = bsRead("bs-strike");
  const time = bsRead("bs-time");
  const ratePct = bsRead("bs-rate");
  const volatilityPct = bsRead("bs-volatility");
  const dividendPct = bsRead("bs-dividend");
  if (![spot, strike, time, ratePct, volatilityPct, dividendPct].every(Number.isFinite)) {
    bsError.textContent = "Enter a valid number in every field.";
    bsError.hidden = false;
    return;
  }
  if (spot <= 0 || strike <= 0 || time < 0 || volatilityPct < 0 || dividendPct < 0) {
    bsError.textContent = "Underlying and strike prices must be positive. Time, volatility, and dividend yield cannot be negative.";
    bsError.hidden = false;
    return;
  }
  const rate = ratePct / 100;
  const volatility = volatilityPct / 100;
  const dividend = dividendPct / 100;
  let d1 = NaN;
  let d2 = NaN;
  let optionValue;
  if (time === 0) {
    optionValue = type === "call" ? Math.max(spot - strike, 0) : Math.max(strike - spot, 0);
  } else if (volatility === 0) {
    const discountedSpot = spot * Math.exp(-dividend * time);
    const discountedStrike = strike * Math.exp(-rate * time);
    optionValue = type === "call" ? Math.max(discountedSpot - discountedStrike, 0) : Math.max(discountedStrike - discountedSpot, 0);
  } else {
    d1 = (Math.log(spot / strike) + (rate - dividend + 0.5 * volatility ** 2) * time) / (volatility * Math.sqrt(time));
    d2 = d1 - volatility * Math.sqrt(time);
    if (type === "call") optionValue = spot * Math.exp(-dividend * time) * normalCdf(d1) - strike * Math.exp(-rate * time) * normalCdf(d2);
    else optionValue = strike * Math.exp(-rate * time) * normalCdf(-d2) - spot * Math.exp(-dividend * time) * normalCdf(-d1);
  }
  if (!Number.isFinite(optionValue)) {
    bsError.textContent = "These inputs are outside the calculator's numeric range. Review the values and rates.";
    bsError.hidden = false;
    return;
  }
  document.querySelector("#bs-output-title").textContent = `Illustrative ${type} value`;
  document.querySelector("#bs-value").textContent = optionValue.toFixed(4);
  document.querySelector("#bs-d1").textContent = Number.isFinite(d1) ? d1.toFixed(4) : "Not applicable at expiration or zero volatility";
  document.querySelector("#bs-d2").textContent = Number.isFinite(d2) ? d2.toFixed(4) : "Not applicable at expiration or zero volatility";
  bsResults.hidden = false;
}

document.querySelector("#bs-calculate").addEventListener("click", calculateBlackScholes);
calculateBlackScholes();
