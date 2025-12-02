/* ============================================================
   SUPABASE BOOKING - FIXED & COMPLETE
   - Wrap initialization in DOMContentLoaded to avoid null element errors
   - Defensive checks for missing elements
   - Robust parsing of PostgreSQL range (tstzrange) values
   - Conflict check improved and correct handling of 'during' ranges
   - Clearer user feedback and error handling
   - All main features: create, read (load), render, edit, delete

   Save this file as supabase-booking.fixed.js and include it in your HTML
   instead of the old supabase-booking.js
============================================================ */

const supabaseUrl = "https://hsepwjxuiclhtkfroanq.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzZXB3anh1aWNsaHRrZnJvYW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1ODQyODUsImV4cCI6MjA3OTE2MDI4NX0.rPQ0BP0xJr0IgesIykXclwFUnJ151kBjWgE4rL4F4ro";

const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// Price config
const PRICE_PER_HOUR = 100000; // VNĐ

// Utility: safe get element
function $id(id) {
  return document.getElementById(id);
}


// Convert field letter to court_id (numbers matching DB)
function fieldToCourtId(f) {
  if (f === "A" || f === "a") return 1;
  if (f === "B" || f === "b") return 2;
  return 3;
}

function courtIdToField(id) {
  return id === 1 ? "A" : id === 2 ? "B" : "C";
}

// UI open/close modal
function openModal(modal) {
  if (!modal) return;
  modal.style.display = "flex";
}
function closeModal(modal) {
  if (!modal) return;
  modal.style.display = "none";
}

// Parse PostgreSQL range string like: "[2025-11-25 09:00:00,2025-11-25 11:00:00)"
function parseRangeString(range) {
  if (!range) return null;
  if (Array.isArray(range)) return range; // already array of strings
  if (typeof range === "string") {
    // strip brackets/parentheses and split by comma (only first comma)
    const clean = range.replace(/^\s*\[|\(|\)|\]\s*$/g, "");
    const idx = clean.indexOf(",");
    if (idx === -1) return null;
    const a = clean.slice(0, idx).trim();
    const b = clean.slice(idx + 1).trim();
    return [a, b];
  }
  return null;
}

// convert hour to grid row (row 2 = 08:00)
function hourToRow(h) {
  return h - 8 + 2;
}

// Calculate total amount and update UI (returns total)
function calculateTotal() {
  const startEl = $id("new-start-time");
  const endEl = $id("new-end-time");
  const durEl = $id("calculated-duration");
  const totalEl = $id("calculated-total");
  const pphEl = $id("price-per-hour");
  if (!startEl || !endEl || !durEl || !totalEl) return 0;

  const start = startEl.value;
  const end = endEl.value;
  if (!start || !end) {
    durEl.innerText = "0 giờ";
    totalEl.innerText = "0 VNĐ";
    return 0;
  }

  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const minutes = (eh * 60 + em) - (sh * 60 + sm);
  if (minutes <= 0) {
    durEl.innerText = "0 giờ";
    totalEl.innerText = "0 VNĐ";
    return 0;
  }

  const hours = minutes / 60;
  const total = hours * PRICE_PER_HOUR;
  durEl.innerText = `${hours % 1 === 0 ? hours : hours.toFixed(2)} giờ`;
  totalEl.innerText = total.toLocaleString("vi-VN") + " VNĐ";
  if (pphEl) pphEl.innerText = PRICE_PER_HOUR.toLocaleString("vi-VN") + " VNĐ";
  return total;
}

// RENDER: remove old dynamic slots and add new ones
function clearDynamicSlots() {
  document.querySelectorAll(".dynamic-slot").forEach((el) => el.remove());
}

function renderBookingToGrid(b) {
    const grid = document.querySelector(".booking-grid");
    if (!grid || !b) return;

    const rng = parseRangeString(b.during);
    if (!rng) return;

    function extractHour(ts) {
        return Number(ts.split(" ")[1].split(":")[0]);
    }

    const startHour = extractHour(rng[0]);
    const endHour   = extractHour(rng[1]);

    const rowStart = hourToRow(startHour);
    const rowSpan  = Math.max(1, endHour - startHour +1 );
    const col = (b.court_id || 1) + 1;

    const item = document.createElement("div");
    item.className = `grid-cell booked-slot dynamic-slot`;
    item.style.gridRow = `${rowStart} / span ${rowSpan}`;
    item.style.gridColumn = col;

    const customerName =
        (b.metadata && b.metadata.customer_name) ||
        b.metadata?.name ||
        "Khách";

    const statusText =
        b.status === "pending"
            ? "Chưa TT"
            : b.status === "confirmed"
            ? "Đã cọc"
            : "Đã TT";

    item.innerHTML = `
        <p class="customer-name">${customerName}</p>
        <p class="time-range">${startHour}:00 - ${endHour}:00</p>
        <span class="status-badge ${b.status}">${statusText}</span>
    `;

    item.addEventListener("click", () => openEditModal(b));

    grid.appendChild(item);
}

// LOAD bookings for selected date
async function loadBookingSchedule() {
  const dateEl = $id("date-select");
  if (!dateEl) return;
  const date = dateEl.value;
  if (!date) return;

  const startOfDay = `${date} 00:00:00`;
  const endOfDay = `${date} 23:59:59`;

  try {
    const { data, error } = await supabaseClient
      .from("bookings")
      .select("*")
      .overlaps("during", `[${startOfDay},${endOfDay})`);

    if (error) {
      console.error("Load bookings error:", error);
      return;
    }

    clearDynamicSlots();
    if (!data || data.length === 0) return;

    // Render each booking
    data.forEach((b) => {
      try {
        renderBookingToGrid(b);
      } catch (e) {
        console.warn("Render skip", e, b);
      }
    });
  } catch (err) {
    console.error(err);
  }
}

// OPEN EDIT modal and populate fields
function openEditModal(b) {
  const md = b.metadata || {};
  const editModal = $id("editBookingModal");
  if (!editModal) return;

  $id("edit-booking-id").value = b.id ?? "";
  $id("edit-customer-name").value = md.customer_name || md.name || "";

  const rng = parseRangeString(b.during);
  if (rng) {
    const sd = new Date(rng[0]);
    const ed = new Date(rng[1]);
    if (!isNaN(sd)) $id("edit-date").value = sd.toISOString().split("T")[0];
    if (!isNaN(sd)) $id("edit-start-time").value = sd.toTimeString().slice(1);
    if (!isNaN(ed)) $id("edit-end-time").value = ed.toTimeString().slice(1);
  }

  $id("edit-field").value = courtIdToField(b.court_id);
  $id("edit-payment-status").value = b.status || "pending";
  $id("edit-price").value = b.price ?? 0;

  openModal(editModal);
}

// Initialize listeners and behaviour after DOM ready
document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const newModal = $id("newBookingModal");
  const editModal = $id("editBookingModal");
  const createNewBookingBtn = document.querySelector(".create-btn");
  const closeNewModalBtn = $id("closeNewModalBtn");
  const closeEditModalBtn = $id("closeEditModalBtn");
  const submitNewBtn = $id("submitNewBookingBtn");
  const saveEditBtn = $id("saveBookingBtn");
  const deleteBtn = $id("deleteBookingBtn");
  const dateSelect = $id("date-select");

  // safe bind if exists
  if (createNewBookingBtn) {
    createNewBookingBtn.addEventListener("click", () => {
      if ($id("new-customer-name")) $id("new-customer-name").value = "";
      if ($id("new-phone")) $id("new-phone").value = "";
      if ($id("new-notes")) $id("new-notes").value = "";
      if ($id("new-deposit-amount")) $id("new-deposit-amount").value = 0;
      calculateTotal();
      openModal(newModal);
    });
  }
  if (closeNewModalBtn) closeNewModalBtn.addEventListener("click", () => closeModal(newModal));
  if (closeEditModalBtn) closeEditModalBtn.addEventListener("click", () => closeModal(editModal));

  // Price calculation live
  ["new-start-time", "new-end-time"].forEach((id) => {
    const el = $id(id);
    if (el) el.addEventListener("change", calculateTotal);
  });

  // Submit new booking
  if (submitNewBtn) {
    submitNewBtn.addEventListener("click", async () => {
      const name = ($id("new-customer-name")?.value || "").trim();
      const phone = ($id("new-phone")?.value || "").trim();
      const date = $id("new-date")?.value;
      const field = $id("new-field")?.value;
      const start = $id("new-start-time")?.value;
      const end = $id("new-end-time")?.value;
      const deposit = Number($id("new-deposit-amount")?.value || 0);
      const notes = ($id("new-notes")?.value || "").trim();

      if (!name || !phone || !date || !start || !end) {
        alert("⚠️ Vui lòng nhập đủ thông tin!");
        return;
      }

      const price = calculateTotal();
      const court_id = fieldToCourtId(field);

      // build range params acceptable to overlaps
      const startTS = `${date} ${start}:00`;
      const endTS = `${date} ${end}:00`;

      // Conflict check: find bookings that overlap with this time on same court
      try {
        const { data: conflict, error: conflictErr } = await supabaseClient
          .from("bookings")
          .select("*")
          .eq("court_id", court_id)
          .overlaps("during", `[${startTS},${endTS})`);

        if (conflictErr) {
          console.error("Conflict check error:", conflictErr);
        }

        if (conflict && conflict.length > 0) {
          alert("⚠️ Khung giờ này đã được đặt!");
          return;
        }
      } catch (e) {
        console.error(e);
      }

      const status = deposit >= price ? "paid" : deposit > 0 ? "confirmed" : "pending";

      try {
        const { data, error } = await supabaseClient.from("bookings").insert([
          {
            user_id: null,
            court_id,
            during: [startTS, endTS],
            price,
            status,
            metadata: { customer_name: name, phone, deposit, notes },
          },
        ]);

        if (error) {
          console.error("Insert error:", error);
          alert("❌ Lỗi tạo đơn!");
          return;
        }

        alert("🎉 Đã tạo đơn thành công!");
        closeModal(newModal);
        loadBookingSchedule();
      } catch (err) {
        console.error(err);
        alert("❌ Lỗi khi tạo đơn (network)!");
      }
    });
  }

  // Save edit
  if (saveEditBtn) {
    saveEditBtn.addEventListener("click", async () => {
      const id = $id("edit-booking-id")?.value;
      const name = ($id("edit-customer-name")?.value || "").trim();
      const date = $id("edit-date")?.value;
      const field = $id("edit-field")?.value;
      const start = $id("edit-start-time")?.value;
      const end = $id("edit-end-time")?.value;
      const status = $id("edit-payment-status")?.value;

      if (!id) return alert("ID đơn không hợp lệ");
      if (!date || !start || !end) return alert("Vui lòng nhập thời gian hợp lệ");

      const court_id = fieldToCourtId(field);
      const startTS = `${date} ${start}:00`;
      const endTS = `${date} ${end}:00`;

      try {
        const { error } = await supabaseClient
          .from("bookings")
          .update({
            court_id,
            during: [startTS, endTS],
            status,
            metadata: { customer_name: name },
          })
          .eq("id", id);

        if (error) {
          console.error("Update error:", error);
          alert("❌ Lỗi cập nhật!");
          return;
        }

        alert("✔ Đã cập nhật thành công!");
        closeModal(editModal);
        loadBookingSchedule();
      } catch (err) {
        console.error(err);
        alert("❌ Lỗi cập nhật (network)!");
      }
    });
  }

  // Delete booking
  if (deleteBtn) {
    deleteBtn.addEventListener("click", async () => {
      const id = $id("edit-booking-id")?.value;
      if (!id) return;
      if (!confirm("Bạn chắc chắn muốn xóa đơn này?")) return;

      try {
        const { error } = await supabaseClient.from("bookings").delete().eq("id", id);
        if (error) {
          console.error("Delete error:", error);
          alert("❌ Lỗi khi xóa!");
          return;
        }
        alert("🗑️ Đơn đã bị xóa");
        closeModal(editModal);
        loadBookingSchedule();
      } catch (err) {
        console.error(err);
        alert("❌ Lỗi xóa (network)!");
      }
    });
  }

  // click outside to close
  document.querySelectorAll(".modal-overlay").forEach((overlay) => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal(overlay);
    });
  });

  // date change
  if (dateSelect) dateSelect.addEventListener("change", loadBookingSchedule);

  // Auto load
  loadBookingSchedule();
});

// expose certain functions for debugging in console if needed
window._booking = { loadBookingSchedule, calculateTotal, renderBookingToGrid };

document.addEventListener("DOMContentLoaded", () => {

    // 🔥 KHỞI TẠO SUPABASE
    const supabase = window.supabase.createClient(
        "https://hsepwjxuiclhtkfroanq.supabase.co",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzZXB3anh1aWNsaHRrZnJvYW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1ODQyODUsImV4cCI6MjA3OTE2MDI4NX0.rPQ0BP0xJr0IgesIykXclwFUnJ151kBjWgE4rL4F4ro"
    );

   // 2️⃣ Lấy thông tin user hiện tại trong hàm async
    async function loadUserName() {
        try {
            const { data: { user }, error } = await supabase.auth.getUser();
            if (error) throw error;

            const userNameSpan = document.getElementById("userName");
            if (user) {
                let name = user.user_metadata?.full_name || user.email;

                // Ẩn phần đuôi @gmail.com nếu đang dùng email
                if (!user.user_metadata?.full_name && name.includes("@")) {
                    name = name.split("@")[0]; // giữ phần trước @
                }

                userNameSpan.textContent = `Xin Chào, ${name}`;
            } else {
                window.location.href = "login.html";
            }
        } catch (err) {
            console.error("Lỗi lấy user:", err);
            window.location.href = "login.html";
        }
    }

    loadUserName();

    // 🔥 LẤY NÚT ĐĂNG XUẤT
    const logoutBtn = document.getElementById("logoutBtn");
    if (!logoutBtn) {
        console.error("Không tìm thấy nút logoutBtn.");
        return;
    }

    // 🔥 XỬ LÝ SỰ KIỆN ĐĂNG XUẤT
    logoutBtn.addEventListener("click", async () => {
        try {
            const { error } = await supabase.auth.signOut();

            if (error) {
                console.error("Lỗi khi đăng xuất:", error);
                alert("Đăng xuất thất bại!");
                return;
            }

            // XÓA CACHE / LOCAL STORAGE TUỲ DỰ ÁN CỦA BẠN
            localStorage.removeItem("currentUser");

            // CHUYỂN VỀ TRANG LOGIN
            window.location.href = "login.html";

        } catch (err) {
            console.error("Unexpected error:", err);
            alert("Lỗi không xác định khi đăng xuất.");
        }
    });

});
