"use client";

import { useState } from "react";

type Mode = "regular" | "polymarket" | "comparison";

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
  expectedGrowth: number;
}

interface PolymarketPanelResult {
  teamName: string;
  currentPrice: number;
  probability: number;
  suggestedPrice: number;
  rows: PolymarketRow[];
}

export default function Home() {
  const [mode, setMode] = useState<Mode>("polymarket");
  const [bankroll, setBankroll] = useState<string>("10000");
  const [fractionalKelly, setFractionalKelly] = useState<number>(0.5);

  // Shared
  const [teamA, setTeamA] = useState<string>("Team A");
  const [teamB, setTeamB] = useState<string>("Team B");

  // Regular mode
  const [odds, setOdds] = useState<string>("1.49");
  const [probability, setProbability] = useState<string>("67.5");

  // Polymarket mode
  const [teamAPrice, setTeamAPrice] = useState<string>("60");
  const [teamBPrice, setTeamBPrice] = useState<string>("40");
  const [estimatedProbability, setEstimatedProbability] = useState<string>("70");
  const [feesEnabled, setFeesEnabled] = useState<boolean>(true);

  // Comparison mode (two independent bets)
  const [bet1Label, setBet1Label] = useState<string>("Bet 1");
  const [bet1Price, setBet1Price] = useState<string>("60");
  const [bet1Prob, setBet1Prob] = useState<string>("70");
  const [bet1Fees, setBet1Fees] = useState<boolean>(true);

  const [bet2Label, setBet2Label] = useState<string>("Bet 2");
  const [bet2Price, setBet2Price] = useState<string>("45");
  const [bet2Prob, setBet2Prob] = useState<string>("55");
  const [bet2Fees, setBet2Fees] = useState<boolean>(true);

  interface ComparisonBetResult {
    label: string;
    sharePrice: number;
    probability: number;
    feesEnabled: boolean;
    effectiveCost: number;
    feePerShare: number;
    edge: number;
    fullKelly: number;
    fractionalKellyPct: number;
    betAmount: number;
    shares: number;
    expectedGrowth: number; // log-growth
    expectedGrowthPct: number; // (e^G - 1) * 100
  }

  const [comparisonResults, setComparisonResults] = useState<{
    a: ComparisonBetResult;
    b: ComparisonBetResult;
  } | null>(null);

  // Results
  const [regularResult, setRegularResult] = useState<RegularResult | null>(null);
  const [polymarketResults, setPolymarketResults] = useState<{
    a: PolymarketPanelResult;
    b: PolymarketPanelResult;
  } | null>(null);

  const handleTeamAPriceChange = (value: string) => {
    setTeamAPrice(value);
    const num = parseFloat(value);
    if (!isNaN(num) && num > 0 && num < 100) {
      setTeamBPrice(String(100 - num));
    }
  };

  const handleTeamBPriceChange = (value: string) => {
    setTeamBPrice(value);
    const num = parseFloat(value);
    if (!isNaN(num) && num > 0 && num < 100) {
      setTeamAPrice(String(100 - num));
    }
  };

  const generateKellyRows = (
    sharePrice: number,
    estProb: number,
    bankrollAmt: number,
    fk: number,
    includeFees: boolean
  ): PolymarketRow[] => {
    const pricePoints: number[] = [];

    for (let i = 3; i >= 1; i--) {
      const lowerPrice = Math.round((sharePrice - i * 0.01) * 100) / 100;
      if (lowerPrice >= 0.01) pricePoints.push(lowerPrice);
    }

    pricePoints.push(sharePrice);

    for (let i = 1; i <= 3; i++) {
      const higherPrice = Math.round((sharePrice + i * 0.01) * 100) / 100;
      if (higherPrice < estProb && higherPrice < 0.99) {
        pricePoints.push(higherPrice);
      }
    }

    return pricePoints.map((price) => {
      const feePerShare = includeFees ? 0.03 * price * (1 - price) : 0;
      const effectiveCost = price + feePerShare;
      const oddsB = (1 - effectiveCost) / effectiveCost;
      const q = 1 - estProb;
      const kelly = (oddsB * estProb - q) / oddsB;
      const kellyPercent = Math.max(0, kelly * 100) * fk;
      const betAmt = (kellyPercent / 100) * bankrollAmt;
      const edge = (estProb - effectiveCost) * 100;

      // Expected log-growth rate at fractional Kelly fraction f:
      //   G = p * ln(1 + f*b) + (1-p) * ln(1 - f)
      const f = kellyPercent / 100;
      let expectedGrowth = 0;
      if (f > 0 && f < 1) {
        expectedGrowth =
          estProb * Math.log(1 + f * oddsB) + q * Math.log(1 - f);
      }

      return {
        sharePrice: price,
        edge,
        kellyPercentage: kellyPercent,
        betAmount: betAmt,
        expectedGrowth,
      };
    });
  };

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
    setPolymarketResults(null);
  };

  const calculatePolymarketKelly = () => {
    const b = parseFloat(bankroll);
    const estProbA = parseFloat(estimatedProbability) / 100;
    const estProbB = 1 - estProbA;
    const priceA = parseFloat(teamAPrice) / 100;
    const priceB = parseFloat(teamBPrice) / 100;

    if (
      isNaN(b) || isNaN(priceA) || isNaN(priceB) || isNaN(estProbA) ||
      b <= 0 || priceA <= 0 || priceA >= 1 || priceB <= 0 || priceB >= 1 ||
      estProbA <= 0 || estProbA >= 1
    ) {
      alert("Please enter valid values");
      return;
    }

    const rowsA = generateKellyRows(priceA, estProbA, b, fractionalKelly, feesEnabled);
    const rowsB = generateKellyRows(priceB, estProbB, b, fractionalKelly, feesEnabled);

    setPolymarketResults({
      a: {
        teamName: teamA,
        currentPrice: priceA,
        probability: estProbA,
        suggestedPrice: estProbA,
        rows: rowsA,
      },
      b: {
        teamName: teamB,
        currentPrice: priceB,
        probability: estProbB,
        suggestedPrice: estProbB,
        rows: rowsB,
      },
    });
    setRegularResult(null);
  };

  const computeComparisonBet = (
    label: string,
    priceStr: string,
    probStr: string,
    fees: boolean,
    bankrollAmt: number,
    fk: number
  ): ComparisonBetResult | null => {
    const price = parseFloat(priceStr) / 100;
    const p = parseFloat(probStr) / 100;
    if (
      isNaN(price) || isNaN(p) ||
      price <= 0 || price >= 1 || p <= 0 || p >= 1
    ) {
      return null;
    }
    const feePerShare = fees ? 0.03 * price * (1 - price) : 0;
    const effectiveCost = price + feePerShare;
    const oddsB = (1 - effectiveCost) / effectiveCost;
    const q = 1 - p;
    const kelly = (oddsB * p - q) / oddsB;
    const fullKellyPct = Math.max(0, kelly * 100);
    const fractionalKellyPct = fullKellyPct * fk;
    const betAmount = (fractionalKellyPct / 100) * bankrollAmt;
    const shares = effectiveCost > 0 ? betAmount / effectiveCost : 0;
    const f = fractionalKellyPct / 100;
    let expectedGrowth = 0;
    if (f > 0 && f < 1) {
      expectedGrowth = p * Math.log(1 + f * oddsB) + q * Math.log(1 - f);
    }
    const expectedGrowthPct = (Math.exp(expectedGrowth) - 1) * 100;
    return {
      label,
      sharePrice: price,
      probability: p,
      feesEnabled: fees,
      effectiveCost,
      feePerShare,
      edge: (p - effectiveCost) * 100,
      fullKelly: fullKellyPct,
      fractionalKellyPct,
      betAmount,
      shares,
      expectedGrowth,
      expectedGrowthPct,
    };
  };

  const calculateComparison = () => {
    const b = parseFloat(bankroll);
    if (isNaN(b) || b <= 0) {
      alert("Please enter a valid bankroll");
      return;
    }
    const a = computeComparisonBet(bet1Label, bet1Price, bet1Prob, bet1Fees, b, fractionalKelly);
    const c = computeComparisonBet(bet2Label, bet2Price, bet2Prob, bet2Fees, b, fractionalKelly);
    if (!a || !c) {
      alert("Please enter valid prices and probabilities for both bets");
      return;
    }
    setComparisonResults({ a, b: c });
    setRegularResult(null);
    setPolymarketResults(null);
  };

  const handleCalculate = () => {
    if (mode === "regular") {
      calculateRegularKelly();
    } else if (mode === "polymarket") {
      calculatePolymarketKelly();
    } else {
      calculateComparison();
    }
  };

  const handleReset = () => {
    setBankroll("10000");
    setFractionalKelly(0.5);
    setTeamA("Team A");
    setTeamB("Team B");
    setOdds("1.49");
    setProbability("67.5");
    setTeamAPrice("60");
    setTeamBPrice("40");
    setEstimatedProbability("70");
    setFeesEnabled(true);
    setBet1Label("Bet 1");
    setBet1Price("60");
    setBet1Prob("70");
    setBet1Fees(true);
    setBet2Label("Bet 2");
    setBet2Price("45");
    setBet2Prob("55");
    setBet2Fees(true);
    setRegularResult(null);
    setPolymarketResults(null);
    setComparisonResults(null);
  };

  const renderPolymarketPanel = (result: PolymarketPanelResult) => {
    const currentRow = result.rows.find(
      (r) => Math.abs(r.sharePrice - result.currentPrice) < 0.005
    );
    const hasEdge = currentRow && currentRow.edge > 0;

    return (
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="bg-purple-50 px-4 py-3 border-b border-purple-100">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-purple-900 text-lg">{result.teamName}</h3>
            <span className="text-sm text-purple-600">
              Fair: {Math.round(result.suggestedPrice * 100)}¢
            </span>
          </div>
          <p className="text-xs text-purple-600 mt-0.5">
            Your prob: {(result.probability * 100).toFixed(1)}% | Market:{" "}
            {Math.round(result.currentPrice * 100)}¢
          </p>
        </div>

        {/* Recommended Bet */}
        <div className="px-4 py-3 border-b border-gray-100">
          {hasEdge && currentRow ? (
            <div>
              <p className="text-3xl font-bold text-purple-700">
                ${currentRow.betAmount.toFixed(0)}
              </p>
              <p className="text-sm text-gray-500">
                {currentRow.kellyPercentage.toFixed(2)}% of bankroll
              </p>
            </div>
          ) : (
            <p className="text-gray-400 text-sm py-2">No edge at current price</p>
          )}
        </div>

        {/* Table */}
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-3 py-2 text-left font-semibold text-gray-600">Price</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-600">Edge</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-600">Kelly</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-600">Bet</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row, index) => {
              const isCurrentPrice =
                Math.abs(row.sharePrice - result.currentPrice) < 0.005;
              const rowHasEdge = row.edge > 0;

              return (
                <tr
                  key={index}
                  className={`${
                    isCurrentPrice ? "bg-purple-50 font-semibold" : ""
                  } ${rowHasEdge ? "text-gray-900" : "text-gray-500"} border-b border-gray-50`}
                >
                  <td className="px-3 py-1.5 font-medium">
                    {Math.round(row.sharePrice * 100)}¢
                    {isCurrentPrice && (
                      <span className="ml-1 text-[10px] text-purple-600">(now)</span>
                    )}
                  </td>
                  <td
                    className={`px-3 py-1.5 font-semibold ${
                      row.edge > 0 ? "text-green-700" : "text-red-600"
                    }`}
                  >
                    {row.edge > 0 ? "+" : ""}
                    {row.edge.toFixed(1)}%
                  </td>
                  <td className="px-3 py-1.5">
                    {row.kellyPercentage > 0
                      ? `${row.kellyPercentage.toFixed(1)}%`
                      : "\u2014"}
                  </td>
                  <td className="px-3 py-1.5 font-medium">
                    {row.betAmount > 0 ? `$${row.betAmount.toFixed(0)}` : "\u2014"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Kelly Criterion Calculator
            </h1>
            <p className="text-gray-600 text-sm">
              Optimal bet sizing for sports betting and prediction markets
            </p>
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
            <button
              onClick={() => setMode("comparison")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                mode === "comparison"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              EG Comparison
            </button>
          </div>
        </div>

        {mode === "polymarket" ? (
          /* POLYMARKET: 3-column layout — Form | Team A Panel | Team B Panel */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Left: Form */}
            <div className="bg-purple-700 rounded-xl p-5">
              <div className="space-y-4">
                {/* Bankroll */}
                <div>
                  <label className="block text-white font-medium mb-1 text-sm">
                    Bankroll ($)
                  </label>
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
                    <label className="text-white font-medium text-sm">
                      Fractional Kelly
                    </label>
                    <input
                      type="number"
                      value={fractionalKelly}
                      onChange={(e) =>
                        setFractionalKelly(parseFloat(e.target.value))
                      }
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
                    onChange={(e) =>
                      setFractionalKelly(
                        Math.round((1.1 - parseFloat(e.target.value)) * 10) / 10
                      )
                    }
                    className="w-full accent-purple-300"
                  />
                  <div className="flex justify-between text-white text-[10px] mt-1">
                    <span>1</span>
                    <span>.9</span>
                    <span>.8</span>
                    <span>.7</span>
                    <span>.6</span>
                    <span>.5</span>
                    <span>.4</span>
                    <span>.3</span>
                    <span>.2</span>
                    <span>.1</span>
                  </div>
                </div>

                {/* Team Names */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-white font-medium mb-1 text-sm">
                      Team A
                    </label>
                    <input
                      type="text"
                      value={teamA}
                      onChange={(e) => setTeamA(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-gray-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-white font-medium mb-1 text-sm">
                      Team B
                    </label>
                    <input
                      type="text"
                      value={teamB}
                      onChange={(e) => setTeamB(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-gray-900 bg-white"
                    />
                  </div>
                </div>

                {/* Prices */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-white font-medium mb-1 text-sm">
                      {teamA} (¢)
                    </label>
                    <input
                      type="number"
                      value={teamAPrice}
                      onChange={(e) => handleTeamAPriceChange(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-gray-900 bg-white"
                      placeholder="60"
                    />
                  </div>
                  <div>
                    <label className="block text-white font-medium mb-1 text-sm">
                      {teamB} (¢)
                    </label>
                    <input
                      type="number"
                      value={teamBPrice}
                      onChange={(e) => handleTeamBPriceChange(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-gray-900 bg-white"
                      placeholder="40"
                    />
                  </div>
                </div>

                {/* Estimated Probability */}
                <div>
                  <label className="block text-white font-medium mb-1 text-sm">
                    {teamA} Win Probability (%)
                  </label>
                  <input
                    type="number"
                    value={estimatedProbability}
                    onChange={(e) => setEstimatedProbability(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-gray-900 bg-white"
                    placeholder="70"
                  />
                </div>

                {/* Fees Toggle */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={feesEnabled}
                    onChange={(e) => setFeesEnabled(e.target.checked)}
                    className="w-4 h-4 accent-purple-300 rounded"
                  />
                  <span className="text-white text-sm font-medium">
                    Include Polymarket fees
                  </span>
                  <span className="text-purple-200 text-xs">(3% × p × (1−p))</span>
                </label>

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

            {/* Middle: Team A Panel */}
            {polymarketResults ? (
              renderPolymarketPanel(polymarketResults.a)
            ) : (
              <div className="bg-gray-50 rounded-xl p-8 text-center">
                <p className="text-gray-400 text-sm">
                  {teamA} profitability
                </p>
              </div>
            )}

            {/* Right: Team B Panel */}
            {polymarketResults ? (
              renderPolymarketPanel(polymarketResults.b)
            ) : (
              <div className="bg-gray-50 rounded-xl p-8 text-center">
                <p className="text-gray-400 text-sm">
                  {teamB} profitability
                </p>
              </div>
            )}
          </div>
        ) : mode === "regular" ? (
          /* REGULAR: 2-column layout — Form | Results */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Left: Calculator Form */}
            <div className="bg-purple-700 rounded-xl p-5">
              <div className="space-y-4">
                {/* Bankroll */}
                <div>
                  <label className="block text-white font-medium mb-1 text-sm">
                    Betting Account Balance ($)
                  </label>
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
                    <label className="text-white font-medium text-sm">
                      Fractional Kelly
                    </label>
                    <input
                      type="number"
                      value={fractionalKelly}
                      onChange={(e) =>
                        setFractionalKelly(parseFloat(e.target.value))
                      }
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
                    onChange={(e) =>
                      setFractionalKelly(
                        Math.round((1.1 - parseFloat(e.target.value)) * 10) / 10
                      )
                    }
                    className="w-full accent-purple-300"
                  />
                  <div className="flex justify-between text-white text-xs mt-1">
                    <span>1</span>
                    <span>0.9</span>
                    <span>0.8</span>
                    <span>0.7</span>
                    <span>0.6</span>
                    <span>0.5</span>
                    <span>0.4</span>
                    <span>0.3</span>
                    <span>0.2</span>
                    <span>0.1</span>
                  </div>
                </div>

                {/* Teams */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-white font-medium mb-1 text-sm">
                      Team A
                    </label>
                    <input
                      type="text"
                      value={teamA}
                      onChange={(e) => setTeamA(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-gray-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-white font-medium mb-1 text-sm">
                      Team B
                    </label>
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
                    <label className="block text-white font-medium mb-1 text-sm">
                      Sportsbook Odds (Decimal)
                    </label>
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
                    <label className="block text-white font-medium mb-1 text-sm">
                      Your Probability (%)
                    </label>
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
              {regularResult ? (
                <div className="bg-purple-100 rounded-xl p-6 text-center">
                  <p className="text-purple-600 text-sm font-medium mb-1">
                    Recommended Bet Size
                  </p>
                  <p className="text-5xl font-bold text-purple-700">
                    {regularResult.fractionalKellyPercentage.toFixed(2)}%
                  </p>
                  <p className="text-purple-600 text-lg mt-1">
                    ${regularResult.betAmount.toFixed(2)} of $
                    {parseFloat(bankroll).toLocaleString()}
                  </p>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-xl p-6 text-center">
                  <p className="text-gray-400 text-lg">
                    Enter values and click Calculate
                  </p>
                </div>
              )}

              {regularResult && (
                <div className="bg-white border border-gray-200 rounded-xl p-4 text-sm space-y-2">
                  <p className="text-gray-700">
                    <span className="font-semibold">Full Kelly:</span>{" "}
                    {regularResult.kellyPercentage.toFixed(2)}% &rarr;{" "}
                    <span className="font-semibold">
                      Fractional ({fractionalKelly}x):
                    </span>{" "}
                    {regularResult.fractionalKellyPercentage.toFixed(2)}%
                  </p>
                  <p className="text-gray-700">
                    <span className="font-semibold">Expected Value:</span> $
                    {regularResult.expectedValue.toFixed(2)} (
                    {regularResult.returnOnWager.toFixed(2)}% return)
                  </p>
                  <p className="text-gray-700">
                    <span className="font-semibold">Implied Odds:</span>{" "}
                    {regularResult.impliedOdds.toFixed(1)}% |{" "}
                    <span className="font-semibold">Your Edge:</span>{" "}
                    {(
                      parseFloat(probability) - regularResult.impliedOdds
                    ).toFixed(1)}
                    %
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* COMPARISON: shared form on top, two bet inputs side by side, then comparison panel */
          <div className="space-y-6">
            {/* Top: Bankroll & Fractional Kelly */}
            <div className="bg-purple-700 rounded-xl p-5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div>
                  <label className="block text-white font-medium mb-1 text-sm">
                    Bankroll ($)
                  </label>
                  <input
                    type="number"
                    value={bankroll}
                    onChange={(e) => setBankroll(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-gray-900 bg-white"
                    placeholder="10000"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-white font-medium text-sm">
                      Fractional Kelly
                    </label>
                    <input
                      type="number"
                      value={fractionalKelly}
                      onChange={(e) =>
                        setFractionalKelly(parseFloat(e.target.value))
                      }
                      className="w-14 px-2 py-1 rounded text-gray-900 bg-white text-center text-sm"
                      step="0.1"
                      min="0.1"
                      max="1"
                    />
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.1"
                    value={1.1 - fractionalKelly}
                    onChange={(e) =>
                      setFractionalKelly(
                        Math.round((1.1 - parseFloat(e.target.value)) * 10) / 10
                      )
                    }
                    className="w-full accent-purple-300"
                  />
                </div>
              </div>
            </div>

            {/* Bet 1 & Bet 2 input cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[
                {
                  label: bet1Label, setLabel: setBet1Label,
                  price: bet1Price, setPrice: setBet1Price,
                  prob: bet1Prob, setProb: setBet1Prob,
                  fees: bet1Fees, setFees: setBet1Fees,
                  key: "bet1",
                },
                {
                  label: bet2Label, setLabel: setBet2Label,
                  price: bet2Price, setPrice: setBet2Price,
                  prob: bet2Prob, setProb: setBet2Prob,
                  fees: bet2Fees, setFees: setBet2Fees,
                  key: "bet2",
                },
              ].map((b) => (
                <div key={b.key} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
                  <input
                    type="text"
                    value={b.label}
                    onChange={(e) => b.setLabel(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-gray-900 bg-purple-50 border border-purple-200 font-bold text-lg"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-gray-700 font-medium mb-1 text-sm">
                        Share Price (¢)
                      </label>
                      <input
                        type="number"
                        value={b.price}
                        onChange={(e) => b.setPrice(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-gray-900 bg-white border border-gray-200"
                        placeholder="60"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1 text-sm">
                        Win Probability (%)
                      </label>
                      <input
                        type="number"
                        value={b.prob}
                        onChange={(e) => b.setProb(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-gray-900 bg-white border border-gray-200"
                        placeholder="70"
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={b.fees}
                      onChange={(e) => b.setFees(e.target.checked)}
                      className="w-4 h-4 accent-purple-600 rounded"
                    />
                    <span className="text-gray-700 text-sm font-medium">
                      Include Polymarket fees
                    </span>
                    <span className="text-gray-400 text-xs">(3% × p × (1−p))</span>
                  </label>
                </div>
              ))}
            </div>

            <div className="flex gap-3 max-w-md mx-auto">
              <button
                onClick={handleReset}
                className="flex-1 px-4 py-2 bg-white text-purple-700 border border-purple-200 rounded-full font-medium hover:bg-purple-50 transition-colors"
              >
                RESET
              </button>
              <button
                onClick={handleCalculate}
                className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-full font-medium hover:bg-gray-800 transition-colors"
              >
                COMPARE
              </button>
            </div>

            {/* Results */}
            {comparisonResults && (() => {
              const a = comparisonResults.a;
              const b = comparisonResults.b;
              const aWins = a.expectedGrowth > b.expectedGrowth;
              const bWins = b.expectedGrowth > a.expectedGrowth;
              let header: string;
              let headerColor: string;
              if (a.expectedGrowth <= 0 && b.expectedGrowth <= 0) {
                header = "Neither bet has positive expected growth";
                headerColor = "text-gray-500";
              } else if (aWins) {
                header = `${a.label} has better expected growth`;
                headerColor = "text-green-700";
              } else if (bWins) {
                header = `${b.label} has better expected growth`;
                headerColor = "text-green-700";
              } else {
                header = "Both bets are tied";
                headerColor = "text-gray-700";
              }

              const renderCard = (r: ComparisonBetResult, isWinner: boolean) => (
                <div
                  className={`rounded-xl p-5 border-2 ${
                    isWinner
                      ? "border-green-400 bg-green-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-gray-900 text-lg">{r.label}</h4>
                    {isWinner && r.expectedGrowth > 0 && (
                      <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded">
                        BEST EG
                      </span>
                    )}
                  </div>
                  <p className="text-3xl font-bold text-purple-700">
                    {r.expectedGrowth > 0 ? "+" : ""}
                    {r.expectedGrowthPct.toFixed(4)}%
                  </p>
                  <p className="text-xs text-gray-500 mb-3">
                    expected growth per bet (ln G = {r.expectedGrowth.toFixed(5)})
                  </p>
                  <div className="text-sm space-y-1 border-t border-gray-200 pt-3">
                    <p className="text-gray-700">
                      <span className="font-semibold">Share price:</span>{" "}
                      {Math.round(r.sharePrice * 100)}¢
                      {r.feesEnabled && (
                        <>
                          {" "}+ fee {(r.feePerShare * 100).toFixed(2)}¢ ={" "}
                          <span className="font-semibold">
                            {(r.effectiveCost * 100).toFixed(2)}¢ effective
                          </span>
                        </>
                      )}
                    </p>
                    <p className="text-gray-700">
                      <span className="font-semibold">Your prob:</span>{" "}
                      {(r.probability * 100).toFixed(1)}% |{" "}
                      <span className="font-semibold">Edge:</span>{" "}
                      <span className={r.edge > 0 ? "text-green-700" : "text-red-600"}>
                        {r.edge > 0 ? "+" : ""}
                        {r.edge.toFixed(2)}%
                      </span>
                    </p>
                    <p className="text-gray-700">
                      <span className="font-semibold">Full Kelly:</span>{" "}
                      {r.fullKelly.toFixed(2)}% &rarr;{" "}
                      <span className="font-semibold">
                        Fractional ({fractionalKelly}x):
                      </span>{" "}
                      {r.fractionalKellyPct.toFixed(2)}%
                    </p>
                    <p className="text-gray-700">
                      <span className="font-semibold">Bet:</span>{" "}
                      ${r.betAmount.toFixed(2)} ({r.shares.toFixed(0)} shares)
                    </p>
                  </div>
                </div>
              );

              return (
                <div className="space-y-4">
                  <div className="bg-white border border-gray-200 rounded-xl px-5 py-3 flex items-center justify-between">
                    <h3 className="font-bold text-gray-900 text-lg">
                      Expected Growth Comparison
                    </h3>
                    <span className={`font-semibold text-sm ${headerColor}`}>
                      {header}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {renderCard(a, aWins && a.expectedGrowth > 0)}
                    {renderCard(b, bWins && b.expectedGrowth > 0)}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
