
// ---------- HỖ TRỢ HIỂN THỊ LỖI / LOADING ----------
function setLoading(isLoading) {
    const tbody = document.getElementById("table-body");
    if (!tbody) return;
    if (isLoading) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Đang tải dữ liệu...</td></tr>`;
    }
}
function setEmpty(message = "Không có dữ liệu") {
    const tbody = document.getElementById("table-body");
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">${message}</td></tr>`;
}

// ---------- PARSE & FORMAT ----------
function parseTstzRange(rangeText) {
    if (!rangeText) return { start: null, end: null };
    try {
        let cleaned = rangeText.replace(/^[\[\(]/, "").replace(/[\]\)]$/, "");
        let parts = cleaned.split(",");
        let start = parts[0] ? new Date(parts[0].trim()) : null;
        let end = parts[1] ? new Date(parts[1].trim()) : null;
        return { start, end };
    } catch (e) {
        console.warn("parseTstzRange lỗi:", e, rangeText);
        return { start: null, end: null };
    }
}
function formatMoney(num) {
    return Number(num || 0).toLocaleString("vi-VN") + " đ";
}
function formatDate(d) {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("vi-VN");
}
function formatDateTime(d) {
    if (!d) return "-";
    return new Date(d).toLocaleString("vi-VN");
}
function calcHours(start, end) {
    if (!start || !end) return 0;
    return Number(((end - start) / 3600000).toFixed(2));
}

// ---------- LOAD DATA TỪ SUPABASE ----------
async function loadBookings() {
    if (typeof supabaseClient === "undefined") {
        throw new Error("supabaseClient chưa được tìm thấy. Hãy chắc client_config.js được load trước và supabase lib đã có.");
    }

    const { data, error } = await supabaseClient
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        throw error;
    }
    if (!data || data.length === 0) return [];

    return data.map(row => ({
        id: row.id,
        court_id: row.court_id,
        price: Number(row.price || 0),
        created_at: row.created_at,
        during: parseTstzRange(row.during)
    }));
}

// ---------- RENDER BẢNG + TOTAL ----------
function renderTable(list) {
    const tbody = document.getElementById("table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!list || list.length === 0) {
        setEmpty("Không có booking phù hợp");
        updateTotals(0, 0);
        return;
    }

    list.forEach(b => {
        const hours = calcHours(b.during.start, b.during.end);
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${b.id}</td>
            <td>${formatDate(b.created_at)}</td>
            <td>${formatDateTime(b.during.start)}</td>
            <td>${formatDateTime(b.during.end)}</td>
            <td>${hours}</td>
            <td>${formatMoney(b.price)}</td>
        `;
        tbody.appendChild(tr);
    });

    const totalHours = list.reduce((s, b) => s + calcHours(b.during.start, b.during.end), 0);
    const totalMoney = list.reduce((s, b) => s + (b.price || 0), 0);
    updateTotals(totalHours, totalMoney);
}
function updateTotals(hours, money) {
    const elH = document.getElementById("total-hours");
    const elM = document.getElementById("total-money");
    if (elH) elH.innerText = hours;
    if (elM) elM.innerText = formatMoney(money);
}

// ---------- BỘ LỌC ----------
function filterToday(list) {
    const today = new Date().toISOString().split("T")[0];
    return list.filter(b => {
        if (!b.created_at) return false;
        return b.created_at.split("T")[0] === today;
    });
}
function filterByDate(list) {
    const from = document.getElementById("date-from")?.value;
    const to = document.getElementById("date-to")?.value;
    return list.filter(b => {
        const d = b.created_at ? b.created_at.split("T")[0] : "";
        return (!from || d >= from) && (!to || d <= to);
    });
}
function getISOWeekStart(year, week) {
    const base = new Date(year, 0, 1 + (week - 1) * 7);
    const day = base.getDay();
    const start = new Date(base);
    start.setDate(base.getDate() - ((day + 6) % 7));
    start.setHours(0,0,0,0);
    return start;
}
function filterByWeek(list) {
    const week = document.getElementById("week-select")?.value;
    if (!week) return list;
    const [year, weekNum] = week.split("-W");
    if (!year || !weekNum) return list;
    const start = getISOWeekStart(Number(year), Number(weekNum));
    const end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23,59,59,999);
    return list.filter(b => {
        const d = b.created_at ? new Date(b.created_at) : null;
        return d && d >= start && d <= end;
    });
}
function filterByMonth(list) {
    const monthValue = document.getElementById("month-select")?.value;
    if (!monthValue) return list;
    const [year, month] = monthValue.split("-");
    return list.filter(b => {
        const d = b.created_at ? new Date(b.created_at) : null;
        return d && d.getFullYear() == Number(year) && (d.getMonth() + 1) == Number(month);
    });
}

// ---------- UI: ẨN/HIỆN nhóm lọc ----------
function hideAllFilterGroups() {
    ["filter-date", "filter-week", "filter-month"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add("hidden");
    });
}
function onFilterTypeChange() {
    const type = document.getElementById("filter-type")?.value || "none";
    hideAllFilterGroups();
    if (type === "date") document.getElementById("filter-date")?.classList.remove("hidden");
    if (type === "week") document.getElementById("filter-week")?.classList.remove("hidden");
    if (type === "month") document.getElementById("filter-month")?.classList.remove("hidden");
}

// ---------- ÁP DỤNG BỘ LỌC (khi nhấn nút hoặc đổi) ----------
function applyFilters() {
    if (!allBookings) return;
    let list = allBookings.slice();
    const type = document.getElementById("filter-type")?.value || "none";

    if (type === "none") {
        list = filterToday(list);
    } else if (type === "date") {
        list = filterByDate(list);
    } else if (type === "week") {
        list = filterByWeek(list);
    } else if (type === "month") {
        list = filterByMonth(list);
    }
    renderTable(list);
}

// ---------- INIT ----------
let allBookings = [];

document.addEventListener("DOMContentLoaded", async () => {
    // Ẩn hết nhóm filter ban đầu
    hideAllFilterGroups();

    // Kiểm tra element table-body tồn tại
    const tbody = document.getElementById("table-body");
    if (!tbody) {
        console.error("Element #table-body không tìm thấy trong HTML.");
        return;
    }

    setLoading(true);

    try {
        allBookings = await loadBookings();
        console.log("Loaded bookings:", allBookings.length);

        // Nếu không có dữ liệu
        if (!allBookings || allBookings.length === 0) {
            setEmpty("Không có dữ liệu bookings");
        } else {
            // Mặc định: hiển thị booking của hôm nay
            const todayList = filterToday(allBookings);
            renderTable(todayList);
        }
    } catch (err) {
        console.error("Lỗi khi tải bookings:", err);
        setEmpty("Lỗi khi tải dữ liệu. Xem console để biết chi tiết.");
    } finally {
        // Gắn event (an toàn: kiểm tra tồn tại)
        document.getElementById("filter-type")?.addEventListener("change", onFilterTypeChange);
        document.getElementById("btn-refresh")?.addEventListener("click", applyFilters);
        document.getElementById("date-from")?.addEventListener("change", () => {
            if (document.getElementById("filter-type")?.value === "date") applyFilters();
        });
        document.getElementById("date-to")?.addEventListener("change", () => {
            if (document.getElementById("filter-type")?.value === "date") applyFilters();
        });
        document.getElementById("week-select")?.addEventListener("change", () => {
            if (document.getElementById("filter-type")?.value === "week") applyFilters();
        });
        document.getElementById("month-select")?.addEventListener("change", () => {
            if (document.getElementById("filter-type")?.value === "month") applyFilters();
        });
    }
});
