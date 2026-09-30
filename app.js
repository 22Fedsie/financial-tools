const form = document.querySelector("#mortgage-form");
const result = document.querySelector("#result");
const paymentOutput = document.querySelector("#payment");

const currency = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 2,
});

function formatMoney(amount) {
  return currency.format(amount);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const principal = Number(form.elements.principal.value);
  const annualRate = Number(form.elements.rate.value) / 100;
  const years = Number(form.elements.years.value);
  const months = years * 12;

  // Canadian fixed mortgage rates are commonly quoted with semi-annual compounding.
  const monthlyRate = annualRate === 0
    ? 0
    : (1 + annualRate / 2) ** (2 / 12) - 1;
  const payment = monthlyRate === 0
    ? principal / months
    : principal * monthlyRate / (1 - (1 + monthlyRate) ** -months);

  paymentOutput.textContent = currency.format(payment);
  result.hidden = false;
});

form.requestSubmit();

const investmentForm = document.querySelector("#investment-form");
const investmentResult = document.querySelector("#investment-result");
const endingValue = document.querySelector("#ending-value");
const totalContributions = document.querySelector("#total-contributions");
const investmentGrowth = document.querySelector("#investment-growth");

investmentForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const startingAmount = Number(investmentForm.elements.startingAmount.value);
  const monthlyContribution = Number(investmentForm.elements.monthlyContribution.value);
  const annualReturn = Number(investmentForm.elements.annualReturn.value) / 100;
  const years = Number(investmentForm.elements.years.value);
  const months = years * 12;

  // Convert the estimated effective annual return to a monthly rate.
  const monthlyRate = (1 + annualReturn) ** (1 / 12) - 1;
  const growthFactor = (1 + monthlyRate) ** months;
  const futureStartingAmount = startingAmount * growthFactor;
  const futureContributions = monthlyRate === 0
    ? monthlyContribution * months
    : monthlyContribution * (growthFactor - 1) / monthlyRate;
  const projectedValue = futureStartingAmount + futureContributions;
  const contributed = startingAmount + monthlyContribution * months;

  endingValue.textContent = formatMoney(projectedValue);
  totalContributions.textContent = formatMoney(contributed);
  investmentGrowth.textContent = formatMoney(projectedValue - contributed);
  investmentResult.hidden = false;
});

investmentForm.requestSubmit();
