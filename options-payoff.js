(() => {
  const form = document.getElementById('payoff-form');
  if (!form) return;

  const positionInput = document.getElementById('payoff-position');
  const strikeInput = document.getElementById('payoff-strike');
  const premiumInput = document.getElementById('payoff-premium');
  const multiplierInput = document.getElementById('payoff-multiplier');
  const lowInput = document.getElementById('payoff-low');
  const highInput = document.getElementById('payoff-high');
  const error = document.getElementById('payoff-error');
  const chart = document.getElementById('payoff-chart');
  const rows = document.getElementById('payoff-rows');
  const ns = 'http://www.w3.org/2000/svg';
  const money = value => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 2 }).format(value);

  function svg(tag, attributes) {
    const node = document.createElementNS(ns, tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
    return node;
  }

  function render() {
    const strike = Number(strikeInput.value);
    const premium = Number(premiumInput.value);
    const multiplier = Number(multiplierInput.value);
    const low = Number(lowInput.value);
    const high = Number(highInput.value);
    const [direction, kind] = positionInput.value.split('-');
    if (![strike, premium, multiplier, low, high].every(Number.isFinite) || strike <= 0 || premium < 0 || multiplier <= 0 || low < 0 || high <= low) {
      error.textContent = 'Enter valid values. The high underlying price must be greater than the low price.';
      error.hidden = false;
      return;
    }
    error.hidden = true;

    const sign = direction === 'long' ? 1 : -1;
    const intrinsic = price => kind === 'call' ? Math.max(price - strike, 0) : Math.max(strike - price, 0);
    const profit = price => sign * (intrinsic(price) - premium) * multiplier;
    const breakeven = kind === 'call' ? strike + premium : strike - premium;
    const maxGain = direction === 'long'
      ? (kind === 'call' ? 'Unlimited' : money(Math.max(0, strike - premium) * multiplier))
      : money(premium * multiplier);
    const maxLoss = direction === 'long'
      ? money(premium * multiplier)
      : (kind === 'call' ? 'Unlimited' : money(Math.max(0, strike - premium) * multiplier));
    document.getElementById('payoff-breakeven').textContent = kind === 'put' && breakeven < 0 ? 'Below zero' : money(breakeven);
    document.getElementById('payoff-max-gain').textContent = maxGain;
    document.getElementById('payoff-max-loss').textContent = maxLoss;
    document.getElementById('payoff-chart-title').textContent = `${positionInput.options[positionInput.selectedIndex].text} profit and loss at expiration`;
    document.getElementById('payoff-chart-desc').textContent = `Profit or loss per contract from underlying price ${money(low)} to ${money(high)} at expiration. Break-even is ${money(breakeven)}.`;

    const points = Array.from({ length: 81 }, (_, index) => {
      const price = low + (high - low) * index / 80;
      return { price, value: profit(price) };
    });
    const minValue = Math.min(0, ...points.map(point => point.value));
    const maxValue = Math.max(0, ...points.map(point => point.value));
    const yRange = Math.max(maxValue - minValue, 1);
    const pad = { left: 78, right: 18, top: 18, bottom: 48 };
    const width = 680 - pad.left - pad.right;
    const height = 320 - pad.top - pad.bottom;
    const x = price => pad.left + (price - low) / (high - low) * width;
    const y = value => pad.top + (maxValue - value) / yRange * height;
    chart.replaceChildren();

    for (let tick = 0; tick <= 4; tick += 1) {
      const value = minValue + yRange * tick / 4;
      const yy = y(value);
      chart.append(svg('line', { x1: pad.left, y1: yy, x2: pad.left + width, y2: yy, class: Math.abs(value) < yRange / 1000 ? 'zero-line' : 'gridline' }));
      const label = svg('text', { x: pad.left - 9, y: yy + 4, 'text-anchor': 'end' });
      label.textContent = money(value);
      chart.append(label);
    }
    for (let tick = 0; tick <= 4; tick += 1) {
      const price = low + (high - low) * tick / 4;
      const xx = x(price);
      chart.append(svg('line', { x1: xx, y1: pad.top, x2: xx, y2: pad.top + height, class: 'gridline' }));
      const label = svg('text', { x: xx, y: pad.top + height + 21, 'text-anchor': 'middle' });
      label.textContent = money(price);
      chart.append(label);
    }
    if (breakeven >= low && breakeven <= high) {
      const zeroX = x(breakeven);
      chart.append(svg('line', { x1: zeroX, y1: pad.top, x2: zeroX, y2: pad.top + height, stroke: '#b8994e', 'stroke-dasharray': '5 5', 'stroke-width': '1.5' }));
    }
    const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${x(point.price).toFixed(2)},${y(point.value).toFixed(2)}`).join(' ');
    chart.append(svg('path', { d: path, class: 'payoff-line' }));
    const xLabel = svg('text', { x: pad.left + width / 2, y: 313, 'text-anchor': 'middle' });
    xLabel.textContent = 'Underlying price at expiration';
    chart.append(xLabel);
    const yLabel = svg('text', { x: 15, y: pad.top + height / 2, transform: `rotate(-90 15 ${pad.top + height / 2})`, 'text-anchor': 'middle' });
    yLabel.textContent = 'Profit or loss';
    chart.append(yLabel);

    rows.replaceChildren();
    for (let index = 0; index <= 10; index += 1) {
      const price = low + (high - low) * index / 10;
      const tr = document.createElement('tr');
      const priceCell = document.createElement('th');
      priceCell.scope = 'row';
      priceCell.textContent = money(price);
      const valueCell = document.createElement('td');
      valueCell.textContent = money(profit(price));
      tr.append(priceCell, valueCell);
      rows.append(tr);
    }
  }

  form.addEventListener('input', render);
  form.addEventListener('change', render);
  render();
})();
