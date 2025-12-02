

// lay phan tu DOM
const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const messageElement = document.getElementById('message');

// hien thi thong bao
function displayMessage(text) {
    messageElement.textContent = text;
}
// Tạo hàm chuyển hướng mới
function handleManualRedirect(userRole) {
    if (userRole === 'admin') {
        window.location.href = 'court.html';
    } else if (userRole === 'employee') {
        window.location.href = 'staff_booking.html';
    } 
}

// -------------------------------------------------------------------
// 🔥 HÀM MỚI: Lấy vai trò (ROLE) của người dùng từ bảng super_users
// -------------------------------------------------------------------
// async function fetchUserRole(userId) {
//     // Truy vấn bảng 'super_users' (tên bảng bạn dùng để lưu vai trò)
//     const { data, error } = await supabaseClient
//         .from('super_users')
//         .select('role')
//         .eq('id', userId)
//         .single();

//     if (error || !data || !data.role) {
//         // Xử lý lỗi: Không tìm thấy vai trò (Chưa được gán thủ công)
//         displayMessage('Lỗi: Tài khoản chưa được gán vai trò. Vui lòng liên hệ Admin.');
//         // Bắt đăng xuất nếu không có vai trò
//         await supabaseClient.auth.signOut();
//         return;
//     }

//     const userRole = data.role;
//     // Lưu vai trò vào Local Storage để sử dụng trên các trang dashboard
//     localStorage.setItem('user_role', userRole);

//     // CHUYỂN HƯỚNG CÓ ĐIỀU KIỆN
//     if (userRole === 'admin') {
//         window.location.href = 'admin.html';
//     } else if (userRole === 'employee') {
//         // Chuyển hướng nhân viên đến trang dashboard riêng
//         window.location.href = 'staff_booking.html';
//     } 
// }

// -------------------------------------------------------------------
// 🔥 HÀM SIGN IN : Bắt đầu quá trình lấy vai trò
// -------------------------------------------------------------------
// Thay đổi hàm signIn
async function signIn(email, password) {
    displayMessage('Đang kiểm tra thông tin người dùng...');
    
    // 🛑 THAY THẾ: TRUY VẤN TRỰC TIẾP BẢNG super_users ĐỂ TÌM EMAIL VÀ MẬT KHẨU
    const { data: user, error: dbError } = await supabaseClient
        .from('super_users')
        .select(`id, email, role`) // Chỉ lấy các trường cần thiết
        .eq('email', email)
        .eq('password', password) // 🛑 KIỂM TRA MẬT KHẨU PLAIN TEXT! (NGUY HIỂM)
        .single();

    if (dbError || !user) {
        // Nếu không tìm thấy user nào khớp với email và password
        displayMessage(`Lỗi Đăng nhập: Sai Email hoặc Mật khẩu.`);
        return;
    }
    
    // Nếu truy vấn thành công, người dùng đã được "xác thực"
    const userEmail = user.email;
    displayMessage(`Đăng nhập thành công! Đang kiểm tra quyền truy cập...`);

    // Lưu Vai trò và User ID thủ công
    localStorage.setItem('user_role', user.role);
    localStorage.setItem('user_id', user.id); // LƯU ID USER THỦ CÔNG

    // GỌI HÀM LẤY VAI TRÒ VÀ CHUYỂN HƯỚNG
    // (Bây giờ fetchUserRole chỉ cần đọc từ localStorage hoặc gọi hàm chuyển hướng trực tiếp)
    
    // Tạo hàm chuyển hướng đơn giản mới
    handleManualRedirect(user.role);
}

// su kien lang nghe form (Giữ nguyên)
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = emailInput.value;
    const password = passwordInput.value;

    displayMessage('Đang xử lý...');
    await signIn(email, password);
});

