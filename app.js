const form = document.querySelector("#mortgage-form");
const result = document.querySelector("#result");
const paymentOutput = document.querySelector("#payment");

const currency = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 2,
});

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
