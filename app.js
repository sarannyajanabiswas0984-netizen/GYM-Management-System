// ── DOM REFERENCES ────────────────────────────
const memberForm  = document.getElementById("memberForm");
const memberTable = document.getElementById("memberTable");
const searchInput = document.getElementById("search");
const themeBtn    = document.getElementById("themeBtn");
const emptyMsg    = document.getElementById("emptyMsg");

// ── Load from localStorage ────────────────────
let members = [];
try {
  members = JSON.parse(localStorage.getItem("gymMembers")) || [];
} catch (e) {
  members = [];
}

// ── SAVE ──────────────────────────────────────
function saveData() {
  localStorage.setItem("gymMembers", JSON.stringify(members));
}

// ── CLOCK ─────────────────────────────────────
function updateClock() {
  const now = new Date();
  document.getElementById("clock").innerText =
    "🇮🇳 IST: " + now.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" });
}
setInterval(updateClock, 1000);
updateClock();

// ── THEME ─────────────────────────────────────
themeBtn.addEventListener("click", () => {
  document.body.classList.toggle("light-mode");
});

// ── DASHBOARD ─────────────────────────────────
function updateDashboard() {
  document.getElementById("totalMembers").innerText = members.length;
  const active = members.filter(m => m.checkIn && !m.checkOut).length;
  document.getElementById("activeMembers").innerText = active;
  const planSet = new Set(members.map(m => m.membership).filter(Boolean));
  document.getElementById("activePlans").innerText = planSet.size;
}

// ── DURATION CALC ─────────────────────────────
function calcDuration(inStr, outStr) {
  try {
    const base = new Date().toDateString();
    const inT  = new Date(base + " " + inStr);
    const outT = new Date(base + " " + outStr);
    if (isNaN(inT) || isNaN(outT)) return "N/A";
    let diff = outT - inT;
    if (diff < 0) diff += 86400000;
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return h > 0 ? `${h}h ${m}m` : `${m} min`;
  } catch { return "N/A"; }
}

// ── ESCAPE HTML ───────────────────────────────
function esc(str) {
  return String(str)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

// ── HEALTH BADGE HELPER ───────────────────────
function getHealthBadgeHTML(member) {
  const db  = member.diabetesStatus  || "";
  const wt  = member.weightStatus    || "";

  let dbClass = "pill-nondiabetic", dbLabel = "✅ Non-Diabetic";
  if (db === "pre-diabetic")      { dbClass = "pill-prediabetic"; dbLabel = "⚠️ Pre-Diabetic"; }
  if (db === "diabetic-type1")    { dbClass = "pill-diabetic";    dbLabel = "💉 Diabetic T1"; }
  if (db === "diabetic-type2")    { dbClass = "pill-diabetic";    dbLabel = "🩸 Diabetic T2"; }

  let wtClass = "pill-normal", wtLabel = "✅ Normal";
  if (wt === "underweight") { wtClass = "pill-under";     wtLabel = "📉 Underweight"; }
  if (wt === "overweight")  { wtClass = "pill-overweight"; wtLabel = "⚖️ Overweight"; }
  if (wt === "obese")       { wtClass = "pill-obese";      wtLabel = "🔴 Obese"; }

  return `<div class="health-badge">
    <span class="health-pill ${dbClass}">${dbLabel}</span>
    <span class="health-pill ${wtClass}">${wtLabel}</span>
  </div>`;
}

// ── DISPLAY MEMBERS ───────────────────────────
function displayMembers(list) {
  const toShow = Array.isArray(list) ? list : members;
  memberTable.innerHTML = "";

  if (toShow.length === 0) {
    emptyMsg.style.display = "block";
    updateDashboard();
    return;
  }
  emptyMsg.style.display = "none";

  toShow.forEach((member, i) => {
    const realIdx = members.findIndex(m => m.id === member.id);
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${i + 1}</td>
      <td><strong>${esc(member.name)}</strong></td>
      <td>${member.age}</td>
      <td>${esc(member.goal)}</td>
      <td><span class="badge">${esc(member.membership)}</span></td>
      <td>${getHealthBadgeHTML(member)}</td>
      <td>${member.joinDate}</td>
      <td>
        <button class="attend" onclick="checkIn(${realIdx})">Check In</button>
        <div class="time-label">${member.checkIn || "—"}</div>
      </td>
      <td>
        <button class="checkout" onclick="checkOut(${realIdx})">Check Out</button>
        <div class="time-label">${member.checkOut || "—"}</div>
      </td>
      <td><span class="duration-tag">${member.duration || "—"}</span></td>
      <td>
        <button class="viewbtn" onclick="openDietModal(${realIdx})">👁 View</button>
      </td>
      <td>
        <button class="delete" onclick="deleteMember(${realIdx})">🗑 Remove</button>
      </td>
    `;
    memberTable.appendChild(row);
  });

  updateDashboard();
}

// ── ADD MEMBER ────────────────────────────────
memberForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const name            = document.getElementById("name").value.trim();
  const age             = Number(document.getElementById("age").value);
  const goal            = document.getElementById("goal").value;
  const membership      = document.getElementById("membership").value;
  const joinDate        = document.getElementById("joinDate").value;
  const diabetesStatus  = document.getElementById("diabetesStatus").value;
  const weightStatus    = document.getElementById("weightStatus").value;

  // Validations
  if (!name || name.length < 2)
    { showAlert("❌ Full name is required (min 2 characters)."); return; }

  // Age: strictly 17–100
  if (!age || age < 17 || age > 100)
    { showAlert("❌ Age must be between 17 and 100 years. Members below 17 or above 100 cannot be registered."); return; }

  if (!goal)
    { showAlert("❌ Please select a fitness goal."); return; }
  if (!membership)
    { showAlert("❌ Please select a membership plan."); return; }
  if (!joinDate)
    { showAlert("❌ Please select the joining date."); return; }
  if (!diabetesStatus)
    { showAlert("❌ Please select the diabetes status (Health Section)."); return; }
  if (!weightStatus)
    { showAlert("❌ Please select the weight status (Health Section)."); return; }

  const dup = members.find(m => m.name.toLowerCase() === name.toLowerCase());
  if (dup) { showAlert(`⚠️ Member "${name}" already exists.`); return; }

  members.push({
    id: Date.now(),
    name, age, goal, membership, joinDate,
    diabetesStatus, weightStatus,
    checkIn: "", checkOut: "", duration: ""
  });

  saveData();
  displayMembers();
  memberForm.reset();
  showAlert("✅ Member added successfully!", "success");
});

// ── CHECK IN ──────────────────────────────────
function checkIn(index) {
  const m = members[index];
  if (m.checkIn && !m.checkOut) { showAlert("⚠️ Already checked in. Check out first."); return; }
  m.checkIn  = new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" });
  m.checkOut = "";
  m.duration = "";
  saveData();
  displayMembers(getCurrentList());
}

// ── CHECK OUT ─────────────────────────────────
function checkOut(index) {
  const m = members[index];
  if (!m.checkIn)  { showAlert("⚠️ Please check in first."); return; }
  if (m.checkOut)  { showAlert("⚠️ Already checked out."); return; }
  m.checkOut = new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" });
  m.duration = calcDuration(m.checkIn, m.checkOut);
  saveData();
  displayMembers(getCurrentList());
}

// ── DELETE ────────────────────────────────────
function deleteMember(index) {
  if (!confirm(`Remove "${members[index].name}"? This cannot be undone.`)) return;
  members.splice(index, 1);
  saveData();
  displayMembers(getCurrentList());
}

// ── SEARCH ────────────────────────────────────
searchInput.addEventListener("input", () => {
  displayMembers(getCurrentList());
});

function getCurrentList() {
  const val = searchInput.value.trim().toLowerCase();
  if (!val) return members;
  return members.filter(m => m.name.toLowerCase().includes(val));
}

// ── ALERT ─────────────────────────────────────
function showAlert(msg, type = "error") {
  const ex = document.getElementById("gymAlert");
  if (ex) ex.remove();
  const div = document.createElement("div");
  div.id = "gymAlert";
  div.className = "gym-alert " + type;
  div.innerText = msg;
  document.querySelector(".container").prepend(div);
  setTimeout(() => div.remove(), 4000);
}

/* ════════════════════════════════════════════════════════════════
   BASE DIET PLANS
   Rules enforced throughout:
   • Meat = chicken or fish ONLY (no red meat, pork, lamb, etc.)
   • Items are marked as health-safe or risky for diabetics / overweight
════════════════════════════════════════════════════════════════ */
const dietPlans = {
  "6 Pack Abs": {
    color: "#ff4d00", icon: "🔥",
    eat: [
      "Egg whites & whole eggs (high protein)",
      "Chicken breast (grilled / boiled) — lean protein",
      "Fish: rohu, katla, salmon, tuna — omega-3 & protein",
      "Brown rice, oats, sweet potato (complex carbs)",
      "Leafy greens: spinach, broccoli, kale",
      "Greek yogurt & cottage cheese (paneer)",
      "Almonds, walnuts — healthy fats in moderation",
      "Green tea & water (3–4 L/day)"
    ],
    avoid: [
      "Sugary drinks: soda, juices, energy drinks",
      "White bread, pasta, refined flour (maida) items",
      "Fried & fast foods",
      "Alcohol — causes belly fat",
      "Ice cream, sweets & chocolates",
      "Processed meats — sausage, bacon, red meat",
      "Excess salt — causes water retention"
    ],
    tip: "Combine a calorie deficit with core workouts. Abs are truly made in the kitchen!"
  },

  "Weight Loss": {
    color: "#22c55e", icon: "⚖️",
    eat: [
      "Fruits: apple, papaya, watermelon, berries",
      "Vegetables: cucumber, tomato, carrot, beans",
      "Lentils, dal, chickpeas — high fibre & protein",
      "Poha, idli, upma — light Indian meals",
      "Buttermilk, low-fat curd",
      "Boiled / grilled chicken breast — low-calorie protein",
      "Fish: rohu, tuna — lean, filling protein",
      "Whole wheat roti, brown rice (small portions)",
      "Soups & salads before main meals"
    ],
    avoid: [
      "Deep-fried foods — samosa, puri, pakoda",
      "Sugary drinks — soda, packaged juices",
      "White rice in large portions",
      "Sweets, mithai, chocolates",
      "Red meat, mutton, pork",
      "Late-night heavy meals",
      "Butter, ghee in excess",
      "Alcohol"
    ],
    tip: "Eat slowly, chew well, stop at 80% full. Small sustainable deficits beat crash diets."
  },

  "Muscle Gain": {
    color: "#f59e0b", icon: "💪",
    eat: [
      "Chicken breast & thigh — high protein for muscle repair",
      "Fish: salmon, tuna, rohu — protein + omega-3",
      "Eggs (whole) — complete amino acid profile",
      "Paneer / cottage cheese — casein protein",
      "Whole milk or low-fat milk",
      "Rice, roti, oats, sweet potato — carbs for energy",
      "Lentils, rajma, chickpeas — plant protein",
      "Banana post-workout for quick carbs",
      "Nuts & peanut butter — healthy fats + calories"
    ],
    avoid: [
      "Processed junk food — empty calories",
      "Alcohol — kills testosterone & protein synthesis",
      "Sugary drinks",
      "Skipping meals — muscles need consistent fuel",
      "Red meat & pork (high saturated fat)",
      "Trans fats — biscuits, packaged snacks",
      "Crash diets"
    ],
    tip: "Eat 5–6 small meals. Protein within 30 min post-workout is critical for muscle repair."
  },

  "Lean Bulk": {
    color: "#a78bfa", icon: "📈",
    eat: [
      "Grilled chicken — calorie-controlled protein",
      "Fish: tuna, pomfret — lean protein",
      "Eggs — complete protein",
      "Brown rice, oats, sweet potato",
      "Avocado, olive oil — quality fats",
      "Mixed nuts (small portions)",
      "Dahi / Greek yogurt",
      "Seasonal fruits",
      "Whole grain roti"
    ],
    avoid: [
      "Dirty bulk foods — pizza, burgers, excess junk",
      "Too much refined sugar",
      "Red meat & processed meats",
      "Alcohol",
      "Liquid calories in excess",
      "Skipping cardio entirely",
      "Trans fats"
    ],
    tip: "Aim for 200–300 calorie surplus only. Clean sources let you gain muscle without excessive fat."
  },

  "Fat Burn": {
    color: "#fb923c", icon: "🔥",
    eat: [
      "Grilled chicken — thermogenic protein",
      "Fish: salmon, mackerel — omega-3 boosts fat metabolism",
      "Green tea (3 cups/day) — natural fat burner",
      "Apple cider vinegar (diluted) before meals",
      "Eggs for breakfast — keeps you full longer",
      "Leafy vegetables — very low calorie",
      "Coconut water — hydration without sugar",
      "Cinnamon in oats — regulates blood sugar",
      "Berries — low sugar, high antioxidants"
    ],
    avoid: [
      "Refined carbs — maida, white rice, bread",
      "Sugary drinks including packaged juices",
      "Excess dairy fat",
      "Red meat",
      "Alcohol",
      "Skipping breakfast",
      "Late-night snacking"
    ],
    tip: "Combine intermittent fasting (16:8) with cardio for maximum fat burn results."
  },

  "Body Toning": {
    color: "#34d399", icon: "✨",
    eat: [
      "Grilled / steamed chicken — lean protein",
      "Fish: rohu, surmai — light protein",
      "Egg whites",
      "Low-fat dahi / Greek yogurt",
      "Quinoa, oats, brown rice (measured portions)",
      "Green vegetables — spinach, broccoli, beans",
      "Cucumber, carrot, celery — low calorie snacks",
      "Plenty of water — 3 L+/day"
    ],
    avoid: [
      "Excess carbs — causes water retention & bloating",
      "High-sodium packaged foods",
      "Alcohol",
      "Sugary drinks",
      "Fried foods",
      "Red meat",
      "Excess dairy fat"
    ],
    tip: "Toning is fat loss + light resistance training. Protein protects your muscle while you lean down."
  },

  "General Fitness": {
    color: "#38bdf8", icon: "🏃",
    eat: [
      "Balanced meals: roti / rice + dal + sabzi + salad",
      "Chicken (2–3 times/week) — good protein source",
      "Fish (1–2 times/week) — heart-healthy",
      "Eggs — versatile protein",
      "Seasonal fruits & vegetables",
      "Low-fat dahi / buttermilk",
      "Whole grains — oats, brown rice, multigrain roti",
      "Water — at least 2.5–3 L/day"
    ],
    avoid: [
      "Ultra-processed packaged foods",
      "Excess sugar",
      "Sugary drinks",
      "Red meat in excess",
      "Fried snacks daily",
      "Alcohol",
      "Skipping any major meal"
    ],
    tip: "Eat like your grandparents did — whole foods, home-cooked, balanced. Simple wins."
  },

  "Strength Training": {
    color: "#fbbf24", icon: "🏋️",
    eat: [
      "High-protein chicken — breast or thigh",
      "Fish: tuna, salmon — protein + omega-3 for joints",
      "Eggs (4–6/day) — complete amino acids",
      "Paneer, low-fat dairy",
      "Rice + roti — carbs to fuel heavy lifts",
      "Rajma, chole, lentils — plant protein",
      "Creatine (supplement) — proven strength aid",
      "Banana pre-workout — quick energy",
      "Milk + protein shake post-workout"
    ],
    avoid: [
      "Alcohol — impairs recovery severely",
      "Sugary drinks pre-workout (causes crash)",
      "Insufficient calories — can't build strength in deficit",
      "Processed meats — sausage, salami",
      "Red meat (stick to chicken & fish)",
      "Skipping post-workout nutrition",
      "Low-carb diets during heavy training phases"
    ],
    tip: "Progressive overload + adequate protein = strength gains. Eat enough to lift heavy."
  },

  "Powerlifting": {
    color: "#ef4444", icon: "🏆",
    eat: [
      "Chicken (large portions) — primary protein",
      "Fish: tuna, salmon — secondary protein + anti-inflammatory",
      "Eggs — 6–8/day for elite athletes",
      "Rice, roti, pasta — high carbs to fuel max lifts",
      "Potatoes, sweet potatoes — energy dense",
      "Dahi, paneer, milk",
      "Nuts, peanut butter — calorie dense healthy fats",
      "Creatine monohydrate — essential for powerlifters"
    ],
    avoid: [
      "Alcohol — kills strength and recovery",
      "Junk food on meet day",
      "Skipping carbs — glycogen needed for 1RM attempts",
      "Red meat regularly (stick to chicken/fish)",
      "Crash dieting in-season",
      "Sugary drinks before training",
      "Dehydration"
    ],
    tip: "Powerlifting demands high calories and high protein. Eat to perform — aesthetics come later."
  },

  "Endurance & Stamina": {
    color: "#6ee7b7", icon: "🌬️",
    eat: [
      "Complex carbs: brown rice, oats, whole grain roti — primary fuel",
      "Chicken — lean protein for recovery",
      "Fish: mackerel, tuna — omega-3 reduces inflammation",
      "Bananas — quick energy during long sessions",
      "Dates & dry fruits — natural energy",
      "Coconut water — electrolyte replacement",
      "Beetroot juice pre-session — improves VO2 max",
      "Dahi / curd — recovery protein",
      "Plenty of water — 4 L+ on training days"
    ],
    avoid: [
      "Heavy high-fat meals before long runs",
      "Alcohol — reduces aerobic capacity",
      "Sugary drinks (cause mid-run crash)",
      "Dehydration — performance drops rapidly",
      "Red meat — hard to digest",
      "Fried foods",
      "Low-carb diets during endurance training"
    ],
    tip: "Carbohydrates are your engine. Don't fear them — fuel correctly and go further."
  },

  "Cardio Fitness": {
    color: "#f43f5e", icon: "❤️",
    eat: [
      "Oats with fruits — sustained energy pre-cardio",
      "Boiled chicken / egg whites — light post-cardio protein",
      "Fish — heart-healthy, low-calorie protein",
      "Fruits: banana, apple, watermelon",
      "Coconut water — natural electrolytes",
      "Green tea — improves fat oxidation",
      "Salads + soups — low calorie, filling",
      "Low-fat dahi"
    ],
    avoid: [
      "Heavy meals before cardio (causes cramps)",
      "Sugary drinks — leads to energy crash",
      "Red meat — hard to digest before cardio",
      "Excess caffeine",
      "Alcohol",
      "Fried snacks",
      "Skipping post-cardio protein"
    ],
    tip: "Fasted cardio in the morning (with water only) can accelerate fat loss for some people."
  },

  "Flexibility & Mobility": {
    color: "#c084fc", icon: "🧘",
    eat: [
      "Anti-inflammatory foods: turmeric, ginger, amla",
      "Omega-3: fish (salmon, sardines), flaxseed, walnuts",
      "Chicken bone broth — collagen for joints",
      "Citrus fruits — vitamin C for connective tissue",
      "Leafy greens: spinach, methi — magnesium for muscles",
      "Banana — potassium reduces cramping",
      "Pumpkin seeds — zinc + magnesium",
      "Water — joint lubrication",
      "Green tea — anti-inflammatory"
    ],
    avoid: [
      "Processed foods — increase inflammation",
      "Excess sugar — degrades collagen",
      "Alcohol — dehydrates and worsens stiffness",
      "Fried foods — pro-inflammatory",
      "Red meat — increases inflammation",
      "Carbonated drinks — calcium leaching",
      "Excess caffeine"
    ],
    tip: "Hydration and anti-inflammatory diet dramatically improve joint range of motion over time."
  },

  "Functional Fitness": {
    color: "#facc15", icon: "⚡",
    eat: [
      "Balanced protein: chicken, fish, eggs — for muscle function",
      "Complex carbs: rice, oats, sweet potato",
      "Vegetables across colours — micronutrients for daily function",
      "Lentils, dal — plant protein + fibre",
      "Fruits — antioxidants for recovery",
      "Nuts and seeds — healthy fats",
      "Dahi, buttermilk — gut health",
      "Water 3 L+"
    ],
    avoid: [
      "Processed and junk foods",
      "Excess salt and sugar",
      "Alcohol",
      "Red meat regularly",
      "Skipping meals — affects energy for daily tasks",
      "Carbonated drinks",
      "Low-nutrient packaged snacks"
    ],
    tip: "Functional fitness is about performing real-life movements. Eat to have consistent energy all day."
  },

  "CrossFit": {
    color: "#f97316", icon: "🔄",
    eat: [
      "Chicken — primary protein source",
      "Fish: tuna, salmon — protein + recovery support",
      "Eggs — quick preparation, complete protein",
      "Sweet potato, rice — fast fuel for WODs",
      "Banana pre-WOD — instant energy",
      "Dahi / Greek yogurt post-WOD",
      "Nuts and nut butter",
      "Leafy greens and vegetables",
      "Coconut water for electrolytes"
    ],
    avoid: [
      "Alcohol — destroys CrossFit recovery",
      "Sugary drinks",
      "Heavy meals within 90 min of WOD",
      "Red meat before training",
      "Trans fats and processed snacks",
      "Low-carb diets (CrossFit is high intensity = needs carbs)",
      "Dehydration"
    ],
    tip: "CrossFit demands both carbs AND protein. Time nutrition around your WOD for best performance."
  },

  "HIIT Training": {
    color: "#e879f9", icon: "⏱️",
    eat: [
      "Light chicken or egg pre-HIIT (1 hr before)",
      "Fish post-HIIT for anti-inflammatory recovery",
      "Banana or dates pre-session — quick carbs",
      "Oats pre-session for sustained energy",
      "Watermelon post-session — hydration + natural sugars",
      "Dahi / low-fat yogurt post-HIIT",
      "Protein shake with water post-session"
    ],
    avoid: [
      "Large meals 1 hr before HIIT",
      "High-fat meals pre-workout — slows digestion",
      "Sugary snacks — causes crash mid-session",
      "Alcohol — impairs recovery severely",
      "Carbonated drinks",
      "Dehydration",
      "Red meat or heavy protein before training"
    ],
    tip: "HIIT burns fat for 24–48 hrs after session. Eat clean to maximise this afterburn effect."
  },

  "Calisthenics": {
    color: "#06b6d4", icon: "🤸",
    eat: [
      "Chicken (moderate) — keeps bodyweight lean while building strength",
      "Fish: rohu, tuna — light protein, supports skill work",
      "Eggs — quick protein, easy to track",
      "Rice, oats — carbs for bodyweight movements",
      "Fruits for quick energy pre-session",
      "Lentils, legumes — plant protein",
      "Nuts and seeds for healthy fats",
      "Green vegetables and salads"
    ],
    avoid: [
      "Excess body weight from high-fat diet",
      "Heavy meals before training (affects skill movements)",
      "Junk food",
      "Excess alcohol",
      "Red meat in excess — adds unnecessary weight",
      "Carbonated drinks",
      "High-sodium packaged snacks"
    ],
    tip: "Calisthenics favours a lean physique. Keep body weight in check for easier muscle-ups!"
  },

  "Stress Relief": {
    color: "#6366f1", icon: "🧠",
    eat: [
      "Dark chocolate (70%+ cocoa) — reduces cortisol",
      "Chamomile or ashwagandha tea",
      "Walnuts, flaxseed — omega-3 for brain health",
      "Fish: salmon — omega-3 reduces anxiety",
      "Bananas — serotonin boost",
      "Turmeric milk (haldi doodh) before bed",
      "Fermented foods: dahi, idli — gut-brain axis",
      "Leafy greens, pumpkin seeds — magnesium"
    ],
    avoid: [
      "Excess caffeine — increases anxiety",
      "Alcohol — depressant, worsens stress long-term",
      "Sugary foods — blood sugar spikes = mood swings",
      "Processed and junk food",
      "Skipping meals — drops blood sugar = irritability",
      "Energy drinks",
      "Excess sodium — raises cortisol"
    ],
    tip: "Combine yoga, meditation, and balanced meals. Sleep 7–8 hours for stress recovery."
  },

  "Posture Correction": {
    color: "#84cc16", icon: "🦴",
    eat: [
      "Calcium: milk, dahi, ragi, sesame seeds",
      "Vitamin D: sunlight exposure + fish (sardines, salmon)",
      "Magnesium: banana, pumpkin seeds, spinach",
      "Chicken bone broth — collagen for spinal discs",
      "Amla, citrus fruits — vitamin C for connective tissue",
      "Anti-inflammatory: turmeric, ginger",
      "Potassium: banana, coconut water",
      "Water — spinal disc hydration"
    ],
    avoid: [
      "Processed foods — trigger inflammation",
      "Carbonated drinks — leach calcium from bones",
      "Excess alcohol",
      "High-sugar diet — weakens connective tissue",
      "Too much caffeine — affects calcium absorption",
      "Red meat regularly",
      "Low-calcium diet"
    ],
    tip: "Strengthen your core and back muscles with targeted exercises alongside a bone-health diet."
  },

  "Post-Injury Rehab": {
    color: "#f472b6", icon: "🩺",
    eat: [
      "High protein: chicken, fish — tissue repair",
      "Amla, citrus, guava — vitamin C for collagen synthesis",
      "Pumpkin seeds, chickpeas — zinc for healing",
      "Salmon, fish oil, flaxseed — omega-3 reduces inflammation",
      "Turmeric + black pepper — natural anti-inflammatory",
      "Chicken bone broth — collagen + minerals",
      "Eggs — complete amino acids",
      "Adequate total calories — body needs fuel to heal"
    ],
    avoid: [
      "Alcohol — severely impairs healing",
      "Sugary foods — slow tissue repair",
      "Processed and fried foods",
      "Excess sodium — increases swelling",
      "Crash diets / calorie restriction during rehab",
      "Red meat — inflammatory",
      "NSAIDs overuse — consult your doctor"
    ],
    tip: "Recovery nutrition is as important as physiotherapy. Never rush back to training."
  },

  "Sports Performance": {
    color: "#fbbf24", icon: "⚽",
    eat: [
      "High carb on game days: rice, roti, pasta",
      "Chicken — lean protein for daily recovery",
      "Fish: salmon, tuna — protein + omega-3 for endurance",
      "Beetroot juice pre-game — improves endurance",
      "Banana + peanut butter — pre-match snack",
      "Electrolytes during match: coconut water, ORS",
      "Eggs — quick protein post-game",
      "Recovery shake: protein + carbs within 30 min post-game"
    ],
    avoid: [
      "Heavy meals 2–3 hrs before competition",
      "Trying new foods on match day",
      "Alcohol night before",
      "Dehydration",
      "High-fat snacks before game",
      "Carbonated drinks during sport",
      "Skipping warm-up nutrition"
    ],
    tip: "Carb-load 2 days before competition. Hydration strategy is key for peak performance."
  }
};


// Items diabetics MUST avoid (appended to avoid list with red highlight)
const diabeticAvoid = [
  "🚨 White rice in large quantities — spikes blood sugar rapidly",
  "🚨 Maida / refined flour — high glycemic index",
  "🚨 Fruit juices & sugary drinks — immediate glucose spike",
  "🚨 Sweets, mithai, chocolates, ice cream",
  "🚨 Potatoes in excess (especially fried)",
  "🚨 Alcohol — unpredictable blood glucose effects",
  "🚨 Packaged breakfast cereals — hidden sugar",
  "🚨 Full-fat dairy in excess (Type 2)"
];

// Items beneficial for diabetics (appended to eat list with purple highlight)
const diabeticEat = [
  "🩺 Karela (bitter gourd) — natural blood sugar regulation",
  "🩺 Methi seeds (fenugreek) soaked in water — lowers glucose",
  "🩺 Cinnamon in oats or tea — improves insulin sensitivity",
  "🩺 Low-GI grains: barley, millets, oats — preferred over white rice",
  "🩺 Jamun (Indian blackberry) — known to help manage blood sugar",
  "🩺 Fish (grilled) — protein without carbs, heart-friendly",
  "🩺 Leafy greens in every meal — minimal glucose impact"
];

// Items overweight/obese MUST avoid (appended to avoid list)
const overweightAvoid = [
  "⚠️ High-calorie dense foods: fried snacks, pakoda, samosa",
  "⚠️ Liquid calories: lassi with sugar, sweetened chai, milkshakes",
  "⚠️ Excess ghee, butter, oil in cooking",
  "⚠️ Large portion sizes — even of healthy foods",
  "⚠️ Late-night eating — promotes fat storage",
  "⚠️ Refined carbs: white bread, puri, bhatura",
  "⚠️ Fast food and restaurant meals frequently"
];

// Items beneficial for overweight (appended to eat list)
const overweightEat = [
  "⚖️ High-volume low-calorie foods: cucumber, lettuce, tomato",
  "⚖️ Fibre-rich: oats, chia seeds, psyllium husk (isabgol) — keeps full",
  "⚖️ Warm water with lemon in the morning — metabolism boost",
  "⚖️ Green tea 2–3 cups/day — fat oxidation support",
  "⚖️ Boiled / grilled chicken — maximum protein, minimum fat",
  "⚖️ Eat in smaller plates — natural portion control",
  "⚖️ Mindful eating — eat slowly, chew 20 times"
];

// Combined both conditions
const dualConditionEat = [
  "🟣 Low-GI + low-calorie: karela, lauki, tinda, turai",
  "🟣 Grilled fish — ideal for both conditions (low fat, zero carbs)",
  "🟣 Boiled chicken (no skin) — pure lean protein",
  "🟣 Millets: jowar, bajra, ragi — low GI, filling, nutritious",
  "🟣 Cinnamon + fenugreek water daily — blood sugar + weight control",
  "🟣 Raw vegetable salads before main meals — reduces glycemic load",
  "🟣 Intermittent fasting (16:8) with doctor's approval — dual benefit"
];

const dualConditionAvoid = [
  "🚫 All refined carbs — spike both glucose and weight",
  "🚫 All sugary drinks, including packaged 'diet' drinks",
  "🚫 High-fat dairy — cream, full-fat paneer, butter",
  "🚫 Fruit juices — high sugar even from natural fruits",
  "🚫 Alcohol — dangerous combination with both conditions",
  "🚫 Restaurant / takeaway food — hidden sugar, fat, salt",
  "🚫 Skipping meals — worsens blood sugar swings"
];


function buildHealthWarning(member) {
  const db = member.diabetesStatus || "non-diabetic";
  const wt = member.weightStatus   || "normal-weight";

  const isDiabetic   = db !== "non-diabetic";
  const isOverweight = wt === "overweight" || wt === "obese";
  const isUnder      = wt === "underweight";

  let warnings = [];

  if (isDiabetic && isOverweight) {
    warnings.push({
      cls: "multi-warn",
      icon: "🟣",
      title: "Dual Health Alert: Diabetes + " + (wt === "obese" ? "Obesity" : "Overweight"),
      lines: [
        "This member has BOTH diabetes and weight concerns. Their diet requires extra care.",
        "Focus heavily on low-glycemic index AND low-calorie foods simultaneously.",
        "Strongly advise consulting a registered dietitian for a personalised plan.",
        "Below you'll find special combined recommendations marked in purple 🟣."
      ]
    });
  } else if (isDiabetic) {
    const typeLabel = db === "pre-diabetic" ? "Pre-Diabetic" : (db === "diabetic-type1" ? "Type 1 Diabetic" : "Type 2 Diabetic");
    warnings.push({
      cls: "diabetes-warn",
      icon: "🩸",
      title: `Diabetes Alert: ${typeLabel}`,
      lines: [
        "Standard diet plans may not suit this member. High-glycemic foods must be avoided.",
        "Prioritise low-GI carbohydrates and consistent meal timing to manage blood sugar.",
        db === "pre-diabetic"
          ? "Pre-diabetes is reversible with diet and exercise — this is a crucial window!"
          : "Blood glucose must be monitored. Diet changes should complement medical treatment.",
        "Diabetes-specific items are highlighted in the list below (🩺 teal markers)."
      ]
    });
  }

  if (isOverweight && !isDiabetic) {
    warnings.push({
      cls: "weight-warn",
      icon: "⚖️",
      title: wt === "obese" ? "Obesity Health Alert" : "Overweight Health Alert",
      lines: [
        "Many foods that are 'healthy' for a normal-weight person are still too calorie-dense here.",
        "Even chicken breast portions and rice servings should be measured carefully.",
        "Focus on high-volume, low-calorie, high-fibre foods to create a sustainable deficit.",
        "Overweight-specific items are highlighted in the list below (⚖️ orange markers)."
      ]
    });
  }

  if (isUnder) {
    warnings.push({
      cls: "weight-warn",
      icon: "📉",
      title: "Underweight Health Note",
      lines: [
        "This member needs a calorie surplus to reach a healthy weight.",
        "Increase portion sizes of complex carbs and healthy fats gradually.",
        "Focus on nutrient-dense foods — not junk food — for healthy weight gain.",
        "Consult a doctor to rule out any underlying medical cause of low weight."
      ]
    });
  }

  if (warnings.length === 0) return "";

  return warnings.map(w => `
    <div class="health-warning ${w.cls}">
      <strong>${w.icon} ${w.title}</strong>
      ${w.lines.map(l => `• ${l}`).join("<br>")}
    </div>
  `).join("");
}

function buildHealthAwareLists(plan, member) {
  const db = member.diabetesStatus || "non-diabetic";
  const wt = member.weightStatus   || "normal-weight";

  const isDiabetic   = db !== "non-diabetic";
  const isOverweight = wt === "overweight" || wt === "obese";

  let eatList   = [...plan.eat];
  let avoidList = [...plan.avoid];

  if (isDiabetic && isOverweight) {
    // Dual condition — show combined extra lists
    eatList   = eatList.concat(dualConditionEat);
    avoidList = avoidList.concat(dualConditionAvoid);
  } else if (isDiabetic) {
    eatList   = eatList.concat(diabeticEat);
    avoidList = avoidList.concat(diabeticAvoid);
  } else if (isOverweight) {
    eatList   = eatList.concat(overweightEat);
    avoidList = avoidList.concat(overweightAvoid);
  }

  // Determine CSS class for extra items
  const extraEatClass   = (isDiabetic && isOverweight) ? "health-extra" :
                          isDiabetic ? "health-extra" :
                          isOverweight ? "health-extra" : "";
  const extraAvoidClass = (isDiabetic || isOverweight) ? "health-danger" : "";

  const baseEatCount   = plan.eat.length;
  const baseAvoidCount = plan.avoid.length;

  const eatHTML = eatList.map((item, i) => {
    const cls = i >= baseEatCount ? `class="${extraEatClass}"` : "";
    return `<li ${cls}>✅ ${item}</li>`;
  }).join("");

  const avoidHTML = avoidList.map((item, i) => {
    const cls = i >= baseAvoidCount ? `class="${extraAvoidClass}"` : "";
    return `<li ${cls}>❌ ${item}</li>`;
  }).join("");

  return { eatHTML, avoidHTML };
}


function openDietModal(index) {
  const m    = members[index];
  const plan = dietPlans[m.goal];

  if (!plan) {
    showAlert("ℹ️ No specific diet plan available for this goal yet.");
    return;
  }

  const { eatHTML, avoidHTML } = buildHealthAwareLists(plan, m);
  const healthWarning           = buildHealthWarning(m);

  // Health tag labels for modal header
  const dbLabels = {
    "non-diabetic"   : { label: "✅ Non-Diabetic",   cls: "pill-nondiabetic" },
    "pre-diabetic"   : { label: "⚠️ Pre-Diabetic",   cls: "pill-prediabetic" },
    "diabetic-type1" : { label: "💉 Diabetic T1",    cls: "pill-diabetic" },
    "diabetic-type2" : { label: "🩸 Diabetic T2",    cls: "pill-diabetic" }
  };
  const wtLabels = {
    "normal-weight" : { label: "✅ Normal Weight",  cls: "pill-normal" },
    "underweight"   : { label: "📉 Underweight",    cls: "pill-under" },
    "overweight"    : { label: "⚖️ Overweight",     cls: "pill-overweight" },
    "obese"         : { label: "🔴 Obese",           cls: "pill-obese" }
  };

  const dbTag = dbLabels[m.diabetesStatus] || dbLabels["non-diabetic"];
  const wtTag = wtLabels[m.weightStatus]   || wtLabels["normal-weight"];

  document.getElementById("modalContent").innerHTML = `
    <div class="modal-header" style="border-left: 5px solid ${plan.color}">
      <div class="modal-goal-icon">${plan.icon}</div>
      <div>
        <h2 class="modal-title">${esc(m.name)}'s Diet Plan</h2>
        <p class="modal-goal-name" style="color:${plan.color}">Goal: ${esc(m.goal)}</p>
        <div class="modal-health-tags">
          <span class="health-pill ${dbTag.cls} modal-health-tag">${dbTag.label}</span>
          <span class="health-pill ${wtTag.cls} modal-health-tag">${wtTag.label}</span>
        </div>
      </div>
    </div>

    <div class="diet-tip">
      💡 <strong>Pro Tip:</strong> ${plan.tip}
    </div>

    ${healthWarning}

    <div class="diet-columns">
      <div class="diet-col eat-col">
        <h3>🥗 What to EAT</h3>
        <ul>${eatHTML}</ul>
      </div>
      <div class="diet-col avoid-col">
        <h3>🚫 What to AVOID</h3>
        <ul>${avoidHTML}</ul>
      </div>
    </div>
  `;

  document.getElementById("dietModal").classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeDietModal(e) {
  if (e.target === document.getElementById("dietModal")) closeDietModalBtn();
}
function closeDietModalBtn() {
  document.getElementById("dietModal").classList.remove("active");
  document.body.style.overflow = "";
}

// ── INIT ──────────────────────────────────────
displayMembers();