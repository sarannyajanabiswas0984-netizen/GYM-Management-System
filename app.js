

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

  const name       = document.getElementById("name").value.trim();
  const age        = Number(document.getElementById("age").value);
  const goal       = document.getElementById("goal").value;
  const membership = document.getElementById("membership").value;
  const joinDate   = document.getElementById("joinDate").value;

  if (!name || name.length < 2)        { showAlert("❌ Full name is required (min 2 chars)."); return; }
  if (!age || age < 1 || age > 100)    { showAlert("❌ Age must be between 1 and 100."); return; }
  if (!goal)                           { showAlert("❌ Please select a fitness goal."); return; }
  if (!membership)                     { showAlert("❌ Please select a membership plan."); return; }
  if (!joinDate)                       { showAlert("❌ Please select the Joining Date (not Date of Birth)."); return; }

  const dup = members.find(m => m.name.toLowerCase() === name.toLowerCase());
  if (dup) { showAlert(`⚠️ Member "${name}" already exists.`); return; }

  members.push({
    id: Date.now(),
    name, age, goal, membership, joinDate,
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
  if (!m.checkIn)   { showAlert("⚠️ Please check in first."); return; }
  if (m.checkOut)   { showAlert("⚠️ Already checked out."); return; }
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
  setTimeout(() => div.remove(), 3500);
}

// ══════════════════════════════════════════════
//  DIET PLAN DATA — per goal
// ══════════════════════════════════════════════
const dietPlans = {
  "6 Pack Abs": {
    color: "#ff4d00",
    icon: "🔥",
    eat: [
      "Egg whites & whole eggs (high protein)",
      "Chicken breast, turkey, lean fish",
      "Brown rice, oats, sweet potato (complex carbs)",
      "Leafy greens: spinach, broccoli, kale",
      "Greek yogurt & cottage cheese",
      "Almonds, walnuts (healthy fats in moderation)",
      "Green tea & plenty of water (3–4 L/day)"
    ],
    avoid: [
      "Sugary drinks: soda, juices, energy drinks",
      "White bread, pasta, refined flour items",
      "Fried & fast foods",
      "Alcohol (causes belly fat)",
      "Ice cream, sweets & chocolates",
      "Processed meats (sausage, bacon)",
      "Excess salt (causes water retention)"
    ],
    tip: "Combine a calorie deficit with core workouts. Abs are made in the kitchen!"
  },
  "Weight Loss": {
    color: "#22c55e",
    icon: "⚖️",
    eat: [
      "Fruits: apple, papaya, watermelon, berries",
      "Vegetables: cucumber, tomato, carrot, beans",
      "Lentils, dal, chickpeas (high fibre & protein)",
      "Poha, idli, upma (light Indian meals)",
      "Buttermilk, low-fat curd",
      "Whole wheat roti, brown rice",
      "Soups & salads before main meals"
    ],
    avoid: [
      "Deep-fried snacks: samosa, pakoda, chips",
      "Sugary chai, coffee with full-cream milk",
      "White rice in excess",
      "Sweets: ladoo, halwa, barfi",
      "Packaged biscuits & namkeen",
      "Aerated drinks & fruit juices",
      "Late-night eating"
    ],
    tip: "Eat smaller portions 5–6 times a day. Never skip breakfast!"
  },
  "Muscle Gain": {
    color: "#3b82f6",
    icon: "💪",
    eat: [
      "Chicken, egg, fish, paneer (protein sources)",
      "Whole milk, whey protein shake",
      "Brown rice, sweet potato, banana (carbs for energy)",
      "Peanut butter & almond butter",
      "Rajma, chana, soya chunks",
      "Dry fruits: dates, raisins, cashews",
      "Pre & post-workout meals are key"
    ],
    avoid: [
      "Skipping meals (muscles need constant fuel)",
      "Junk food with empty calories",
      "Excess alcohol (suppresses testosterone)",
      "Too much cardio (burns muscle)",
      "Low-calorie crash diets",
      "Carbonated drinks",
      "Trans fats (margarine, packaged snacks)"
    ],
    tip: "Eat in a calorie surplus. Aim for 1.6–2.2g protein per kg of bodyweight daily."
  },
  "Lean Bulk": {
    color: "#a855f7",
    icon: "📈",
    eat: [
      "Lean meats: turkey, tuna",
      "Eggs (whole + whites)",
      "Oats, quinoa, sweet potato",
      "Low-fat dairy: paneer, Greek yogurt",
      "Nuts & seeds in small amounts",
      "Whey protein post-workout",
      "Lots of vegetables for micronutrients"
    ],
    avoid: [
      "Dirty bulk foods: burgers, pizza, fries",
      "Excess sugar and sweets",
      "High-fat dairy in large amounts",
      "Processed and packaged foods",
      "Soft drinks",
      "Skipping rest days",
      "Overeating (lean bulk = moderate surplus only)"
    ],
    tip: "Aim for only 200–300 extra calories above maintenance. Slow and clean gains."
  },
  "Fat Burn": {
    color: "#f59e0b",
    icon: "🔥",
    eat: [
      "Green vegetables: spinach, broccoli, zucchini",
      "Lean proteins: egg whites, fish, chicken",
      "Green tea, black coffee (boosts metabolism)",
      "Apple cider vinegar (diluted in water)",
      "Grapefruit, berries (low-sugar fruits)",
      "Chia seeds, flaxseeds",
      "Plenty of water throughout the day"
    ],
    avoid: [
      "Sugary foods and drinks",
      "Refined carbs (white bread, maida)",
      "Alcohol",
      "Butter, ghee in large quantities",
      "Fruit juices (high sugar)",
      "Processed snack foods",
      "Eating 2–3 hours before bed"
    ],
    tip: "HIIT workouts + intermittent fasting is the fastest way to burn fat."
  },
  "Body Toning": {
    color: "#ec4899",
    icon: "✨",
    eat: [
      "Chicken, fish, eggs (lean protein)",
      "Quinoa, oats, brown rice",
      "Green salads with olive oil dressing",
      "Fruits rich in antioxidants",
      "Low-fat yogurt & milk",
      "Almonds, walnuts (handful per day)",
      "Hydration: 2.5–3 L water daily"
    ],
    avoid: [
      "Excess sodium (bloating)",
      "Deep-fried snacks",
      "High-sugar desserts",
      "Full-fat dairy in excess",
      "White flour products",
      "Carbonated drinks",
      "Skipping leg day meals 😄"
    ],
    tip: "Focus on resistance training + light cardio. High reps, moderate weight."
  },
  "General Fitness": {
    color: "#14b8a6",
    icon: "🏃",
    eat: [
      "Balanced meals: protein + carbs + fats",
      "Dal, sabzi, roti, rice (traditional balanced meal)",
      "Seasonal fruits and vegetables",
      "Eggs, milk, curd (daily)",
      "Nuts and seeds as snacks",
      "Whole grain bread and cereals",
      "Stay well hydrated"
    ],
    avoid: [
      "Junk & fast food regularly",
      "Excessive sugar and sweets",
      "Too much caffeine",
      "Skipping meals",
      "Packaged ready-to-eat foods",
      "Excess oil in cooking",
      "Sodas and aerated drinks"
    ],
    tip: "Consistency matters more than perfection. Eat 80% clean, 20% flexible."
  },
  "Strength Training": {
    color: "#f97316",
    icon: "🏋️",
    eat: [
      "Red meat  — rich in creatine",
      "Whole eggs — testosterone support",
      "Milk, paneer, whey protein",
      "Complex carbs: oats, rice, potato (fuel for lifts)",
      "Beets and spinach (nitric oxide boost)",
      "Banana pre-workout",
      "Creatine monohydrate supplement (optional)"
    ],
    avoid: [
      "Low-protein diets",
      "Excessive alcohol (weakens recovery)",
      "Long gaps between meals",
      "Skipping post-workout nutrition",
      "Junk food on heavy lift days",
      "Excess caffeine (disrupts sleep = poor recovery)",
      "Highly processed foods"
    ],
    tip: "Progressive overload + enough protein + deep sleep = strength gains."
  },
  "Powerlifting": {
    color: "#dc2626",
    icon: "🏆",
    eat: [
      "Very high protein: 2–2.5g per kg bodyweight",
      "Red meat, whole eggs, fish",
      "High carbs around training sessions",
      "Full-fat dairy for calories",
      "Peanut butter, almond butter",
      "Carb loading before competition",
      "Electrolytes: sodium, potassium, magnesium"
    ],
    avoid: [
      "Calorie deficit (you need surplus for strength)",
      "Fasted training without fuel",
      "Low-carb diets (reduces performance)",
      "Alcohol before competition",
      "Dehydration",
      "Excessive fiber before lifting (causes discomfort)",
      "Skipping warm-up meals"
    ],
    tip: "Eat big to lift big. Focus on squat, bench, deadlift. Sleep 8–9 hours."
  },
  "Endurance & Stamina": {
    color: "#0ea5e9",
    icon: "🌬️",
    eat: [
      "Complex carbohydrates: pasta, rice, oats",
      "Bananas and dates (quick energy)",
      "Electrolyte drinks during long sessions",
      "Iron-rich foods: spinach, beetroot, lentils",
      "Lean proteins for muscle repair",
      "Coconut water post-workout",
      "Chia seeds in water (hydration + energy)"
    ],
    avoid: [
      "High-fat meals before training",
      "Spicy foods before cardio",
      "Dehydration (major stamina killer)",
      "Sugary energy drinks (short crash follows)",
      "Too much dairy before long runs",
      "Skipping carbs (main fuel for endurance)",
      "Alcohol (dehydrates and reduces VO2 max)"
    ],
    tip: "Carbs are your fuel. Never train long distances in a fasted state."
  },
  "Cardio Fitness": {
    color: "#ef4444",
    icon: "❤️",
    eat: [
      "Light carbs pre-workout: banana, toast",
      "Lean proteins for recovery",
      "Watermelon, cucumber (hydration-rich)",
      "Low-fat yogurt",
      "Coconut water (natural electrolytes)",
      "Beetroot juice (improves VO2 max)",
      "Green tea (fat metabolism)"
    ],
    avoid: [
      "Heavy meals before cardio sessions",
      "Deep-fried foods",
      "Sugary snacks",
      "Dehydration",
      "Alcohol",
      "High sodium foods (raises BP)",
      "Carbonated drinks before cardio"
    ],
    tip: "Stay hydrated before, during, and after cardio. Moderate intensity for 30–45 min daily is ideal."
  },
  "Flexibility & Mobility": {
    color: "#8b5cf6",
    icon: "🧘",
    eat: [
      "Anti-inflammatory foods: turmeric, ginger",
      "Omega-3 rich foods: flaxseed, walnuts, fish",
      "Vitamin C: citrus fruits, amla, bell peppers (collagen for joints)",
      "Calcium: milk, curd, ragi (bone health)",
      "Magnesium: banana, dark chocolate, nuts",
      "Plenty of water (lubricates joints)",
      "Green leafy vegetables daily"
    ],
    avoid: [
      "Processed foods (increase inflammation)",
      "Sugary drinks",
      "Excess alcohol (dehydrates tissues)",
      "Red meat in excess",
      "Refined oils",
      "Fast food",
      "Skipping rest and recovery"
    ],
    tip: "Yoga + stretching + good hydration = excellent flexibility over time."
  },
  "Functional Fitness": {
    color: "#10b981",
    icon: "⚡",
    eat: [
      "Balanced macros: protein + carbs + fats",
      "Eggs, chicken, fish, lentils",
      "Brown rice, quinoa, sweet potato",
      "Colourful vegetables daily",
      "Fruits: banana, apple, mango",
      "Healthy fats: avocado, olive oil, nuts",
      "Adequate hydration for joint health"
    ],
    avoid: [
      "Processed and packaged foods",
      "Excess sugar",
      "Alcohol",
      "Fried foods",
      "Skipping post-workout protein",
      "Low-calorie crash diets",
      "Energy drinks"
    ],
    tip: "Functional fitness = moving well in real life. Focus on compound movements + balance."
  },
  "CrossFit": {
    color: "#f43f5e",
    icon: "🔄",
    eat: [
      "High protein: chicken, eggs, fish",
      "Paleo-friendly: vegetables, fruits, nuts",
      "Sweet potato, yam for carb fuel",
      "Protein shake within 30 min post-WOD",
      "Coconut oil for healthy cooking",
      "Berries (antioxidant recovery)",
      "Plenty of water + electrolytes"
    ],
    avoid: [
      "Grains and gluten (Paleo approach)",
      "Dairy (for strict CrossFitters)",
      "Sugar and sweets",
      "Alcohol",
      "Processed foods",
      "Vegetable oils (canola, soybean)",
      "Legumes in some protocols"
    ],
    tip: "WODs are intense — eat a proper meal 2 hrs before, and recover with protein immediately after."
  },
  "HIIT Training": {
    color: "#fb923c",
    icon: "⏱️",
    eat: [
      "Banana or dates 30 min before HIIT",
      "Lean protein post-session: eggs, chicken",
      "Complex carbs: oats, whole wheat",
      "Berries for antioxidant recovery",
      "Greek yogurt with honey (recovery meal)",
      "Coconut water for electrolytes",
      "Plenty of water (HIIT = heavy sweat)"
    ],
    avoid: [
      "Large meals 1 hr before HIIT",
      "High-fat meals pre-workout (slows digestion)",
      "Sugary snacks (causes crash mid-session)",
      "Alcohol (impairs recovery severely)",
      "Carbonated drinks",
      "Dehydration",
      "Fried or greasy foods"
    ],
    tip: "HIIT burns fat for 24–48 hrs after session. Eat clean to maximise this afterburn effect."
  },
  "Calisthenics": {
    color: "#06b6d4",
    icon: "🤸",
    eat: [
      "Moderate high protein: eggs, chicken, paneer",
      "Carbs for bodyweight movements: rice, oats",
      "Fruits for quick energy",
      "Nuts and seeds for healthy fats",
      "Lentils and legumes",
      "Whole grains",
      "Green vegetables and salads"
    ],
    avoid: [
      "Excess body weight from high-fat diet",
      "Heavy meals before training",
      "Junk food",
      "Excess alcohol",
      "Low-protein diets (muscles need repair)",
      "Carbonated drinks",
      "High-sodium packaged snacks"
    ],
    tip: "Calisthenics favours a lean physique. Keep body weight in check for easier muscle-ups!"
  },
  "Stress Relief": {
    color: "#6366f1",
    icon: "🧠",
    eat: [
      "Dark chocolate (70%+ cocoa) — reduces cortisol",
      "Chamomile or ashwagandha tea",
      "Omega-3 rich: walnuts, flaxseed, fish",
      "Bananas (serotonin boost)",
      "Turmeric milk (haldi doodh) before bed",
      "Fermented foods: curd, idli (gut-brain connection)",
      "Magnesium-rich foods: leafy greens, nuts"
    ],
    avoid: [
      "Excess caffeine (increases anxiety)",
      "Alcohol (depressant, worsens stress long-term)",
      "Sugary foods (blood sugar spikes = mood swings)",
      "Processed and junk food",
      "Skipping meals (drops blood sugar = irritability)",
      "Energy drinks",
      "Excess sodium (raises cortisol)"
    ],
    tip: "Combine yoga, meditation, and balanced meals. Sleep 7–8 hours for stress recovery."
  },
  "Posture Correction": {
    color: "#84cc16",
    icon: "🦴",
    eat: [
      "Calcium: milk, curd, ragi, sesame seeds",
      "Vitamin D: sunlight + fortified foods, fatty fish",
      "Magnesium: banana, pumpkin seeds, spinach",
      "Collagen: bone broth, amla, citrus fruits",
      "Anti-inflammatory: turmeric, ginger",
      "Potassium: banana, potato, coconut water",
      "Water for spinal disc health"
    ],
    avoid: [
      "Processed foods (trigger inflammation)",
      "Carbonated drinks (leach calcium from bones)",
      "Excess alcohol",
      "High-sugar diet (weakens connective tissue)",
      "Too much caffeine (affects calcium absorption)",
      "Smoking",
      "Low-calcium diet"
    ],
    tip: "Strengthen your core and back muscles with targeted exercises alongside a bone-health diet."
  },
  "Post-Injury Rehab": {
    color: "#f472b6",
    icon: "🩺",
    eat: [
      "High protein for tissue repair: eggs, chicken, fish",
      "Vitamin C: amla, citrus, guava (collagen synthesis)",
      "Zinc: pumpkin seeds, chickpeas, meat",
      "Omega-3: fish oil, flaxseed (reduces inflammation)",
      "Turmeric + black pepper (anti-inflammatory)",
      "Bone broth (collagen and minerals)",
      "Adequate calories to support healing"
    ],
    avoid: [
      "Alcohol (severely impairs healing)",
      "Sugary foods ",
      "Processed and fried foods",
      "Excess sodium ",
      "Crash diets / calorie restriction during rehab",
      "Smoking",
      "NSAIDs overuse (ask your doctor)"
    ],
    tip: "Recovery nutrition is as important as physiotherapy. Never rush back to training."
  },
  "Sports Performance": {
    color: "#fbbf24",
    icon: "⚽",
    eat: [
      "High carb on game days: pasta, rice, roti",
      "Lean protein daily: chicken, fish, eggs",
      "Creatine (for explosive sports)",
      "Beetroot juice pre-game (improves endurance)",
      "Banana + peanut butter (pre-match snack)",
      "Electrolytes during match: coconut water, ORS",
      "Recovery shake post-game: protein + carbs"
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

// ── DIET MODAL OPEN ───────────────────────────
function openDietModal(index) {
  const m    = members[index];
  const plan = dietPlans[m.goal];

  if (!plan) {
    showAlert("ℹ️ No specific diet plan available for this goal yet.");
    return;
  }

  const eatItems  = plan.eat.map(i  => `<li>✅ ${i}</li>`).join("");
  const avoidItems = plan.avoid.map(i => `<li>❌ ${i}</li>`).join("");

  document.getElementById("modalContent").innerHTML = `
    <div class="modal-header" style="border-left: 5px solid ${plan.color}">
      <div class="modal-goal-icon">${plan.icon}</div>
      <div>
        <h2 class="modal-title">${esc(m.name)}'s Diet Plan</h2>
        <p class="modal-goal-name" style="color:${plan.color}">Goal: ${esc(m.goal)}</p>
      </div>
    </div>

    <div class="diet-tip">
      💡 <strong>Pro Tip:</strong> ${plan.tip}
    </div>

    <div class="diet-columns">
      <div class="diet-col eat-col">
        <h3>🥗 What to EAT</h3>
        <ul>${eatItems}</ul>
      </div>
      <div class="diet-col avoid-col">
        <h3>🚫 What to AVOID</h3>
        <ul>${avoidItems}</ul>
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

// ── EXTEND MODAL ──────────────────────────────
let extendTargetIndex = null;

function openExtendModal(index) {
  extendTargetIndex = index;
  const m = members[index];
  document.getElementById("extendMemberName").innerText  = "👤 " + m.name;
  document.getElementById("extendCurrentPlan").innerText = m.membership;
  document.getElementById("extendModal").classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeExtendModal(e) {
  if (e.target === document.getElementById("extendModal")) closeExtendModalBtn();
}
function closeExtendModalBtn() {
  document.getElementById("extendModal").classList.remove("active");
  document.body.style.overflow = "";
  extendTargetIndex = null;
}

function confirmExtend() {
  if (extendTargetIndex === null) return;
  const addOn = document.getElementById("extendSelect").value;
  const m = members[extendTargetIndex];

  // Append to existing plan
  const planMap = {
    "1 Month": 1, "3 Months": 3, "6 Months": 6,
    "1 Year": 12, "2 Years": 24, "3 Years": 36, "4 Years": 48
  };
  const existing = planMap[m.membership] || 0;
  const adding   = planMap[addOn] || 0;
  const total    = existing + adding;

  let newPlan = "";
  if (total <= 1)       newPlan = "1 Month";
  else if (total <= 3)  newPlan = "3 Months";
  else if (total <= 6)  newPlan = "6 Months";
  else if (total <= 12) newPlan = "1 Year";
  else if (total <= 24) newPlan = "2 Years";
  else if (total <= 36) newPlan = "3 Years";
  else                  newPlan = "4 Years";

  m.membership = newPlan;
  saveData();
  displayMembers(getCurrentList());
  closeExtendModalBtn();
  showAlert(`✅ ${m.name}'s plan extended! New plan: ${newPlan}`, "success");
}

// ── INIT ──────────────────────────────────────
displayMembers();