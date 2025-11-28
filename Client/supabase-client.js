
const supabaseUrl = 'https://hsepwjxuiclhtkfroanq.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzZXB3anh1aWNsaHRrZnJvYW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1ODQyODUsImV4cCI6MjA3OTE2MDI4NX0.rPQ0BP0xJr0IgesIykXclwFUnJ151kBjWgE4rL4F4ro'
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey)

// lay phan tu DOM
const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const messageElement = document.getElementById('message');

// hien thi thong bao
function displayMessage(text) {
    messageElement.textContent = text;
}

// -------------------------------------------------------------------
// 🔥 HÀM MỚI: Lấy vai trò (ROLE) của người dùng từ bảng super_users
// -------------------------------------------------------------------
async function fetchUserRole(userId) {
    // Truy vấn bảng 'super_users' (tên bảng bạn dùng để lưu vai trò)
    const { data, error } = await supabaseClient
        .from('super_users')
        .select('role')
        .eq('id', userId)
        .single();

    if (error || !data || !data.role) {
        // Xử lý lỗi: Không tìm thấy vai trò (Chưa được gán thủ công)
        displayMessage('Lỗi: Tài khoản chưa được gán vai trò. Vui lòng liên hệ Admin.');
        // Bắt đăng xuất nếu không có vai trò
        await supabaseClient.auth.signOut();
        return;
    }

    const userRole = data.role;
    // Lưu vai trò vào Local Storage để sử dụng trên các trang dashboard
    localStorage.setItem('user_role', userRole);

    // CHUYỂN HƯỚNG CÓ ĐIỀU KIỆN
    if (userRole === 'admin') {
        window.location.href = 'admin.html';
    } else if (userRole === 'employee') {
        // Chuyển hướng nhân viên đến trang dashboard riêng
        window.location.href = 'staff_booking.html';
    } 
}

// -------------------------------------------------------------------
// 🔥 HÀM SIGN IN : Bắt đầu quá trình lấy vai trò
// -------------------------------------------------------------------
async function signIn(email, password) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        displayMessage(`Lỗi Đăng nhập: ${error.message}`);
    } else {
        const userEmail = data.user.email;
        displayMessage(`Đăng nhập thành công! Đang kiểm tra quyền truy cập...`);

        // GỌI HÀM LẤY VAI TRÒ VÀ CHUYỂN HƯỚNG
        await fetchUserRole(data.user.id);
    }
}

// su kien lang nghe form (Giữ nguyên)
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = emailInput.value;
    const password = passwordInput.value;

    displayMessage('Đang xử lý...');
    await signIn(email, password);
});