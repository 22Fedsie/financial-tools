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
const requiredContribution = document.querySelector("#required-contribution");
const goalStatus = document.querySelector("#goal-status");

investmentForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const startingAmount = Number(investmentForm.elements.startingAmount.value);
  const monthlyContribution = Number(investmentForm.elements.monthlyContribution.value);
  const savingsGoal = Number(investmentForm.elements.savingsGoal.value);
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
  const contributionFactor = monthlyRate === 0
    ? months
    : (growthFactor - 1) / monthlyRate;
  const monthlyNeededRaw = Math.max(0, (savingsGoal - futureStartingAmount) / contributionFactor);
  const monthlyNeeded = Math.ceil(monthlyNeededRaw * 100) / 100;
  const difference = projectedValue - savingsGoal;

  endingValue.textContent = formatMoney(projectedValue);
  totalContributions.textContent = formatMoney(contributed);
  investmentGrowth.textContent = formatMoney(projectedValue - contributed);
  requiredContribution.textContent = formatMoney(monthlyNeeded);
  if (difference >= 0) {
    goalStatus.textContent = `At this pace, the projection is ${formatMoney(difference)} above your goal.`;
  } else {
    goalStatus.textContent = `At this pace, the projection is ${formatMoney(Math.abs(difference))} below your goal. Increase your monthly contribution by about ${formatMoney(Math.max(0, monthlyNeeded - monthlyContribution))} to reach it.`;
  }
  investmentResult.hidden = false;
});

investmentForm.requestSubmit();

const debtForm = document.querySelector("#debt-form");
const debtResult = document.querySelector("#debt-result");
const debtAlert = document.querySelector("#debt-alert");
const debtMonths = document.querySelector("#debt-months");
const debtInterest = document.querySelector("#debt-interest");
const debtTotal = document.querySelector("#debt-total");

function roundCents(amount) {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

debtForm.addEventListener("submit", (event) => {
  event.preventDefault();

  let balance = roundCents(Number(debtForm.elements.balance.value));
  const monthlyRate = Number(debtForm.elements.annualRate.value) / 100 / 12;
  const monthlyPayment = roundCents(Number(debtForm.elements.monthlyPayment.value));
  const firstMonthInterest = roundCents(balance * monthlyRate);

  debtResult.hidden = true;
  debtAlert.hidden = true;

  if (monthlyPayment <= firstMonthInterest) {
    debtAlert.textContent = `The payment must be more than the estimated first month's interest (${formatMoney(firstMonthInterest)}) for the balance to go down.`;
    debtAlert.hidden = false;
    return;
  }

  let months = 0;
  let interestPaid = 0;
  let totalPaid = 0;
  const maximumMonths = 1200;

  while (balance > 0 && months < maximumMonths) {
    const interest = roundCents(balance * monthlyRate);
    const amountDue = roundCents(balance + interest);
    const paymentThisMonth = Math.min(monthlyPayment, amountDue);
    balance = roundCents(amountDue - paymentThisMonth);
    interestPaid = roundCents(interestPaid + interest);
    totalPaid = roundCents(totalPaid + paymentThisMonth);
    months += 1;
  }

  if (balance > 0) {
    debtAlert.textContent = "This payment would take more than 100 years to pay off the balance. Try a larger monthly payment.";
    debtAlert.hidden = false;
    return;
  }

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  const duration = years === 0
    ? `${remainingMonths} ${remainingMonths === 1 ? "month" : "months"}`
    : remainingMonths === 0
      ? `${years} ${years === 1 ? "year" : "years"}`
      : `${years} ${years === 1 ? "year" : "years"}, ${remainingMonths} ${remainingMonths === 1 ? "month" : "months"}`;

  debtMonths.textContent = duration;
  debtInterest.textContent = formatMoney(interestPaid);
  debtTotal.textContent = formatMoney(totalPaid);
  debtResult.hidden = false;
});

debtForm.requestSubmit();

const rentBuyForm = document.querySelector("#rent-buy-form");
const rentBuyResult = document.querySelector("#rent-buy-result");
const rentBuyAlert = document.querySelector("#rent-buy-alert");
const mortgagePaymentFormat = (principal, annualRate, years) => {
  if (principal <= 0) return 0;
  const monthlyRate = annualRate === 0 ? 0 : (1 + annualRate / 2) ** (2 / 12) - 1;
  const months = years * 12;
  return monthlyRate === 0
    ? principal / months
    : principal * monthlyRate / (1 - (1 + monthlyRate) ** -months);
};

rentBuyForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const homePrice = Number(rentBuyForm.elements.homePrice.value);
  const downPayment = Number(rentBuyForm.elements.downPayment.value);
  const closingCosts = Number(rentBuyForm.elements.closingCosts.value);
  const mortgageRate = Number(rentBuyForm.elements.mortgageRate.value) / 100;
  const amortizationYears = Number(rentBuyForm.elements.amortizationYears.value);
  const monthlyRent = Number(rentBuyForm.elements.monthlyRent.value);
  const ownerCosts = Number(rentBuyForm.elements.ownerCosts.value);
  const yearsInHome = Number(rentBuyForm.elements.yearsInHome.value);
  const appreciationRate = Number(rentBuyForm.elements.homeAppreciation.value) / 100;
  const rentIncrease = Number(rentBuyForm.elements.rentIncrease.value) / 100;
  const alternativeReturn = Number(rentBuyForm.elements.alternativeReturn.value) / 100;
  const sellingCostsRate = Number(rentBuyForm.elements.sellingCosts.value) / 100;

  rentBuyResult.hidden = true;
  rentBuyAlert.hidden = true;

  if (downPayment > homePrice) {
    rentBuyAlert.textContent = "The down payment cannot be higher than the home purchase price.";
    rentBuyAlert.hidden = false;
    return;
  }

  const mortgageAmount = homePrice - downPayment;
  const mortgageMonthlyRate = mortgageRate === 0 ? 0 : (1 + mortgageRate / 2) ** (2 / 12) - 1;
  const mortgagePayment = mortgagePaymentFormat(mortgageAmount, mortgageRate, amortizationYears);
  const months = yearsInHome * 12;
  const investmentMonthlyRate = (1 + alternativeReturn) ** (1 / 12) - 1;
  let mortgageBalance = mortgageAmount;
  let rentPortfolio = downPayment + closingCosts;
  let ownerSavings = 0;

  for (let month = 0; month < months; month += 1) {
    const interest = mortgageBalance > 0 ? mortgageBalance * mortgageMonthlyRate : 0;
    const amountDue = mortgageBalance + interest;
    const actualMortgagePayment = mortgageBalance > 0 ? Math.min(mortgagePayment, amountDue) : 0;
    mortgageBalance = Math.max(0, amountDue - actualMortgagePayment);

    const rentThisMonth = monthlyRent * (1 + rentIncrease) ** Math.floor(month / 12);
    const ownerHousingCost = actualMortgagePayment + ownerCosts;
    rentPortfolio = rentPortfolio * (1 + investmentMonthlyRate) + Math.max(0, ownerHousingCost - rentThisMonth);
    ownerSavings = ownerSavings * (1 + investmentMonthlyRate) + Math.max(0, rentThisMonth - ownerHousingCost);
  }

  const futureHomeValue = homePrice * (1 + appreciationRate) ** yearsInHome;
  const ownerHomeEquity = futureHomeValue * (1 - sellingCostsRate) - mortgageBalance;
  const ownerAssets = ownerHomeEquity + ownerSavings;
  const difference = ownerAssets - rentPortfolio;
  const ownerMonthlyTotal = mortgagePayment + ownerCosts;

  document.querySelector("#owner-monthly-total").textContent = formatMoney(ownerMonthlyTotal);
  document.querySelector("#renter-monthly-total").textContent = formatMoney(monthlyRent);
  document.querySelector("#horizon-years").textContent = String(yearsInHome);
  document.querySelector("#owner-assets").textContent = formatMoney(ownerAssets);
  document.querySelector("#renter-assets").textContent = formatMoney(rentPortfolio);
  document.querySelector("#rent-buy-comparison").textContent = difference >= 0
    ? `In this estimate, owning ends ${formatMoney(difference)} ahead.`
    : `In this estimate, renting ends ${formatMoney(Math.abs(difference))} ahead.`;
  rentBuyResult.hidden = false;
});

rentBuyForm.requestSubmit();
