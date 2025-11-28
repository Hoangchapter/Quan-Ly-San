const supabaseUrl = 'https://hsepwjxuiclhtkfroanq.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzZXB3anh1aWNsaHRrZnJvYW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1ODQyODUsImV4cCI6MjA3OTE2MDI4NX0.rPQ0BP0xJr0IgesIykXclwFUnJ151kBjWgE4rL4F4ro'
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey)

function checkAdminAccess() {
    const role = localStorage.getItem('user_role');
    
    // Nếu không có role hoặc role KHÔNG phải là 'admin', chặn truy cập
    if (role !== 'admin') {
        // Xóa thông tin cũ và chuyển hướng về trang đăng nhập
        localStorage.removeItem('user_role');
        window.location.href = 'staff_booking.html'; 
    }
}
const staffDetailCard = document.getElementById('staff-detail-card'); // Form Sửa/Chi tiết (Mặc định hiện)
const addStaffCard = document.getElementById('add-staff-card');       // Form Thêm mới (Mặc định ẩn)
const addStaffButton = document.getElementById('add-staff-button');   // Nút Thêm Nhân Viên Mới

document.addEventListener('DOMContentLoaded', () => {
    // 1. Bắt buộc kiểm tra quyền truy cập ngay khi trang tải
    checkAdminAccess();
    
    // 2. Thiết lập sự kiện cho nút Thêm Nhân viên
    addStaffButton.addEventListener('click', () => {
        // Ẩn Form Sửa/Chi tiết
        if (staffDetailCard) {
            staffDetailCard.style.display = 'none';
        }
        // Hiện Form Thêm mới
        if (addStaffCard) {
            addStaffCard.style.display = 'block';
        }
    });

    // 3. Thiết lập sự kiện cho các nút 'Sửa' để chuyển về form Sửa
    // (Bổ sung: Hiện tại chỉ ẩn, chưa có logic hiển thị lại form Sửa, nhưng cơ bản đã xử lý được nút Thêm)
    // Ví dụ: Lắng nghe sự kiện click trên toàn bộ bảng để chuyển về form Sửa
    const staffListTable = document.getElementById('staff-list-table');
    if (staffListTable) {
        staffListTable.addEventListener('click', (e) => {
            if (e.target.classList.contains('edit-btn')) {
                // Ẩn Form Thêm mới
                if (addStaffCard) {
                    addStaffCard.style.display = 'none';
                }
                // Hiện Form Sửa/Chi tiết
                if (staffDetailCard) {
                    staffDetailCard.style.display = 'block';
                }
                // (Thêm logic tải dữ liệu nhân viên vào form Sửa ở đây)
            }
        });
    }

    // 4. Xử lý Form Thêm Tài khoản
    const addStaffForm = document.getElementById('add-staff-form');
    if (addStaffForm) {
        addStaffForm.addEventListener('submit', handleAddStaff);
    }
});


// -------------------------------------------------------------------
// 3. PHẦN XỬ LÝ TẠO TÀI KHOẢN (SIGN UP & GÁN ROLE)
// -------------------------------------------------------------------

const staffEmailInput = document.getElementById('staff-email');
const staffPasswordInput = document.getElementById('staff-password');
const staffRoleSelect = document.getElementById('staff-role-new'); // Đã đổi ID trong HTML
const adminMessageElement = document.getElementById('admin-message');

async function handleAddStaff(e) {
    e.preventDefault();
    const email = staffEmailInput.value;
    const password = staffPasswordInput.value;
    const role = staffRoleSelect.value;

    adminMessageElement.textContent = 'Đang tạo tài khoản... Vui lòng chờ.';
    adminMessageElement.style.color = 'orange';

    // 1. TẠO TÀI KHOẢN AUTH (Supabase Auth)
    const { data: authData, error: authError } = await supabaseClient.auth.signUp({
        email: email,
        password: password,
        options: {
            data: { skip_email_verification: true } // Có thể bỏ qua xác minh email nếu không cần
        }
    });

    if (authError) {
        adminMessageElement.textContent = `❌ Lỗi tạo tài khoản: ${authError.message}`;
        adminMessageElement.style.color = 'red';
        return;
    }

    const newUserId = authData.user.id;
    
    // 2. CHÈN VAI TRÒ VÀO BẢNG super_users (Sử dụng RLS INSERT Admin)
    const { error: profileError } = await supabaseClient
        .from('super_users') 
        .insert([{ id: newUserId, role: role }]);

    if (profileError) {
        adminMessageElement.textContent = `❌ Lỗi gán Role: ${profileError.message}. Kiểm tra RLS INSERT cho Admin.`;
        adminMessageElement.style.color = 'red';
        // (Trong môi trường thực tế, bạn nên xóa tài khoản Auth nếu gán role thất bại)
        return;
    }

    // THÀNH CÔNG
    adminMessageElement.textContent = `✅ Tạo tài khoản ${email} (${role}) thành công!`;
    adminMessageElement.style.color = 'green';
    
    addStaffForm.reset();
    
    // (Bổ sung: Gọi hàm render lại danh sách nhân viên ở đây, nếu có)
}