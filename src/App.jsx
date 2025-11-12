import React, { useMemo, useState } from "react";

export default function App() {
  const [loan, setLoan] = useState(10000000);
  const [rate, setRate] = useState(7.5);
  const [tenureYears, setTenureYears] = useState(20);
  const [offset, setOffset] = useState(100000);

  const SAVINGS_ROI = 5.00975528;
  const monthlyRate = useMemo(() => rate / 100 / 12, [rate]);

  const allValuesEntered = [loan, rate, tenureYears, offset].every(v => v !== "");

  function safeNper(pv, emi, r) {
    if (emi <= 0) return NaN;
    const denom = 1 - r * pv / emi;
    if (denom <= 0) return NaN;
    return -Math.log(denom) / Math.log(1 + r);
  }

  const emi = useMemo(() => {
    if (!allValuesEntered) return NaN;
    const n = Math.round(tenureYears * 12);
    if (monthlyRate === 0) return loan / n;
    return (monthlyRate * loan) / (1 - Math.pow(1 + monthlyRate, -n));
  }, [loan, monthlyRate, tenureYears, allValuesEntered]);

  const nOrig = useMemo(() => (allValuesEntered ? safeNper(loan, emi, monthlyRate) : NaN), [loan, emi, monthlyRate, allValuesEntered]);
  const principalAfter = Math.max(0, loan - offset);
  const nNew = useMemo(() => (allValuesEntered ? safeNper(principalAfter, emi, monthlyRate) : NaN), [principalAfter, emi, monthlyRate, allValuesEntered]);

  const origInterest = useMemo(() => (allValuesEntered ? emi * nOrig - loan : NaN), [emi, nOrig, loan, allValuesEntered]);
  const newInterest = useMemo(() => (allValuesEntered ? emi * nNew - principalAfter : NaN), [emi, nNew, principalAfter, allValuesEntered]);
  const interestSaved = useMemo(() => (allValuesEntered ? origInterest - newInterest : NaN), [origInterest, newInterest, allValuesEntered]);

  const yearsNew = nNew / 12;
  const oppCost = useMemo(() => {
    if (!allValuesEntered) return NaN;
    const r = SAVINGS_ROI / 100;
    if (!isFinite(yearsNew) || yearsNew <= 0) return 0;
    return offset * (Math.pow(1 + r, yearsNew) - 1);
  }, [offset, yearsNew, allValuesEntered]);

  const netSavings = interestSaved - oppCost;
  const emisSaved = Math.trunc(nOrig - nNew);
  const effectiveRate = rate - (netSavings / (loan * yearsNew)) * 100;

  const fmt = (v) => (typeof v === "number" && isFinite(v) ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—");
  const fmtPct = (v) => (typeof v === "number" && isFinite(v) ? `${(+v).toFixed(2)}%` : "—");

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6">EquirusHomeSaver Calculator</h1>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-5 bg-white p-4 rounded-lg shadow">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Loan Value (₹)</label>
              <input type="number" value={loan} onChange={(e)=>setLoan(e.target.value === "" ? "" : Number(e.target.value))} className="w-full p-2 border rounded" />
            </div>

            <div>
              <label className="block text-sm font-medium">Loan ROI (annual %)</label>
              <input type="number" value={rate} onChange={(e)=>setRate(e.target.value === "" ? "" : Number(e.target.value))} className="w-full p-2 border rounded" />
            </div>

            <div>
              <label className="block text-sm font-medium">Loan Tenure (years)</label>
              <input type="number" value={tenureYears} onChange={(e)=>setTenureYears(e.target.value === "" ? "" : Number(e.target.value))} className="w-full p-2 border rounded" />
            </div>

            <div>
              <label className="block text-sm font-medium">Offset / Prepayment (₹)</label>
              <input type="number" value={offset} onChange={(e)=>setOffset(e.target.value === "" ? "" : Number(e.target.value))} className="w-full p-2 border rounded" />
            </div>

            <button onClick={()=>{setLoan(10000000);setRate(7.5);setTenureYears(20);setOffset(100000);}} className="px-3 py-2 border rounded w-full">Reset</button>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-7 bg-white p-4 rounded-lg shadow">
          {allValuesEntered ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 rounded">
                <div className="text-sm text-gray-600">EMI Amount</div>
                <div className="text-xl font-semibold">{fmt(emi)}</div>
              </div>
              <div className="p-4 bg-green-50 rounded">
                <div className="text-sm text-gray-600">Loan completed (years)</div>
                <div className="text-xl font-semibold">{fmt(yearsNew)}</div>
              </div>
              <div className="p-4 bg-green-50 rounded">
                <div className="text-sm text-gray-600">Interest saved (₹)</div>
                <div className="text-xl font-semibold">{fmt(interestSaved)}</div>
              </div>
              <div className="p-4 bg-green-50 rounded">
                <div className="text-sm text-gray-600">Net savings (₹)</div>
                <div className="text-xl font-semibold">{fmt(netSavings)}</div>
              </div>
              <div className="p-4 bg-green-50 rounded">
                <div className="text-sm text-gray-600">EMIs saved (months)</div>
                <div className="text-xl font-semibold">{emisSaved}</div>
              </div>
              <div className="p-4 bg-green-50 rounded">
                <div className="text-sm text-gray-600">Effective interest rate</div>
                <div className="text-xl font-semibold">{fmtPct(effectiveRate)}</div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-gray-500 text-center">Please enter all input values to see results.</div>
          )}
        </div>
      </div>

      <p className="mt-4 text-sm text-gray-500">
        Offset is applied immediately at t=0 with fixed EMI. Internal opportunity cost (annual-compound 5.0098%) applied silently.
      </p>
    </div>
  );
}
