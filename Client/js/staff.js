// staff.js (MÃ ĐÃ SỬA VÀ HỢP NHẤT)

// ===================================================================
// KHAI BÁO BIẾN TOÀN CỤC MỚI VÀ ĐỒNG BỘ
// ===================================================================
// Giả định supabaseClient đã được định nghĩa trong client_config.js

let currentStaffId = null; // ID nhân viên đang được sửa
let isAddingNew = false;   // Cờ xác định chế độ (Thêm mới/Sửa)

const staffListTableBody = document.getElementById('staff-list-tbody');
const addStaffButton = document.getElementById('add-staff-button');

// Thẻ chi tiết/sửa (Unified Card)
const staffDetailCard = document.getElementById('staff-detail-card'); 
// Form chung (Unified Form ID)
const staffUnifiedForm = document.getElementById('staff-unified-form'); 
// Các nút trong form chung
const saveStaffButton = document.getElementById('save-staff-btn');
const cancelStaffButton = document.getElementById('cancel-staff-btn');


// ===================================================================
// I. LOGIC HIỂN THỊ DANH SÁCH (READ)
// (GIỮ NGUYÊN)
// ===================================================================

async function fetchStaffList() {
    // ... (logic fetchStaffList giữ nguyên) ...
    const { data: staff, error } = await supabaseClient
        .from('super_users')
        .select(`id, username, email, role`)
        .eq('role', 'employee')
        .order('id', { ascending: true });

    if (error) {
        console.error("Lỗi khi tải danh sách nhân viên:", error.message);
        return;
    }

    renderStaffList(staff);
}

function renderStaffList(staff) {
    // ... (logic renderStaffList giữ nguyên) ...
    const staffListTableBody = document.getElementById('staff-list-tbody');
    staffListTableBody.innerHTML = ''; 

    if (!staff || staff.length === 0) {
        staffListTableBody.innerHTML = '<tr><td colspan="6">Chưa có nhân viên nào được tạo.</td></tr>';
        return;
    }

    staff.forEach((person, index) => { 
        const stt = index + 1; 

        const row = `
            <tr data-id="${person.id}">
                <td>${stt}</td> 
                <td>${person.username}</td>
                <td>${person.email}</td>
                <td>${person.role || 'Nhân viên'}</td>
                
                <td>
                    <button class="action-btn edit-staff-btn" data-id="${person.id}">Sửa</button>
                    <button class="action-btn delete-staff-btn" data-id="${person.id}">Xóa</button>
                </td>
            </tr>
        `;
        staffListTableBody.insertAdjacentHTML('beforeend', row);
    });
}

// ===================================================================
// II. LOGIC THÊM/SỬA (CREATE & UPDATE) - HỢP NHẤT
// ===================================================================

/**
 * Hàm chung để ẩn Card Chi tiết/Sửa
 */
function hideDetailCard() {
    currentStaffId = null;
    isAddingNew = false;
    
    staffUnifiedForm.reset(); 
    staffDetailCard.style.display = 'none';
}

/**
 * Hàm chung để hiển thị Form và tải dữ liệu (nếu là chế độ Sửa)
 */
async function showDetailCard(mode = 'add', id = null) {
    isAddingNew = mode === 'add';
    currentStaffId = id;

    // Reset form trước
    staffUnifiedForm.reset();
    
    // Đặt Tiêu đề và Nút
    const titleElement = document.getElementById('form-title');
    const passwordInput = document.getElementById('staff-password-input');
    const emailInput = document.getElementById('staff-email-input');
    // Đảm bảo các trường luôn có thể chỉnh sửa và bắt buộc (theo yêu cầu DB)
    emailInput.readOnly = false; 
    passwordInput.readOnly = false;
    emailInput.classList.remove('non-editable'); // Xóa class non-editable
    
    // Mặc định cả hai trường đều bắt buộc
    emailInput.required = true;
    passwordInput.required = true;

    if (isAddingNew) {
        // Chế độ THÊM MỚI
        titleElement.textContent = ' Thêm Tài Khoản Nhân Viên Mới';
        saveStaffButton.textContent = 'Tạo Tài Khoản';
        passwordInput.required = true; // Bắt buộc nhập khi Thêm mới
        passwordInput.placeholder = 'Nhập mật khẩu (ít nhất 6 ký tự)';

    } else {
        // Chế độ CẬP NHẬT
        titleElement.textContent = ' Cập Nhật Chi Tiết Nhân Viên';
        saveStaffButton.textContent = 'Lưu Cập Nhật';
        

        // 1. Tải dữ liệu
        const { data: staff, error } = await supabaseClient
            .from('super_users')
            //  PHẢI SELECT CỘT 'password' để lưu tạm 
            .select(`id, username, email, role, password`) 
            .eq('id', id)
            .single();

        if (error) { 
            console.error("Lỗi khi tải chi tiết nhân viên:", error.message);
            hideDetailCard();
            return;
        }

        // 2. Đổ dữ liệu vào Form (Sử dụng ID mới đã sửa trong HTML)
        document.getElementById('staff-name-input').value = staff.username;
        document.getElementById('staff-email-input').value = staff.email; 
        document.getElementById('staff-role-input').value = staff.role;
        document.getElementById('staff-password-input').value = staff.password
        // KHÔNG đổ mật khẩu vào input
        
        // 3. Lưu mật khẩu cũ (Quan trọng cho logic UPDATE)
        staffUnifiedForm.dataset.oldPassword = staff.password; 
    }
    
    // Hiển thị Form
    staffDetailCard.style.display = 'block';
}

/**
 * Xử lý Lưu (INSERT) hoặc Cập nhật (UPDATE)
 */
async function handleSaveStaff(event) {
    event.preventDefault();

    // LẤY DỮ LIỆU TỪ INPUT CỦA FORM CHUNG (dùng ID mới)
    const username = document.getElementById('staff-name-input').value.trim();
    const email = document.getElementById('staff-email-input').value.trim();
    const newPassword = document.getElementById('staff-password-input').value;
    const role = document.getElementById('staff-role-input').value;
    
    if (!username || !email || !role) {
        alert("Vui lòng điền đầy đủ Tên, Email và Vai trò.");
        return;
    }

    let result;
    let dataToSubmit = {
        username: username,
        full_name: username, // Giả định full_name = username
        email: email,
        role: role,
        updated_at: new Date().toISOString()
    };

    if (isAddingNew) {
        // --- LOGIC THÊM MỚI (CREATE) ---
        if (!newPassword || newPassword.length < 6) {
            alert("Mật khẩu phải có ít nhất 6 ký tự.");
            return;
        }

        const newManualId = crypto.randomUUID();
        dataToSubmit = {
            ...dataToSubmit,
            id: newManualId,
            password: newPassword,
            created_at: new Date().toISOString()
        };

        const { error } = await supabaseClient
            .from('super_users')
            .insert([dataToSubmit]);

        result = { error, successMessage: " Tạo tài khoản nhân viên thành công!" };

    } else {
        // --- LOGIC CẬP NHẬT (UPDATE) ---
        if (!currentStaffId) {
            alert("Lỗi: Không tìm thấy ID nhân viên để cập nhật.");
            return;
        }
        
        const oldPassword = staffUnifiedForm.dataset.oldPassword;

        // Logic Mật khẩu (Sử dụng mật khẩu mới nếu có, nếu không thì dùng mật khẩu cũ)
        if (newPassword && newPassword.length >= 6) {
            dataToSubmit.password = newPassword; 
        } else if (oldPassword) {
            dataToSubmit.password = oldPassword; 
        } else {
            alert("Lỗi: Mật khẩu không được để trống và phải có ít nhất 6 ký tự.");
            return;
        }

        const { error } = await supabaseClient
            .from('super_users')
            .update(dataToSubmit)
            .eq('id', currentStaffId);

        result = { error, successMessage: " Cập nhật nhân viên thành công!" };
    }
    
    // XỬ LÝ KẾT QUẢ
    if (result.error) {
        console.error(result.error);
        alert(`Lỗi: ${result.error.message}.`);
        return;
    }

    alert(result.successMessage);

    hideDetailCard(); // Ẩn form sau khi lưu
    await fetchStaffList();
}


// ===================================================================
// III. LOGIC XÓA (DELETE)
// (GIỮ NGUYÊN)
// ===================================================================

async function handleDeleteStaff(staffId) {
    if (!confirm("Bạn có chắc chắn muốn xóa nhân viên này không?")) {
        return;
    }

    const { error: deleteError } = await supabaseClient
        .from('super_users')
        .delete()
        .eq('id', staffId);

    if (deleteError) {
        alert(`Lỗi khi xóa nhân viên: ${deleteError.message}`);
        return;
    }
    
    alert(" Xóa/Vô hiệu hóa nhân viên thành công!");
    await fetchStaffList();
}


// ===================================================================
// IV. LOGIC UI/EVENTS - CẬP NHẬT
// ===================================================================

// Lắng nghe sự kiện click trên bảng (Sửa/Xóa)
staffListTableBody.addEventListener('click', (e) => {
    const target = e.target;
    const staffId = target.dataset.id;
    
    if (!staffId) return;

    if (target.classList.contains('edit-staff-btn')) {
        // Tải chi tiết nhân viên để sửa (Gọi showDetailCard với mode 'edit')
        showDetailCard('edit', staffId); 
    } else if (target.classList.contains('delete-staff-btn')) {
        // Xóa nhân viên
        handleDeleteStaff(staffId);
    }
});

// Lắng nghe nút THÊM NHÂN VIÊN MỚI
if (addStaffButton) {
    addStaffButton.addEventListener('click', () => {
        // Chuyển sang chế độ Thêm Mới
        showDetailCard('add'); 
    });
}

// Lắng nghe sự kiện Lưu/Submit form CHUNG
if (staffUnifiedForm) {
    staffUnifiedForm.addEventListener('submit', handleSaveStaff);
}

// Lắng nghe nút HỦY (thoát form)
if (cancelStaffButton) {
    cancelStaffButton.addEventListener('click', hideDetailCard);
}


// Chạy khi trang load
document.addEventListener('DOMContentLoaded', () => {
    fetchStaffList();
    // Ẩn form chi tiết khi khởi tạo (mặc định)
    staffDetailCard.style.display = 'none'; 
});