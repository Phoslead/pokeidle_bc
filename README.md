# Poke Idle - Breeding Center Calculator

An advanced calculation tool designed as a UI overlay for the Poke idle World Breeding Center.

---

## ⚡ Features

-  **Quality Projections:** Estimates total breeds, hunt kills, and hours needed for every quality tier (*Common* to *Divine*).
-  **Step-by-Step Material Chain:** Interactive breakdown displaying exact secondary material quality ranges ($\pm0.15$ Q) for each breed step.
-  **Evolution Stones & Pheromones:** Automatic detection for required stones and "Double Stones" multiplier with itemized Gold cost calculation.
-  **IV Loss Warning:** Instant visual alert if your higher-quality parent has lower IVs.
-  **Data Export:** Export complete project data directly to your clipboard in **JSON** or **CSV** format.

---
## 📸 Preview & Screenshots

#### Tool Overview
<img width="852" height="811" alt="image" src="https://github.com/user-attachments/assets/5a8e01fe-3df6-4bd1-a11d-99e4b6aed4f3" />

---

#### Material Chain Table
<img width="410" height="793" alt="image" src="https://github.com/user-attachments/assets/81869d0d-a377-4b5c-8d62-040d8c56cc05" />

---

#### Settings and Automatic Stone Detection
<img width="847" height="835" alt="image" src="https://github.com/user-attachments/assets/72014bb6-9e07-47fe-aed4-c5cdb725a206" />


---

#### JSON & CSV Export Format
<img width="1224" height="897" alt="image" src="https://github.com/user-attachments/assets/26cc4dc3-1b2e-4b80-b0fe-815c9d550d3e" />

#### IV Loss Warning
<img width="401" height="119" alt="image" src="https://github.com/user-attachments/assets/34b4e508-cb5a-439a-97e2-bf3f209fce47" />

---

## 📖 How to Use

1. **Select 2 Pokémon for Breeding:**
   - The tool automatically detects both Pokémon and their stats, as well as the active breeding mode (**Pheromones** or **Free**).
   - It also detects any required **Evolution Stones** and whether the **Double Stones** option is active.

2. **Configure Settings:**
   - **Pheromone Price:** Set the market or purchasing unit cost for pheromones (defaults to 100,000 Gold).
   - **Stone Prices:** Input the current market price for any required evolution stones if you want to include them in the total gold calculations.
   - **Kills/h:** Enter your hourly defeat rate to project total farming time.

3. **Select Growth System:**
   - **Minimum:** Uses the minimum growth delta per breed step (**+0.15** for Pheromones, **+0.005** for Free mode).
   - **Average:** Calculates expected growth based on weighted outcome probabilities (**~+0.1875** for Pheromones, ranging from +0.15 [50%] to +0.30 [5%]; **~+0.0096** for Free mode, ranging from +0.005 [50%] to +0.04 [5%]).

4. **View Projections & Material Chains:**
   - The table displays estimated breeds needed to reach each quality tier (*Common* through *Divine*), along with total Gold costs, required defeats (kills), and projected hours based on your Kills/h setting.
   - **Click on any quality tier row** to expand a step-by-step list showing the exact required Quality range for the secondary parent. *(Note: The primary parent is always the offspring resulting from the previous breed in the chain).*

5. **Export Data:**
   - Click **Export JSON** or **Export CSV** to copy the complete calculation payload directly to your clipboard for personal tracking or spreadsheet analysis.

---
## 🌐 Browser Compatibility

This userscript is compatible with any modern desktop browser running a script manager extension:

| Browser | Recommended Manager Extension |
| :--- | :--- |
| **Google Chrome / Brave / Edge** | [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/) |
| **Mozilla Firefox** | [Tampermonkey](https://www.tampermonkey.net/) or [Greasemonkey](https://addons.mozilla.org/firefox/addon/greasemonkey/) |
| **Opera / Opera GX** | [Tampermonkey](https://www.tampermonkey.net/) |
| **Safari** | [Tampermonkey](https://www.tampermonkey.net/) |

---

## 📦 Installation

### Option 1: Automatic Installation (Recommended)

1. Make sure you have a script manager extension (such as **Tampermonkey**) installed in your browser.
2. Click the link below to install the script automatically:

👉 **[INSTALL USERSCRIPT DIRECTLY](https://raw.githubusercontent.com/hariseld/pokeidle_bc/main/pokeidle_bc.user.js)** 👈

3. Tampermonkey will prompt an installation tab. Click **"Install"**.
4. Open or refresh the game tab!

---

### Option 2: Manual Installation

If the automatic link does not trigger your script manager, follow these steps:

1. Open your browser's extension panel for **Tampermonkey** and click **"Create a new script..."**.
2. Open the script file from this repository: [`pokeidle_bc.user.js`](https://github.com/hariseld/pokeidle_bc/blob/main/pokeidle_bc.user.js).
3. Copy the entire JavaScript code.
4. Paste the code inside the Tampermonkey script editor, replacing any default template text.
5. Save the script (**Ctrl + S** or `File -> Save`).
6. Refresh the game tab.

---
