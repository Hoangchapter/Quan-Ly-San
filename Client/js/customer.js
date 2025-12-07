// ===================================================================
// KHỞI TẠO BIẾN
// ===================================================================
// Giả định supabaseClient đã được định nghĩa trong client_config.js

const customerTableBody = document.querySelector('.customer-table tbody');
const addCustomerButtonInList = document.getElementById('add-customer-button-in-list');
const customerEditCard = document.getElementById('customer-edit-card');
const saveButton = document.getElementById('save-customer-details-btn');
const cancelButton = document.getElementById('cancel-edit-btn');
const managementGrid = document.querySelector('.management-grid');

let currentCustomerId = null;
let isAddingNew = false;

// ===================================================================
// 1. READ (Đọc) - Tải và Render Danh Sách Khách Hàng (UPDATED)
// ===================================================================
async function fetchAndRenderCustomers() {
    // Chỉ truy vấn các cột cần thiết (id, username, phone, email)
    const { data: customers, error } = await supabaseClient
        .from('profiles')
        .select('id, username, phone, email') 
        .order('id', { ascending: true });

    if (error) {
        console.error('Lỗi khi tải khách hàng:', error);
        // Colspan = số cột hiển thị (STT, Tên, SĐT, Email, Thao tác) = 5
        customerTableBody.innerHTML = '<tr><td colspan="5">Lỗi tải dữ liệu.</td></tr>'; 
        return;
    }

    customerTableBody.innerHTML = '';
    customers.forEach((customer, index) => { 
        const row = customerTableBody.insertRow();
        row.innerHTML = `
            <td>${index + 1}</td> <td>${customer.username || 'N/A'}</td> 
            <td>${customer.phone || 'N/A'}</td>    
            <td>${customer.email || 'N/A'}</td>    
           
        `;
    });
}

// ===================================================================
// 2. CREATE/UPDATE (Thêm/Cập nhật) - Xử lý Lưu chi tiết (UPDATED)
// ===================================================================
async function handleSaveCustomer() {
    const nameInput = document.getElementById('customer-name').value;
    const phoneInput = document.getElementById('customer-phone').value;
    const emailInput = document.getElementById('customer-email').value;
    
    // Đã xóa: const totalSpent, const rank

    if (!nameInput || !phoneInput || !emailInput) {
        alert('Vui lòng điền đủ Tên, SĐT và Email.');
        return;
    }

    const customerData = {
        username: nameInput,
        phone: phoneInput,
        email: emailInput,
        // Đã xóa: total_spent và customer_rank
    };

    try {
        let response;
        if (isAddingNew) {
            // Thêm mới
            response = await supabaseClient
                .from('profiles')
                .insert([customerData]);
            alert('Thêm khách hàng thành công!');
        } else {
            // Cập nhật
            response = await supabaseClient
                .from('profiles')
                .update(customerData)
                .eq('id', currentCustomerId);
            alert('Cập nhật khách hàng thành công!');
        }

        if (response.error) {
            throw response.error;
        }

        fetchAndRenderCustomers();
        hideDetailCard();
    } catch (error) {
        console.error('Lỗi khi lưu khách hàng:', error);
        alert(`Lỗi khi lưu khách hàng: ${error.message}`);
    }
}

// ===================================================================
// 3. DELETE (Xóa) - Xử lý Xóa Khách hàng (Giữ Nguyên)
// ===================================================================
async function handleDeleteCustomer(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa khách hàng này?')) return;

    try {
        const { error } = await supabaseClient
            .from('profiles')
            .delete()
            .eq('id', id);

        if (error) {
            throw error;
        }

        alert('Xóa khách hàng thành công!');
        fetchAndRenderCustomers();
    } catch (error) {
        console.error('Lỗi khi xóa khách hàng:', error);
        alert(`Lỗi khi xóa khách hàng: ${error.message}`);
    }
}

// ===================================================================
// HÀM HỖ TRỢ GIAO DIỆN (UPDATED)
// ===================================================================

async function showDetailCard(mode = 'add', id = null) {
    isAddingNew = mode === 'add';
    currentCustomerId = id;

    // Đặt lại các trường về giá trị mặc định
    document.getElementById('customer-name').value = '';
    document.getElementById('customer-phone').value = '';
    document.getElementById('customer-email').value = '';
    // Đã xóa: document.getElementById('customer-total-spent').value = '0';
    // Đã xóa: document.getElementById('customer-rank').value = 'normal';
    
    document.querySelector('#customer-edit-card h3').textContent = isAddingNew ? ' Thêm Khách Hàng Mới' : '📝 Chi Tiết Khách Hàng';
    saveButton.textContent = isAddingNew ? ' Tạo Khách Hàng' : ' Lưu Cập Nhật';
    
    // HIỆN THẺ CHI TIẾT và kích hoạt layout 2 cột
    customerEditCard.style.display = 'block';
    managementGrid.classList.add('detail-visible');
    
    // Nếu là chế độ Cập nhật, tải dữ liệu khách hàng
    if (id && !isAddingNew) {
        // Chỉ truy vấn các cột cần thiết (username, phone, email)
        const { data: customer, error } = await supabaseClient
            .from('profiles')
            .select('username, phone, email')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Lỗi tải chi tiết khách hàng:', error);
            alert('Không tải được chi tiết khách hàng.');
            hideDetailCard();
            return;
        }

        // Map tên cột DB mới vào các trường Form
        document.getElementById('customer-name').value = customer.username || ''; 
        document.getElementById('customer-phone').value = customer.phone || '';   
        document.getElementById('customer-email').value = customer.email || '';  
        // Đã xóa: document.getElementById('customer-total-spent').value = customer.total_spent || 0;
        // Đã xóa: document.getElementById('customer-rank').value = customer.customer_rank || 'normal';
    }
}

function hideDetailCard() {
    customerEditCard.style.display = 'none';
    managementGrid.classList.remove('detail-visible');

    currentCustomerId = null;
    isAddingNew = false;
}

// ===================================================================
// LẮNG NGHE SỰ KIỆN (EVENT LISTENERS) (Giữ Nguyên)
// ===================================================================
document.addEventListener('DOMContentLoaded', () => {
    fetchAndRenderCustomers(); // Tải danh sách khi trang load

    // Nút Thêm Khách Hàng Mới (trong danh sách)
    if (addCustomerButtonInList) {
        addCustomerButtonInList.addEventListener('click', () => showDetailCard('add'));
    }

    // Nút Lưu/Cập nhật
    if (saveButton) {
        saveButton.addEventListener('click', handleSaveCustomer);
    }
    
    // Nút Hủy/Quay lại
    if (cancelButton) {
        cancelButton.addEventListener('click', hideDetailCard);
    }

    // Lắng nghe sự kiện click trên bảng (Sửa & Xóa)
    if (customerTableBody) {
        customerTableBody.addEventListener('click', (e) => {
            const target = e.target;
            const id = target.dataset.id;
            
            if (target.classList.contains('edit-btn')) {
                showDetailCard('edit', id);
            } else if (target.classList.contains('delete-btn')) {
                handleDeleteCustomer(id);
            }
        });
    }
});