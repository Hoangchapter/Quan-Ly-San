// app.js - Quản lý dữ liệu, render UI, lưu localStorage

const BASE_URL = 'http://localhost:3000/api';
// --- Keys storage
// const KEY_COURTS = 'pb_courts_v1'
// const KEY_BOOKINGS = 'pb_bookings_v1'

// --- Helpers DOM
const $ = id => document.getElementById(id)
const el = sel => document.querySelector(sel)

// --- Default data (lần đầu chạy)
// const defaultCourts = [
//   { id: 'court-a', name: 'Sân A', size: 1, bookingsCount: 45, revenue: 12500000 },
//   { id: 'court-b', name: 'Sân B', size: 2, bookingsCount: 38, revenue: 10800000 },
//   { id: 'court-c', name: 'Sân C', size: 1, bookingsCount: 25, revenue: 9500000 }
// ]

// --- Load/Save helpers
// function loadJSON(key, fallback) {
//   try { return JSON.parse(localStorage.getItem(key)) || fallback } catch(e) { return fallback }
// }
// function saveJSON(key, data) { localStorage.setItem(key, JSON.stringify(data)) }

// --- App state
// let courts = loadJSON(KEY_COURTS, defaultCourts.slice())
// let bookings = loadJSON(KEY_BOOKINGS, [])
let courts = [];
let bookings = [];

// --- UI elements
const pages = document.querySelectorAll('.page')
const menuItems = document.querySelectorAll('.menu-item')

// set top date
$('topDate').textContent = new Date().toLocaleString('vi-VN', { weekday:'long', year:'numeric', month:'long', day:'numeric' })

// --- Navigation
menuItems.forEach(btn => {
  btn.addEventListener('click', () => {
    menuItems.forEach(x => x.classList.remove('active'))
    btn.classList.add('active')
    const page = btn.dataset.page
    pages.forEach(p => p.classList.toggle('hidden', p.id !== page))
  })
})

// --- Utilities
function uid(prefix='id') { return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,6) }
function courtName(id) { const c = courts.find(x=>x.id===id); return c? c.name : id }

// --- Render functions
function renderStats() {
  $('statTotalCourts').textContent = courts.length
  $('statTotalBookings').textContent = bookings.length
  const revenue = bookings.reduce((s,b)=> s + (Number(b.price)||0), 0)
  $('statRevenue').textContent = revenue.toLocaleString('vi-VN') + ' đ'
  const today = new Date().toISOString().slice(0,10)
  const activeToday = bookings.filter(b => b.date === today).length
  $('statActiveToday').textContent = activeToday
}

function renderPopularCourts() {
  const wrap = $('popularCourts'); wrap.innerHTML = ''
  // sort by bookingsCount (demo data)
  const list = courts.slice().sort((a,b)=> (b.bookingsCount||0) - (a.bookingsCount||0))
  list.forEach(c => {
    const row = document.createElement('div'); row.className = 'list-item'
    row.innerHTML = `<div>${c.name} - ${c.size} người</div><div>${(c.revenue||0).toLocaleString('vi-VN')} đ</div>`
    wrap.appendChild(row)
  })
}

function renderRecentActivity() {
  const wrap = $('recentActivity'); wrap.innerHTML = ''
  // show last 6 bookings/activities
  const acts = bookings.slice().sort((a,b)=> b.createdAt.localeCompare(a.createdAt)).slice(0,6)
  if(!acts.length) { wrap.innerHTML = '<div class="muted">Chưa có hoạt động</div>'; return }
  acts.forEach(a => {
    const div = document.createElement('div'); div.className = 'list-item'
    const left = `${a.action || 'Đặt sân'} — ${a.name}`
    const right = timeAgo(a.createdAt)
    div.innerHTML = `<div>${left}</div><div style="color:var(--muted)">${right}</div>`
    wrap.appendChild(div)
  })
}

function renderCourtsTable() {
  const tbody = $('courtsTable'); tbody.innerHTML = ''
  courts.forEach(c => {
    const tr = document.createElement('tr')
    tr.innerHTML = `<td>${c.name}</td><td>${c.size}</td><td>${c.bookingsCount||0}</td>
      <td><button class="secondary" data-id="${c.id}" onclick="deleteCourt('${c.id}')">Xóa</button></td>`
    tbody.appendChild(tr)
  })
}

function renderBookingFormCourts() {
  const sel = $('bkCourt'); sel.innerHTML = ''
  courts.forEach(c => {
    const opt = document.createElement('option'); opt.value = c.id; opt.textContent = c.name
    sel.appendChild(opt)
  })
}

function renderBookingsTable() {
  const tbody = $('bookingsTable'); tbody.innerHTML = ''
  // sort by date asc
  const list = bookings.slice().sort((a,b)=> a.date.localeCompare(b.date) || a.slot.localeCompare(b.slot))
  list.forEach(b => {
    const tr = document.createElement('tr')
    tr.innerHTML = `<td>${b.date}</td>
      <td>${courtName(b.court)}</td>
      <td>${b.slot}</td>
      <td>${b.name}</td>
      <td>${b.note||''}</td>
      <td>${(Number(b.price)||0).toLocaleString('vi-VN')} đ</td>
      <td><button class="secondary" onclick="cancelBooking('${b.id}')">Hủy</button></td>`
    tbody.appendChild(tr)
  })
}

// --- Time ago helper
function timeAgo(iso){
  if(!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff/60000)
  if(mins < 1) return 'vừa xong'
  if(mins < 60) return `${mins} phút trước`
  const hrs = Math.floor(mins/60)
  if(hrs < 24) return `${hrs} giờ trước`
  const days = Math.floor(hrs/24); return `${days} ngày trước`
}

// --- Booking logic
function isConflict(courtId, date, slot){
  return bookings.some(b => b.court===courtId && b.date===date && b.slot===slot)
}

async function addBooking(payload){
  if(!payload.name || !payload.court || !payload.date || !payload.slot) return {ok:false, msg:'Thiếu thông tin'}
  if(isConflict(payload.court, payload.date, payload.slot)) return {ok:false, msg:'Khung giờ đã có người đặt'}
  const bk = {
    id: uid('bk'), name: payload.name, court: payload.court,
    date: payload.date, slot: payload.slot, note: payload.note || '',
    price: payload.price || 0, createdAt: new Date().toISOString(),
    action: 'Đặt sân'
  }
  // bookings.push(bk)
  await fetch ('/api/bookings')
  // cập nhật số lượt & doanh thu demo cho court
  const c = courts.find(x=>x.id===payload.court)
  if(c){ c.bookingsCount = (c.bookingsCount||0) + 1; c.revenue = (c.revenue||0) + Number(bk.price||0) }
  saveAll()
  // renderAll()
  fetchAndRender();
  return {ok:true}
}

function cancelBooking(id){
  const b = bookings.find(x=>x.id===id)
  if(!b) return
  bookings = bookings.filter(x=>x.id !== id)
  // update court counters (demo)
  const c = courts.find(x=>x.id===b.court)
  if(c){ c.bookingsCount = Math.max(0,(c.bookingsCount||0)-1); c.revenue = Math.max(0,(c.revenue||0) - Number(b.price||0)) }
  // add recent activity item
  const act = {...b, id: uid('act'), action: 'Hủy đặt', createdAt: new Date().toISOString()}
  bookings.push // (we don't push to bookings — we keep only in recent activities via createdAt of bookings)
  saveAll()
  // renderAll()
  fetchAndRender()
}

// --- CRUD courts
function addCourt(name, size=5){
  const id = name.trim().toLowerCase().replace(/\s+/g,'-') + '-' + Math.random().toString(36).slice(2,5)
  courts.push({id, name, size: Number(size), bookingsCount:0, revenue:0})
  saveAll()
  // renderAll()
  fetchAndRender()
}
function deleteCourt(id){
  if(!confirm('Xóa sân này?')) return
  courts = courts.filter(c => c.id !== id)
  bookings = bookings.filter(b => b.court !== id)
  saveAll(); 
  // renderAll()
  fetchAndRender()
}

// --- Import / Export
function exportJSON(){
  const data = { courts, bookings }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = 'pickleball-data.json'; a.click()
  URL.revokeObjectURL(url)
}
function importJSONFile(file){
  const reader = new FileReader()
  reader.onload = e => {
    try{
      const obj = JSON.parse(e.target.result)
      if(Array.isArray(obj.courts)) courts = obj.courts
      if(Array.isArray(obj.bookings)) bookings = obj.bookings
      saveAll(); 
      // renderAll(); 
      fetchAndRender();
      alert('Nhập dữ liệu thành công')
    }catch(err){ alert('Tập tin không hợp lệ') }
  }
  reader.readAsText(file)
}

// --- Save all
function saveAll(){ saveJSON(KEY_COURTS, courts); saveJSON(KEY_BOOKINGS, bookings) }

// --- Render everything
function renderAll(){
  renderStats(); renderPopularCourts(); renderRecentActivity()
  renderCourtsTable(); renderBookingFormCourts(); renderBookingsTable()
}

async function fetchAndRender() {
  
  try{
    // lay courts
    const courtsRes = await fetch(`${BASE_URL}/courts`);
    courts = await courtsRes.json();

    // lay booking
    const bookingsRes = await fetch(`${BASE_URL}/bookings`);
    bookings = await bookingsRes.json();

    // goi cac ham rende ui
    renderStats(); 
    renderPopularCourts(); 
    renderRecentActivity();
    renderCourtsTable(); 
    renderBookingFormCourts(); 
    renderBookingsTable();
  }catch(error){
    console.log("Loi khi fetch du lieu", error);
  }
}

function logout() {
    if (confirm("Bạn có chắc muốn đăng xuất không?")) {
        alert("Đã đăng xuất!");
        window.location.href = 'login.html';
    }
}

// --- Wire UI events
document.addEventListener('DOMContentLoaded', () => {
  // init date input default
  const today = new Date().toISOString().slice(0,10)
  $('bkDate').value = today

  // render initial
  // renderAll()
  fetchAndRender();

  // add court
  $('addCourtBtn').addEventListener('click', () => {
    const name = $('courtNameInput').value.trim()
    const size = $('courtSizeInput').value
    if(!name) return alert('Nhập tên sân')
    addCourt(name, size); $('courtNameInput').value = ''
  })

  // booking submit
  $('bookingForm').addEventListener('submit', e => {
    e.preventDefault()
    const payload = {
      name: $('bkName').value.trim(),
      court: $('bkCourt').value,
      date: $('bkDate').value,
      slot: $('bkSlot').value,
      note: $('bkNote').value.trim(),
      price: Number($('bkPrice').value) || 0
    }
    const res = addBooking(payload)
    if(!res.ok) return alert(res.msg)
    alert('Đặt sân thành công')
    $('bookingForm').reset()
    $('bkDate').value = today
  })

  $('resetBookingForm').addEventListener('click', () => {
    $('bookingForm').reset(); $('bkDate').value = today
  })

  $('exportBtn').addEventListener('click', exportJSON)
  $('importBtn').addEventListener('click', () => $('importFile').click())
  $('importFile').addEventListener('change', e => {
    if(e.target.files.length) importJSONFile(e.target.files[0])
    e.target.value = null
  })
  $('clearAll').addEventListener('click', () => {
    if(confirm('Xóa tất cả lịch đặt?')) { bookings = []; saveAll(); fetchAndRender() } 
    
  })
})

// --- small utils exposed to HTML (for delete/cancel buttons)
window.cancelBooking = cancelBooking
window.deleteCourt = deleteCourt
