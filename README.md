# Financial Tools

Financial Tools is a Canadian-focused collection of free financial calculators, interactive models, and plain-language financial education. The site uses static HTML, CSS, and JavaScript. Calculations run in the visitor's browser and the models use fictional example values rather than live market data.

## Site features

The home page includes mortgage, investment growth and savings goal, debt payoff, rent-versus-buy, RRSP-versus-TFSA, and net worth calculators.

Interactive models are available on separate pages:

- `portfolio-returns.html`: holding-period, annualized, money-weighted, and time-weighted returns, plus a benchmark comparison.
- `portfolio-analyzer.html`: browser-only multi-holding return analysis using a user-supplied CSV of adjusted closing prices.
- `capm-wacc.html`: CAPM cost of equity and weighted average cost of capital.
- `dcf-valuation-basics.html`: a driver-based five-year FCFF forecast, enterprise valuation, and WACC and growth sensitivity.
- `relative-valuation-model.html`: peer-based P/E, EV/EBITDA, and P/S valuation ranges.
- `black-scholes-model.html`: theoretical European call and put option values.
- `savings-goal-planner.html`: a savings target projection.

`money-basics.html` provides Canadian financial literacy guides. `methodology.html` documents model formulas and assumptions. The calculators do not provide personalized financial, investment, or tax advice.

## Privacy

The site does not use Cloudflare Web Analytics, an email signup, or a feedback form. Calculator inputs and results are processed in the browser. Cloudflare Pages may process technical request information to serve and protect the site. See `privacy.html` for details.

## Run locally

The project has no build step or package dependencies.

1. Open Terminal in this project folder.
2. Run `python3 -m http.server 8000`.
3. Open <http://localhost:8000> in a browser.
4. Press Control+C in Terminal to stop the local preview.

## Deploy

The production site is hosted on Cloudflare Pages at <https://financial-tools-c5l.pages.dev/> and is connected to the `22Fedsie/financial-tools` GitHub repository. The production branch is `main`. A push to that branch triggers a Pages deployment. Review the local preview before syncing changes to GitHub.

This is a static site, so Cloudflare Pages does not need a build command. The repository root is the output directory.
