(() => {
  'use strict';

  const DEFAULT_EVENT_ID = 'node-meetup-2025';
  const POLL_MS = 5000;

  const $ = (sel) => document.querySelector(sel);
  const state = {
    events: [],
    selectedId: decodeURIComponent(location.hash.slice(1)) || null,
    reservations: [],
    lastBookedId: null
  };

  // ---------- helpers ----------
  const escapeHtml = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const fmt = (n) => Number(n).toLocaleString();

  const timeAgo = (iso) => {
    const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 45) return 'just now';
    if (s < 3600) return `${Math.round(s / 60)} min ago`;
    if (s < 86400) return `${Math.round(s / 3600)} h ago`;
    return new Date(iso).toLocaleDateString();
  };

  async function api(path, options = {}) {
    const res = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    let data = null;
    try { data = await res.json(); } catch (_) { /* empty body */ }
    if (!res.ok) {
      const err = new Error((data && data.error) || `Request failed (${res.status})`);
      err.status = res.status;
      throw err;
    }
    return data;
  }

  function toast(message, type = '') {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = message;
    $('#toasts').appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity .3s';
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 300);
    }, 3200);
  }

  function seatBadge(ev) {
    const pct = ev.availableSeats / ev.totalSeats;
    if (ev.availableSeats === 0) return '<span class="badge badge-sold">Sold out</span>';
    if (pct <= 0.15) return '<span class="badge badge-low">Almost gone</span>';
    return '<span class="badge badge-ok">On sale</span>';
  }

  // ---------- theme ----------
  const storedTheme = (() => { try { return localStorage.getItem('tb-theme'); } catch (_) { return null; } })();
  if (storedTheme) document.documentElement.dataset.theme = storedTheme;
  $('#themeToggle').addEventListener('click', () => {
    const current = document.documentElement.dataset.theme ||
      (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('tb-theme', next); } catch (_) { /* ignore */ }
  });

  // ---------- health ----------
  async function checkHealth() {
    const el = $('#health');
    try {
      const h = await api('/health');
      el.className = 'health ok';
      el.querySelector('.health-label').textContent = 'Live';
      el.title = `Database ${h.database}`;
    } catch (_) {
      el.className = 'health down';
      el.querySelector('.health-label').textContent = 'Offline';
    }
  }

  // ---------- events ----------
  async function loadEvents() {
    try {
      const data = await api('/api/events');
      state.events = data.events;
      if (!state.selectedId || !state.events.some((e) => e.eventId === state.selectedId)) {
        state.selectedId = state.events[0] ? state.events[0].eventId : null;
      }
      renderEvents();
    } catch (err) {
      $('#eventGrid').innerHTML = `<p class="muted">Couldn't load events: ${escapeHtml(err.message)}</p>`;
    }
  }

  function renderEvents() {
    const grid = $('#eventGrid');
    $('#eventCount').textContent = `${state.events.length} event${state.events.length === 1 ? '' : 's'}`;

    if (!state.events.length) {
      grid.innerHTML = '<p class="muted">No events yet. Create one to start selling seats.</p>';
      $('#detail').hidden = true;
      return;
    }

    grid.innerHTML = state.events.map((ev) => {
      const sold = ev.totalSeats - ev.availableSeats;
      const pct = (sold / ev.totalSeats) * 100;
      return `
        <button type="button" class="card${ev.eventId === state.selectedId ? ' selected' : ''}" data-id="${escapeHtml(ev.eventId)}">
          <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start">
            <div style="min-width:0">
              <div class="card-name">${escapeHtml(ev.name)}</div>
              <div class="card-id mono">${escapeHtml(ev.eventId)}</div>
            </div>
            ${seatBadge(ev)}
          </div>
          <div class="meter"><span style="width:${pct}%"></span></div>
          <div class="card-foot">
            <span><strong>${fmt(ev.availableSeats)}</strong> <span class="muted">/ ${fmt(ev.totalSeats)} left</span></span>
            <span class="muted">${fmt(ev.reservationCount || 0)} booking${ev.reservationCount === 1 ? '' : 's'}</span>
          </div>
        </button>`;
    }).join('');
  }

  $('#eventGrid').addEventListener('click', (e) => {
    const card = e.target.closest('.card[data-id]');
    if (!card) return;
    selectEvent(card.dataset.id, true);
  });

  function selectEvent(id, scroll) {
    state.selectedId = id;
    history.replaceState(null, '', `#${encodeURIComponent(id)}`);
    renderEvents();
    loadDetail().then(() => {
      if (scroll) $('#detail').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // ---------- detail ----------
  async function loadDetail() {
    if (!state.selectedId) return;
    const id = state.selectedId;
    try {
      const [ev, res] = await Promise.all([
        api(`/api/events/${encodeURIComponent(id)}`),
        api(`/api/reservations/event/${encodeURIComponent(id)}`)
      ]);
      if (id !== state.selectedId) return; // user switched meanwhile
      state.reservations = res.reservations;
      renderDetail(ev);
      // keep the card in sync with the detail view
      const idx = state.events.findIndex((e) => e.eventId === id);
      if (idx >= 0) { state.events[idx] = { ...state.events[idx], ...ev }; renderEvents(); }
    } catch (err) {
      if (err.status === 404) { state.selectedId = null; await loadEvents(); }
    }
  }

  function renderDetail(ev) {
    $('#detail').hidden = false;
    $('#detailId').textContent = ev.eventId;
    $('#detailName').textContent = ev.name;
    $('#detailAvailable').textContent = fmt(ev.availableSeats);
    $('#detailTotal').textContent = fmt(ev.totalSeats);
    $('#detailSold').textContent = fmt(ev.totalSeats - ev.availableSeats);
    $('#detailBookings').textContent = fmt(ev.reservationCount);
    $('#detailVersion').textContent = `v${ev.version}`;
    const pct = ((ev.totalSeats - ev.availableSeats) / ev.totalSeats) * 100;
    const meter = $('#detailMeter');
    meter.firstElementChild.style.width = `${pct}%`;
    meter.setAttribute('aria-valuenow', Math.round(pct));
    $('#resetBtn').hidden = ev.eventId !== DEFAULT_EVENT_ID;

    const soldOut = ev.availableSeats === 0;
    $('#bookBtn').disabled = soldOut;
    $('#bookBtn').textContent = soldOut ? 'Sold out' : 'Book seats';
    $('#seats').max = Math.max(1, Math.min(10, ev.availableSeats));

    renderReservations();
  }

  function renderReservations() {
    const showCancelled = $('#showCancelled').checked;
    const rows = state.reservations.filter((r) => showCancelled || r.status !== 'cancelled');
    $('#resEmpty').hidden = rows.length > 0;
    $('#resBody').innerHTML = rows.slice(0, 200).map((r) => `
      <tr class="${r.status === 'cancelled' ? 'cancelled' : ''}${r.reservationId === state.lastBookedId ? ' flash' : ''}">
        <td class="partner">${escapeHtml(r.partnerId)}</td>
        <td class="num">${r.seats}</td>
        <td><span class="badge ${r.status === 'cancelled' ? 'badge-muted' : 'badge-ok'}">${escapeHtml(r.status)}</span></td>
        <td class="muted" title="${escapeHtml(new Date(r.createdAt).toLocaleString())}">${timeAgo(r.createdAt)}</td>
        <td class="num">${r.status === 'confirmed'
          ? `<button type="button" class="link-btn" data-cancel="${escapeHtml(r.reservationId)}">Cancel</button>` : ''}</td>
      </tr>`).join('');
    state.lastBookedId = null;
  }

  $('#showCancelled').addEventListener('change', renderReservations);

  $('#resBody').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-cancel]');
    if (!btn) return;
    btn.disabled = true;
    try {
      const r = await api(`/api/reservations/${btn.dataset.cancel}`, { method: 'DELETE' });
      toast(`Cancelled · ${r.seats} seat${r.seats === 1 ? '' : 's'} released`, 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
    await loadDetail();
  });

  // ---------- booking ----------
  document.querySelectorAll('[data-step]').forEach((b) =>
    b.addEventListener('click', () => {
      const input = $('#seats');
      const max = Number(input.max) || 10;
      input.value = Math.min(max, Math.max(1, (Number(input.value) || 1) + Number(b.dataset.step)));
    })
  );

  $('#bookForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const partnerId = $('#partnerId').value.trim();
    const seats = Number($('#seats').value);
    const errEl = $('#formError');
    errEl.textContent = '';
    $('#partnerId').removeAttribute('aria-invalid');

    if (!partnerId) {
      errEl.textContent = 'Enter a partner ID.';
      $('#partnerId').setAttribute('aria-invalid', 'true');
      $('#partnerId').focus();
      return;
    }
    if (!Number.isInteger(seats) || seats < 1 || seats > 10) {
      errEl.textContent = 'Choose between 1 and 10 seats.';
      return;
    }

    const btn = $('#bookBtn');
    btn.disabled = true;
    btn.textContent = 'Booking…';
    try {
      const r = await api('/api/reservations', {
        method: 'POST',
        body: { eventId: state.selectedId, partnerId, seats }
      });
      state.lastBookedId = r.reservationId;
      toast(`Booked ${r.seats} seat${r.seats === 1 ? '' : 's'} for ${partnerId}`, 'success');
    } catch (err) {
      errEl.textContent = err.message;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Book seats';
      await loadDetail();
    }
  });

  // ---------- rush test ----------
  $('#stressBtn').addEventListener('click', async () => {
    const n = Math.min(200, Math.max(2, Number($('#stressCount').value) || 50));
    const seats = Math.min(10, Math.max(1, Number($('#stressSeats').value) || 1));
    const btn = $('#stressBtn');
    const out = $('#stressResult');
    btn.disabled = true;
    btn.textContent = `Firing ${n} requests…`;

    const before = await api(`/api/events/${encodeURIComponent(state.selectedId)}`);
    const tag = Date.now().toString(36);
    const started = performance.now();

    const results = await Promise.allSettled(
      Array.from({ length: n }, (_, i) =>
        api('/api/reservations', {
          method: 'POST',
          body: { eventId: state.selectedId, partnerId: `rush-${tag}-${i + 1}`, seats }
        })
      )
    );
    const ms = Math.round(performance.now() - started);
    const ok = results.filter((r) => r.status === 'fulfilled').length;
    const rejected = n - ok;

    const after = await api(`/api/events/${encodeURIComponent(state.selectedId)}`);
    const expected = before.availableSeats - ok * seats;
    const consistent = after.availableSeats === expected && after.availableSeats >= 0;

    out.hidden = false;
    out.innerHTML = `
      <div><b>${ok}</b><span>booked</span></div>
      <div><b>${rejected}</b><span>turned away</span></div>
      <div><b>${ms}ms</b><span>total</span></div>
      <div class="note${consistent ? '' : ' bad'}">${consistent
        ? `Seat count exact: ${fmt(before.availableSeats)} → ${fmt(after.availableSeats)}, no overbooking.`
        : `Mismatch: expected ${fmt(expected)} seats left, found ${fmt(after.availableSeats)} (other bookings may have landed at the same time).`}</div>`;

    btn.disabled = false;
    btn.textContent = 'Fire requests';
    await loadDetail();
  });

  // ---------- reset demo ----------
  $('#resetBtn').addEventListener('click', async () => {
    if (!confirm('Reset the demo event? This restores all 500 seats and deletes its bookings.')) return;
    try {
      await api('/api/events/bootstrap');
      $('#stressResult').hidden = true;
      toast('Demo event reset', 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
    await loadDetail();
  });

  // ---------- new event ----------
  const dialog = $('#eventDialog');
  $('#newEventBtn').addEventListener('click', () => {
    $('#eventForm').reset();
    $('#evError').textContent = '';
    dialog.showModal();
    $('#evName').focus();
  });
  $('#evCancel').addEventListener('click', () => dialog.close());

  $('#evName').addEventListener('input', () => {
    $('#evId').placeholder = $('#evName').value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'summer-music-festival';
  });

  $('#eventForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('#evName').value.trim();
    const eventId = $('#evId').value.trim().toLowerCase();
    const totalSeats = Number($('#evSeats').value);
    const errEl = $('#evError');
    errEl.textContent = '';

    if (!name) { errEl.textContent = 'Give the event a name.'; return; }
    if (!Number.isInteger(totalSeats) || totalSeats < 1) { errEl.textContent = 'Total seats must be at least 1.'; return; }

    try {
      const ev = await api('/api/events', {
        method: 'POST',
        body: { name, totalSeats, ...(eventId && { eventId }) }
      });
      dialog.close();
      toast(`Created “${ev.name}”`, 'success');
      await loadEvents();
      selectEvent(ev.eventId, true);
    } catch (err) {
      errEl.textContent = err.message;
    }
  });

  // ---------- boot ----------
  async function refresh() {
    if (document.hidden) return;
    await Promise.all([loadEvents(), checkHealth()]);
    await loadDetail();
  }

  refresh();
  setInterval(refresh, POLL_MS);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
})();
