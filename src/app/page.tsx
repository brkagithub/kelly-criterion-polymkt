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
    fk: number
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
      const oddsB = (1 - price) / price;
      const q = 1 - estProb;
      const kelly = (oddsB * estProb - q) / oddsB;
      const kellyPercent = Math.max(0, kelly * 100) * fk;
      const betAmt = (kellyPercent / 100) * bankrollAmt;
      const edge = (estProb - price) * 100;

      return {
        sharePrice: price,
        edge,
        kellyPercentage: kellyPercent,
        betAmount: betAmt,
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

    const rowsA = generateKellyRows(priceA, estProbA, b, fractionalKelly);
    const rowsB = generateKellyRows(priceB, estProbB, b, fractionalKelly);

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
    setTeamAPrice("60");
    setTeamBPrice("40");
    setEstimatedProbability("70");
    setRegularResult(null);
    setPolymarketResults(null);
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
        ) : (
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
        )}
      </div>
    </div>
  );
}
