const socket = io();

let userId = localStorage.getItem("habibis_userId");
let userName = localStorage.getItem("habibis_userName");

const joinScreen = document.getElementById("join-screen");
const appEl = document.getElementById("app");
const userNameEl = document.getElementById("user-name");
const plansList = document.getElementById("plans-list");
const calendarSummary = document.getElementById("calendar-summary");
const weekBanner = document.getElementById("week-banner");
const DIAS_ORDEN = ["Jueves", "Viernes", "Sábado", "Domingo"];
const groupSizeInput = document.getElementById("group-size");
const addPlanDialog = document.getElementById("add-plan-dialog");

let lastState = null;

function showApp() {
joinScreen.classList.add("hidden");
appEl.classList.remove("hidden");
userNameEl.textContent = userName;
}

if (userId && userName) {
showApp();
}

document.getElementById("join-btn").addEventListener("click", async () => {
const name = document.getElementById("name-input").value.trim();
if (!name) return;
const res = await fetch("/api/join", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ name }),
});
const data = await res.json();
userId = data.userId;
userName = data.name;
localStorage.setItem("habibis_userId", userId);
localStorage.setItem("habibis_userName", userName);
showApp();
});

document.getElementById("add-plan-btn").addEventListener("click", () => {
addPlanDialog.showModal();
});
document.getElementById("cancel-add-plan").addEventListener("click", () => {
addPlanDialog.close();
});

document.getElementById("add-plan-form").addEventListener("submit", async (e) => {
e.preventDefault();
const form = e.target;
const payload = Object.fromEntries(new FormData(form).entries());
payload.addedBy = userName;
await fetch("/api/plans", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify(payload),
});
form.reset();
addPlanDialog.close();
});

let groupSizeDebounce;
groupSizeInput.addEventListener("input", () => {
clearTimeout(groupSizeDebounce);
groupSizeDebounce = setTimeout(async () => {
const groupSize = Number(groupSizeInput.value);
if (!groupSize || groupSize < 1) return;
await fetch("/api/group-size", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ groupSize }),
});
}, 400);
});

async function vote(planId) {
if (!userId) return;
await fetch("/api/vote", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ planId, userId }),
});
}

function money(n) {
return "$" + Math.round(n).toLocaleString("es-MX");
}

function render(state) {
lastState = state;
if (document.activeElement !== groupSizeInput) {
groupSizeInput.value = state.groupSize;
}

if (weekBanner) {
weekBanner.textContent = state.weekLabel ? `📅 ${state.weekLabel}` : "";
}

const dias = state.dias && state.dias.length ? state.dias : DIAS_ORDEN;

const porDia = {};
dias.forEach((d) => (porDia[d] = []));
state.plans.forEach((plan) => {
const d = porDia[plan.dia] ? plan.dia : dias[dias.length - 1];
porDia[d].push(plan);
});

const resumenItems = dias.map((d) => {
const ganador = porDia[d][0];
if (ganador && ganador.votos > 0) {
return `<div class="calendar-day-pill"><b>${escapeHtml(d)}</b>: 🏆 ${escapeHtml(ganador.name)} · ${money(ganador.totalPorPersona)}/persona</div>`;
}
return `<div class="calendar-day-pill calendar-day-pill-empty"><b>${escapeHtml(d)}</b>: sin votos aún</div>`;
});
calendarSummary.innerHTML = `<div class="calendar-summary-title">📅 Calendario Jueves–Domingo</div><div class="calendar-summary-grid">${resumenItems.join("")}</div>`;

plansList.innerHTML = "";
dias.forEach((d) => {
const planesDelDia = porDia[d];
const section = document.createElement("section");
section.className = "day-section";

const header = document.createElement("div");
header.className = "day-header";
header.innerHTML = `<span class="day-title">${escapeHtml(d)}</span>`;
section.appendChild(header);

const group = document.createElement("div");
group.className = "plans-list";

if (planesDelDia.length === 0) {
const empty = document.createElement("p");
empty.className = "day-empty";
empty.textContent = "Aún no hay planes sugeridos para este día.";
group.appendChild(empty);
}

planesDelDia.forEach((plan, idx) => {
const card = document.createElement("div");
card.className = "plan-card" + (idx === 0 && plan.votos > 0 ? " leading" : "");

const hasVoted = plan.votes.includes(userId);

card.innerHTML = `
<div class="plan-top">
<div>
<p class="plan-name">${idx === 0 && plan.votos > 0 ? "🏆 " : ""}${escapeHtml(plan.name)}</p>
<p class="plan-zone">${escapeHtml(plan.zone)}</p>
<p class="plan-tipo">${escapeHtml(plan.tipo || "")}</p>
</div>
<button class="vote-btn ${hasVoted ? "voted" : ""}" data-plan="${plan.id}">
${hasVoted ? "✓ Votaste" : "Votar"} (${plan.votos})
</button>
</div>
${
plan.vibe && plan.vibe.length
? `<div class="plan-tags">${plan.vibe.map((v) => `<span class="tag">${escapeHtml(v)}</span>`).join("")}</div>`
: ""
}
<div class="budget-row">
<span>Cover: <b>${money(plan.cover)}</b>${plan.coverNota ? ` <i>(${escapeHtml(plan.coverNota)})</i>` : ""}</span>
<span>Consumo prom.: <b>${money(plan.consumoPromedio)}</b></span>
<span>Traslado (ida y vuelta): <b>${money(plan.transporteCosto * 2)}</b>${plan.transporteNota ? ` <i>(${escapeHtml(plan.transporteNota)})</i>` : ""}</span>
</div>
<div class="plan-total">Total estimado por persona: <b>${money(plan.totalPorPersona)}</b> · Grupo completo: <b>${money(plan.totalPorPersona * lastStateGroupSize(state))}</b></div>
${plan.fuente ? `<div class="plan-source"><a href="${escapeAttr(plan.fuente)}" target="_blank" rel="noopener">Fuente</a> · sugerido por ${escapeHtml(plan.addedBy || "Anónimo")}</div>` : `<div class="plan-source">Sugerido por ${escapeHtml(plan.addedBy || "Anónimo")}</div>`}
`;

card.querySelector(".vote-btn").addEventListener("click", () => vote(plan.id));
group.appendChild(card);
});

section.appendChild(group);
plansList.appendChild(section);
});
}

function lastStateGroupSize(state) {
return state.groupSize || 1;
}

function escapeHtml(str) {
return String(str).replace(/[&<>"']/g, (c) => ({
"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[c]));
}
function escapeAttr(str) {
return escapeHtml(str);
}

socket.on("state", render);
