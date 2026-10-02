/* FitAdapt – a workout app that learns from every session.
   Engine: double progression (reps first, then weight) + difficulty feedback + auto-deload. */

const KEY = 'fitadapt:v1';
const app = document.getElementById('app');
let S = JSON.parse(localStorage.getItem(KEY) || 'null');
const save = () => localStorage.setItem(KEY, JSON.stringify(S));

// ---------- Exercise library: each movement slot has a version per equipment level ----------
// w = starting kg (beginner), inc = smallest weight jump, bw = bodyweight (progress by reps only)
const LIB = {
  squat: { body: { n: 'Bodyweight Squat', bw: 1 }, home: { n: 'Goblet Squat', w: 10, inc: 2 }, gym: { n: 'Barbell Back Squat', w: 30, inc: 2.5 } },
  push:  { body: { n: 'Push-up', bw: 1 },          home: { n: 'Dumbbell Bench Press', w: 8, inc: 2 }, gym: { n: 'Barbell Bench Press', w: 30, inc: 2.5 } },
  pull:  { body: { n: 'Inverted Row', bw: 1 },     home: { n: 'One-Arm Dumbbell Row', w: 10, inc: 2 }, gym: { n: 'Lat Pulldown', w: 30, inc: 2.5 } },
  hinge: { body: { n: 'Glute Bridge', bw: 1 },     home: { n: 'Dumbbell Romanian Deadlift', w: 12, inc: 2 }, gym: { n: 'Barbell Deadlift', w: 40, inc: 2.5 } },
  ohp:   { body: { n: 'Pike Push-up', bw: 1 },     home: { n: 'Dumbbell Shoulder Press', w: 6, inc: 2 }, gym: { n: 'Barbell Overhead Press', w: 20, inc: 2.5 } },
  core:  { body: { n: 'Lying Leg Raise', bw: 1 },  home: { n: 'Lying Leg Raise', bw: 1 }, gym: { n: 'Cable Crunch', w: 20, inc: 2.5 } },
};
const SPLITS = {
  2: [['Full Body A', ['squat', 'push', 'pull', 'core']], ['Full Body B', ['hinge', 'ohp', 'pull', 'core']]],
  3: [['Full Body A', ['squat', 'push', 'pull', 'core']], ['Full Body B', ['hinge', 'ohp', 'pull', 'core']]],
  4: [['Upper', ['push', 'pull', 'ohp', 'core']], ['Lower', ['squat', 'hinge', 'core']]],
  5: [['Push', ['push', 'ohp']], ['Pull', ['pull', 'hinge']], ['Legs', ['squat', 'hinge', 'core']]],
};
const GOALS = { strength: { lo: 4, hi: 6, sets: 4 }, muscle: { lo: 8, hi: 12, sets: 3 }, endurance: { lo: 12, hi: 15, sets: 3 } };
const LEVEL = { beginner: 1, intermediate: 1.5, advanced: 2 };

// ---------- Setup: personalise the plan from the user's profile ----------
function build(p) {
  const g = GOALS[p.goal], plan = SPLITS[p.days].map(([name, slots]) => ({ name, slots }));
  const prog = {};
  plan.forEach(s => s.slots.forEach(slot => {
    const ex = LIB[slot][p.equip];
    if (prog[ex.n]) return;
    const w = ex.bw ? 0 : Math.round(ex.w * LEVEL[p.level] / ex.inc) * ex.inc;
    prog[ex.n] = { w, reps: g.lo, fails: 0, inc: ex.inc || 0, bw: !!ex.bw };
  }));
  return { profile: p, plan, prog, history: [], next: 0 };
}

// ---------- The adaptive engine ----------
function adapt(p, reps, feel, g) {
  const hitAll = reps.every(r => r >= p.reps);
  if (feel === 'hard' && hitAll) { p.fails = 0; return ['hold', 'Marked hard – repeating this load until it feels steadier.']; }
  if (hitAll) {
    p.fails = 0;
    if (p.bw) { p.reps += feel === 'easy' ? 3 : 2; return ['up', `Add reps: aim for ${p.reps} next time.`]; }
    if (p.reps < g.hi) { p.reps += feel === 'easy' ? 2 : 1; p.reps = Math.min(p.reps, g.hi); return ['up', `Same weight, aim for ${p.reps} reps per set.`]; }
    p.w += p.inc * (feel === 'easy' ? 2 : 1); p.reps = g.lo;
    return ['up', `Top of the range hit – go up to ${p.w} kg.`];
  }
  p.fails++;
  if (p.fails >= 2 && !p.bw) {
    p.w = Math.max(0, Math.round(p.w * 0.9 / p.inc) * p.inc); p.reps = g.lo; p.fails = 0;
    return ['down', `Two tough sessions in a row – deload to ${p.w} kg and rebuild.`];
  }
  return ['hold', `Missed the ${p.reps}-rep target – repeat the same load.`];
}

// ---------- Views ----------
const opts = (o, v) => Object.entries(o).map(([k, l]) => `<option value="${k}" ${k === v ? 'selected' : ''}>${l}</option>`).join('');

function onboarding() {
  app.innerHTML = `
    <h1>FitAdapt</h1><p>Answer four questions. Your plan adjusts after every workout you log.</p>
    <form id="f" class="card">
      <label for="goal">Main goal</label>
      <select id="goal">${opts({ strength: 'Get stronger', muscle: 'Build muscle', endurance: 'Improve endurance & tone' })}</select>
      <label for="level">Experience</label>
      <select id="level">${opts({ beginner: 'Beginner (new or returning)', intermediate: 'Intermediate (1–2 years)', advanced: 'Advanced (3+ years)' })}</select>
      <label for="equip">Equipment</label>
      <select id="equip">${opts({ body: 'None – bodyweight only', home: 'Dumbbells at home', gym: 'Full gym' })}</select>
      <label for="days">Days per week</label>
      <select id="days">${opts({ 2: '2 days', 3: '3 days', 4: '4 days', 5: '5 days' }, 3)}</select>
      <button>Build my plan</button>
    </form>`;
  document.getElementById('f').onsubmit = e => {
    e.preventDefault();
    const v = id => document.getElementById(id).value;
    S = build({ goal: v('goal'), level: v('level'), equip: v('equip'), days: +v('days') });
    save(); dashboard();
  };
}

const sessionExercises = s => s.slots.map(slot => LIB[slot][S.profile.equip].n);
const fmt = (p) => `${GOALS[S.profile.goal].sets} × ${p.reps}${p.bw ? '' : ' @ ' + p.w + ' kg'}`;

function dashboard() {
  const s = S.plan[S.next % S.plan.length], g = GOALS[S.profile.goal];
  const last = S.history.slice(-5).reverse();
  app.innerHTML = `
    <h1>${s.name}</h1><p>Your next workout. Targets are set from how your last sessions went.</p>
    <div class="card">${sessionExercises(s).map(n => `
      <div class="ex"><div><b>${n}</b><small>${g.lo}–${g.hi} rep range</small></div><div class="target">${fmt(S.prog[n])}</div></div>`).join('')}
    </div>
    <button id="go">Start workout</button>
    <h2>Recent sessions</h2>
    ${last.length ? last.map(h => `<div class="hist"><span>${h.session}</span><span>${h.date}</span></div>`).join('') : '<p>Nothing logged yet. Your first session sets the baseline.</p>'}
    <button class="ghost" id="reset">Reset profile and data</button>`;
  document.getElementById('go').onclick = () => workout(s);
  document.getElementById('reset').onclick = () => { if (confirm('Delete your plan and history?')) { localStorage.removeItem(KEY); S = null; onboarding(); } };
}

function workout(s) {
  const g = GOALS[S.profile.goal], names = sessionExercises(s);
  app.innerHTML = `
    <h1>${s.name}</h1><p>Enter the reps you completed for each set.</p>
    ${names.map((n, i) => { const p = S.prog[n]; return `
      <div class="card"><b>${n}</b> <small>target ${fmt(p)}</small>
        ${p.bw ? '' : `<div class="wt"><label for="w${i}" style="margin:0">Weight (kg)</label><input id="w${i}" type="number" step="0.5" min="0" value="${p.w}"></div>`}
        <div class="sets">${Array.from({ length: g.sets }, (_, k) => `<input aria-label="Set ${k + 1} reps" data-ex="${i}" type="number" min="0" value="${p.reps}">`).join('')}</div>
      </div>`; }).join('')}
    <h2>How did the session feel?</h2>
    <div class="seg">${['easy', 'right', 'hard'].map((f, i) => `<label><input type="radio" name="feel" value="${f}" ${i === 1 ? 'checked' : ''}><span>${f === 'right' ? 'Just right' : f[0].toUpperCase() + f.slice(1)}</span></label>`).join('')}</div>
    <button id="done">Finish and update my plan</button>`;
  document.getElementById('done').onclick = () => {
    const feel = document.querySelector('input[name=feel]:checked').value, report = [];
    names.forEach((n, i) => {
      const p = S.prog[n];
      const reps = [...document.querySelectorAll(`[data-ex="${i}"]`)].map(x => +x.value || 0);
      const wEl = document.getElementById('w' + i);
      if (wEl) p.w = +wEl.value || p.w; // respect the weight actually lifted
      const [dir, msg] = adapt(p, reps, feel, g);
      report.push({ n, dir, msg });
    });
    S.history.push({ session: s.name, date: new Date().toLocaleDateString(), feel });
    S.next++; save(); summary(report);
  };
}

function summary(report) {
  app.innerHTML = `
    <h1>Session logged</h1><p>Here is what changes next time.</p>
    <div class="card">${report.map(r => `<div class="ex"><b>${r.n}</b><span class="${r.dir}" style="text-align:right">${r.msg}</span></div>`).join('')}</div>
    <button id="back">See next workout</button>`;
  document.getElementById('back').onclick = dashboard;
}

S ? dashboard() : onboarding();
