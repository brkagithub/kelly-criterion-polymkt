"use client";

import { useState } from "react";

type Mode = "regular" | "polymarket";

interface RegularResult {
  kellyPercentage: number;
  fractionalKellyPercentage: number;
  betAmount: number;
  expectedValue: number;
  returnOnWager: number;
  impliedOdds: number;
}

interface PolymarketRow {
  sharePrice: number;
  edge: number;
  kellyPercentage: number;
  betAmount: number;
}

interface PolymarketResult {
  suggestedPrice: number;
  rows: PolymarketRow[];
}

export default function Home() {
  const [mode, setMode] = useState<Mode>("regular");
  const [bankroll, setBankroll] = useState<string>("10000");
  const [fractionalKelly, setFractionalKelly] = useState<number>(0.5);

  // Regular mode
  const [teamA, setTeamA] = useState<string>("Team A");
  const [teamB, setTeamB] = useState<string>("Team B");
  const [odds, setOdds] = useState<string>("1.49");
  const [probability, setProbability] = useState<string>("67.5");

  // Polymarket mode (prices in cents, 1-99)
  const [yesPrice, setYesPrice] = useState<string>("60");
  const [noPrice, setNoPrice] = useState<string>("");
  const [estimatedProbability, setEstimatedProbability] = useState<string>("70");

  const [regularResult, setRegularResult] = useState<RegularResult | null>(null);
  const [polymarketResult, setPolymarketResult] = useState<PolymarketResult | null>(null);

  const calculateRegularKelly = () => {
    const b = parseFloat(bankroll);
    const o = parseFloat(odds);
    const p = parseFloat(probability) / 100;

    if (isNaN(b) || isNaN(o) || isNaN(p) || b <= 0 || o <= 1 || p <= 0 || p >= 1) {
      alert("Please enter valid values");
      return;
    }

    const q = 1 - p;
    const decimalOddsMinusOne = o - 1;

    const kelly = (decimalOddsMinusOne * p - q) / decimalOddsMinusOne;
    const kellyPercent = Math.max(0, kelly * 100);
    const fractionalKellyPercent = kellyPercent * fractionalKelly;
    const betAmt = (fractionalKellyPercent / 100) * b;

    const ev = betAmt * ((decimalOddsMinusOne * p) + (-1 * q));
    const returnOnWager = betAmt > 0 ? (ev / betAmt) * 100 : 0;
    const impliedProb = (1 / o) * 100;

    setRegularResult({
      kellyPercentage: kellyPercent,
      fractionalKellyPercentage: fractionalKellyPercent,
      betAmount: betAmt,
      expectedValue: ev,
      returnOnWager: returnOnWager,
      impliedOdds: impliedProb,
    });
    setPolymarketResult(null);
  };

  const calculatePolymarketKelly = () => {
    const b = parseFloat(bankroll);
    const estProb = parseFloat(estimatedProbability) / 100;

    let sharePrice: number;
    if (yesPrice && yesPrice.trim() !== "") {
      sharePrice = parseFloat(yesPrice) / 100;
    } else if (noPrice && noPrice.trim() !== "") {
      sharePrice = 1 - parseFloat(noPrice) / 100;
    } else {
      alert("Please enter either YES or NO share price");
      return;
    }

    if (isNaN(b) || isNaN(sharePrice) || isNaN(estProb) || b <= 0 || sharePrice <= 0 || sharePrice >= 1 || estProb <= 0 || estProb >= 1) {
      alert("Please enter valid values");
      return;
    }

    const pricePoints: number[] = [];

    // 3 prices below current (better edge)
    for (let i = 3; i >= 1; i--) {
      const lowerPrice = Math.round((sharePrice - i * 0.01) * 100) / 100;
      if (lowerPrice >= 0.01) {
        pricePoints.push(lowerPrice);
      }
    }

    // Current price
    pricePoints.push(sharePrice);

    // Up to 3 prices above current, only if still profitable (price < estProb)
    for (let i = 1; i <= 3; i++) {
      const higherPrice = Math.round((sharePrice + i * 0.01) * 100) / 100;
      if (higherPrice < estProb && higherPrice < 0.99) {
        pricePoints.push(higherPrice);
      }
    }

    const uniquePrices = pricePoints;

    const rows: PolymarketRow[] = uniquePrices.map((price) => {
      const oddsB = (1 - price) / price;
      const q = 1 - estProb;
      const kelly = (oddsB * estProb - q) / oddsB;
      const kellyPercent = Math.max(0, kelly * 100) * fractionalKelly;
      const betAmt = (kellyPercent / 100) * b;
      const edge = (estProb - price) * 100;

      return {
        sharePrice: price,
        edge: edge,
        kellyPercentage: kellyPercent,
        betAmount: betAmt,
      };
    });

    const suggestedPrice = estProb;

    setPolymarketResult({
      suggestedPrice,
      rows,
    });
    setRegularResult(null);
  };

  const handleCalculate = () => {
    if (mode === "regular") {
      calculateRegularKelly();
    } else {
      calculatePolymarketKelly();
    }
  };

  const handleReset = () => {
    setBankroll("10000");
    setFractionalKelly(0.5);
    setTeamA("Team A");
    setTeamB("Team B");
    setOdds("1.49");
    setProbability("67.5");
    setYesPrice("60");
    setNoPrice("");
    setEstimatedProbability("70");
    setRegularResult(null);
    setPolymarketResult(null);
  };

  const handleYesPriceChange = (value: string) => {
    setYesPrice(value);
    if (value && value.trim() !== "") {
      setNoPrice("");
    }
  };

  const handleNoPriceChange = (value: string) => {
    setNoPrice(value);
    if (value && value.trim() !== "") {
      setYesPrice("");
    }
  };

  const getCurrentPolymarketResult = () => {
    if (!polymarketResult) return null;
    const currentPriceDecimal = yesPrice ? parseFloat(yesPrice) / 100 : (1 - parseFloat(noPrice) / 100);
    return polymarketResult.rows.find(r => Math.abs(r.sharePrice - currentPriceDecimal) < 0.01);
  };

  return (
    <div className="min-h-screen bg-white p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Kelly Criterion Calculator</h1>
            <p className="text-gray-600 text-sm">Optimal bet sizing for sports betting and prediction markets</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setMode("regular")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                mode === "regular"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Regular Odds
            </button>
            <button
              onClick={() => setMode("polymarket")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                mode === "polymarket"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Polymarket
            </button>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left: Calculator Form */}
          <div className="bg-purple-700 rounded-xl p-5">
            <div className="space-y-4">
              {/* Bankroll */}
              <div>
                <label className="block text-white font-medium mb-1 text-sm">Betting Account Balance ($)</label>
                <input
                  type="number"
                  value={bankroll}
                  onChange={(e) => setBankroll(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-gray-900 bg-white"
                  placeholder="10000"
                />
              </div>

              {/* Fractional Kelly */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-white font-medium text-sm">Fractional Kelly</label>
                  <input
                    type="number"
                    value={fractionalKelly}
                    onChange={(e) => setFractionalKelly(parseFloat(e.target.value))}
                    className="w-14 px-2 py-1 rounded text-gray-900 bg-white text-center text-sm"
                    step="0.1"
                    min="0.1"
                    max="1"
                  />
                </div>
                <div className="flex items-center justify-between text-white text-xs mb-1">
                  <span>Standard</span>
                  <span>Conservative</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.1"
                  value={1.1 - fractionalKelly}
                  onChange={(e) => setFractionalKelly(Math.round((1.1 - parseFloat(e.target.value)) * 10) / 10)}
                  className="w-full accent-purple-300"
                />
                <div className="flex justify-between text-white text-xs mt-1">
                  <span>1</span><span>0.9</span><span>0.8</span><span>0.7</span><span>0.6</span>
                  <span>0.5</span><span>0.4</span><span>0.3</span><span>0.2</span><span>0.1</span>
                </div>
              </div>

              {mode === "regular" ? (
                <>
                  {/* Teams */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-white font-medium mb-1 text-sm">Team A</label>
                      <input
                        type="text"
                        value={teamA}
                        onChange={(e) => setTeamA(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-gray-900 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-white font-medium mb-1 text-sm">Team B</label>
                      <input
                        type="text"
                        value={teamB}
                        onChange={(e) => setTeamB(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-gray-900 bg-white"
                      />
                    </div>
                  </div>
                  {/* Odds & Probability */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-white font-medium mb-1 text-sm">Sportsbook Odds (Decimal)</label>
                      <input
                        type="number"
                        value={odds}
                        onChange={(e) => setOdds(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-gray-900 bg-white"
                        placeholder="1.49"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-white font-medium mb-1 text-sm">Your Probability (%)</label>
                      <input
                        type="number"
                        value={probability}
                        onChange={(e) => setProbability(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-gray-900 bg-white"
                        placeholder="67.5"
                        step="0.1"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Teams */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-white font-medium mb-1 text-sm">Team A (YES)</label>
                      <input
                        type="text"
                        value={teamA}
                        onChange={(e) => setTeamA(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-gray-900 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-white font-medium mb-1 text-sm">Team B (NO)</label>
                      <input
                        type="text"
                        value={teamB}
                        onChange={(e) => setTeamB(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-gray-900 bg-white"
                      />
                    </div>
                  </div>
                  {/* YES/NO Prices */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-white font-medium mb-1 text-sm">{teamA} Price (¢)</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={yesPrice}
                          onChange={(e) => handleYesPriceChange(e.target.value)}
                          className={`w-full px-3 py-2 rounded-lg text-gray-900 ${noPrice ? 'bg-gray-300' : 'bg-white'}`}
                          placeholder="60"
                          disabled={!!noPrice}
                        />
                        {yesPrice && (
                          <button onClick={() => setYesPrice("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">✕</button>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-white font-medium mb-1 text-sm">{teamB} Price (¢)</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={noPrice}
                          onChange={(e) => handleNoPriceChange(e.target.value)}
                          className={`w-full px-3 py-2 rounded-lg text-gray-900 ${yesPrice ? 'bg-gray-300' : 'bg-white'}`}
                          placeholder="40"
                          disabled={!!yesPrice}
                        />
                        {noPrice && (
                          <button onClick={() => setNoPrice("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">✕</button>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Estimated Probability */}
                  <div>
                    <label className="block text-white font-medium mb-1 text-sm">{teamA} Win Probability (%)</label>
                    <input
                      type="number"
                      value={estimatedProbability}
                      onChange={(e) => setEstimatedProbability(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-gray-900 bg-white"
                      placeholder="70"
                    />
                  </div>
                </>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleReset}
                  className="flex-1 px-4 py-2 bg-white text-purple-700 rounded-full font-medium hover:bg-gray-100 transition-colors"
                >
                  RESET
                </button>
                <button
                  onClick={handleCalculate}
                  className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-full font-medium hover:bg-gray-800 transition-colors"
                >
                  CALCULATE
                </button>
              </div>
            </div>
          </div>

          {/* Right: Results */}
          <div className="space-y-4">
            {/* Big Result Display */}
            {(regularResult || polymarketResult) ? (
              <div className="bg-purple-100 rounded-xl p-6 text-center">
                <p className="text-purple-600 text-sm font-medium mb-1">
                  {mode === "regular" ? "Recommended Bet Size" : "Recommended Bet at Current Price"}
                </p>
                <p className="text-5xl font-bold text-purple-700">
                  {mode === "regular"
                    ? `${regularResult?.fractionalKellyPercentage.toFixed(2)}%`
                    : `${getCurrentPolymarketResult()?.kellyPercentage.toFixed(2) || "0.00"}%`
                  }
                </p>
                <p className="text-purple-600 text-lg mt-1">
                  {mode === "regular"
                    ? `$${regularResult?.betAmount.toFixed(2)} of $${parseFloat(bankroll).toLocaleString()}`
                    : `$${(getCurrentPolymarketResult()?.betAmount || 0).toFixed(2)} of $${parseFloat(bankroll).toLocaleString()}`
                  }
                </p>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl p-6 text-center">
                <p className="text-gray-400 text-lg">Enter values and click Calculate</p>
              </div>
            )}

            {/* Detailed Results - Regular */}
            {regularResult && mode === "regular" && (
              <div className="bg-white border border-gray-200 rounded-xl p-4 text-sm space-y-2">
                <p className="text-gray-700">
                  <span className="font-semibold">Full Kelly:</span> {regularResult.kellyPercentage.toFixed(2)}% →{" "}
                  <span className="font-semibold">Fractional ({fractionalKelly}x):</span> {regularResult.fractionalKellyPercentage.toFixed(2)}%
                </p>
                <p className="text-gray-700">
                  <span className="font-semibold">Expected Value:</span> ${regularResult.expectedValue.toFixed(2)} ({regularResult.returnOnWager.toFixed(2)}% return)
                </p>
                <p className="text-gray-700">
                  <span className="font-semibold">Implied Odds:</span> {regularResult.impliedOdds.toFixed(1)}% |{" "}
                  <span className="font-semibold">Your Edge:</span> {(parseFloat(probability) - regularResult.impliedOdds).toFixed(1)}%
                </p>
              </div>
            )}

            {/* Detailed Results - Polymarket */}
            {polymarketResult && mode === "polymarket" && (
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-gray-700 text-sm mb-3">
                  <span className="font-semibold">{teamA} Win:</span> {estimatedProbability}% |{" "}
                  <span className="font-semibold">Fair Price:</span> {Math.round(polymarketResult.suggestedPrice * 100)}¢
                </p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-purple-100">
                      <th className="px-3 py-2 text-left font-semibold text-purple-900">Price</th>
                      <th className="px-3 py-2 text-left font-semibold text-purple-900">Edge</th>
                      <th className="px-3 py-2 text-left font-semibold text-purple-900">Kelly %</th>
                      <th className="px-3 py-2 text-left font-semibold text-purple-900">Bet</th>
                    </tr>
                  </thead>
                  <tbody>
                    {polymarketResult.rows.map((row, index) => {
                      const currentPriceDecimal = yesPrice ? parseFloat(yesPrice) / 100 : (1 - parseFloat(noPrice) / 100);
                      const isCurrentPrice = Math.abs(row.sharePrice - currentPriceDecimal) < 0.01;
                      const hasEdge = row.edge > 0;

                      return (
                        <tr
                          key={index}
                          className={`${isCurrentPrice ? "bg-purple-50 font-semibold" : ""} ${hasEdge ? "" : "text-gray-400"} border-b border-gray-100`}
                        >
                          <td className="px-3 py-2 text-gray-700 font-medium">
                            {Math.round(row.sharePrice * 100)}¢
                            {isCurrentPrice && <span className="ml-1 text-xs text-purple-600">(now)</span>}
                          </td>
                          <td className={`px-3 py-2 ${row.edge > 0 ? "text-green-600" : "text-red-500"}`}>
                            {row.edge > 0 ? "+" : ""}{row.edge.toFixed(1)}%
                          </td>
                          <td className="px-3 py-2">
                            {row.kellyPercentage > 0 ? `${row.kellyPercentage.toFixed(2)}%` : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {row.betAmount > 0 ? `$${row.betAmount.toFixed(0)}` : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
