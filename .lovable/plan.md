

# Tax Comparison Calculator: UK vs Spain (Normal, Beckham & Autónomo)

## Overview
A single-page finance dashboard that compares net take-home pay across **four** tax regimes — UK Employed, Spain Normal (Employed), Spain Beckham Law, and Spain Autónomo (Freelancer) — with full transparency on assumptions and step-by-step breakdowns.

---

## Page Layout

**Two-panel responsive layout** (stacked on mobile):
- **Left panel**: All inputs (salary, freelance income, property income, toggles, settings)
- **Right panel**: Results cards, comparison table, and expandable breakdowns

**Three tabs/sections** across the top:
1. **Inputs & Results** — the main working view
2. **Detailed Comparison Table** — side-by-side line-by-line breakdown
3. **Assumptions & Methodology** — per-regime accordions with all assumptions, tax year selectors, and editable parameters

---

## Features

### 1. Input Panel
- Base currency selector (GBP/EUR), exchange rate input
- **Employment income**: Gross salary with currency selector (used for UK, Spain Normal, Spain Beckham)
- **Freelance income** (separate field): Gross annual invoicing/revenue with currency selector (used for Spain Autónomo)
- Configurable flat expense deduction rate for autónomo (default ~7%, editable slider/input) to derive net taxable profit
- Country toggles (UK NI on/off, Spain Normal, Beckham, Autónomo — all shown by default)
- Optional foreign property income section with amount, currency, property country dropdown, and treatment toggles
- Residency assumption toggles per country
- "Reset to defaults" button
- Pre-filled with example values (€126,500 salary, €126,500 freelance revenue, rate 1.15, property income off)

### 2. Results Summary Cards
- **Four cards** (UK, Spain Normal, Spain Beckham, Spain Autónomo) showing:
  - Net annual & monthly
  - Total tax, social contributions
  - Effective tax rate & take-home percentage
- Autónomo card additionally highlights: cuota de autónomo (monthly/annual), deducted expenses, and net taxable profit
- Each card has an expandable "How is this calculated?" section showing step-by-step breakdowns

### 3. Side-by-Side Comparison Table
- Line-by-line: gross income, expense deductions (autónomo only), taxable income, each tax component, social contributions, foreign income treatment, net annual/monthly
- Dual-currency columns (original + base currency)
- Clear indicators for what applies to each regime

### 4. Assumptions & Methodology Panel
- Tax year selectors (UK and Spain)
- List of all applied allowances with values and phase-out rules
- **Autónomo-specific assumptions**: expense deduction rate, cuota tramo applied, no employer contributions
- Explicit treatment of foreign property income per regime
- Exchange rate source note with timestamp
- Per-regime accordion with detailed methodology
- Disclaimer at the bottom

### 5. Tax Calculation Engine (Data-Driven)
- JSON configuration files per tax year for each regime:
  - **UK**: Income tax bands, personal allowance (with £100k taper), employee NI rates/thresholds
  - **Spain Normal**: IRPF progressive bands, employee social security caps, general deductions
  - **Spain Beckham**: Flat rate on employment income, foreign income treatment rules
  - **Spain Autónomo**: Same IRPF bands applied to net profit (gross minus flat expense %), 2025 progressive cuota de autónomo table (income-based tramos), no employer SS contribution
- Modular calculator functions that read from config, making yearly updates simple
- Intermediate calculation steps stored and displayed in breakdowns

### 6. Warnings & Edge Cases
- Gentle inline warnings when inputs create ambiguity (e.g., Beckham + foreign income, autónomo with very low income hitting minimum cuota)
- Currency conversion shown transparently whenever income currency differs from base
- If freelance income field is empty, autónomo card shows a prompt to enter it rather than calculating from salary
- Clear labeling of what's included/excluded in each regime

### 7. Design & Polish
- Finance dashboard aesthetic with clean cards, subtle borders, muted backgrounds
- Responsive: two-column on desktop, stacked on mobile
- Readable typography, no clutter — expandable sections keep detail available but hidden by default
- Four result cards arranged in a 2×2 grid on desktop

---

## Default Example State
- Salary: €126,500 | Freelance revenue: €126,500
- Expense deduction rate: 7%
- Exchange rate: 1 GBP = 1.15 EUR
- Base currency: EUR
- Spain resident: on, UK resident: on
- Foreign property income: off (toggle to add €12,000 net from Portugal)
- All four scenarios shown simultaneously

