# Why I built FinRelief AI

When someone falls behind on loan payments, the hard part usually isn't the math — it's not knowing what to do next. Do you call the bank? What do you actually offer to settle? How do you write to a lender without sounding like you're either begging or picking a fight?

That gap between "I'm behind on this loan" and "I have a plan" is what I wanted this project to close.

## What it does

1. **Track your loans.** Log what you owe, your income, your EMIs. The app works out your debt-to-income ratio, monthly surplus, and a stress score — one number instead of a spreadsheet full of them.
2. **Suggest a settlement number.** Based on how overdue a loan is and how stretched your finances are, it recommends a one-time settlement percentage instead of leaving you to guess.
3. **Draft the letter.** Gemini writes a negotiation letter tailored to the specific loan and lender, so you're not starting from a blank page when you're already stressed.

## Why it's useful

- One score to look at instead of five numbers to interpret yourself
- A concrete figure to negotiate from, instead of picking one out of thin air
- A letter that reads as professional, even on a day you don't feel like writing one
- Your data stays on your own machine (or wherever you deploy it) — this isn't a hosted service pulling in your financial details

## A quick walkthrough

**1. Log in**

Financial data is sensitive, so it starts behind a login.

![Secure Login Screen](docs/screenshots/login-screen.png)

**2. Dashboard**

Your DTI ratio, monthly surplus, and stress score at a glance, plus a trend chart as things (hopefully) improve.

![Financial Dashboard](docs/screenshots/dashboard.png)

**3. Your loans**

Add each loan with lender, amount, EMI, and days overdue.

![Active Loans List](docs/screenshots/loans.png)

**4. Settlement analyzer**

Pick a loan and play with the income/EMI sliders to see how the recommended settlement percentage shifts.

![One Time Settlement Analysis](docs/screenshots/settlement.png)

**5. The letter**

One click drafts a formal one-time settlement request. Review it, tweak it, send it.

![AI-Generated Settlement Letter](docs/screenshots/Letters.png)

---

For setup and API details, see [README.md](README.md).
