# Financial Tools

Free, practical financial calculators and tools, with a growing library of advanced financial models and Excel-based tools.

## Calculators

- **Mortgage payment:** Estimates a monthly payment using a Canadian semi-annual interest-rate conversion. It excludes property tax, insurance, and other costs.
- **Investment growth and savings goal:** Projects an ending value from an initial amount and monthly contributions, compares it with a target, and estimates the monthly contribution needed to reach that target. It converts the estimated annual return to a monthly rate and assumes contributions are made at the end of each month. Returns are uncertain; this is an illustration, not a forecast or recommendation.

Planned next: debt payoff, rent-versus-buy, RRSP-versus-TFSA, and net worth calculators.

## Run on your Mac

1. Open Terminal and move into the `financial-tools` project folder.
2. Run `python3 -m http.server 8000`.
3. Open <http://localhost:8000> in your browser.
4. Press Control+C in Terminal when you want to stop the local website.

This starter uses plain HTML, CSS, and JavaScript, so it does not need Node.js or extra packages.

## Project files

- `index.html` contains the page content and calculator form.
- `styles.css` controls the layout and appearance.
- `app.js` calculates results for both tools.

The project is connected to the [`financial-tools` GitHub repository](https://github.com/22Fedsie/financial-tools).
