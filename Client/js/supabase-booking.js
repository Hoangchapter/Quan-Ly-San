// FULL supabase-booking.js with payment calculation integrated

/* ============================================================
   SUPABASE BOOKING — FULL VERSION WITH PAYMENT CALCULATION
   ============================================================ */

document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 JS START LOADING...");
  const SUPABASE_URL = "https://hsepwjxuiclhtkfroanq.supabase.co";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzZXB3anh1aWNsaHRrZnJvYW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1ODQyODUsImV4cCI6MjA3OTE2MDI4NX0.rPQ0BP0xJr0IgesIykXclwFUnJ151kBjWgE4rL4F4ro";

  const TZ_SUFFIX = "+07:00";

  let supabase;
  try {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("✅ Supabase initialized");
  } catch (err) {
    console.error("❌ Cannot initialize Supabase:", err);
    return;
  }

  // ------------ DOM ELEMENTS --------------
  const dateSelect = document.getElementById("date-select");
  const fieldFilter = document.getElementById("field-filter");
  const createBtn = document.querySelector(".create-btn");

  // NEW BOOKING
  const newModal = document.getElementById("newBookingModal");
  const newCustomer = document.getElementById("new-customer-name");
  const newDate = document.getElementById("new-date");
  const newKhu = document.getElementById("new-Khu");
  const newField = document.getElementById("new-field");
  const newStart = document.getElementById("new-start-time");
  const newEnd = document.getElementById("new-end-time");
  const newNotes = document.getElementById("new-notes");
  const closeNewModalBtn = document.getElementById("closeNewModalBtn");
  const submitNewBookingBtn = document.getElementById("submitNewBookingBtn");

  // EDIT MODAL
  const editModal = document.getElementById("editBookingModal");
  const editBookingId = document.getElementById("edit-booking-id");
  const editCustomer = document.getElementById("edit-customer-name");
  const editDate = document.getElementById("edit-date");
  const editKhu = document.getElementById("edit-Khu");
  const editField = document.getElementById("edit-field");
  const editStart = document.getElementById("edit-start-time");
  const editEnd = document.getElementById("edit-end-time");
  const editPaymentStatus = document.getElementById("edit-payment-status");
  const editPriceInput = document.getElementById("edit-price");
  const deleteBookingBtn = document.getElementById("deleteBookingBtn");
  const saveBookingBtn = document.getElementById("saveBookingBtn");
  const closeEditModalBtn = document.getElementById("closeEditModalBtn");

  const bookingGridContainer = document.getElementById("bookingGrid");

  // ------------ STATE --------------
  let venues = [];
  let courts = [];
  let bookings = [];
  let currentCourtId = null;
  let editingBooking = null;
  let isLoadingBookings = false;   // ✅ FIX LỖI TẠI ĐÂY
  // ------------ HELPERS --------------
  const toISOWithTZ = (d, t) => `${d}T${t}:00${TZ_SUFFIX}`;
  const toRange = (s, e) => `[${s},${e})`;

  function parseDuring(val) {
    if (!val) return null;
    const m = val.match(/^\[(.*?),(.*?)\)$/);
    if (!m) return null;
    return { start: m[1] || null, end: m[2] || null };
  }

  function hhmmFromISO(iso) {
    if (!iso || typeof iso !== "string") return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }

  const escapeHtml = (str = "") =>
    String(str).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[c]));

  // ------------ TIME OPTIONS --------------
  const HOURS = [
    "08:00", "09:00", "10:00", "11:00", "12:00",
    "13:00", "14:00", "15:00", "16:00", "17:00",
    "18:00", "19:00", "20:00", "21:00", "22:00"
  ];

  function populateTimeSelects() {
    const targets = [newStart, newEnd, editStart, editEnd];
    targets.forEach(sel => {
      sel.innerHTML = "";
      HOURS.forEach(h => {
        const o = document.createElement("option");
        o.value = h;
        o.textContent = h;
        sel.appendChild(o);
      });
    });
  }

  // ------------ GRID BUILDERS --------------
  function buildCourtColumns(ids) {
    const map = {};
    ids.forEach((id, idx) => (map[id] = idx + 2));
    return map;
  }

  function computeGridRows(startISO, endISO) {
    const start = new Date(startISO);
    const end = new Date(endISO);

    const gridStartHour = 8; // lưới bắt đầu từ 08:00
    const baseRow = 2;      // row 1 là header

    const startHour = start.getHours();
    const endHour = end.getHours();

    const startRow = baseRow + (startHour - gridStartHour);

    // ✅ +1 ô theo quy ước của bạn
    let span = (endHour - startHour) + 1;

    // Nếu kết thúc đúng :00 thì vẫn tính +1 ô
    if (end.getMinutes() === 0) {
      span = (endHour - startHour) + 1;
    }

    let endRow = startRow + span;

    return { startRow, endRow };
  }




  function buildDynamicGrid(courtsToShow) {
    bookingGridContainer.innerHTML = "";
    bookingGridContainer.style.display = "grid";
    bookingGridContainer.style.gridTemplateColumns = `120px repeat(${courtsToShow.length}, 1fr)`;
    bookingGridContainer.style.gridTemplateRows = `50px repeat(${HOURS.length}, 50px)`;

    const head = document.createElement("div");
    head.className = "header-cell";
    head.innerText = "Giờ";
    head.style.gridColumn = 1;
    head.style.gridRow = 1;
    bookingGridContainer.appendChild(head);

    courtsToShow.forEach((c, idx) => {
      const col = document.createElement("div");
      col.className = "header-cell";
      col.innerText = c.name;
      col.style.gridColumn = idx + 2;
      col.style.gridRow = 1;
      bookingGridContainer.appendChild(col);
    });

    HOURS.forEach((h, idx) => {
      const t = document.createElement("div");
      t.className = "time-slot";
      t.innerText = h;
      t.style.gridColumn = 1;
      t.style.gridRow = idx + 2;
      bookingGridContainer.appendChild(t);

      courtsToShow.forEach((c, colIdx) => {
        const cell = document.createElement("div");
        cell.className = "grid-cell";
        cell.dataset.courtId = c.id;
        cell.style.gridColumn = colIdx + 2;
        cell.style.gridRow = idx + 2;
        bookingGridContainer.appendChild(cell);
      });
    });
  }


  // ------------ LOAD VENUES --------------
  async function loadVenues() {
    const { data } = await supabase.from("venues").select("id,name").order("id");
    venues = data || [];

    [newKhu, editKhu].forEach(sel => {
      sel.innerHTML = `<option value="">-- Chọn khu --</option>`;
      venues.forEach(v => {
        const o = document.createElement("option");
        o.value = v.id;
        o.textContent = v.name;
        sel.appendChild(o);
      });
    });
  }

  // ------------ LOAD COURTS --------------
  async function loadCourts() {
    const { data } = await supabase
      .from("courts")
      .select("id,name,venue_id,default_price_per_hour,is_active")
      .eq("is_active", true)
      .order("name");

    courts = data || [];

    fieldFilter.innerHTML = `<option value="all">Tất cả</option>`;
    courts.forEach(c => {
      const v = venues.find(x => x.id === c.venue_id);
      const o = document.createElement("option");
      o.value = c.id;
      o.textContent = `${v?.name ?? ""} — ${c.name}`;
      fieldFilter.appendChild(o);
    });

    buildDynamicGrid(courts);
    renderBookingGrid();
  }

  // ------------ LOAD BOOKINGS --------------
  async function loadBookingsForDateAndCourt(dateStr, courtId = null) {
    if (isLoadingBookings) return;   // ✅ CHỐNG LOAD TRÙNG
    isLoadingBookings = true;

    const dayStart = `${dateStr}T00:00:00+07:00`;
    const dayEnd = `${dateStr}T23:59:59+07:00`;
    const dayRange = `[${dayStart},${dayEnd})`;

    let q = supabase
      .from("bookings")
      .select("id,user_id,court_id,during,status,price,metadata,created_at")
      .overlaps("during", dayRange);

    if (courtId) q = q.eq("court_id", courtId);

    const { data, error } = await q.order("created_at", { ascending: true });

    isLoadingBookings = false;

    if (error) {
      console.error("❌ LOAD BOOKINGS ERROR:", error);
      return;
    }

    bookings = data || [];
    console.log("✅ BOOKINGS LOADED:", bookings.length);
    renderBookingGrid();
  }





  // ------------ RENDER BOOKINGS --------------
  function renderBookingGrid() {
    const visible = getVisibleCourts();
    buildDynamicGrid(visible);

    const colMap = buildCourtColumns(visible.map(c => c.id));

    bookings.forEach(b => {
      const parsed = parseDuring(b.during);
      if (!parsed) return;

      if (!parsed.start || !parsed.end) return;
      const { startRow, endRow } = computeGridRows(parsed.start, parsed.end);
      const col = colMap[b.court_id];
      if (!col) return;

      const block = document.createElement("div");
      block.className = "booking-block";
      block.style.gridColumn = col;
      block.style.gridRow = `${startRow} / ${endRow}`;
      block.style.background = "#4CAF50";
      block.style.color = "#fff";
      block.style.padding = "6px";
      block.style.borderRadius = "6px";
      block.style.cursor = "pointer";

      const name = b.metadata?.customer_name ?? "Khách";
      const label = `${hhmmFromISO(parsed.start)} - ${hhmmFromISO(parsed.end)}`;

      block.innerHTML = `<strong>${escapeHtml(name)}</strong><br><small>${label}</small>`;
      block.addEventListener("click", () => openEditModal(b));

      bookingGridContainer.appendChild(block);
      console.log("RENDER BLOCK:", b.id, block.style.gridColumn, block.style.gridRow);

    });
  }

  function getVisibleCourts() {
    if (fieldFilter.value === "all") return courts;
    const found = courts.find(c => String(c.id) === fieldFilter.value);
    return found ? [found] : courts;
  }

  // ------------ CHECK CONFLICT --------------
  async function checkConflict(courtId, startISO, endISO, excludeId = null) {
    let q = supabase
      .from("bookings")
      .select("id,status")
      .eq("court_id", courtId)
      .overlaps("during", `[${startISO},${endISO})`);

    if (excludeId) q = q.neq("id", excludeId);

    const { data } = await q;
    return (data || []).some(b => b.status !== "cancelled");
  }

  // ------------ POPULATE FIELDS BY KHU --------------
  async function populateFieldsForKhu(khuSel, fieldSel) {
    fieldSel.innerHTML = "";

    if (!khuSel.value) {
      fieldSel.innerHTML = `<option value="">-- Chọn sân --</option>`;
      return;
    }

    const list = courts.filter(c => String(c.venue_id) === String(khuSel.value));

    if (list.length === 0) {
      fieldSel.innerHTML = `<option value="">-- Không có sân --</option>`;
      return;
    }

    list.forEach(c => {
      const o = document.createElement("option");
      o.value = c.id;
      o.textContent = c.name;
      o.dataset.price = c.default_price_per_hour;
      fieldSel.appendChild(o);
    });
  }

  // =====================================================
  // ⭐⭐ NEW: AUTO CALC PAYMENT ⭐⭐
  // =====================================================

  function updateNewBookingPrice() {
    const durLabel = document.getElementById("calculated-duration");
    const pricePerHourLabel = document.getElementById("price-per-hour");
    const totalLabel = document.getElementById("calculated-total");

    const start = newStart.value;
    const end = newEnd.value;
    const courtId = Number(newField.value);
    const date = newDate.value;

    if (!start || !end || end <= start || !courtId || !date) {
      durLabel.innerText = "--- giờ";
      pricePerHourLabel.innerText = "--- VND";
      totalLabel.innerText = "--- VND";
      return;
    }

    const court = courts.find(c => c.id === courtId);
    if (!court) return;

    const startISO = toISOWithTZ(date, start);
    const endISO = toISOWithTZ(date, end);

    const hours = (new Date(endISO) - new Date(startISO)) / 3600000;
    const price = court.default_price_per_hour || 0;
    const total = Math.round(hours * price);

    durLabel.innerText = `${hours} giờ`;
    pricePerHourLabel.innerText = price.toLocaleString("vi-VN") + " VND";
    totalLabel.innerText = total.toLocaleString("vi-VN") + " VND";
  }

  // =====================================================
  // OPEN EDIT MODAL
  // =====================================================

  function openEditModal(b) {
    editingBooking = b;
    const parsed = parseDuring(b.during);
    if (!parsed) return;

    editBookingId.value = b.id;
    editCustomer.value = b.metadata?.customer_name ?? "";
    editDate.value = new Date(parsed.start).toISOString().slice(0, 10);
    editStart.value = hhmmFromISO(parsed.start);
    editEnd.value = hhmmFromISO(parsed.end);

    const court = courts.find(c => c.id === b.court_id);
    editKhu.value = court.venue_id;

    populateFieldsForKhu(editKhu, editField).then(() => {
      editField.value = court.id;
    });

    // editPaymentStatus.value = b.status;
    editPriceInput.value = Number(b.price || 0);

    editModal.style.display = "flex";
  }

  // =====================================================
  // SAVE EDIT
  // =====================================================
  // ===============================
  // ✅ AUTO UPDATE GIÁ KHI ĐANG SỬA
  // ===============================
  [editStart, editEnd, editField].forEach(el => {
    el.addEventListener("change", () => {
      const date = editDate.value;
      const start = editStart.value;
      const end = editEnd.value;
      const courtId = Number(editField.value);

      if (!date || !start || !end || end <= start || !courtId) return;

      const court = courts.find(c => c.id === courtId);
      const pricePerHour = court?.default_price_per_hour || 0;

      const startISO = toISOWithTZ(date, start);
      const endISO = toISOWithTZ(date, end);

      const totalHours =
        (new Date(endISO) - new Date(startISO)) / 3600000;

      const totalPrice = Math.round(totalHours * pricePerHour);

      editPriceInput.value = totalPrice;
    });
  });

  // ===============================
  // ✅ SAVE EDITED BOOKING (TỰ TÍNH GIÁ)
  // ===============================
  async function saveEditedBooking() {
    if (!editingBooking) return;

    const id = editingBooking.id;
    const date = editDate.value;
    const start = editStart.value;
    const end = editEnd.value;
    const courtId = Number(editField.value);

    if (!date || !start || !end || end <= start)
      return alert("Thời gian không hợp lệ");

    const startISO = toISOWithTZ(date, start);
    const endISO = toISOWithTZ(date, end);

    if (await checkConflict(courtId, startISO, endISO, id))
      return alert("Khung giờ đã có người đặt!");

    // ✅ TÍNH GIÁ THEO GIỜ CỦA SÂN
    const court = courts.find(c => c.id === courtId);
    const pricePerHour = court?.default_price_per_hour || 0;

    const totalHours =
      (new Date(endISO) - new Date(startISO)) / 3600000;

    const totalPrice = Math.round(totalHours * pricePerHour);

    // ✅ UPDATE DATABASE
    const { error } = await supabase
      .from("bookings")
      .update({
        during: `[${startISO},${endISO})`,
        court_id: courtId,
        price: totalPrice, // ✅ GIÁ ĐÚNG THEO GIỜ
        // status: editPaymentStatus.value,
        metadata: {
          customer_name: editCustomer.value,
          notes: editingBooking.metadata?.notes ?? ""
        }
      })
      .eq("id", id);

    if (error) return alert("Lỗi lưu: " + error.message);

    // ✅ Cập nhật lại ô giá trên form sau khi lưu
    editPriceInput.value = totalPrice; // chỉ ghi số thô

    editModal.style.display = "none";
    loadBookingsForDateAndCourt(dateSelect.value, currentCourtId);
  }


  // =====================================================
  // DELETE BOOKING
  // =====================================================

  async function deleteBooking() {
    if (!editingBooking) return;
    if (!confirm("Xóa lịch đặt này?")) return;

    const { error } = await supabase.from("bookings").delete().eq("id", editingBooking.id);
    if (error) return alert("Lỗi khi xóa: " + error.message);

    editModal.style.display = "none";
    loadBookingsForDateAndCourt(dateSelect.value, currentCourtId);
  }

  // =====================================================
  // ⭐⭐ CREATE NEW BOOKING WITH PAYMENT ⭐⭐
  // =====================================================

  async function createNewBooking() {
    const customer = newCustomer.value.trim();
    const date = newDate.value;
    const start = newStart.value;
    const end = newEnd.value;
    const courtId = Number(newField.value);

    if (!customer) return alert("Vui lòng nhập tên khách");
    if (!date || !start || !end || end <= start) return alert("Thời gian không hợp lệ");
    if (!courtId) return alert("Chưa chọn sân");

    const startISO = toISOWithTZ(date, start);
    const endISO = toISOWithTZ(date, end);

    if (await checkConflict(courtId, startISO, endISO)) return alert("Khung giờ đã có người khác đặt!");

    const court = courts.find(c => c.id === courtId);
    const price = court.default_price_per_hour || 0;
    const totalHours = (new Date(endISO) - new Date(startISO)) / 3600000;
    const total = totalHours * price;

    const duringRange = `[${startISO},${endISO})`;

    const { error } = await supabase.from("bookings").insert({
      court_id: courtId,
      user_id: null,
      during: duringRange,
      price: total,
      status: "pending",
      metadata: {
        customer_name: customer,
        notes: newNotes.value.trim() || ""
      }
    });

    if (error) return alert("❌ Lỗi tạo đơn: " + error.message);

    alert("🎉 Đặt đơn thành công!");
    newModal.style.display = "none";

    loadBookingsForDateAndCourt(dateSelect.value, currentCourtId);
  }

  // =====================================================
  // EVENTS
  // =====================================================

  if (createBtn) createBtn.addEventListener("click", () => {
    const today = new Date().toISOString().slice(0, 10);
    newDate.value = today; // ✅ LUÔN LẤY NGÀY HIỆN TẠI
    newModal.style.display = "flex";
  });


  closeNewModalBtn.addEventListener("click", () => newModal.style.display = "none");
  closeEditModalBtn.addEventListener("click", () => editModal.style.display = "none");

  newKhu.addEventListener("change", () => populateFieldsForKhu(newKhu, newField));
  editKhu.addEventListener("change", () => populateFieldsForKhu(editKhu, editField));

  submitNewBookingBtn.addEventListener("click", createNewBooking);
  saveBookingBtn.addEventListener("click", saveEditedBooking);
  deleteBookingBtn.addEventListener("click", deleteBooking);

  // ⭐ NEW AUTO-CALC EVENTS
  newStart.addEventListener("change", updateNewBookingPrice);
  newEnd.addEventListener("change", updateNewBookingPrice);
  newField.addEventListener("change", updateNewBookingPrice);

  fieldFilter.addEventListener("change", () => {
    currentCourtId = fieldFilter.value === "all" ? null : Number(fieldFilter.value);
    loadBookingsForDateAndCourt(dateSelect.value, currentCourtId);
  });

  dateSelect.addEventListener("change", () => {
    loadBookingsForDateAndCourt(dateSelect.value, currentCourtId);
  });

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  populateTimeSelects();
  await loadVenues();
  await loadCourts();
  const today = new Date().toISOString().slice(0, 10);
  dateSelect.value = today;
  newDate.value = today; // ✅ TỰ ĐỘNG SET NGÀY TẠO ĐƠN LÀ HÔM NAY
  await loadBookingsForDateAndCourt(today, null);


  console.log("✅ FULL INITIAL LOAD COMPLETE");


  /* ============================
     ĐĂNG XUẤT CHUẨN
     ============================ */

  const logoutBtn = document.getElementById("logoutBtn");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("❌ Logout error:", error);
        return;
      }

      console.log("✅ Logged out");

      window.location.href = "login.html";
    });
  }
  
});

