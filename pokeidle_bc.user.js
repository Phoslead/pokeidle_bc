// ==UserScript==
// @name         Breeding Center - Breeding calculator
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Breeding calculator
// @author       Phoslead
// @match        https://poke.idleworld.online/*
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    // Base Configuration
    const COST_PER_BREED_GOLD = 2000000;
    const PHEROMONES_PER_BREED = 9;
    const KILLS_PER_EGG = 3000;
    const MAX_QUALITY_DIFF = 0.15;

    // Growth Rates: Average vs Minimum
    const GROWTH_RATES = {
        avg: { free: 0.0096, pheromones: 0.1875 },
        min: { free: 0.0050, pheromones: 0.1500 }
    };

    // Quality Tiers
    const QUALITY_TIERS = [
        { label: 'Common', min: 1.0 },
        { label: 'Uncommon', min: 1.1 },
        { label: 'Rare', min: 1.3 },
        { label: 'Epic', min: 1.5 },
        { label: 'Legendary', min: 1.7 },
        { label: 'Mythic', min: 2.0 },
        { label: 'Ancient', min: 3.0 },
        { label: 'Divine', min: 4.0 }
    ];

    // Dynamic Color Based on Quality (Q)
    function getQualityColor(qVal) {
        if (qVal < 1.0) return 'rgb(154, 166, 179)';      // Weak
        if (qVal < 1.1) return 'rgb(99, 216, 115)';       // Common
        if (qVal < 1.3) return 'rgb(127, 212, 255)';      // Uncommon
        if (qVal < 1.5) return 'rgb(176, 108, 255)';      // Rare
        if (qVal < 1.7) return 'rgb(240, 192, 64)';       // Epic
        if (qVal < 2.0) return 'rgb(255, 140, 60)';       // Legendary
        if (qVal < 3.0) return 'rgb(106, 13, 173)';       // Mythic
        if (qVal < 4.0) return 'rgb(184, 134, 11)';       // Ancient
        return 'rgb(219, 239, 255)';                       // Divine
    }

    // Helper for Tier Name by Quality
    function getTierLabelForQ(qVal) {
        for (let i = QUALITY_TIERS.length - 1; i >= 0; i--) {
            if (qVal >= QUALITY_TIERS[i].min) {
                return QUALITY_TIERS[i].label;
            }
        }
        return 'Weak';
    }

    // Dynamic Formatter for Kills
    function formatKills(kills) {
        if (kills >= 1000000) {
            return (kills / 1000000).toLocaleString(undefined, { maximumFractionDigits: 1 }) + 'M ⚔️';
        }
        return (kills / 1000).toLocaleString(undefined, { maximumFractionDigits: 0 }) + 'k ⚔️';
    }

    // Helper for formatting Currency Tooltips
    function formatM(val) {
        return '$' + (val / 1000000).toLocaleString(undefined, { maximumFractionDigits: 2 }) + 'M';
    }

    // Global Settings State
    let settings = {
        pheromoneUnitPrice: 100000,
        killsPerHour: 0,
        growthType: 'avg',
        isFolded: true,
        useStonesCost: false,
        stonePrices: {},
        expandedTierLabel: null
    };

    // 1. Custom CSS Injection
    const customStyles = `
        .brd-custom-box {
            margin-top: 12px;
            background: rgba(10, 16, 25, 0.75);
            border: 1px solid rgba(216, 184, 113, 0.3);
            border-radius: 4px;
            padding: 8px 10px;
            box-shadow: inset 0 0 8px rgba(0, 0, 0, 0.5);
            display: flex;
            flex-direction: column;
            max-height: 460px;
        }

        .brd-custom-box .brd-custom-head {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #d8b871;
            margin-bottom: 8px;
            border-bottom: 1px solid rgba(216, 184, 113, 0.2);
            padding-bottom: 3px;
            flex-shrink: 0;
        }

        .brd-poke-info {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: rgba(216, 184, 113, 0.08);
            border: 1px solid rgba(216, 184, 113, 0.85);
            box-shadow: 0 0 8px rgba(216, 184, 113, 0.4), inset 0 0 6px rgba(216, 184, 113, 0.15);
            border-radius: 3px;
            padding: 5px 8px;
            flex-shrink: 0;
            margin-bottom: 6px;
        }

        .brd-poke-tag {
            font-weight: 700;
            color: #f4e2a8;
            font-size: 11px;
            background: rgba(216, 184, 113, 0.2);
            border: 1px solid rgba(216, 184, 113, 0.4);
            padding: 1px 6px;
            border-radius: 3px;
        }

        .brd-poke-name {
            font-weight: 700;
            color: #ffffff;
        }

        .brd-poke-stats {
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .brd-stat-chip {
            font-variant-numeric: tabular-nums;
            background: linear-gradient(#242e3ce6, #0d131cf2);
            border-radius: 4px;
            padding: 2px 8px;
            font-size: 10.5px;
            font-style: normal;
            font-weight: 800;
            box-shadow: inset 0 1px #ffffff17, inset 0 -1px 3px #0006;
            border: 1px solid;
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }

        .brd-stat-chip.iv {
            color: #e8c98a;
            border-color: #b99a58 #7a5c22 #4f3d17;
        }

        .brd-iv-warn-ico {
            width: 14px;
            height: 14px;
            vertical-align: middle;
            cursor: help;
        }

        .brd-custom-content {
            display: flex;
            flex-direction: column;
            gap: 6px;
            font-size: 12px;
            color: #c8cdd0;
            overflow-y: auto;
            flex: 1;
            padding-right: 3px;
        }

        .brd-custom-content::-webkit-scrollbar {
            width: 5px;
        }
        .brd-custom-content::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.4);
            border-radius: 3px;
        }
        .brd-custom-content::-webkit-scrollbar-thumb {
            background: rgba(216, 184, 113, 0.4);
            border-radius: 3px;
            border: 1px solid rgba(10, 16, 25, 0.8);
        }
        .brd-custom-content::-webkit-scrollbar-thumb:hover {
            background: rgba(216, 184, 113, 0.7);
        }

        .brd-tiers-container {
            display: flex;
            flex-direction: column;
            gap: 3px;
        }

        .brd-tier-title {
            font-size: 10px;
            text-transform: uppercase;
            color: #d8b871;
            font-weight: 700;
            margin-bottom: 2px;
        }

        .brd-tier-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: rgba(0, 0, 0, 0.25);
            padding: 4px 6px;
            border-radius: 3px;
            font-size: 11px;
            cursor: pointer;
            user-select: none;
            transition: background 0.15s ease;
        }

        .brd-tier-row:hover {
            background: rgba(216, 184, 113, 0.12);
        }

        .brd-tier-row.active {
            border: 1px solid rgba(216, 184, 113, 0.5);
            background: rgba(216, 184, 113, 0.15);
        }

        .brd-tier-label {
            font-weight: 700;
        }

        .brd-tier-target {
            color: #8c9ba5;
            font-size: 10px;
        }

        .brd-tier-right {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .brd-tier-count {
            color: #7fd4ff;
            font-weight: 700;
        }

        .brd-tier-kills {
            color: #a0aec0;
            font-size: 10px;
            font-weight: 600;
        }

        .brd-tier-phero {
            color: #ff8ce8;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 2px;
        }

        .brd-tier-cost {
            color: #ffd700;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 2px;
            cursor: help;
        }

        .brd-tier-cost img, .brd-tier-phero img {
            vertical-align: middle;
        }

        .brd-subtiers-wrap {
            background: rgba(0, 0, 0, 0.4);
            border: 1px solid rgba(216, 184, 113, 0.2);
            border-radius: 4px;
            padding: 6px 8px;
            margin: 2px 0 6px 0;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .brd-subtiers-head {
            font-size: 10px;
            font-weight: 700;
            color: #d8b871;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }

        .brd-subtiers-scroll {
            max-height: 120px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 3px;
            padding-right: 4px;
        }

        .brd-subtiers-scroll::-webkit-scrollbar {
            width: 4px;
        }
        .brd-subtiers-scroll::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.4);
            border-radius: 3px;
        }
        .brd-subtiers-scroll::-webkit-scrollbar-thumb {
            background: rgba(216, 184, 113, 0.4);
            border-radius: 3px;
        }

        .brd-subtier-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.05);
            padding: 3px 6px;
            border-radius: 3px;
            font-size: 10px;
        }

        .brd-subtier-step {
            color: #7fd4ff;
            font-weight: 700;
        }

        .brd-subtier-q {
            font-weight: 700;
        }

        .brd-settings-wrap {
            margin-top: 8px;
            padding-top: 6px;
            border-top: 1px solid rgba(216, 184, 113, 0.2);
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .brd-settings-toggle {
            font-size: 10px;
            text-transform: uppercase;
            color: #d8b871;
            font-weight: 700;
            cursor: pointer;
            user-select: none;
            display: inline-flex;
            align-items: center;
            gap: 4px;
            width: fit-content;
            transition: color 0.15s ease;
        }

        .brd-settings-toggle:hover {
            color: #f4e2a8;
        }

        .brd-settings-body {
            display: flex;
            flex-direction: column;
            gap: 8px;
            padding-top: 2px;
        }

        .brd-settings-body.hidden {
            display: none;
        }

        .brd-settings-row {
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 10px;
            color: #8c9ba5;
            flex-wrap: wrap;
        }

        .brd-setting-item {
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .brd-setting-item input[type="text"] {
            width: 65px;
            background: rgba(0, 0, 0, 0.5);
            border: 1px solid rgba(216, 184, 113, 0.3);
            border-radius: 3px;
            color: #ffd700;
            font-size: 10px;
            padding: 1px 4px;
            text-align: right;
            font-weight: 700;
            outline: none;
            -moz-appearance: textfield;
        }

        .brd-setting-item input[type="text"]:disabled {
            background: rgba(0, 0, 0, 0.2);
            border-color: rgba(255, 255, 255, 0.1);
            color: #555;
            cursor: not-allowed;
        }

        .brd-setting-item input[type="text"]::-webkit-outer-spin-button,
        .brd-setting-item input[type="text"]::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
        }

        .brd-checkbox-label {
            display: flex;
            align-items: center;
            gap: 4px;
            cursor: pointer;
            color: #c8cdd0;
            font-size: 10px;
            user-select: none;
        }

        .brd-radio-group {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .brd-radio-group label {
            display: flex;
            align-items: center;
            gap: 3px;
            cursor: pointer;
            color: #c8cdd0;
            font-size: 10px;
        }

        .brd-stones-settings-container {
            display: flex;
            flex-direction: column;
            gap: 4px;
            background: rgba(0, 0, 0, 0.2);
            padding: 4px 6px;
            border-radius: 3px;
            border: 1px dashed rgba(216, 184, 113, 0.15);
        }

        .brd-export-row {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 6px;
            margin-top: 4px;
            padding-top: 4px;
            border-top: 1px dashed rgba(216, 184, 113, 0.15);
        }

        .brd-export-btn {
            background: rgba(216, 184, 113, 0.12);
            border: 1px solid rgba(216, 184, 113, 0.4);
            color: #f4e2a8;
            border-radius: 3px;
            font-size: 10px;
            font-weight: 700;
            padding: 3px 8px;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .brd-export-btn:hover {
            background: rgba(216, 184, 113, 0.3);
            border-color: rgba(216, 184, 113, 0.8);
            color: #ffffff;
        }

        .brd-no-poke {
            text-align: center;
            color: #8c9ba5;
            font-style: italic;
            font-size: 11px;
            padding: 6px 0;
        }
    `;

    if (typeof GM_addStyle !== 'undefined') {
        GM_addStyle(customStyles);
    } else {
        const styleEl = document.createElement('style');
        styleEl.textContent = customStyles;
        document.head.appendChild(styleEl);
    }

    let lastStateSignature = '';

    // 2. Extract Data from Breeding Pair
    function getSelectedParents() {
        const parents = [];
        const parentNodes = document.querySelectorAll('.brd-col-pair .brd-parent.filled');

        parentNodes.forEach((node) => {
            const name = node.querySelector('.brd-parent-name')?.textContent.trim() || 'Pokemon';
            const ivStr = node.querySelector('.brd-chip.iv')?.textContent.trim() || 'IV 0';
            const qStr = node.querySelector('.brd-chip.q')?.textContent.trim() || 'Q 0';

            const ivMatch = ivStr.match(/\d+/);
            const ivVal = ivMatch ? parseInt(ivMatch[0], 10) : 0;

            const qMatch = qStr.match(/[\d.]+/);
            const qVal = qMatch ? parseFloat(qMatch[0]) : 0;

            parents.push({ name, ivVal, qVal });
        });

        return parents;
    }

    // 3. Detect Active Mode
    function getSelectedMode() {
        const activeOpt = document.querySelector('.brd-path-opt.on');
        if (!activeOpt) return 'free';

        const text = activeOpt.textContent.toLowerCase();
        return text.includes('pheromone') ? 'pheromones' : 'free';
    }

    // 4. Detect Required Stones
    function getRequiredStones() {
        const stones = [];
        const stoneElements = document.querySelectorAll('.brd-stones-req .brd-stone-item');

        stoneElements.forEach(el => {
            const name = el.querySelector('.brd-stone-name')?.textContent.trim() || 'Stone';
            const qtyText = el.querySelector('b')?.textContent.trim() || '0×';
            const qtyMatch = qtyText.match(/\d+/);
            const baseQty = qtyMatch ? parseInt(qtyMatch[0], 10) : 0;

            stones.push({ name, baseQty });
        });

        return stones;
    }

    // 5. Detect Double Stones Checkbox
    function isDoubleStonesChecked() {
        const checkbox = document.querySelector('.brd-double input[type="checkbox"]');
        return checkbox ? checkbox.checked : false;
    }

    // 6. Generate Optimized Payload for Export (Deduplicated Progressive Steps)
    function generateExportPayload() {
        const parents = getSelectedParents();
        const mode = getSelectedMode();
        const requiredStones = getRequiredStones();
        const doubleStones = isDoubleStonesChecked();

        let bestParent = parents[0] || null;
        let otherParent = parents[1] || null;

        if (parents.length > 1 && parents[1].qVal > parents[0].qVal) {
            bestParent = parents[1];
            otherParent = parents[0];
        }

        const avgQDelta = GROWTH_RATES[settings.growthType][mode];
        const stoneMultiplier = doubleStones ? 2 : 1;

        let singleBreedStonesCost = 0;
        if (settings.useStonesCost) {
            requiredStones.forEach(st => {
                const unitPrice = settings.stonePrices[st.name] || 0;
                singleBreedStonesCost += (st.baseQty * stoneMultiplier) * unitPrice;
            });
        }

        const projections = [];
        let maxBreedsNeededOverall = 0;

        if (bestParent && bestParent.qVal > 0) {
            QUALITY_TIERS.forEach(tier => {
                if (bestParent.qVal < tier.min) {
                    const diff = tier.min - bestParent.qVal;
                    const breedsNeeded = Math.ceil(diff / avgQDelta);
                    if (breedsNeeded > maxBreedsNeededOverall) {
                        maxBreedsNeededOverall = breedsNeeded;
                    }

                    const killsNeeded = breedsNeeded * KILLS_PER_EGG;
                    const hoursNeeded = settings.killsPerHour > 0 ? parseFloat((killsNeeded / settings.killsPerHour).toFixed(1)) : null;

                    const totalPheromones = breedsNeeded * PHEROMONES_PER_BREED;
                    const baseCostTotal = breedsNeeded * COST_PER_BREED_GOLD;
                    const pheroCostTotal = mode === 'pheromones' ? totalPheromones * settings.pheromoneUnitPrice : 0;
                    const stonesCostTotal = breedsNeeded * singleBreedStonesCost;
                    const totalCostGold = baseCostTotal + pheroCostTotal + stonesCostTotal;

                    projections.push({
                        tier: tier.label,
                        targetQualityMin: tier.min,
                        breedsNeeded,
                        killsNeeded,
                        hoursNeeded,
                        pheromonesNeeded: mode === 'pheromones' ? totalPheromones : 0,
                        costs: {
                            baseFeeGold: baseCostTotal,
                            pheromonesGold: pheroCostTotal,
                            stonesGold: stonesCostTotal,
                            totalGold: totalCostGold
                        }
                    });
                }
            });
        }

        // Single continuous progressive sequence up to highest tier needed
        const progressiveMaterialSequence = [];
        if (bestParent && bestParent.qVal > 0 && maxBreedsNeededOverall > 0) {
            let currentQ = bestParent.qVal;
            for (let step = 1; step <= maxBreedsNeededOverall; step++) {
                const childQ = currentQ + avgQDelta;
                const minSecQ = Math.max(0, currentQ - MAX_QUALITY_DIFF);
                const maxSecQ = Math.max(0, currentQ - 0.01);

                progressiveMaterialSequence.push({
                    breedStep: step,
                    minSecondaryQuality: parseFloat(minSecQ.toFixed(4)),
                    maxSecondaryQuality: parseFloat(maxSecQ.toFixed(4)),
                    childResultingQuality: parseFloat(childQ.toFixed(4)),
                    targetTierReached: getTierLabelForQ(childQ)
                });

                currentQ = childQ;
            }
        }

        return {
            exportTimestamp: new Date().toISOString(),
            parents: {
                parent1: parents[0] ? { name: parents[0].name, iv: parents[0].ivVal, quality: parents[0].qVal } : null,
                parent2: parents[1] ? { name: parents[1].name, iv: parents[1].ivVal, quality: parents[1].qVal } : null,
                inheritedBestParent: bestParent ? { name: bestParent.name, iv: bestParent.ivVal, quality: bestParent.qVal } : null
            },
            settings: {
                calculationMode: mode,
                growthSystem: settings.growthType === 'avg' ? 'Average' : 'Minimum',
                growthDeltaPerBreed: avgQDelta,
                pheromoneUnitPrice: settings.pheromoneUnitPrice,
                killsPerHour: settings.killsPerHour,
                useStonesCost: settings.useStonesCost,
                doubleStonesActive: doubleStones,
                stonePrices: settings.stonePrices,
                requiredStones: requiredStones.map(st => ({
                    name: st.name,
                    baseQty: st.baseQty,
                    effectiveQtyPerBreed: st.baseQty * stoneMultiplier,
                    unitPrice: settings.stonePrices[st.name] || 0
                }))
            },
            projections,
            progressiveMaterialSequence
        };
    }

    // 7. Convert Payload to CSV Format (Clean & Deduplicated)
    function convertPayloadToCSV(payload) {
        let csv = '\uFEFF'; // UTF-8 BOM

        // Parents Info
        csv += '--- PARENTS INFO ---\n';
        csv += 'Slot,Name,IV,Quality\n';
        if (payload.parents.parent1) {
            csv += `Parent 1,"${payload.parents.parent1.name}",${payload.parents.parent1.iv},${payload.parents.parent1.quality}\n`;
        }
        if (payload.parents.parent2) {
            csv += `Parent 2,"${payload.parents.parent2.name}",${payload.parents.parent2.iv},${payload.parents.parent2.quality}\n`;
        }
        if (payload.parents.inheritedBestParent) {
            csv += `Inherited Best,"${payload.parents.inheritedBestParent.name}",${payload.parents.inheritedBestParent.iv},${payload.parents.inheritedBestParent.quality}\n`;
        }

        // Settings
        csv += '\n--- SETTINGS ---\n';
        csv += `Mode,${payload.settings.calculationMode}\n`;
        csv += `Growth System,${payload.settings.growthSystem}\n`;
        csv += `Growth Delta (+Q),${payload.settings.growthDeltaPerBreed}\n`;
        csv += `Pheromone Unit Price,${payload.settings.pheromoneUnitPrice}\n`;
        csv += `Kills per Hour,${payload.settings.killsPerHour || 0}\n`;
        csv += `Calculate with Stones,${payload.settings.useStonesCost}\n`;
        csv += `Double Stones Active,${payload.settings.doubleStonesActive}\n`;

        if (payload.settings.requiredStones.length > 0) {
            csv += '\n--- STONES REQUIRED ---\n';
            csv += 'Stone Name,Base Qty,Effective Qty,Unit Price\n';
            payload.settings.requiredStones.forEach(st => {
                csv += `"${st.name}",${st.baseQty},${st.effectiveQtyPerBreed},${st.unitPrice}\n`;
            });
        }

        // Tier Projections
        csv += '\n--- ESTIMATED PROJECTIONS BY TIER ---\n';
        csv += 'Tier,Target Q,Breeds Needed,Kills Needed,Hours Needed,Pheromones Needed,Base Fee Gold,Pheromones Gold,Stones Gold,Total Gold\n';
        payload.projections.forEach(p => {
            csv += `"${p.tier}",${p.targetQualityMin},${p.breedsNeeded},${p.killsNeeded},${p.hoursNeeded || ''},${p.pheromonesNeeded},${p.costs.baseFeeGold},${p.costs.pheromonesGold},${p.costs.stonesGold},${p.costs.totalGold}\n`;
        });

        // Unique Progressive Material Breakdown
        csv += '\n--- PROGRESSIVE MATERIAL BREAKDOWN (SEQUENCE) ---\n';
        csv += 'Breed Step,Min Sec Quality,Max Sec Quality,Child Quality Result,Tier Reached\n';
        payload.progressiveMaterialSequence.forEach(s => {
            csv += `${s.breedStep},${s.minSecondaryQuality},${s.maxSecondaryQuality},${s.childResultingQuality},"${s.targetTierReached}"\n`;
        });

        return csv;
    }

    // 8. Main Render Loop
    function runCalculatorLoop() {
        const pairSection = document.querySelector('.brd-col-pair');

        if (!pairSection) {
            lastStateSignature = '';
            return;
        }

        if (!document.querySelector('.brd-custom-box')) {
            const customBox = document.createElement('div');
            customBox.className = 'brd-custom-box';

            customBox.innerHTML = `
                <div class="brd-custom-head">CALCULATOR</div>
                <div class="brd-custom-content">
                    <div class="brd-no-poke">Select Pokémon in the Breeding Pair</div>
                </div>
            `;

            pairSection.appendChild(customBox);
            lastStateSignature = '';
        }

        const parents = getSelectedParents();
        const mode = getSelectedMode();
        const requiredStones = getRequiredStones();
        const doubleStones = isDoubleStonesChecked();

        const currentStateSignature = JSON.stringify({ parents, mode, requiredStones, doubleStones, settings });

        if (currentStateSignature === lastStateSignature) return;
        lastStateSignature = currentStateSignature;

        const boxEl = document.querySelector('.brd-custom-box');
        if (!boxEl) return;

        if (parents.length === 0) {
            boxEl.innerHTML = `
                <div class="brd-custom-head">CALCULATOR</div>
                <div class="brd-custom-content">
                    <div class="brd-no-poke">Select Pokémon in the Breeding Pair</div>
                </div>
            `;
            return;
        }

        // Preserve Scroll
        const contentContainerPrev = document.querySelector('.brd-custom-content');
        const prevScrollTop = contentContainerPrev ? contentContainerPrev.scrollTop : 0;

        const activeEl = document.activeElement;
        const activeId = activeEl ? activeEl.id : null;
        let cursorPosStart = 0;
        let cursorPosEnd = 0;

        if (activeEl && activeEl.tagName === 'INPUT' && activeEl.type === 'text') {
            cursorPosStart = activeEl.selectionStart;
            cursorPosEnd = activeEl.selectionEnd;
        }

        // Find Best Parent by Q
        let bestParent = parents[0];
        let otherParent = null;

        if (parents.length > 1) {
            if (parents[1].qVal > parents[0].qVal) {
                bestParent = parents[1];
                otherParent = parents[0];
            } else {
                otherParent = parents[1];
            }
        }

        // IV Warning Tooltip
        const isLosingIv = otherParent && (otherParent.ivVal >= bestParent.ivVal + 1);
        const warnIconHtml = isLosingIv
            ? `<img class="brd-iv-warn-ico" alt="Warning" title="Warning: IV loss! The parent with higher quality has lower IV (Other parent: IV ${otherParent.ivVal})" src="/assets/topmenu/playerWarning.png">`
            : '';

        // Growth Delta
        const avgQDelta = GROWTH_RATES[settings.growthType][mode];
        const projectedQVal = bestParent.qVal + avgQDelta;
        const projectedQStr = `Q ${projectedQVal.toFixed(4)}`;

        const qColor = getQualityColor(projectedQVal);
        const modeLabel = mode === 'pheromones' ? 'PHEROMONES MODE' : 'FREE MODE';
        const growthTypeLabel = settings.growthType === 'avg' ? 'AVERAGE' : 'MINIMUM';

        const stoneMultiplier = doubleStones ? 2 : 1;

        let singleBreedStonesCost = 0;
        if (settings.useStonesCost) {
            requiredStones.forEach(st => {
                const unitPrice = settings.stonePrices[st.name] || 0;
                singleBreedStonesCost += (st.baseQty * stoneMultiplier) * unitPrice;
            });
        }

        // Fixed Top Blocks
        let htmlBox = `
            <div class="brd-custom-head">CALCULATOR</div>
            <div class="brd-poke-info">
                <span class="brd-poke-tag">Child</span>
                <span class="brd-poke-name">${bestParent.name}</span>
                <div class="brd-poke-stats">
                    <span class="brd-stat-chip iv">${warnIconHtml}IV ${bestParent.ivVal}</span>
                    <span class="brd-stat-chip q" style="color: ${qColor}; border-color: ${qColor};" title="Best parent Quality (${bestParent.qVal}) + ΔQ (${avgQDelta})">${projectedQStr}</span>
                </div>
            </div>
            <div class="brd-custom-content">
        `;

        // Scrollable Tiers
        if (bestParent.qVal > 0) {
            htmlBox += `
                <div class="brd-tiers-container">
                    <div class="brd-tier-title">Estimated Breeds (${modeLabel} - ${growthTypeLabel})</div>
            `;

            QUALITY_TIERS.forEach(tier => {
                if (bestParent.qVal < tier.min) {
                    const diff = tier.min - bestParent.qVal;
                    const breedsNeeded = Math.ceil(diff / avgQDelta);
                    const killsNeeded = breedsNeeded * KILLS_PER_EGG;

                    let timeStr = '';
                    if (settings.killsPerHour > 0) {
                        const hoursNeeded = (killsNeeded / settings.killsPerHour).toFixed(1);
                        timeStr = ` - ${hoursNeeded}h`;
                    }

                    const totalPheromones = breedsNeeded * PHEROMONES_PER_BREED;
                    const baseCostTotal = breedsNeeded * COST_PER_BREED_GOLD;
                    const pheroCostTotal = mode === 'pheromones' ? totalPheromones * settings.pheromoneUnitPrice : 0;
                    const stonesCostTotal = breedsNeeded * singleBreedStonesCost;

                    const totalCostGold = baseCostTotal + pheroCostTotal + stonesCostTotal;
                    const costInMillions = (totalCostGold / 1000000).toLocaleString(undefined, { maximumFractionDigits: 1 });

                    let costTooltip = `Base Fee: ${formatM(baseCostTotal)}`;
                    if (mode === 'pheromones') {
                        costTooltip += `\nPheromones: ${formatM(pheroCostTotal)}`;
                    }
                    if (settings.useStonesCost && stonesCostTotal > 0) {
                        costTooltip += `\nStones: ${formatM(stonesCostTotal)}`;
                    }
                    costTooltip += `\nTotal: ${formatM(totalCostGold)}`;

                    const tierLabelColor = getQualityColor(tier.min);
                    const isExpanded = settings.expandedTierLabel === tier.label;
                    const activeRowClass = isExpanded ? 'active' : '';

                    htmlBox += `
                        <div class="brd-tier-row ${activeRowClass}" data-tierlabel="${tier.label}">
                            <span>
                                <strong class="brd-tier-label" style="color: ${tierLabelColor};">${tier.label}</strong>
                                <span class="brd-tier-target">(${tier.min.toFixed(1)}+)</span>
                            </span>
                            <div class="brd-tier-right">
                                <span class="brd-tier-count">~${breedsNeeded.toLocaleString()} ${breedsNeeded === 1 ? 'breed' : 'breeds'}</span>
                                <span class="brd-tier-kills" title="Total hunt defeats required (${killsNeeded.toLocaleString()} kills)">(${formatKills(killsNeeded)}${timeStr})</span>
                                ${mode === 'pheromones' ? `
                                    <span class="brd-tier-phero" title="Total pheromones required">
                                        <img alt="Strange Pheromone" width="13" height="13" draggable="false" src="/assets/items/strange_pheromone.png">
                                        ${totalPheromones.toLocaleString()}
                                    </span>
                                ` : ''}
                                <span class="brd-tier-cost" title="${costTooltip}">
                                    <img class="brd-cur-ico" alt="$" width="13" height="13" draggable="false" src="/assets/market/dollar.png">
                                    $${costInMillions}M
                                </span>
                            </div>
                        </div>
                    `;

                    // Material Breakdown Subsection
                    if (isExpanded) {
                        htmlBox += `
                            <div class="brd-subtiers-wrap">
                                <div class="brd-subtiers-head">Step-by-Step Material Range (Reduced -0.01)</div>
                                <div class="brd-subtiers-scroll">
                        `;

                        let currentQ = bestParent.qVal;
                        for (let step = 1; step <= breedsNeeded; step++) {
                            const childQ = currentQ + avgQDelta;

                            const minSecQ = Math.max(0, currentQ - MAX_QUALITY_DIFF);
                            const maxSecQ = Math.max(0, currentQ - 0.01);

                            const minSecColor = getQualityColor(minSecQ);
                            const maxSecColor = getQualityColor(maxSecQ);
                            const childColor = getQualityColor(childQ);

                            htmlBox += `
                                <div class="brd-subtier-item">
                                    <span class="brd-subtier-step">Breed #${step}</span>
                                    <span>Secondary Material: <strong class="brd-subtier-q" style="color: ${minSecColor};">Q ${minSecQ.toFixed(2)}</strong> to <strong class="brd-subtier-q" style="color: ${maxSecColor};">Q ${maxSecQ.toFixed(2)}</strong></span>
                                    <span>Child: <strong class="brd-subtier-q" style="color: ${childColor};">Q ${childQ.toFixed(4)}</strong></span>
                                </div>
                            `;

                            currentQ = childQ;
                        }

                        htmlBox += `
                                </div>
                            </div>
                        `;
                    }
                }
            });

            htmlBox += `</div>`;
        }

        // Settings Section
        const foldArrow = settings.isFolded ? '►' : '▼';
        const bodyClass = settings.isFolded ? 'hidden' : '';

        let stonesInputsHtml = '';
        if (requiredStones.length > 0) {
            stonesInputsHtml += `<div class="brd-stones-settings-container">`;
            stonesInputsHtml += `
                <label class="brd-checkbox-label">
                    <input type="checkbox" id="useStonesCheckbox" ${settings.useStonesCost ? 'checked' : ''}>
                    <span>Calculate with stones (${doubleStones ? '2× Double active' : '1× Normal'})</span>
                </label>
            `;

            requiredStones.forEach((st, idx) => {
                const currentPrice = settings.stonePrices[st.name] || '';
                const disabledAttr = settings.useStonesCost ? '' : 'disabled';
                const effectiveQty = st.baseQty * stoneMultiplier;

                stonesInputsHtml += `
                    <div class="brd-setting-item" style="justify-content: space-between;">
                        <span>$ ${st.name} (${effectiveQty}×):</span>
                        <input type="text" class="stone-price-input" data-stonename="${st.name}" id="stoneInput_${idx}" value="${currentPrice}" placeholder="0" inputmode="numeric" autocomplete="off" ${disabledAttr}>
                    </div>
                `;
            });
            stonesInputsHtml += `</div>`;
        }

        htmlBox += `
            <div class="brd-settings-wrap">
                <span class="brd-settings-toggle" id="settingsToggleBtn">${foldArrow} Settings</span>
                <div class="brd-settings-body ${bodyClass}">
                    <div class="brd-settings-row">
                        <div class="brd-setting-item">
                            <span>$ Pheromone:</span>
                            <input type="text" id="pheroPriceInput" value="${settings.pheromoneUnitPrice}" inputmode="numeric" autocomplete="off">
                        </div>
                        <div class="brd-setting-item">
                            <span>Kills/h:</span>
                            <input type="text" id="killsPerHourInput" value="${settings.killsPerHour || ''}" placeholder="0" inputmode="numeric" autocomplete="off">
                        </div>
                    </div>
                    ${stonesInputsHtml}
                    <div class="brd-settings-row">
                        <span>Growth System:</span>
                        <div class="brd-radio-group">
                            <label title="Average Growth (+0.0096 Free / +0.1875 Phero)">
                                <input type="radio" name="growthRadio" value="avg" ${settings.growthType === 'avg' ? 'checked' : ''}>
                                Average
                            </label>
                            <label title="Minimum Growth (+0.0050 Free / +0.1500 Phero)">
                                <input type="radio" name="growthRadio" value="min" ${settings.growthType === 'min' ? 'checked' : ''}>
                                Minimum
                            </label>
                        </div>
                    </div>
                    <div class="brd-export-row">
                        <button type="button" class="brd-export-btn" id="exportJsonBtn" title="Copy full data as JSON to clipboard">Export JSON</button>
                        <button type="button" class="brd-export-btn" id="exportCsvBtn" title="Copy full data as CSV to clipboard">Export CSV</button>
                    </div>
                </div>
            </div>
            </div>
        `;

        boxEl.innerHTML = htmlBox;

        // Restore Scroll
        const contentContainerNew = document.querySelector('.brd-custom-content');
        if (contentContainerNew) {
            contentContainerNew.scrollTop = prevScrollTop;
        }

        // Listeners
        const tierRows = document.querySelectorAll('.brd-tier-row');
        tierRows.forEach(row => {
            row.addEventListener('click', (e) => {
                const label = row.getAttribute('data-tierlabel');
                settings.expandedTierLabel = (settings.expandedTierLabel === label) ? null : label;
                lastStateSignature = '';
            });
        });

        const toggleBtn = document.getElementById('settingsToggleBtn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                settings.isFolded = !settings.isFolded;
                lastStateSignature = '';
            });
        }

        const useStonesCb = document.getElementById('useStonesCheckbox');
        if (useStonesCb) {
            useStonesCb.addEventListener('change', (e) => {
                settings.useStonesCost = e.target.checked;
                lastStateSignature = '';
            });
        }

        const stoneInputs = document.querySelectorAll('.stone-price-input');
        stoneInputs.forEach(input => {
            input.addEventListener('input', (e) => {
                let cleanVal = e.target.value.replace(/\D/g, '');
                e.target.value = cleanVal;
                const stoneName = e.target.getAttribute('data-stonename');
                const val = parseInt(cleanVal, 10);
                settings.stonePrices[stoneName] = isNaN(val) ? 0 : val;
                lastStateSignature = '';
            });
        });

        const pheroInput = document.getElementById('pheroPriceInput');
        if (pheroInput) {
            pheroInput.addEventListener('input', (e) => {
                let cleanVal = e.target.value.replace(/\D/g, '');
                e.target.value = cleanVal;
                const val = parseInt(cleanVal, 10);
                settings.pheromoneUnitPrice = isNaN(val) ? 0 : val;
                lastStateSignature = '';
            });
        }

        const killsInput = document.getElementById('killsPerHourInput');
        if (killsInput) {
            killsInput.addEventListener('input', (e) => {
                let cleanVal = e.target.value.replace(/\D/g, '');
                e.target.value = cleanVal;
                const val = parseInt(cleanVal, 10);
                settings.killsPerHour = isNaN(val) ? 0 : val;
                lastStateSignature = '';
            });
        }

        const radios = document.querySelectorAll('input[name="growthRadio"]');
        radios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                settings.growthType = e.target.value;
                lastStateSignature = '';
            });
        });

        // Export Handlers
        const exportJsonBtn = document.getElementById('exportJsonBtn');
        if (exportJsonBtn) {
            exportJsonBtn.addEventListener('click', () => {
                const payload = generateExportPayload();
                const jsonText = JSON.stringify(payload, null, 2);
                navigator.clipboard.writeText(jsonText).then(() => {
                    exportJsonBtn.textContent = 'Copied!';
                    setTimeout(() => { exportJsonBtn.textContent = 'Export JSON'; }, 1500);
                }).catch(err => {
                    console.error('Clipboard error:', err);
                });
            });
        }

        const exportCsvBtn = document.getElementById('exportCsvBtn');
        if (exportCsvBtn) {
            exportCsvBtn.addEventListener('click', () => {
                const payload = generateExportPayload();
                const csvText = convertPayloadToCSV(payload);
                navigator.clipboard.writeText(csvText).then(() => {
                    exportCsvBtn.textContent = 'Copied!';
                    setTimeout(() => { exportCsvBtn.textContent = 'Export CSV'; }, 1500);
                }).catch(err => {
                    console.error('Clipboard error:', err);
                });
            });
        }

        // Restore Focus
        if (activeId) {
            const restoredEl = document.getElementById(activeId);
            if (restoredEl) {
                restoredEl.focus();
                try {
                    restoredEl.setSelectionRange(cursorPosStart, cursorPosEnd);
                } catch (err) {}
            }
        }
    }

    setInterval(runCalculatorLoop, 250);
})();
