// loadSliderBar.js (Phiên bản CẬP NHẬT)

document.addEventListener('DOMContentLoaded', function() {
    const sidebarURL = 'sidebar.html'; 
    const placeholder = document.getElementById('sidebar-placeholder');

    // 1. Tải Sidebar
    if (placeholder) {
        fetch(sidebarURL)
            .then(response => response.text())
            .then(data => {
                placeholder.innerHTML = data;
                
                // --- BẮT ĐẦU LOGIC ACTIVE ---

                // Lấy tên file hiện tại (ví dụ: dashboard.html, quanlysan.html)
                // location.pathname trả về đường dẫn đầy đủ (/duongdan/den/file.html)
                const currentPath = window.location.pathname;
                const currentFile = currentPath.substring(currentPath.lastIndexOf('/') + 1) || 'dashboard.html'; 
                // Dùng 'dashboard.html' nếu đường dẫn là thư mục gốc (index)

                // Lấy tất cả các mục menu
                const menuItems = document.querySelectorAll('#sidebar-placeholder .menu-item');
                
                menuItems.forEach(item => {
                    // Loại bỏ trạng thái 'active' cũ
                    item.classList.remove('active'); 

                    // So sánh href của mục menu với tên file hiện tại
                    // Nếu item.href (ví dụ: 'quanlysan.html') khớp với currentFile
                    if (item.getAttribute('href') === currentFile) {
                        item.classList.add('active'); // Thêm trạng thái 'active'
                    }
                });

                // --- KẾT THÚC LOGIC ACTIVE ---
            })
            .catch(error => {
                console.error('LỖI TẢI SIDEBAR:', error);
                placeholder.innerHTML = `<p style="color: red; padding: 10px;">Lỗi: Không thể tải sidebar.</p>`;
            });
    }
});