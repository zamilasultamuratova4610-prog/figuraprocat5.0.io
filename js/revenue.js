// ============================================================
//  revenue.js — Выручка за произвольный период
//  Подключается ПОСЛЕ app.js в index.html
// ============================================================

// Переопределяем switchTab, чтобы добавить вкладку "revenue"
// без изменения оригинального app.js
(function () {
  const _origSwitchTab = window.switchTab;

  window.switchTab = function (t) {
    if (t === 'revenue') {
      curTab = t;
      document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
      document.querySelectorAll('.nb').forEach(x => x.classList.remove('active'));
      document.getElementById('tab-revenue').classList.add('active');
      // Кнопка «Выручка» — 5-я в навигации (индекс 4)
      const navBtns = document.querySelectorAll('.nb');
      if (navBtns[4]) navBtns[4].classList.add('active');
      // Скрываем кнопку «+ Костюм» и строку статистики
      document.getElementById('gab').classList.add('hidden');
      document.getElementById('statsBar').style.display = 'none';
      document.getElementById('alertsBar').style.display = 'none';
      renderRevenue();
    } else {
      _origSwitchTab(t);
    }
  };
})();

// ─── Быстрые диапазоны дат ───────────────────────────────────
window.revSetPeriod = function (period) {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  let from, to;

  if (period === 'month') {
    from = dateStr(y, m, 1);
    to   = dateStr(y, m, new Date(y, m + 1, 0).getDate());
  } else if (period === 'prev-month') {
    const pm = m === 0 ? 11 : m - 1;
    const py = m === 0 ? y - 1 : y;
    from = dateStr(py, pm, 1);
    to   = dateStr(py, pm, new Date(py, pm + 1, 0).getDate());
  } else if (period === 'quarter') {
    const qs = Math.floor(m / 3) * 3;
    from = dateStr(y, qs, 1);
    to   = dateStr(y, qs + 2, new Date(y, qs + 3, 0).getDate());
  } else if (period === 'year') {
    from = dateStr(y, 0, 1);
    to   = dateStr(y, 11, 31);
  }

  document.getElementById('revFrom').value = from;
  document.getElementById('revTo').value   = to;
  calcRevPeriod();
};

function dateStr(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// ─── Инициализация вкладки ────────────────────────────────────
window.renderRevenue = function () {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  // Заполняем даты только при первом открытии
  const fromEl = document.getElementById('revFrom');
  const toEl   = document.getElementById('revTo');
  if (!fromEl.value) fromEl.value = dateStr(y, m, 1);
  if (!toEl.value)   toEl.value   = dateStr(y, m, new Date(y, m + 1, 0).getDate());
  calcRevPeriod();
};

// ─── Основной расчёт ─────────────────────────────────────────
window.calcRevPeriod = function () {
  const from = document.getElementById('revFrom').value;
  const to   = document.getElementById('revTo').value;
  const el   = document.getElementById('revResults');

  if (!from || !to) {
    el.innerHTML = '<div class="rev-msg">Выберите даты начала и конца периода</div>';
    return;
  }
  if (from > to) {
    el.innerHTML = '<div class="rev-msg rev-msg-warn">⚠️ Дата «С» не может быть позже даты «По»</div>';
    return;
  }

  // Прокаты, период которых пересекается с выбранным диапазоном.
  // Исключаем «только забронированные» — деньги ещё не получены.
  const filtered = rentals.filter(r => {
    if (r.status === 'booked') return false;
    return r.startDate <= to && r.endDate >= from;
  }).sort((a, b) => (b.startDate > a.startDate ? 1 : -1));

  if (!filtered.length) {
    el.innerHTML = `
      <div class="empty">
        <div class="empty-ico">💰</div>
        <h3>Нет прокатов за выбранный период</h3>
        <p style="color:var(--g500);font-size:13px;margin-top:6px">
          Попробуйте расширить диапазон дат
        </p>
      </div>`;
    return;
  }

  // ── Итоги ──
  const total    = filtered.reduce((s, r) => s + (r.totalPrice || 0), 0);
  const returned = filtered.filter(r => r.status === 'returned').length;
  const rented   = filtered.filter(r => r.status === 'rented').length;

  // ── По категориям ──
  const byCat = {};
  filtered.forEach(r => {
    const d   = typeof gD === 'function' ? gD(r.dressId) : null;
    const cat = d ? d.category : 'Без категории';
    if (!byCat[cat]) byCat[cat] = { count: 0, total: 0 };
    byCat[cat].count++;
    byCat[cat].total += r.totalPrice || 0;
  });

  const catRows = Object.entries(byCat)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([cat, v]) =>
      `<tr>
        <td>${_e(cat)}</td>
        <td style="text-align:center">${v.count}</td>
        <td style="text-align:right;font-weight:700;color:var(--sky,#0ea5e9)">${_fmt(v.total)}</td>
      </tr>`
    ).join('');

  // ── Детализация ──
  const detRows = filtered.map(r => {
    const d   = typeof gD === 'function' ? gD(r.dressId) : null;
    const cfg = (typeof ST !== 'undefined' && ST[r.status]) || { l: r.status, c: '' };
    return `<tr>
      <td>${_fmtD(r.startDate)} — ${_fmtD(r.endDate)}</td>
      <td>${_e(d ? d.name : '?')}</td>
      <td>${_e(r.clientName || '—')}</td>
      <td>${r.clientPhone || '—'}</td>
      <td><span class="sbadge ${cfg.c}" style="font-size:10px;padding:3px 8px;white-space:nowrap">${cfg.l}</span></td>
      <td style="text-align:right;font-weight:700">${_fmt(r.totalPrice)}</td>
    </tr>`;
  }).join('');

  el.innerHTML = `
    <!-- Итоговые карточки -->
    <div class="rev-summary">
      <div class="rev-card rev-card-accent">
        <div class="rev-cv">${_fmt(total)}</div>
        <div class="rev-cl">Общая выручка</div>
      </div>
      <div class="rev-card">
        <div class="rev-cv">${filtered.length}</div>
        <div class="rev-cl">Прокатов за период</div>
      </div>
      <div class="rev-card">
        <div class="rev-cv">${returned}</div>
        <div class="rev-cl">Завершено</div>
      </div>
      <div class="rev-card">
        <div class="rev-cv">${rented}</div>
        <div class="rev-cl">Сейчас в прокате</div>
      </div>
    </div>

    <!-- По категориям -->
    <div class="rev-section">
      <h3 class="rev-section-title">По категориям костюмов</h3>
      <div class="rev-table-wrap">
        <table class="rev-table">
          <thead><tr><th>Категория</th><th style="text-align:center">Прокатов</th><th style="text-align:right">Выручка</th></tr></thead>
          <tbody>${catRows}</tbody>
        </table>
      </div>
    </div>

    <!-- Детализация -->
    <div class="rev-section">
      <h3 class="rev-section-title">Детализация прокатов</h3>
      <div class="rev-table-wrap">
        <table class="rev-table rev-table-detail">
          <thead><tr><th>Период</th><th>Костюм</th><th>Клиент</th><th>Телефон</th><th>Статус</th><th style="text-align:right">Сумма</th></tr></thead>
          <tbody>${detRows}</tbody>
          <tfoot>
            <tr class="rev-tfoot">
              <td colspan="5"><strong>Итого за период</strong></td>
              <td style="text-align:right"><strong>${_fmt(total)}</strong></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  `;
};

// ─── Вспомогательные функции ─────────────────────────────────
// Используем оригинальные если есть, иначе запасные
function _e(s) {
  return typeof esc === 'function' ? esc(s) : String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function _fmt(n) {
  if (typeof fmt === 'function') return fmt(n);
  return Number(n || 0).toLocaleString('ru-RU', { style: 'currency', currency: 'KZT', maximumFractionDigits: 0 });
}
function _fmtD(s) {
  if (typeof fmtD === 'function') return fmtD(s);
  if (!s) return '—';
  const [y, m, d] = s.split('-');
  return `${d}.${m}.${y}`;
}
