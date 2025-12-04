// src/App.jsx
import React, { useMemo, useRef, useState } from "react";

/*
  Final App.jsx - all requested behavior:
  - Inputs start empty
  - Live Indian-style comma formatting while typing for integer fields (Loan, Excess Funds)
  - ROI and Tenure accept decimals (no commas)
  - Pressing Enter/Go on last input triggers Calculate savings
  - Calculate button computes results (net savings used in summary)
  - Summary uses "Money Saver"
  - Opportunity cost = 5.1% p.a. (note shown)
  - Caret moves to end after formatting to keep typing smooth
*/

function formatIndianNumberStringForDisplay(raw) {
  if (raw === "" || raw == null) return "";
  const neg = raw.startsWith("-") ? "-" : "";
  const s = neg ? raw.slice(1) : raw;
  const parts = s.split(".");
  let intPart = parts[0].replace(/^0+(?=\d)/, ""); // remove leading zeros
  if (intPart === "") intPart = "0";
  const dec = parts[1] ?? "";

  if (intPart.length <= 3) {
    return neg + intPart + (dec ? "." + dec : "");
  }
  const last3 = intPart.slice(-3);
  const rest = intPart.slice(0, -3);
  const grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return neg + grouped + "," + last3 + (dec ? "." + dec : "");
}

function unformatDisplayToRaw(display) {
  if (display === "" || display == null) return "";
  return String(display).replace(/[,\s]/g, "");
}

function unformatNumberStringToNumber(s) {
  if (!s || s === "") return NaN;
  const cleaned = String(s).replace(/[,\s]/g, "");
  return cleaned === "" ? NaN : Number(cleaned);
}

/* Controlled NumberInput:
   - props:
     - value (display string)
     - onRawChange(formattedOrRawString) -> store display string in parent
     - placeholder
     - inputMode: "numeric" | "decimal"
     - onEnter() optional
     - name (for debugging)
*/
function NumberInput({ value, onRawChange, placeholder, inputMode = "numeric", onEnter, name }) {
  const ref = useRef(null);

  function handleChange(e) {
    const displayValue = e.target.value;
    // allow only digits, dot, minus while typing (remove commas/spaces automatically)
    let cleaned = displayValue.replace(/[^0-9\.\-]/g, "");

    let raw;
    if (inputMode === "decimal") {
      // allow at most one decimal point
      const parts = cleaned.split(".");
      if (parts.length > 2) {
        cleaned = parts.shift() + "." + parts.join("");
      }
      raw = cleaned; // decimals: keep raw (no comma-formatting)
    } else {
      // numeric mode: remove dots, then format with Indian grouping
      cleaned = cleaned.replace(/\./g, "");
      raw = cleaned;
    }

    // formatted display value: decimals keep raw, numeric get commas while typing
    const formatted = inputMode === "decimal" ? raw : formatIndianNumberStringForDisplay(raw);
    onRawChange(formatted);

    // move caret to end for a stable experience
    setTimeout(() => {
      if (ref.current) {
        const len = ref.current.value.length;
        try {
          ref.current.setSelectionRange(len, len);
        } catch (err) {
          /* ignore if unsupported */
        }
      }
    }, 0);
  }

  function handleFocus(e) {
    // show raw digits (remove commas) on focus to ease editing
    const raw = unformatDisplayToRaw(value);
    onRawChange(raw);
    setTimeout(() => {
      if (ref.current) {
        const len = ref.current.value.length;
        try {
          ref.current.setSelectionRange(len, len);
        } catch (err) {}
      }
    }, 0);
  }

  function handleBlur(e) {
    const raw = unformatDisplayToRaw(e.target.value);
    if (raw === "") {
      onRawChange("");
      return;
    }
    if (inputMode === "decimal") {
      // keep decimals as-is (no commas)
      onRawChange(raw);
    } else {
      // integer fields: format with Indian grouping on blur
      const formatted = formatIndianNumberStringForDisplay(raw);
      onRawChange(formatted);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" || e.key === "Go") {
      if (typeof onEnter === "function") {
        e.preventDefault();
        onEnter();
      }
    }
  }

  return (
    <input
      ref={ref}
      name={name}
      inputMode={inputMode === "decimal" ? "decimal" : "numeric"}
      value={value ?? ""}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className="w-full p-2 border rounded"
      autoComplete="off"
    />
  );
}

/* finance helpers */
function safeNper(pv, emi, r) {
  if (!isFinite(pv) || !isFinite(emi) || !isFinite(r) || emi <= 0) return NaN;
  const denom = 1 - r * pv / emi;
  if (denom <= 0) return NaN;
  return -Math.log(denom) / Math.log(1 + r);
}

function formatIndian(x) {
  if (x === null || x === undefined || x === "" || !isFinite(x)) return "—";
  const parts = Number(x).toFixed(2).split(".");
  let intPart = parts[0];
  const dec = parts[1];
  const sign = intPart.startsWith("-") ? "-" : "";
  if (sign) intPart = intPart.slice(1);
  if (intPart.length <= 3) {
    return sign + intPart + (dec ? "." + dec : "");
  }
  const last3 = intPart.slice(-3);
  let rest = intPart.slice(0, -3);
  const grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return sign + grouped + "," + last3 + (dec ? "." + dec : "");
}

export default function App() {
  // start empty
  const [loanDisplay, setLoanDisplay] = useState("");
  const [rateDisplay, setRateDisplay] = useState("");
  const [tenureDisplay, setTenureDisplay] = useState("");
  const [offsetDisplay, setOffsetDisplay] = useState("");

  const [results, setResults] = useState({
    emi: NaN,
    yearsNew: NaN,
    interestSaved: NaN,
    netSavings: NaN,
    emisSaved: NaN,
    effectiveRate: NaN,
  });

  const SAVINGS_ROI = 5;

  // parsed numeric values
  const loan = useMemo(() => unformatNumberStringToNumber(unformatDisplayToRaw(loanDisplay)), [loanDisplay]);
  const rate = useMemo(() => unformatNumberStringToNumber(unformatDisplayToRaw(rateDisplay)), [rateDisplay]);
  const tenureYears = useMemo(() => unformatNumberStringToNumber(unformatDisplayToRaw(tenureDisplay)), [tenureDisplay]);
  const offset = useMemo(() => unformatNumberStringToNumber(unformatDisplayToRaw(offsetDisplay)), [offsetDisplay]);

  const monthlyRate = useMemo(() => (isFinite(rate) ? rate / 100 / 12 : NaN), [rate]);

  function calculateNow() {
    if (![loan, rate, tenureYears].every(v => isFinite(v) && v > 0)) {
      setResults({
        emi: NaN,
        yearsNew: NaN,
        interestSaved: NaN,
        netSavings: NaN,
        emisSaved: NaN,
        effectiveRate: NaN,
      });
      return;
    }

    const nOrig = Math.round(tenureYears * 12);
    let emi;
    if (monthlyRate === 0) emi = loan / nOrig;
    else emi = (monthlyRate * loan) / (1 - Math.pow(1 + monthlyRate, -nOrig));

    const principalAfter = Math.max(0, loan - (isFinite(offset) ? offset : 0));
    const nOrigReal = safeNper(loan, emi, monthlyRate);
    const nNew = safeNper(principalAfter, emi, monthlyRate);

    const origInterest = emi * nOrigReal - loan;
    const newInterest = emi * nNew - principalAfter;
    const interestSaved = origInterest - newInterest;

    const yearsNew = nNew / 12;
    let oppCost = 0;
    if (isFinite(yearsNew) && yearsNew > 0 && isFinite(offset) && offset > 0) {
      const r = SAVINGS_ROI / 100;
      oppCost = offset * (Math.pow(1 + r, yearsNew) - 1);
    }

    const netSavings = interestSaved - oppCost;
    const emisSaved = Math.trunc(nOrigReal - nNew);
    const effectiveRate = isFinite(yearsNew) && yearsNew > 0
      ? rate - (netSavings / (loan * yearsNew)) * 100
      : NaN;

    setResults({
      emi,
      yearsNew,
      interestSaved,
      netSavings,
      emisSaved,
      effectiveRate,
    });
  }

  const fmt = (v) => (typeof v === "number" && isFinite(v) ? formatIndian(v) : "—");
  const fmtPct = (v) => (typeof v === "number" && isFinite(v) ? `${(+v).toFixed(2)}%` : "—");

  // trigger calculate when Enter/Go is pressed on offset (last) input
  function onOffsetEnter() {
    calculateNow();
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6">EquirusMoneySaver Calculator</h1>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-5 bg-white p-4 rounded-lg shadow">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Loan Value (₹)</label>
              <NumberInput
                name="loan"
                value={loanDisplay}
                onRawChange={setLoanDisplay}
                placeholder="e.g. 1,00,00,000"
                inputMode="numeric"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Loan ROI (annual %)</label>
              <NumberInput
                name="rate"
                value={rateDisplay}
                onRawChange={setRateDisplay}
                placeholder="e.g. 7.5"
                inputMode="decimal"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Loan Tenure (years)</label>
              <NumberInput
                name="tenure"
                value={tenureDisplay}
                onRawChange={setTenureDisplay}
                placeholder="e.g. 20"
                inputMode="decimal"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">
                Average Monthly Balance Maintained / Excess Funds (₹)
              </label>
              <NumberInput
                name="offset"
                value={offsetDisplay}
                onRawChange={setOffsetDisplay}
                placeholder="e.g. 1,00,000"
                inputMode="numeric"
                onEnter={onOffsetEnter}
              />
            </div>

            <div className="flex space-x-2">
              <button onClick={calculateNow} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
                Calculate savings
              </button>
              <button
                onClick={() => {
                  setLoanDisplay("");
                  setRateDisplay("");
                  setTenureDisplay("");
                  setOffsetDisplay("");
                  setResults({ emi: NaN, yearsNew: NaN, interestSaved: NaN, netSavings: NaN, emisSaved: NaN, effectiveRate: NaN });
                }}
                className="px-4 py-2 border rounded"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-7 bg-white p-4 rounded-lg shadow">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 rounded">
              <div className="text-sm text-gray-600">EMI Amount</div>
              <div className="text-xl font-semibold">{fmt(results.emi)}</div>
            </div>

            <div className="p-4 bg-green-50 rounded">
              <div className="text-sm text-gray-600">Loan completed (years)</div>
              <div className="text-xl font-semibold">{fmt(results.yearsNew)}</div>
            </div>

            <div className="p-4 bg-green-50 rounded">
              <div className="text-sm text-gray-600">Net savings (₹)</div>
              <div className="text-xl font-semibold">{fmt(results.netSavings)}</div>
            </div>

            <div className="p-4 bg-green-50 rounded">
              <div className="text-sm text-gray-600">EMIs saved (months)</div>
              <div className="text-xl font-semibold">{isFinite(results.emisSaved) ? results.emisSaved : "—"}</div>
            </div>

            <div className="p-4 bg-green-50 rounded col-span-2">
              <div className="text-sm text-gray-600">Effective interest rate</div>
              <div className="text-xl font-semibold">{fmtPct(results.effectiveRate)}</div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-purple-50 rounded">
            <div className="text-lg text-purple-700">
              {isFinite(results.yearsNew) && isFinite(results.netSavings)
                ? `With Money Saver, your loan will get completed in ${(+results.yearsNew).toFixed(2)} yrs saving ₹ ${formatIndian(results.netSavings)} in interest`
                : 'Click "Calculate savings" to see how much you can save.'}
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-600">
            This calculator assumes an opportunity cost of <strong>5% p.a.</strong> — an approximate average post-tax fixed-deposit return — which is used to compute the net savings shown above.
          </div>
        </div>
      </div>
    </div>
  );
}
