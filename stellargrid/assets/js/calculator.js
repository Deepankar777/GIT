/* Stellar Grid — solar savings calculator & 20-year financial snapshot.
   The financial logic (tariff table, price slabs, EMI, escalation, degradation,
   O&M) is carried over unchanged from the previous stellargrid.in calculator. */
(function () {
  "use strict";
  var advancedCalc = document.querySelector("#advancedSolarCalc");
  if (!advancedCalc) return;

  var tariffTable = {
    "Andhra Pradesh": { Domestic: 6.8, Commercial: 9.2, Industrial: 8.4 },
    "Delhi": { Domestic: 6.5, Commercial: 10.0, Industrial: 9.0 },
    "Gujarat": { Domestic: 6.2, Commercial: 8.6, Industrial: 7.8 },
    "Haryana": { Domestic: 7.0, Commercial: 9.3, Industrial: 8.5 },
    "Karnataka": { Domestic: 7.1, Commercial: 9.8, Industrial: 8.6 },
    "Madhya Pradesh": { Domestic: 6.9, Commercial: 9.0, Industrial: 8.2 },
    "Maharashtra": { Domestic: 8.0, Commercial: 13.0, Industrial: 10.5 },
    "Punjab": { Domestic: 7.0, Commercial: 9.6, Industrial: 8.8 },
    "Rajasthan": { Domestic: 7.5, Commercial: 9.5, Industrial: 8.3 },
    "Tamil Nadu": { Domestic: 6.6, Commercial: 9.2, Industrial: 8.0 },
    "Telangana": { Domestic: 7.2, Commercial: 9.8, Industrial: 8.7 },
    "Uttar Pradesh": { Domestic: 7.0, Commercial: 9.4, Industrial: 8.4 },
    "West Bengal": { Domestic: 7.3, Commercial: 9.8, Industrial: 8.8 },
    "Other": { Domestic: 7.0, Commercial: 9.5, Industrial: 8.5 }
  };

  var ANNUAL_INTEREST = 0.105;
  var EQUITY_SHARE = 0.25;
  var DEBT_SHARE = 0.75;
  var ESCALATION = 1.05;

  var q = function (id) { return document.querySelector(id); };
  var fmt = function (n) { return Math.round(n).toLocaleString("en-IN"); };
  var money = function (n) { return "₹" + fmt(n); };
  var lac = function (n) {
    var v = n / 100000;
    return v >= 100 ? v.toFixed(0) + " Lac" : v.toFixed(2) + " Lac";
  };

  var billInput = q("#monthlyBill");
  var stateInput = q("#state");
  var connInput = q("#connectionType");
  var tariffInput = q("#gridTariffAdvanced");
  var rateInput = q("#systemRate");
  var genInput = q("#annualGenerationAdvanced");
  var snapshotGen = q("#snapshotGeneration");
  var degradationInput = q("#performanceDegradation");
  var solarCostInput = q("#solarCostUnit");
  var maintInput = q("#maintenancePercent");
  var financeInput = q("#financeToggle");
  var debtTenureInput = q("#debtTenure");
  var canvas = q("#savingsChart");
  var ctx = canvas ? canvas.getContext("2d") : null;

  var manualTariff = false;
  var manualRate = false;
  var latest = {};

  function suggestedTariff() {
    var state = stateInput.value || "Other";
    var conn = connInput.value || "Commercial";
    return (tariffTable[state] || tariffTable.Other)[conn] || tariffTable.Other[conn] || 8.5;
  }

  function rateForCapacity(kw) {
    if (kw <= 10) return 45000;
    if (kw <= 50) return 35000;
    if (kw <= 200) return 27000;
    return 25000;
  }

  function emi(principal, annualRate, years) {
    var r = annualRate / 12;
    var n = years * 12;
    if (!principal || !r || !n) return 0;
    return principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
  }

  /* ---------- Chart ---------- */
  function resizeCanvas() {
    var dpr = window.devicePixelRatio || 1;
    var rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function roundRect(x, y, width, height, radius) {
    var r = Math.max(0, Math.min(radius, width / 2, height / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  function drawFinancialChart(points) {
    if (!ctx || !canvas) return;
    resizeCanvas();
    var rect = canvas.getBoundingClientRect();
    var w = rect.width, h = rect.height;
    ctx.clearRect(0, 0, w, h);
    if (!w || !h) return;

    var narrow = w < 520;
    var years = [5, 10, 15, 20];
    var padL = narrow ? 58 : 84, padR = narrow ? 8 : 24, padT = 20, padB = 40;
    var plotW = w - padL - padR;
    var plotH = h - padT - padB;
    var maxVal = Math.max.apply(null, points.map(function (p) { return p.savings; })
      .concat(points.map(function (p) { return p.bank + p.maint; }), [1]));
    var font = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", "Segoe UI", sans-serif';

    function y(v) { return padT + (1 - v / maxVal) * plotH; }

    ctx.lineWidth = 1;
    ctx.font = "12px " + font;
    ctx.textBaseline = "middle";
    for (var i = 0; i < 5; i++) {
      var yy = padT + i * plotH / 4;
      ctx.strokeStyle = "rgba(255,255,255,.10)";
      ctx.beginPath();
      ctx.moveTo(padL, yy);
      ctx.lineTo(w - padR, yy);
      ctx.stroke();
      var val = maxVal * (1 - i / 4);
      ctx.fillStyle = "rgba(255,255,255,.55)";
      ctx.textAlign = "right";
      ctx.fillText("₹" + Math.round(val / 100000).toLocaleString("en-IN") + "L", padL - 12, yy);
    }

    var groupW = plotW / years.length;
    var barW = Math.min(64, groupW * (narrow ? 0.32 : 0.28));
    var gap = narrow ? 4 : 8;

    points.forEach(function (p, i) {
      var cx = padL + groupW * i + groupW / 2;
      var base = padT + plotH;

      var savingsH = base - y(p.savings);
      var total = p.bank + p.maint;
      var totalH = base - y(total);
      var bankH = total ? totalH * (p.bank / total) : 0;
      var maintH = totalH - bankH;

      var gx = cx - barW - gap;
      var sx = cx + gap;

      // Savings bar
      var savingsGrad = ctx.createLinearGradient(0, base - savingsH, 0, base);
      savingsGrad.addColorStop(0, "rgba(255,210,31,.85)");
      savingsGrad.addColorStop(1, "rgba(255,149,0,.25)");
      roundRect(gx, base - savingsH, barW, savingsH, 12);
      ctx.fillStyle = savingsGrad;
      ctx.fill();

      // Bank payments / system cost
      if (bankH > 0) {
        var emiGrad = ctx.createLinearGradient(0, base - bankH, 0, base);
        emiGrad.addColorStop(0, "rgba(255,255,255,.55)");
        emiGrad.addColorStop(1, "rgba(255,255,255,.18)");
        roundRect(sx, base - bankH, barW, bankH, 12);
        ctx.fillStyle = emiGrad;
        ctx.fill();
      }

      // Maintenance
      if (maintH > 0) {
        var maintGrad = ctx.createLinearGradient(0, base - bankH - maintH, 0, base - bankH);
        maintGrad.addColorStop(0, "rgba(24,215,206,.85)");
        maintGrad.addColorStop(1, "rgba(24,215,206,.35)");
        roundRect(sx, base - bankH - maintH - 2, barW, maintH, 10);
        ctx.fillStyle = maintGrad;
        ctx.fill();
      }

      ctx.fillStyle = "rgba(255,255,255,.75)";
      ctx.font = "13px " + font;
      ctx.textAlign = "center";
      ctx.fillText("Year " + years[i], cx, h - 14);
    });
  }

  /* ---------- Calculation ---------- */
  function updateSuggestedFields(force) {
    var st = suggestedTariff();
    var chip = q("#suggestedTariffChip");
    if (chip) chip.textContent = "Suggested grid tariff: ₹" + st.toFixed(2) + " / kWh";
    if (!manualTariff || force) tariffInput.value = st.toFixed(2);
  }

  function cumulative(arr, n) {
    return arr.slice(0, n).reduce(function (a, b) { return a + b; }, 0);
  }

  function calculate() {
    updateSuggestedFields(false);

    var monthlyBill = Number(billInput.value || 0);
    var tariff = Number(tariffInput.value || suggestedTariff());
    var generation = Number(snapshotGen.value || genInput.value || 1300);
    var degradation = Number(degradationInput.value || 1) / 100;
    var maintenancePct = Number(maintInput.value || 2) / 100;
    var solarCostUnit = Number(solarCostInput.value || 2.6); // kept for parity with the original model
    var debtTenure = Math.max(1, Math.min(20, Number(debtTenureInput.value || 7)));
    var financed = financeInput.checked;

    var monthlyUnits = tariff ? monthlyBill / tariff : 0;
    var annualUnits = monthlyUnits * 12;
    var systemSize = generation ? annualUnits / generation : 0;
    var suggestedRate = rateForCapacity(systemSize);
    if (!manualRate) rateInput.value = suggestedRate;
    var rate = Number(rateInput.value || suggestedRate);
    var systemCost = systemSize * rate;

    var equity = systemCost * EQUITY_SHARE;
    var debt = systemCost * DEBT_SHARE;
    var monthlyEmi = financed ? emi(debt, ANNUAL_INTEREST, debtTenure) : 0;
    var annualEmi = monthlyEmi * 12;
    var annualOandM = systemCost * maintenancePct;
    var annualSavingsYear1 = systemSize * tariff * generation;
    var netSavingsYear1 = annualSavingsYear1 - annualOandM - (financed ? annualEmi : 0);
    var simplePayback = (annualSavingsYear1 - annualOandM) > 0 ? systemCost / (annualSavingsYear1 - annualOandM) : 0;

    q("#calcPlantSize").textContent = systemSize.toFixed(1) + " kW";
    q("#calcSystemCost").textContent = money(systemCost);
    q("#calcAnnualSavings").textContent = money(netSavingsYear1);
    q("#calcPayback").textContent = simplePayback.toFixed(1) + " yrs";
    q("#calcRateUsed").textContent = "₹" + fmt(rate) + " / kW";
    q("#calcMonthlyUnits").textContent = fmt(monthlyUnits) + " kWh";

    q("#equityAmount").textContent = money(equity);
    q("#debtAmount").textContent = money(debt);
    q("#emiAmount").textContent = money(monthlyEmi);
    q("#loanInfo").textContent = "75% debt assumed at 10.5% p.a. for " + debtTenure + " years.";
    q("#financeResults").classList.toggle("show", financed);

    var savingsArr = [], bankArr = [], maintArr = [], netArr = [];
    var tariffYr = tariff;
    for (var yr = 0; yr < 20; yr++) {
      var genFactor = Math.pow(1 - degradation, yr);
      var saved = systemSize * generation * genFactor * tariffYr;
      var maintenance = annualOandM * Math.pow(ESCALATION, yr);
      var bank = 0;
      if (financed) {
        bank = yr < debtTenure ? annualEmi : 0;
        if (yr === 0) bank += equity;
      } else {
        bank = yr === 0 ? systemCost : 0;
      }
      savingsArr.push(saved);
      bankArr.push(bank);
      maintArr.push(maintenance);
      netArr.push(saved - bank - maintenance);
      tariffYr *= ESCALATION;
    }

    var milestones = [5, 10, 15, 20];
    var points = milestones.map(function (n) {
      return {
        savings: cumulative(savingsArr, n),
        bank: cumulative(bankArr, n),
        maint: cumulative(maintArr, n),
        net: cumulative(netArr, n)
      };
    });

    drawFinancialChart(points);

    milestones.forEach(function (n, idx) {
      q("#cumSavings" + n).textContent = lac(points[idx].savings);
      q("#cumEmi" + n).textContent = lac(points[idx].bank);
      q("#cumMaint" + n).textContent = lac(points[idx].maint);
      q("#cumNet" + n).textContent = lac(points[idx].net);
    });

    q("#snapshotHeadline").textContent = "Your 20-year estimated net savings are " + lac(points[3].net) + ". Breakeven is within " + simplePayback.toFixed(1) + " years.";
    q("#snapshotSubtext").textContent = financed
      ? "This considers 25% equity, 75% debt financing, EMI, maintenance and tariff escalation."
      : "This considers upfront project cost, maintenance and tariff escalation.";
    q("#explainerEquity").textContent = lac(financed ? equity : systemCost);
    q("#explainerEquityLabel").textContent = financed ? "Down payment" : "Upfront investment";
    q("#explainerProjectCost").textContent = lac(systemCost);
    q("#explainerHeadline").textContent = financed
      ? "Just pay a 25% down payment. The rest can come from the bank."
      : "Own the solar plant upfront and reduce long-term electricity cost.";
    q("#explainerLoanText").textContent = financed
      ? "The " + systemSize.toFixed(0) + " kW solar PV system will require an equity investment of " + lac(equity) + ", with the remaining " + lac(debt) + " financed for " + debtTenure + " years at 10.5% p.a."
      : "The " + systemSize.toFixed(0) + " kW solar PV system has an estimated project cost of " + lac(systemCost) + ".";
    q("#explainerSavingsText").textContent = financed
      ? "After paying EMI and maintenance, the first-year estimated monthly net savings are " + money(netSavingsYear1 / 12) + "."
      : "After maintenance, the first-year estimated monthly net savings are " + money(netSavingsYear1 / 12) + ".";

    latest = {
      systemSize: systemSize, systemCost: systemCost, equity: equity, debt: debt,
      monthlyEmi: monthlyEmi, debtTenure: debtTenure, net20: points[3].net,
      payback: simplePayback, monthlyNet: netSavingsYear1 / 12, financed: financed,
      monthlyBill: monthlyBill, tariff: tariff, state: stateInput.value, conn: connInput.value,
      points: points, solarCostUnit: solarCostUnit
    };
  }

  /* ---------- One-pager ---------- */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function downloadOnePager() {
    var L = latest;
    var rows = [5, 10, 15, 20].map(function (n, i) {
      var p = L.points[i];
      return "<tr><td>Till year " + n + "</td><td>" + lac(p.savings) + "</td><td>" + lac(p.bank) + "</td><td>" + lac(p.maint) + "</td><td><b>" + lac(p.net) + "</b></td></tr>";
    }).join("");
    var report = '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Solar Financial Snapshot — Stellar Grid</title>' +
      "<style>" +
      "*{box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','Inter','Segoe UI',sans-serif;margin:0;color:#1d1d1f;letter-spacing:-.01em}" +
      ".page{max-width:820px;margin:0 auto;padding:40px 36px}" +
      ".brand{font-weight:600;font-size:15px;color:#6e6e73}" +
      "h1{font-size:40px;letter-spacing:-.03em;margin:8px 0 6px}" +
      ".lead{font-size:19px;color:#6e6e73;margin:0}" +
      ".hero{margin-top:28px;padding:28px;border-radius:22px;background:#000;color:#f5f5f7}" +
      ".hero h2{margin:0;font-size:24px;line-height:1.25}.hero p{margin:10px 0 0;color:#a1a1a6}" +
      ".grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:16px}" +
      ".box{background:#f5f5f7;padding:18px;border-radius:16px;font-size:13px;color:#6e6e73}" +
      ".box b{display:block;font-size:24px;color:#1d1d1f;letter-spacing:-.02em;margin-bottom:2px}" +
      "table{width:100%;border-collapse:collapse;margin-top:22px;font-size:14px}" +
      "th,td{padding:10px 8px;border-bottom:1px solid #d2d2d7;text-align:right}th:first-child,td:first-child{text-align:left}th{color:#6e6e73;font-weight:500}" +
      ".note{margin-top:22px;padding:18px;border-radius:16px;border:1px solid #d2d2d7}.note h3{margin:0 0 6px;font-size:18px}.note p{margin:6px 0 0;color:#424245}" +
      ".foot{margin-top:24px;font-size:12px;color:#86868b}" +
      "@media print{.page{padding:18px}}" +
      "</style></head><body><div class='page'>" +
      "<div class='brand'>Stellar Grid Solar Power Solutions</div>" +
      "<h1>Financial Snapshot</h1><p class='lead'>Solar estimate generated from the calculator on stellargrid.in</p>" +
      "<div class='hero'><h2>" + esc(q("#snapshotHeadline").textContent) + "</h2><p>" + esc(q("#snapshotSubtext").textContent) + "</p></div>" +
      "<div class='grid'>" +
      "<div class='box'><b>" + L.systemSize.toFixed(1) + " kW</b>System size</div>" +
      "<div class='box'><b>" + lac(L.systemCost) + "</b>Project cost</div>" +
      "<div class='box'><b>" + L.payback.toFixed(1) + " yrs</b>Breakeven</div>" +
      "<div class='box'><b>" + lac(L.equity) + "</b>Equity / down payment</div>" +
      "<div class='box'><b>" + money(L.monthlyEmi) + "</b>Monthly EMI</div>" +
      "<div class='box'><b>" + lac(L.net20) + "</b>20-year net savings</div>" +
      "</div>" +
      "<table><thead><tr><th>Cumulative</th><th>Savings</th><th>Bank / system cost</th><th>Maintenance</th><th>Net savings</th></tr></thead><tbody>" + rows + "</tbody></table>" +
      "<div class='note'><h3>" + esc(q("#explainerHeadline").textContent) + "</h3><p>" + esc(q("#explainerLoanText").textContent) + "</p><p>" + esc(q("#explainerSavingsText").textContent) + "</p></div>" +
      "<p class='foot'>Inputs: monthly bill " + money(L.monthlyBill) + ", " + esc(L.state) + ", " + esc(L.conn) + ", grid tariff ₹" + L.tariff.toFixed(2) + "/kWh. " +
      "O&amp;M and grid tariff escalate at 5% a year. Indicative estimate only; a site survey confirms final sizing and pricing. WhatsApp +91 97775 29953.</p>" +
      "</div><script>window.onload=function(){window.print()}<\/script></body></html>";
    var win = window.open("", "_blank");
    if (!win) {
      alert("Please allow pop-ups for this site to download the one-pager.");
      return;
    }
    win.document.open();
    win.document.write(report);
    win.document.close();
  }

  /* ---------- Wiring ---------- */
  [stateInput, connInput].forEach(function (input) {
    input.addEventListener("change", function () { manualTariff = false; updateSuggestedFields(true); calculate(); });
  });
  tariffInput.addEventListener("input", function () { manualTariff = true; calculate(); });
  rateInput.addEventListener("input", function () { manualRate = true; calculate(); });
  // The two generation fields mirror each other so editing either one updates the model.
  genInput.addEventListener("input", function () { snapshotGen.value = genInput.value; calculate(); });
  snapshotGen.addEventListener("input", function () { genInput.value = snapshotGen.value; calculate(); });
  [billInput, degradationInput, solarCostInput, maintInput, debtTenureInput].forEach(function (input) {
    input.addEventListener("input", calculate);
  });
  financeInput.addEventListener("change", calculate);
  var resizeTimer;
  window.addEventListener("resize", function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(calculate, 120); });
  var dl = q("#downloadOnePager");
  if (dl) dl.addEventListener("click", downloadOnePager);
  advancedCalc.addEventListener("submit", function (e) { e.preventDefault(); });

  updateSuggestedFields(true);
  calculate();
})();
