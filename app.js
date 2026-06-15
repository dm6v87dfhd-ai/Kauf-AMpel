const STORAGE_KEY = 'giropuffer-ampel-v3-state';
const VERSION_LABEL = 'iOS ruhig v6 · Komma & Farbtafel';

const DEFAULT_STATE = {
  inputs: {
    asOfDate: todayIso(),
    currentBalance: '',
    salaryDate: '',
    purchaseAmount: 0,
    greenThreshold: 1950,
    warnThreshold: 1463,
    criticalThreshold: 975
  },
  movements: []
};

let state = loadState();

const ids = [
  'asOfDate','currentBalance','salaryDate','purchaseAmount',
  'greenThreshold','warnThreshold','criticalThreshold'
];
const els = Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));

const currency = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
const number = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });
const dateFmt = new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });

function todayIso() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const normalized = String(value).trim().replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

function formatNumberForInput(value) {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'string') return value.replace('.', ',');
  if (!Number.isFinite(value)) return '';
  return String(value).replace('.', ',');
}

function resultLabel(ampel) {
  return {
    'GRÜN': 'Kauf möglich',
    'GELB': 'Bewusst prüfen',
    'DUNKELGELB': 'Warnbereich',
    'ROT': 'Nicht kaufen'
  }[ampel] || '—';
}

function parseDate(value) {
  if (!value) return null;
  const d = new Date(`${value}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isoDate(date) {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function dayDiff(a, b) {
  const one = parseDate(isoDate(a));
  const two = parseDate(isoDate(b));
  return Math.round((two - one) / 86400000);
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function loadState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return structuredClone(DEFAULT_STATE);
    const parsed = JSON.parse(stored);
    return {
      inputs: { ...DEFAULT_STATE.inputs, ...(parsed.inputs || {}) },
      movements: Array.isArray(parsed.movements) ? parsed.movements : []
    };
  } catch (error) {
    console.warn('Konnte Speicherstand nicht laden:', error);
    return structuredClone(DEFAULT_STATE);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

const numericInputIds = ['currentBalance','purchaseAmount','greenThreshold','warnThreshold','criticalThreshold'];

function syncInputValuesFromState() {
  for (const id of ids) {
    if (!els[id]) continue;
    els[id].value = numericInputIds.includes(id) ? formatNumberForInput(state.inputs[id]) : (state.inputs[id] ?? '');
  }
}

function bindInputs() {
  syncInputValuesFromState();
  for (const id of ids) {
    els[id].addEventListener('input', () => {
      state.inputs[id] = numericInputIds.includes(id) ? toNumber(els[id].value) : els[id].value;
      saveState();
      renderSummary();
      renderForecast();
    });

    if (numericInputIds.includes(id)) {
      els[id].addEventListener('blur', () => {
        els[id].value = formatNumberForInput(state.inputs[id]);
      });
    }
  }
}

function getEffect(movement) {
  const amount = Math.abs(toNumber(movement.amount));
  if (!amount) return 0;
  if (movement.type === 'Ausgang') return -amount;
  if (movement.type === 'Eingang') return amount;
  return 0;
}

function isCounted(movement) {
  const asOf = parseDate(state.inputs.asOfDate);
  const salary = parseDate(state.inputs.salaryDate);
  const date = parseDate(movement.date);
  const effect = getEffect(movement);
  return Boolean(
    asOf && salary && date &&
    date >= asOf &&
    date < salary &&
    movement.secure === 'Ja' &&
    movement.status === 'Offen' &&
    effect !== 0
  );
}

function ampelFor(value) {
  const green = toNumber(state.inputs.greenThreshold);
  const warn = toNumber(state.inputs.warnThreshold);
  const critical = toNumber(state.inputs.criticalThreshold);
  if (!Number.isFinite(value)) return '—';
  if (value < critical) return 'ROT';
  if (value < warn) return 'DUNKELGELB';
  if (value < green) return 'GELB';
  return 'GRÜN';
}

function ampelClass(ampel) {
  return {
    'GRÜN': 'green-bg',
    'GELB': 'yellow-bg',
    'DUNKELGELB': 'darkyellow-bg',
    'ROT': 'red-bg'
  }[ampel] || 'neutral';
}

function calcForecast() {
  const asOf = parseDate(state.inputs.asOfDate);
  const salary = parseDate(state.inputs.salaryDate);
  const current = toNumber(state.inputs.currentBalance);
  if (!asOf || !salary || salary <= asOf || !Number.isFinite(current)) return [];

  const days = Math.min(Math.max(dayDiff(asOf, salary), 0), 365);
  const rows = [];
  let balance = current;

  for (let i = 0; i < days; i++) {
    const date = addDays(asOf, i);
    const iso = isoDate(date);
    const dayMovement = state.movements
      .filter(m => isCounted(m) && m.date === iso)
      .reduce((sum, m) => sum + getEffect(m), 0);
    balance += dayMovement;
    rows.push({ date: iso, dayMovement, balance, ampel: ampelFor(balance) });
  }
  return rows;
}

function calcSummary() {
  const counted = state.movements.filter(isCounted);
  const safeIncome = counted.reduce((sum, m) => sum + Math.max(getEffect(m), 0), 0);
  const safeOutgoings = -counted.reduce((sum, m) => sum + Math.min(getEffect(m), 0), 0);
  const current = toNumber(state.inputs.currentBalance);
  const beforeSalary = current + safeIncome - safeOutgoings;
  const forecast = calcForecast();
  const lowest = forecast.length ? Math.min(...forecast.map(row => row.balance)) : NaN;
  const afterPurchase = Number.isFinite(lowest) ? lowest - toNumber(state.inputs.purchaseAmount) : NaN;
  const freeBufferAfterPurchase = Number.isFinite(afterPurchase) ? afterPurchase - toNumber(state.inputs.greenThreshold) : NaN;
  const asOf = parseDate(state.inputs.asOfDate);
  const age = asOf ? Math.max(0, dayDiff(asOf, new Date())) : null;
  const quality = age === null ? '—' : age > 7 ? 'NIEDRIG' : age > 3 ? 'MITTEL' : 'HOCH';

  return {
    counted,
    safeIncome,
    safeOutgoings,
    beforeSalary,
    forecast,
    lowest,
    afterPurchase,
    freeBufferAfterPurchase,
    ampelAfter: ampelFor(afterPurchase),
    ampelWithout: ampelFor(lowest),
    age,
    quality,
    distanceWarn: Number.isFinite(afterPurchase) ? afterPurchase - toNumber(state.inputs.warnThreshold) : NaN,
    distanceCritical: Number.isFinite(afterPurchase) ? afterPurchase - toNumber(state.inputs.criticalThreshold) : NaN
  };
}

function moneyOrDash(value) {
  return Number.isFinite(value) ? currency.format(value) : '—';
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function setAmpelElement(id, ampel) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = id === 'mainAmpel' ? resultLabel(ampel) : ampel;
  el.className = id === 'mainAmpel' ? `ampel-pill ${ampelClass(ampel)}` : ampelClass(ampel);
}

function statusClass(ampel) {
  return {
    'GRÜN': 'status-green',
    'GELB': 'status-yellow',
    'DUNKELGELB': 'status-darkyellow',
    'ROT': 'status-red'
  }[ampel] || 'status-neutral';
}

function renderSummary() {
  const s = calcSummary();
  const cls = ampelClass(s.ampelAfter);

  setAmpelElement('mainAmpel', s.ampelAfter);
  setText('ampelAfter', resultLabel(s.ampelAfter));
  setText('ampelWithout', s.ampelWithout);
  setText('quality', s.quality);
  setText('lowestForecast', moneyOrDash(s.lowest));
  setText('lowestAfterPurchase', moneyOrDash(s.afterPurchase));
  setText('freeBufferAfterPurchase', moneyOrDash(s.freeBufferAfterPurchase));
  setText('beforeSalary', moneyOrDash(s.beforeSalary));
  setText('safeIncome', moneyOrDash(s.safeIncome));
  setText('safeOutgoings', moneyOrDash(s.safeOutgoings));
  setText('openCount', number.format(s.counted.length));
  setText('dataAge', s.age === null ? '—' : `${s.age} Tage`);
  setText('distanceWarn', moneyOrDash(s.distanceWarn));
  setText('distanceCritical', moneyOrDash(s.distanceCritical));

  const ampelWord = document.getElementById('ampelAfter');
  if (ampelWord) ampelWord.className = `ampel-word ${cls}`;
  const ampelDot = document.getElementById('ampelDot');
  if (ampelDot) ampelDot.className = `ampel-dot ${cls}`;
  const statusCard = document.getElementById('statusCard');
  if (statusCard) statusCard.className = `card status-card ${statusClass(s.ampelAfter)}`;

  const decision = document.getElementById('decisionText');
  if (!Number.isFinite(s.afterPurchase)) {
    decision.textContent = 'Trage Stichtag, aktuellen Kontostand und nächsten Gehaltseingang ein, um die Prognose zu berechnen.';
  } else if (s.ampelAfter === 'GRÜN') {
    decision.textContent = 'Der niedrigste Prognose-Kontostand nach Kauf bleibt über deinem Soll-Giropuffer. Der Kauf ist grundsätzlich möglich, wenn er zu deinen Kaufregeln passt.';
  } else if (s.ampelAfter === 'GELB') {
    decision.textContent = 'Der Kauf bringt dich unter den Soll-Giropuffer. Bewusst entscheiden, nicht spontan kaufen, und prüfen, ob Verschieben sinnvoller ist.';
  } else if (s.ampelAfter === 'DUNKELGELB') {
    decision.textContent = 'Der Kauf bringt dich unter die Warnschwelle. Keine spontanen Zusatzkäufe; erst Konto klären und Bewegungen prüfen.';
  } else {
    decision.textContent = 'Der Kauf bringt dich unter die kritische Schwelle. Nichts Zusätzliches kaufen; Puffer wiederherstellen.';
  }
}

function renderMovements() {
  const list = document.getElementById('movementList');
  const template = document.getElementById('movementTemplate');
  list.innerHTML = '';

  if (state.movements.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'helper';
    empty.textContent = 'Noch keine Bewegungen eingetragen. Füge Eingänge und Ausgänge bis zum nächsten Gehalt hinzu.';
    list.appendChild(empty);
    return;
  }

  state.movements.forEach((movement, index) => {
    const node = template.content.cloneNode(true);
    const card = node.querySelector('.movement-card');
    const title = node.querySelector('.movement-title');
    const checkText = node.querySelector('[data-role="checkText"]');
    title.textContent = `${movement.type || 'Bewegung'} · ${movement.description || movement.category || 'ohne Beschreibung'}`;

    node.querySelectorAll('[data-field]').forEach(input => {
      const field = input.dataset.field;
      input.value = field === 'amount' ? formatNumberForInput(movement[field]) : (movement[field] ?? '');

      const updateStateFromField = () => {
        state.movements[index][field] = field === 'amount' ? toNumber(input.value) : input.value;
        saveState();
      };

      if (input.tagName === 'SELECT' || input.type === 'date') {
        input.addEventListener('change', () => {
          updateStateFromField();
          render();
        });
      } else {
        input.addEventListener('input', updateStateFromField);
        input.addEventListener('blur', () => {
          if (field === 'amount') input.value = formatNumberForInput(state.movements[index][field]);
          render();
        });
        input.addEventListener('change', render);
      }
    });

    node.querySelector('.delete-movement').addEventListener('click', () => {
      state.movements.splice(index, 1);
      saveState();
      render();
    });

    const counted = isCounted(movement);
    checkText.classList.add(counted ? 'counted' : 'not-counted');
    const effect = getEffect(movement);
    checkText.textContent = counted
      ? `wird gezählt · Giro-Wirkung: ${currency.format(effect)}`
      : 'wird nicht gezählt · prüfen: Datum zwischen Stichtag und Gehalt, Sicher? = Ja, Status = Offen, Betrag als Zahl';

    list.appendChild(node);
  });
}

function renderForecast() {
  const list = document.getElementById('forecastList');
  const forecast = calcForecast();
  list.innerHTML = '';

  if (!forecast.length) {
    const empty = document.createElement('p');
    empty.className = 'helper';
    empty.textContent = 'Keine Prognose möglich. Prüfe Stichtag, Kontostand und Gehaltsdatum.';
    list.appendChild(empty);
    return;
  }

  const lowest = Math.min(...forecast.map(row => row.balance));
  forecast.forEach(row => {
    const d = parseDate(row.date);
    const item = document.createElement('div');
    item.className = `forecast-row ${row.balance === lowest ? 'lowest' : ''}`;
    item.innerHTML = `
      <span class="forecast-date">${dateFmt.format(d)}${row.balance === lowest ? ' · Tiefpunkt' : ''}</span>
      <span class="forecast-balance">${currency.format(row.balance)}</span>
      <span class="forecast-ampel ${ampelClass(row.ampel)}">${row.ampel}</span>
    `;
    list.appendChild(item);
  });
}

function render() {
  renderSummary();
  renderMovements();
  renderForecast();
}

function addMovement() {
  state.movements.push({
    date: state.inputs.asOfDate || todayIso(),
    type: 'Ausgang',
    category: '',
    description: '',
    amount: '',
    secure: 'Ja',
    status: 'Offen',
    note: ''
  });
  saveState();
  render();
  document.querySelector('[data-tab="movements"]').click();
}

function setupTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
    });
  });
}

function setupBackup() {
  document.getElementById('exportJson').addEventListener('click', () => {
    const json = JSON.stringify(state, null, 2);
    document.getElementById('jsonPreview').value = json;
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `giropuffer-sicherung-${todayIso()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById('importJson').addEventListener('change', event => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(reader.result);
        state = {
          inputs: { ...DEFAULT_STATE.inputs, ...(imported.inputs || {}) },
          movements: Array.isArray(imported.movements) ? imported.movements : []
        };
        saveState();
        syncInputValuesFromState();
        document.getElementById('jsonPreview').value = JSON.stringify(state, null, 2);
        render();
      } catch (error) {
        alert('Die JSON-Datei konnte nicht gelesen werden.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  });

  document.getElementById('resetApp').addEventListener('click', () => {
    const ok = confirm('Alle lokalen Eingaben in dieser App löschen?');
    if (!ok) return;
    state = structuredClone(DEFAULT_STATE);
    saveState();
    syncInputValuesFromState();
    render();
  });
}

function setupPwa() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js').catch(error => {
        console.warn('Service Worker konnte nicht registriert werden:', error);
      });
    });
  }
}

bindInputs();
setupTabs();
document.getElementById('addMovement').addEventListener('click', addMovement);
setupBackup();
setupPwa();
render();
