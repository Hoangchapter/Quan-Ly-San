// Lấy phần tử DOM (Phần này không thay đổi)
const registerForm = document.getElementById("register-form");
const nameInput = document.getElementById("fullName");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirmPassword");
const messageElement = document.getElementById("message");

// Hàm hiển thị thông báo (Phần này không thay đổi)
function displayMessage(text) {
    messageElement.textContent = text;
}

// ---------------------------------------------------------
//  HÀM ĐĂNG KÝ (Sign Up) - ĐÃ SỬA THEO YÊU CẦU CỦA BẠN
// (CÓ LƯU MẬT KHẨU PLAIN TEXT VÀO super_users)
// ---------------------------------------------------------
async function staffSignUp(fullName, email, password) {
    // 1. Validate
    if (!email.includes('@')) { alert('Email không hợp lệ'); return; }
    if (password.length < 6) { alert('Password phải ≥ 6 ký tự'); return; }

    displayMessage("⏳ Đang tạo tài khoản Auth...");

    // 2. Tạo tài khoản Auth (Bắt buộc phải tạo để có user ID)
    const { data: authData, error: authError } = await supabaseClient.auth.signUp({
        email,
        password
    });

    if (authError) {
        alert(` Lỗi đăng ký: ${authError.message}`);
        return;
    }

    const newUserId = authData.user.id;

    displayMessage("⏳ Đang gán hồ sơ super_users...");

    // 3. Chèn role employee VÀ MẬT KHẨU (PLAIN TEXT) vào bảng super_users
    
    const { error: profileError } = await supabaseClient
        .from('super_users')
        .insert([{ 
            username: fullName, 
            id: newUserId, 
            role: 'employee', 
            email: email, 
            password: password //  LƯU MẬT KHẨU PLAIN TEXT! 
        }]); 

    if (profileError) {
        alert(` Lỗi gán role: ${profileError.message}.`);
        await supabaseClient.auth.signOut();
        return;
    }

    // THÀNH CÔNG
    alert(' Đăng ký thành công! Bạn đã được gán role Employee.'); 
    window.location.href = 'staff_booking.html';
}


// ---------------------------------------------------------
//  XỬ LÝ SUBMIT FORM - GIỮ NGUYÊN
// ---------------------------------------------------------
registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const fullName = nameInput.value.trim();
    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;

    displayMessage("⏳ Đang xử lý đăng ký...");

    await staffSignUp(fullName, email, password); 
});

// ---------------------------------------------------------
//  XỬ LÝ SUBMIT FORM - ĐỨNG RIÊNG (ngoài hàm staffSignUp)
// ---------------------------------------------------------
registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const fullName = nameInput.value.trim();
    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;

    displayMessage("⏳ Đang xử lý đăng ký...");

    // SỬA LỖI LOGIC: Gọi hàm với đúng thứ tự tham số
    await staffSignUp(fullName, email, password); 
});