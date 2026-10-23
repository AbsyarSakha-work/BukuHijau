/* BukuHijau - aplikasi perpustakaan sederhana.
   Data disimpan di localStorage browser (tanpa backend).
   FR-01 CRUD anggota        FR-02 CRUD buku
   FR-03 peminjaman/pengembalian   FR-04 pencarian buku
   FR-05 validasi stok       FR-06 status pinjaman berubah saat dikembalikan
   FR-07 rekap peminjaman aktif, pengembalian, buku terpopuler            */

const STORAGE_KEY = 'bukuhijau.v1';
const MAX_LOAN_DAYS = 14;

/* ---------- Utilitas ---------- */
const NULL_EL = document.createElement('div'); // pengganti elemen yang tidak ada di halaman ini
const $ = sel => document.querySelector(sel) || NULL_EL;
const has = id => !!document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => iso(new Date());
const parseISO = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parseISO(s); d.setDate(d.getDate() + n); return iso(d); };
const utcDay = s => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };
const diffDays = (a, b) => Math.round((utcDay(b) - utcDay(a)) / 864e5); // b - a
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const fmtDate = s => { if (!s) return '—'; const [y, m, d] = s.split('-').map(Number); return `${d} ${MONTHS[m - 1]} ${y}`; };
const norm = s => String(s ?? '').toLocaleLowerCase('id').trim();

/* ---------- Data & penyimpanan ---------- */
function seedData() {
  const t = today();
  const day = n => addDays(t, n);
  const ms = (s, h = 9) => parseISO(s).getTime() + h * 36e5;
  const books = [
    { kode: 'BK001', judul: 'Laskar Pelangi', penulis: 'Andrea Hirata', kategori: 'Novel', tahun: 2005, stok: 7 },
    { kode: 'BK002', judul: 'Bumi', penulis: 'Tere Liye', kategori: 'Fiksi', tahun: 2014, stok: 5 },
    { kode: 'BK003', judul: 'Atomic Habits', penulis: 'James Clear', kategori: 'Pengembangan Diri', tahun: 2018, stok: 3 },
    { kode: 'BK004', judul: 'Negeri 5 Menara', penulis: 'Ahmad Fuadi', kategori: 'Novel', tahun: 2009, stok: 5 },
    { kode: 'BK005', judul: 'Filosofi Teras', penulis: 'Henry Manampiring', kategori: 'Filsafat', tahun: 2018, stok: 3 },
    { kode: 'BK006', judul: 'Bicara Itu Ada Seninya', penulis: 'Oh Su Hyang', kategori: 'Pengembangan Diri', tahun: 2018, stok: 7 },
    { kode: 'BK007', judul: 'Pulang', penulis: 'Tere Liye', kategori: 'Fiksi', tahun: 2015, stok: 4 },
    { kode: 'BK008', judul: 'Sapiens', penulis: 'Yuval Noah Harari', kategori: 'Sejarah', tahun: 2011, stok: 0 }
  ];
  const members = [
    { id: '23001', nama: 'Alya Putri', kelas: 'XI IPA 1', kontak: '0812-1111-0001' },
    { id: '23002', nama: 'Rizky Pratama', kelas: 'XI IPA 2', kontak: '0812-1111-0002' },
    { id: '23003', nama: 'Nadia Safitri', kelas: 'XI IPS 1', kontak: '0812-1111-0003' },
    { id: '23004', nama: 'Dimas Saputra', kelas: 'XII IPA 1', kontak: '0812-1111-0004' },
    { id: '23005', nama: 'Salsa Maharani', kelas: 'XII IPS 2', kontak: '0812-1111-0005' }
  ];
  // [id, anggota, kode, offset pinjam, offset batas, offset kembali (null = aktif)]
  const rows = [
    ['P001', '23001', 'BK001', -3, 4, null],
    ['P002', '23002', 'BK002', -4, 3, -1],
    ['P003', '23003', 'BK003', -8, -1, null],
    ['P004', '23004', 'BK004', -5, 2, null],
    ['P005', '23001', 'BK002', -20, -13, -14],
    ['P006', '23005', 'BK001', -18, -11, -12],
    ['P007', '23003', 'BK001', -15, -8, -9],
    ['P008', '23002', 'BK003', -12, -5, -6],
    ['P009', '23004', 'BK005', -10, -3, -4]
  ];
  const loans = rows.map(([id, memberId, kode, p, b, k]) => ({
    id, memberId, kode,
    tglPinjam: day(p), batas: day(b),
    tglKembali: k === null ? null : day(k),
    status: k === null ? 'Dipinjam' : 'Dikembalikan',
    createdAt: ms(day(p)),
    returnedAt: k === null ? null : ms(day(k), 15)
  }));
  const log = [{ at: ms(day(-5), 8), icon: '＋', title: 'Buku baru ditambahkan', sub: 'Pulang' }];
  return { books, members, loans, log, seq: 10 };
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (d && Array.isArray(d.books) && Array.isArray(d.members) && Array.isArray(d.loans)) {
        d.log = Array.isArray(d.log) ? d.log : [];
        d.seq = d.seq || d.loans.length + 1;
        return d;
      }
    }
  } catch (e) { /* abaikan, pakai data contoh */ }
  return seedData();
}

let db = loadData();
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); } catch (e) { /* penyimpanan tidak tersedia */ }
}
function addLog(icon, title, sub) {
  db.log.push({ at: Date.now(), icon, title, sub });
  if (db.log.length > 50) db.log = db.log.slice(-50);
}

/* ---------- Query helper ---------- */
const bookByKode = k => db.books.find(b => b.kode === k);
const memberById = id => db.members.find(m => m.id === id);
const memberName = l => memberById(l.memberId)?.nama ?? l.nama ?? '(anggota dihapus)';
const bookTitle = l => bookByKode(l.kode)?.judul ?? l.judul ?? '(buku dihapus)';
// Status turunan: Dipinjam | Terlambat | Dikembalikan
const loanStatus = l => l.status === 'Dikembalikan' ? 'Dikembalikan' : (l.batas < today() ? 'Terlambat' : 'Dipinjam');
const activeLoans = () => db.loans.filter(l => l.status !== 'Dikembalikan');
const activeCountOfMember = id => activeLoans().filter(l => l.memberId === id).length;
const borrowCount = kode => db.loans.filter(l => l.kode === kode).length;
const badgeClass = s => s === 'Terlambat' ? 'danger' : s === 'Dikembalikan' ? 'neutral' : 'warning';
const statusBadge = l => { const s = loanStatus(l); return `<span class="badge ${badgeClass(s)}">${s}</span>`; };
const emptyRow = (cols, text) => `<tr class="empty-row"><td colspan="${cols}">${text}</td></tr>`;

function bookMatches(b, q) {
  if (!q) return true;
  return [b.kode, b.judul, b.penulis, b.kategori].some(v => norm(v).includes(q));
}
function loanMatches(l, q) {
  if (!q) return true;
  return [memberName(l), bookTitle(l), l.kode, l.id].some(v => norm(v).includes(q));
}
const coverClass = kode => ['', 'blue', 'sage', 'cream'][[...kode].reduce((a, c) => a + c.charCodeAt(0), 0) % 4];

/* ---------- UI dasar (setiap halaman punya file HTML sendiri) ---------- */
const sidebar = $('#sidebar');
const profilePop = $('#profilePop');
let toastTimer;

$('#menuToggle').addEventListener('click', () => sidebar.classList.toggle('open'));
$('#profileBtn').addEventListener('click', () => profilePop.classList.toggle('hidden'));

function showToast(message) {
  const box = $('#toast');
  box.textContent = message;
  box.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => box.classList.add('hidden'), 3000);
}

/* Modal informasi / konfirmasi */
const modal = $('#modal');
let onConfirm = null;
function showModal(title, message, opts = {}) {
  $('#modalTitle').textContent = title;
  $('#modalText').textContent = message;
  $('#modalOk').textContent = opts.okText || 'Mengerti';
  $('#modalOk').classList.toggle('btn-danger', !!opts.danger);
  $('#modalCancel').classList.toggle('hidden', !opts.confirm);
  onConfirm = opts.confirm || null;
  modal.classList.remove('hidden');
}
function closeModal() { modal.classList.add('hidden'); onConfirm = null; }
function confirmBox(title, message, okText, fn, danger = false) {
  showModal(title, message, { confirm: fn, okText, danger });
}
$('#modalOk').addEventListener('click', () => { const fn = onConfirm; closeModal(); if (fn) fn(); });
$('#modalCancel').addEventListener('click', closeModal);
$('#modalClose').addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

/* Modal formulir generik */
const formModal = $('#formModal');
let formHandler = null;
function openForm({ title, fields, values = {}, submitText = 'Simpan', onSubmit }) {
  $('#formTitle').textContent = title;
  $('#formSubmit').textContent = submitText;
  $('#formError').textContent = '';
  $('#formFields').innerHTML = fields.map(f => {
    const v = values[f.name] ?? '';
    const attrs = [
      `id="ff_${f.name}"`, `name="${f.name}"`, `type="${f.type || 'text'}"`, `value="${esc(v)}"`,
      f.readonly ? 'readonly' : '', f.min != null ? `min="${f.min}"` : '', f.max != null ? `max="${f.max}"` : '',
      f.list ? `list="dl_${f.name}"` : '', f.placeholder ? `placeholder="${esc(f.placeholder)}"` : '', 'autocomplete="off"'
    ].filter(Boolean).join(' ');
    const dl = f.list ? `<datalist id="dl_${f.name}">${f.list.map(o => `<option value="${esc(o)}">`).join('')}</datalist>` : '';
    return `<div class="field ${f.full ? 'full' : ''}"><label for="ff_${f.name}">${esc(f.label)}</label><input ${attrs}>${dl}</div>`;
  }).join('');
  formHandler = onSubmit;
  formModal.classList.remove('hidden');
  const first = $('#formFields input:not([readonly])');
  if (first) first.focus();
}
function closeForm() { formModal.classList.add('hidden'); formHandler = null; }
$('#modalForm').addEventListener('submit', e => {
  e.preventDefault();
  if (!formHandler) return;
  const vals = {};
  new FormData(e.target).forEach((v, k) => { vals[k] = String(v).trim(); });
  const err = formHandler(vals);
  if (err) { $('#formError').textContent = err; return; }
  closeForm();
});
$('#formClose').addEventListener('click', closeForm);
$('#formCancel').addEventListener('click', closeForm);
formModal.addEventListener('click', e => { if (e.target === formModal) closeForm(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeModal(); closeForm(); sidebar.classList.remove('open'); profilePop.classList.add('hidden'); }
});

$('#aboutBtn').addEventListener('click', () => {
  profilePop.classList.add('hidden');
  showModal('Tentang BukuHijau', 'Aplikasi perpustakaan kelas: kelola buku dan anggota, catat peminjaman & pengembalian, dan lihat rekap. Data tersimpan di browser ini (localStorage).');
});
$('#resetBtn').addEventListener('click', () => {
  profilePop.classList.add('hidden');
  confirmBox('Reset data contoh?', 'Semua data buku, anggota, dan transaksi akan diganti dengan data contoh awal.', 'Reset', () => {
    db = seedData(); save(); resetLoanForm(); renderAll(); showToast('Data dikembalikan ke contoh awal.');
  }, true);
});
document.addEventListener('click', e => {
  if (!e.target.closest('.top-actions')) profilePop.classList.add('hidden');
});

/* ---------- Render ---------- */
function renderDashboard() {
  const active = activeLoans();
  const late = active.filter(l => loanStatus(l) === 'Terlambat').length;
  $('#stTitles').textContent = db.books.length;
  $('#stStock').textContent = db.books.reduce((s, b) => s + b.stok, 0);
  $('#stActive').textContent = active.length;
  $('#stActiveNote').textContent = late ? `${late} terlambat` : 'Transaksi aktif';
  $('#stMembers').textContent = db.members.length;

  const fav = [...db.books].sort((a, b) => borrowCount(b.kode) - borrowCount(a.kode) || a.judul.localeCompare(b.judul)).slice(0, 4);
  $('#favGrid').innerHTML = fav.length ? fav.map(b => `
    <div class="book-card">
      <div class="book-cover ${coverClass(b.kode)}">
        <div class="cover-line"></div>
        <div class="cover-title">${esc(b.judul)}</div>
        <div class="cover-author">${esc(b.penulis)}</div>
      </div>
      <div class="book-info">
        <strong>${esc(b.judul)}</strong>
        <small>${esc(b.penulis)}</small>
        <div class="stock">Stok: ${b.stok} · ${borrowCount(b.kode)}× dipinjam</div>
      </div>
    </div>`).join('') : '<p class="muted">Belum ada buku.</p>';

  const events = [];
  db.loans.forEach(l => {
    events.push({ at: l.createdAt || 0, icon: '↗', title: `${memberName(l)} meminjam buku`, sub: `${bookTitle(l)} · ${fmtDate(l.tglPinjam)}` });
    if (l.status === 'Dikembalikan') events.push({ at: l.returnedAt || 0, icon: '✓', title: `${memberName(l)} mengembalikan buku`, sub: `${bookTitle(l)} · ${fmtDate(l.tglKembali)}` });
  });
  db.log.forEach(x => events.push({ at: x.at, icon: x.icon, title: x.title, sub: `${x.sub} · ${fmtDate(iso(new Date(x.at)))}` }));
  events.sort((a, b) => b.at - a.at);
  $('#activityList').innerHTML = events.slice(0, 5).map(ev => `
    <div class="activity">
      <div class="activity-dot">${ev.icon}</div>
      <div><strong>${esc(ev.title)}</strong><small>${esc(ev.sub)}</small></div>
    </div>`).join('') || '<p class="muted">Belum ada aktivitas.</p>';

  const recent = [...db.loans].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 5);
  $('#recentBody').innerHTML = recent.map(l => `
    <tr><td>${esc(memberName(l))}</td><td>${esc(bookTitle(l))}</td><td>${fmtDate(l.tglPinjam)}</td><td>${fmtDate(l.batas)}</td><td>${statusBadge(l)}</td></tr>`).join('')
    || emptyRow(5, 'Belum ada peminjaman.');
}

function renderBooks() {
  // Filter kategori (dibangun dari data, nilai terpilih dipertahankan)
  const sel = $('#bookCategory');
  const cur = sel.value;
  const cats = [...new Set(db.books.map(b => b.kategori))].sort((a, b) => a.localeCompare(b));
  sel.innerHTML = '<option value="">Semua kategori</option>' + cats.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
  sel.value = cats.includes(cur) ? cur : '';

  const q = norm($('#bookSearch').value);
  const rows = db.books.filter(b => bookMatches(b, q) && (!sel.value || b.kategori === sel.value));
  $('#bookCount').textContent = `${rows.length} buku`;
  $('#bookBody').innerHTML = rows.map(b => `
    <tr>
      <td><b>${esc(b.judul)}</b><small class="cell-sub">${esc(b.penulis)}</small></td>
      <td>${esc(b.kode)}</td><td>${esc(b.kategori)}</td><td>${b.tahun}</td><td>${b.stok}</td>
      <td>${b.stok > 0 ? '<span class="badge">Tersedia</span>' : '<span class="badge danger">Habis</span>'}</td>
    </tr>`).join('') || emptyRow(6, 'Tidak ada buku yang cocok dengan pencarian.');
}

function renderManage() {
  const q = norm($('#manageSearch').value);
  const rows = db.books.filter(b => bookMatches(b, q));
  $('#manageCount').textContent = `${rows.length} buku`;
  $('#manageBody').innerHTML = rows.map(b => `
    <tr>
      <td>${esc(b.kode)}</td><td><b>${esc(b.judul)}</b></td><td>${esc(b.penulis)}</td>
      <td>${esc(b.kategori)}</td><td>${b.tahun}</td><td>${b.stok}</td>
      <td><button class="icon-btn" data-act="edit-book" data-id="${esc(b.kode)}">Edit</button>
          <button class="icon-btn delete" data-act="del-book" data-id="${esc(b.kode)}">Hapus</button></td>
    </tr>`).join('') || emptyRow(7, 'Belum ada data buku.');
}

function renderMembers() {
  const q = norm($('#memberSearch').value);
  const rows = db.members.filter(m => !q || [m.id, m.nama, m.kelas, m.kontak].some(v => norm(v).includes(q)));
  $('#memberCount').textContent = `${rows.length} anggota`;
  $('#memberBody').innerHTML = rows.map(m => `
    <tr>
      <td>${esc(m.id)}</td><td><b>${esc(m.nama)}</b></td><td>${esc(m.kelas)}</td><td>${esc(m.kontak)}</td>
      <td>${activeCountOfMember(m.id)}</td>
      <td><button class="icon-btn" data-act="edit-member" data-id="${esc(m.id)}">Edit</button>
          <button class="icon-btn delete" data-act="del-member" data-id="${esc(m.id)}">Hapus</button></td>
    </tr>`).join('') || emptyRow(6, 'Belum ada data anggota.');
}

function renderLoanForm() {
  const mSel = $('#loanMember'), bSel = $('#loanBook');
  const mv = mSel.value, bv = bSel.value;
  mSel.innerHTML = '<option value="">Pilih nama anggota</option>' +
    db.members.map(m => `<option value="${esc(m.id)}">${esc(m.nama)} — ${esc(m.id)}</option>`).join('');
  bSel.innerHTML = '<option value="">Pilih buku</option>' +
    db.books.map(b => `<option value="${esc(b.kode)}">${esc(b.judul)} (${esc(b.kode)}) — stok ${b.stok}</option>`).join('');
  if (db.members.some(m => m.id === mv)) mSel.value = mv;
  if (db.books.some(b => b.kode === bv)) bSel.value = bv;
  updateStockInfo();
}
function updateStockInfo() {
  const info = $('#loanStockInfo');
  const b = bookByKode($('#loanBook').value);
  info.classList.remove('bad', 'good');
  if (!b) { info.textContent = 'Pilih buku untuk melihat stok.'; return; }
  if (b.stok > 0) { info.textContent = `Stok tersedia: ${b.stok} buku.`; info.classList.add('good'); }
  else { info.textContent = 'Stok habis — buku ini belum dapat dipinjam.'; info.classList.add('bad'); }
}
function resetLoanForm() {
  if (!has('loanForm')) return;
  $('#loanForm').reset();
  $('#loanError').textContent = '';
  $('#loanDate').value = today();
  $('#loanDuration').value = '7';
  $('#loanDue').value = addDays(today(), 7);
  updateStockInfo();
}

function renderReturn() {
  const q = norm($('#returnSearch').value), st = $('#returnStatus').value;
  const rows = activeLoans().filter(l => loanMatches(l, q) && (!st || loanStatus(l) === st))
    .sort((a, b) => a.batas.localeCompare(b.batas));
  $('#returnCount').textContent = `${rows.length} pinjaman aktif`;
  $('#returnBody').innerHTML = rows.map(l => `
    <tr>
      <td>${esc(memberName(l))}</td><td>${esc(bookTitle(l))}</td><td>${fmtDate(l.tglPinjam)}</td><td>${fmtDate(l.batas)}</td>
      <td>${statusBadge(l)}</td>
      <td><button class="btn btn-light" data-act="return" data-id="${esc(l.id)}">Kembalikan</button></td>
    </tr>`).join('') || emptyRow(6, 'Tidak ada buku yang sedang dipinjam.');
}

function renderHistory() {
  const q = norm($('#historySearch').value), st = $('#historyStatus').value;
  const rows = [...db.loans].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .filter(l => loanMatches(l, q) && (!st || loanStatus(l) === st));
  $('#historyCount').textContent = `${rows.length} transaksi`;
  $('#historyBody').innerHTML = rows.map(l => `
    <tr><td>${esc(l.id)}</td><td>${esc(memberName(l))}</td><td>${esc(bookTitle(l))}</td><td>${fmtDate(l.tglPinjam)}</td>
    <td>${fmtDate(l.batas)}</td><td>${fmtDate(l.tglKembali)}</td><td>${statusBadge(l)}</td></tr>`).join('')
    || emptyRow(7, 'Belum ada transaksi.');
}

function renderRecap() {
  const active = activeLoans();
  const returned = db.loans.filter(l => l.status === 'Dikembalikan');
  $('#rcActive').textContent = active.length;
  $('#rcLate').textContent = active.filter(l => loanStatus(l) === 'Terlambat').length;
  $('#rcReturned').textContent = returned.length;
  $('#rcTotal').textContent = db.loans.length;

  // Buku paling sering dipinjam (dihitung dari semua transaksi)
  const counts = {};
  db.loans.forEach(l => { counts[l.kode] = (counts[l.kode] || 0) + 1; });
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 5);
  const max = top.length ? top[0][1] : 1;
  $('#rankList').innerHTML = top.map(([kode, n], i) => {
    const b = bookByKode(kode);
    const title = b ? b.judul : (db.loans.find(l => l.kode === kode)?.judul ?? kode);
    return `<div class="rank-item">
      <div class="rank-no">${i + 1}</div>
      <div class="rank-body">
        <div class="rank-top"><strong>${esc(title)}</strong><span>${n}× dipinjam</span></div>
        <div class="rank-bar"><i style="width:${Math.max(6, n / max * 100)}%"></i></div>
      </div></div>`;
  }).join('') || '<p class="muted">Belum ada data peminjaman.</p>';

  const lastReturns = [...returned].sort((a, b) => (b.returnedAt || 0) - (a.returnedAt || 0)).slice(0, 5);
  $('#recentReturns').innerHTML = lastReturns.map(l => {
    const late = diffDays(l.batas, l.tglKembali);
    return `<div class="activity"><div class="activity-dot">✓</div>
      <div><strong>${esc(memberName(l))}</strong><small>${esc(bookTitle(l))} · ${fmtDate(l.tglKembali)}${late > 0 ? ` · terlambat ${late} hari` : ''}</small></div></div>`;
  }).join('') || '<p class="muted">Belum ada pengembalian.</p>';

  $('#recapActiveBody').innerHTML = [...active].sort((a, b) => a.batas.localeCompare(b.batas)).map(l => `
    <tr><td>${esc(memberName(l))}</td><td>${esc(bookTitle(l))}</td><td>${fmtDate(l.tglPinjam)}</td><td>${fmtDate(l.batas)}</td><td>${statusBadge(l)}</td></tr>`).join('')
    || emptyRow(5, 'Tidak ada peminjaman aktif.');
}

function renderAll() {
  if (has('favGrid')) renderDashboard();
  if (has('bookBody')) renderBooks();
  if (has('manageBody')) renderManage();
  if (has('memberBody')) renderMembers();
  if (has('loanForm')) renderLoanForm();
  if (has('returnBody')) renderReturn();
  if (has('historyBody')) renderHistory();
  if (has('rankList')) renderRecap();
}

/* ---------- FR-02: CRUD buku ---------- */
function bookFields(editing) {
  return [
    { name: 'kode', label: 'Kode buku', readonly: editing, placeholder: 'mis. BK009' },
    { name: 'judul', label: 'Judul', full: true },
    { name: 'penulis', label: 'Penulis', full: true },
    { name: 'kategori', label: 'Kategori', list: [...new Set(db.books.map(b => b.kategori))] },
    { name: 'tahun', label: 'Tahun terbit', type: 'number', min: 1000, max: new Date().getFullYear() + 1 },
    { name: 'stok', label: 'Jumlah stok', type: 'number', min: 0 }
  ];
}
function validateBook(v, editing) {
  if (!v.kode || !v.judul || !v.penulis || !v.kategori || !v.tahun || v.stok === '') return 'Semua kolom wajib diisi.';
  const tahun = Number(v.tahun), stok = Number(v.stok);
  if (!Number.isInteger(tahun) || tahun < 1000 || tahun > new Date().getFullYear() + 1) return 'Tahun terbit tidak valid.';
  if (!Number.isInteger(stok) || stok < 0) return 'Stok harus bilangan bulat 0 atau lebih.';
  if (!editing && db.books.some(b => b.kode.toLowerCase() === v.kode.toLowerCase())) return `Kode ${v.kode} sudah dipakai.`;
  return null;
}
$('#addBookBtn').addEventListener('click', () => {
  openForm({
    title: 'Tambah Buku', fields: bookFields(false), values: { stok: 1 },
    onSubmit(v) {
      const err = validateBook(v, false); if (err) return err;
      db.books.push({ kode: v.kode.toUpperCase(), judul: v.judul, penulis: v.penulis, kategori: v.kategori, tahun: +v.tahun, stok: +v.stok });
      addLog('＋', 'Buku baru ditambahkan', v.judul);
      save(); renderAll(); showToast('Buku ditambahkan.');
    }
  });
});
$('#manageBody').addEventListener('click', e => {
  const btn = e.target.closest('[data-act]'); if (!btn) return;
  const b = bookByKode(btn.dataset.id); if (!b) return;
  if (btn.dataset.act === 'edit-book') {
    openForm({
      title: `Edit Buku ${b.kode}`, fields: bookFields(true), values: b,
      onSubmit(v) {
        const err = validateBook(v, true); if (err) return err;
        Object.assign(b, { judul: v.judul, penulis: v.penulis, kategori: v.kategori, tahun: +v.tahun, stok: +v.stok });
        save(); renderAll(); showToast('Data buku diperbarui.');
      }
    });
  } else if (btn.dataset.act === 'del-book') {
    const n = activeLoans().filter(l => l.kode === b.kode).length;
    if (n) return showModal('Tidak dapat menghapus', `Buku "${b.judul}" masih dipinjam (${n} transaksi aktif). Selesaikan pengembaliannya terlebih dahulu.`);
    confirmBox('Hapus buku?', `Buku "${b.judul}" akan dihapus dari koleksi.`, 'Hapus', () => {
      db.books = db.books.filter(x => x.kode !== b.kode);
      // simpan salinan judul agar riwayat tetap terbaca
      db.loans.forEach(l => { if (l.kode === b.kode) l.judul = b.judul; });
      addLog('✕', 'Buku dihapus', b.judul);
      save(); renderAll(); showToast('Buku dihapus.');
    }, true);
  }
});

/* ---------- FR-01: CRUD anggota ---------- */
function memberFields(editing) {
  return [
    { name: 'id', label: 'No. anggota', readonly: editing, placeholder: 'mis. 23006' },
    { name: 'nama', label: 'Nama lengkap', full: true },
    { name: 'kelas', label: 'Kelas' },
    { name: 'kontak', label: 'Kontak (HP/email)' }
  ];
}
function validateMember(v, editing) {
  if (!v.id || !v.nama || !v.kelas || !v.kontak) return 'Semua kolom wajib diisi.';
  if (!editing && memberById(v.id)) return `No. anggota ${v.id} sudah terdaftar.`;
  return null;
}
$('#addMemberBtn').addEventListener('click', () => {
  const next = String(Math.max(23000, ...db.members.map(m => parseInt(m.id, 10) || 0)) + 1);
  openForm({
    title: 'Tambah Anggota', fields: memberFields(false), values: { id: next },
    onSubmit(v) {
      const err = validateMember(v, false); if (err) return err;
      db.members.push({ id: v.id, nama: v.nama, kelas: v.kelas, kontak: v.kontak });
      addLog('♙', 'Anggota baru terdaftar', v.nama);
      save(); renderAll(); showToast('Anggota ditambahkan.');
    }
  });
});
$('#memberBody').addEventListener('click', e => {
  const btn = e.target.closest('[data-act]'); if (!btn) return;
  const m = memberById(btn.dataset.id); if (!m) return;
  if (btn.dataset.act === 'edit-member') {
    openForm({
      title: `Edit Anggota ${m.id}`, fields: memberFields(true), values: m,
      onSubmit(v) {
        const err = validateMember(v, true); if (err) return err;
        Object.assign(m, { nama: v.nama, kelas: v.kelas, kontak: v.kontak });
        save(); renderAll(); showToast('Data anggota diperbarui.');
      }
    });
  } else if (btn.dataset.act === 'del-member') {
    const n = activeCountOfMember(m.id);
    if (n) return showModal('Tidak dapat menghapus', `${m.nama} masih memiliki ${n} buku yang belum dikembalikan.`);
    confirmBox('Hapus anggota?', `Anggota "${m.nama}" akan dihapus.`, 'Hapus', () => {
      db.members = db.members.filter(x => x.id !== m.id);
      db.loans.forEach(l => { if (l.memberId === m.id) l.nama = m.nama; });
      addLog('✕', 'Anggota dihapus', m.nama);
      save(); renderAll(); showToast('Anggota dihapus.');
    }, true);
  }
});

/* ---------- FR-03 + FR-05: peminjaman ---------- */
$('#loanBook').addEventListener('change', updateStockInfo);
$('#loanDuration').addEventListener('change', () => {
  const d = $('#loanDate').value || today();
  $('#loanDue').value = addDays(d, Number($('#loanDuration').value));
});
$('#loanDate').addEventListener('change', () => {
  const d = $('#loanDate').value;
  if (d) $('#loanDue').value = addDays(d, Number($('#loanDuration').value));
});
$('#loanReset').addEventListener('click', () => setTimeout(resetLoanForm, 0));

$('#loanForm').addEventListener('submit', e => {
  e.preventDefault();
  const err = $('#loanError');
  const memberId = $('#loanMember').value, kode = $('#loanBook').value;
  const tgl = $('#loanDate').value, due = $('#loanDue').value;
  const fail = msg => { err.textContent = msg; };

  const member = memberById(memberId), book = bookByKode(kode);
  if (!member) return fail('Pilih anggota terlebih dahulu.');
  if (!book) return fail('Pilih buku terlebih dahulu.');
  if (!tgl || !due) return fail('Tanggal pinjam dan tanggal pengembalian wajib diisi.');
  if (due < tgl) return fail('Tanggal pengembalian tidak boleh sebelum tanggal pinjam.');
  if (diffDays(tgl, due) > MAX_LOAN_DAYS) return fail(`Durasi peminjaman maksimal ${MAX_LOAN_DAYS} hari.`);
  // FR-05: hanya boleh jika stok tersedia
  if (book.stok <= 0) return fail(`Stok buku "${book.judul}" habis, peminjaman tidak dapat dilakukan.`);
  if (activeLoans().some(l => l.memberId === memberId && l.kode === kode)) {
    return fail(`${member.nama} masih meminjam "${book.judul}" dan belum mengembalikannya.`);
  }

  const id = 'P' + String(db.seq++).padStart(3, '0');
  db.loans.push({ id, memberId, kode, tglPinjam: tgl, batas: due, tglKembali: null, status: 'Dipinjam', createdAt: Date.now(), returnedAt: null });
  book.stok -= 1;
  save();
  resetLoanForm();
  renderAll();
  showToast(`${member.nama} meminjam "${book.judul}". Sisa stok: ${book.stok}.`);
});

/* ---------- FR-03 + FR-06: pengembalian ---------- */
$('#returnBody').addEventListener('click', e => {
  const btn = e.target.closest('[data-act="return"]'); if (!btn) return;
  const loan = db.loans.find(l => l.id === btn.dataset.id);
  if (!loan || loan.status === 'Dikembalikan') return;
  confirmBox('Kembalikan buku?', `${memberName(loan)} mengembalikan "${bookTitle(loan)}".`, 'Ya, kembalikan', () => {
    const tgl = today();
    loan.status = 'Dikembalikan';           // FR-06: status berubah
    loan.tglKembali = tgl;
    loan.returnedAt = Date.now();
    const book = bookByKode(loan.kode);
    if (book) book.stok += 1;               // stok bertambah lagi
    save(); renderAll();
    const late = diffDays(loan.batas, tgl);
    showToast(late > 0 ? `Buku dikembalikan (terlambat ${late} hari).` : 'Buku berhasil dikembalikan.');
  });
});

/* ---------- Pencarian & filter ---------- */
['#bookSearch', '#manageSearch', '#memberSearch', '#returnSearch', '#historySearch'].forEach(sel => {
  $(sel).addEventListener('input', renderAll);
});
['#bookCategory', '#returnStatus', '#historyStatus'].forEach(sel => $(sel).addEventListener('change', renderAll));
$('#bookSearchBtn').addEventListener('click', renderBooks);
$('#bookSearch').addEventListener('keydown', e => { if (e.key === 'Enter') renderBooks(); });

/* ---------- Ekspor CSV riwayat ---------- */
$('#exportBtn').addEventListener('click', () => {
  const head = ['ID', 'Anggota', 'Buku', 'Tgl Pinjam', 'Batas Kembali', 'Tgl Kembali', 'Status'];
  const q = v => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [head.map(q).join(',')].concat(db.loans.map(l =>
    [l.id, memberName(l), bookTitle(l), l.tglPinjam, l.batas, l.tglKembali || '', loanStatus(l)].map(q).join(',')));
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'riwayat-peminjaman.csv';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  showToast('Riwayat diekspor ke CSV.');
});

/* ---------- Mulai ---------- */
if (has('loanForm')) resetLoanForm();
renderAll();
