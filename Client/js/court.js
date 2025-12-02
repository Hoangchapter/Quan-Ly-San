// Biến toàn cục để lưu ID sân đang được chỉnh sửa
let currentCourtId = null;
// Biến lưu trữ chi tiết Venue để tránh tải lại
let allVenues = [];

// ===================================================================
// HÀM HIỂN THỊ ẢNH PREVIEW (SỬ DỤNG URL)
// ===================================================================
// ===================================================================
// HÀM HIỂN THỊ ẢNH PREVIEW (SỬ DỤNG URL) - ĐÃ SỬA LỖI
// ===================================================================
function renderImagePreview(urlText, previewElementId) {
    const previewDiv = document.getElementById(previewElementId);
    previewDiv.innerHTML = ''; // Xóa ảnh cũ

    // SỬA LỖI: Kiểm tra nếu urlText là null/undefined HOẶC không phải là chuỗi.
    // Nếu không phải là chuỗi, ta sẽ thoát ra để tránh lỗi .split()
    if (!urlText || typeof urlText !== 'string') {
        return; 
    }

    // Tách URL (Giả định URL cách nhau bằng dấu phẩy)
    // Dòng này bây giờ đã an toàn vì ta đã đảm bảo urlText là chuỗi.
    const urls = urlText.split(',').map(url => url.trim()).filter(url => url.length > 0);

    urls.forEach(url => {
        if (url.startsWith('http')) {
            const img = document.createElement('img');
            img.src = url;
            img.alt = "Ảnh Khu Vực/Sân";
            img.loading = "lazy"; // Tối ưu hóa: Thêm lazy loading
            previewDiv.appendChild(img);
        }
    });
}


// ===================================================================
// TẢI VÀ RENDER DANH SÁCH VENUES
// ===================================================================
async function fetchAndRenderVenues() {
    // Tải tất cả các trường Venue cần thiết
    const { data: venues, error } = await supabaseClient
        .from('venues')
        .select('id, name, address, surface, is_indoor, images, contact_email, contact_phone, country, rating');

    if (error) {
        console.error("Lỗi khi tải danh sách Khu vực (Venues):", error.message);
        return;
    }

    allVenues = venues;
    const select = document.getElementById('venue-select');
    select.innerHTML = '<option value="">--- Chọn Khu Vực ---</option>';

    venues.forEach(venue => {
        const option = document.createElement('option');
        option.value = venue.id;
        option.textContent = venue.name;
        select.appendChild(option);
    });

    const newOption = document.createElement('option');
    newOption.value = 'new_venue';
    newOption.textContent = '➕ Tạo Khu Vực Mới';
    select.appendChild(newOption);
}

// ===================================================================
// ĐỔ DỮ LIỆU CHI TIẾT VENUE VÀO FORM (CHỈ XEM/NHẬP KHI TẠO MỚI)
// ===================================================================
// ===================================================================
// 9. ĐỔ DỮ LIỆU VENUE VÀO FORM (KHI CHỌN VENUE CŨ HOẶC TẠO MỚI)
// ===================================================================
function loadVenueDetailsToForm(venue) {
    // Reset chi tiết Venue
    document.getElementById('venue-name').value = '';
    document.getElementById('venue-address').value = '';
    document.getElementById('venue-country').value = ''; // Đã đổi tên nhãn thành Tỉnh/Thành phố
    document.getElementById('venue-surface').value = '';
    document.getElementById('venue-is-indoor').value = 'false';
    document.getElementById('venue-contact-email').value = '';
    document.getElementById('venue-contact-phone').value = '';
    document.getElementById('venue-images-url-hidden').value = '';
    document.getElementById('venue-images-preview').innerHTML = '';

    if (venue) {
        // Đổ dữ liệu Venue cũ (luôn bị disabled khi đang sửa Court)
        document.getElementById('venue-name').value = venue.name || '';
        document.getElementById('venue-address').value = venue.address || '';
        document.getElementById('venue-country').value = venue.province || ''; // Dữ liệu Tỉnh/Thành phố
        document.getElementById('venue-surface').value = venue.surface || '';
        document.getElementById('venue-is-indoor').value = venue.is_indoor ? 'true' : 'false';
        document.getElementById('venue-contact-email').value = venue.contact_email || '';
        document.getElementById('venue-contact-phone').value = venue.contact_phone || '';
        document.getElementById('venue-images-url-hidden').value = venue.images || '';

        // Hiển thị ảnh
        renderImagePreview(venue.images, 'venue-images-preview');

    }
}


// ===================================================================
// THIẾT LẬP FORM (ADD/EDIT)
// ===================================================================
function setupCourtForm(mode = 'add', data = null) { // data là Court object
    const title = document.querySelector('#court-edit-card h3');
    const saveButton = document.getElementById('save-court-details-btn');
    const venueFieldset = document.getElementById('venue-details-fieldset');
    const courtFieldset = document.getElementById('court-details-fieldset');

    currentCourtId = (mode === 'edit' && data) ? data.id : null;

    // Đảm bảo Court Fieldset luôn mở
    courtFieldset.style.display = 'block';
    courtFieldset.disabled = false;

    // Reset inputs Sân
    document.getElementById('field-name').value = '';
    document.getElementById('field-code').value = '';
    document.getElementById('field-capacity').value = '2';
    document.getElementById('field-status').value = 'active';
    document.getElementById('default-price-input').value = 0;

    // Reset ảnh Sân (Court) - SỬ DỤNG ID INPUT TEXT
    document.getElementById('court-image-url-hidden').value = '';
    renderImagePreview(null, 'court-image-preview');


    if (mode === 'add') {
        currentCourtId = null;
        title.textContent = "➕ Thêm Sân Mới";
        saveButton.textContent = "➕ Tạo Sân";

        // Reset Venue
        // Cần reset Venue select box về 'new' để form Venue được kích hoạt
        document.getElementById('venue-select').value = 'new';
        document.getElementById('venue-select').dispatchEvent(new Event('change'));

        // Reset các trường Court về giá trị mặc định
        document.getElementById('court-edit-card').style.display = 'block';
        document.getElementById('save-court-details-btn').textContent = '➕ Tạo Sân';

        // ... (Reset các input của Court: name, code, capacity, price, images...)
        document.getElementById('field-name').value = '';
        loadVenueDetailsToForm(null);
        venueFieldset.disabled = true; // Disabled cho đến khi chọn Venue

    } else if (mode === 'edit' && data) { // Edit Court
        title.textContent = `Chỉnh Sửa Sân: ${data.name}`;
        saveButton.textContent = "💾 Lưu Cập Nhật Sân";

        // Mở Venue Fieldset để hiển thị thông tin Venue liên kết
        venueFieldset.disabled = false;
        venueFieldset.querySelector('legend').textContent = 'Chi tiết Khu Vực (Không được sửa)';

    }

    document.getElementById('court-edit-card').style.display = 'block';
}

// ===================================================================
// TẢI DỮ LIỆU SÂN
// ===================================================================
async function fetchCourtsList() {
    const { data: courts, error } = await supabaseClient
        .from('courts')
        .select(`
            id, 
            name, 
            code, 
            capacity, 
            default_price_per_hour, 
            is_active, 
            image_url, 
            venues (
                id, 
                name, 
                address, 
                surface, 
                is_indoor, 
                province
            ) 
        `);

    if (error) {
        console.error("Lỗi khi tải danh sách sân:", error.message);
        return [];
    }

    renderCourtsList(courts);
}

// ===================================================================
// RENDER (HIỂN THỊ) DANH SÁCH (ĐÃ BỎ NÚT SỬA/XÓA VENUE)
// ===================================================================
function renderCourtsList(courts) {
    const tbody = document.getElementById('courts-list-tbody');
    tbody.innerHTML = '';

    if (!courts || courts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8">Chưa có sân nào được tạo.</td></tr>';
        return;
    }

    courts.forEach(court => {
        const isActive = court.is_active || false;
        const statusDisplay = isActive ? 'Hoạt động' : 'Tạm dừng/Bảo trì';
        const statusClass = isActive ? 'status-active' : 'status-maintenance';

        const price = new Intl.NumberFormat('vi-VN').format(court.default_price_per_hour || 0);

        // Lấy thông tin Venue
        const venueId = court.venues ? court.venues.id : null;
        const venueName = (court.venues && court.venues.name) ? court.venues.name : 'N/A';
        const venueProvinceOrCity = (court.venues && court.venues.province) ? court.venues.province : 'N/A';
        const venueSurface = (court.venues && court.venues.surface) ? court.venues.surface : 'N/A';
        const isIndoor = (court.venues && court.venues.is_indoor) ? court.venues.is_indoor : false;
        const indoorDisplay = isIndoor ? 'Trong Nhà' : 'Ngoài Trời';


        // RENDER DANH SÁCH RÚT GỌN (CHỈ CÓ SỬA/XÓA SÂN)
        const row = `
            <tr data-id="${court.id}" data-venue-id="${venueId}" class="${isActive ? 'field-active' : 'field-inactive'}">
                <td>${court.code || 'N/A'}</td> 
                <td>${court.name}</td>
                <td>${venueName} (${venueProvinceOrCity})</td> 
                <td>${court.capacity || 'N/A'} người</td> 
                <td>${venueSurface} / ${indoorDisplay}</td>
                <td class="${statusClass}">${statusDisplay}</td>
                <td>${price}</td> 
                <td>
                    <button class="action-btn edit-court-btn" data-id="${court.id}">Sửa Sân</button>
                    <button class="action-btn delete-court-btn" data-id="${court.id}">Xóa Sân</button>
                </td>
            </tr>
        `;
        tbody.insertAdjacentHTML('beforeend', row);
    });
}

// ===================================================================
// HÀM XỬ LÝ XÓA SÂN
// ===================================================================
async function handleDeleteCourt(courtId) {
    if (!confirm(`Bạn có chắc chắn muốn XÓA SÂN ID: ${courtId} không? Thao tác này không thể hoàn tác.`)) {
        return;
    }

    // Tiến hành xóa Sân
    const { error: deleteError } = await supabaseClient
        .from('courts')
        .delete()
        .eq('id', courtId);

    if (deleteError) {
        alert(`❌ Lỗi xóa Sân: ${deleteError.message}`);
        return;
    }

    alert(`✅ Xóa Sân ID: ${courtId} thành công!`);
    fetchCourtsList();
    document.getElementById('court-edit-card').style.display = 'none';
}


// ===================================================================
// TẢI CHI TIẾT SÂN VÀO FORM SỬA
// ===================================================================
async function loadCourtDetails(courtId) {
    const { data: court, error: courtError } = await supabaseClient
        .from('courts')
        .select(`*, 
                 venues (
                    id, name, address, surface, is_indoor, images, contact_email, contact_phone, province, rating
                 )
                `)
        .eq('id', courtId)
        .single();

    if (courtError) {
        console.error('Lỗi khi tải chi tiết sân:', courtError.message);
        return;
    }

    setupCourtForm('edit', court);

    // --- Đổ dữ liệu SÂN (COURT) ---
    document.getElementById('field-name').value = court.name || '';
    document.getElementById('field-code').value = court.code || '';
    document.getElementById('field-capacity').value = court.capacity ? court.capacity.toString() : '2';
    document.getElementById('field-status').value = court.is_active ? 'active' : 'maintenance';
    document.getElementById('default-price-input').value = court.default_price_per_hour || 0;

    // Ảnh Sân - Đổ dữ liệu URL vào input text
    document.getElementById('court-image-url-hidden').value = court.image_url || '';
    renderImagePreview(court.image_url, 'court-image-preview');


    // Đổ dữ liệu Venue ID
    document.getElementById('venue-select').value = court.venue_id || '';

    // --- Đổ dữ liệu CHI TIẾT VENUE (JOINED) ---
    if (court.venues) {
        loadVenueDetailsToForm(court.venues); // Dùng hàm load details Venue
    } else {
        // Trường hợp lỗi dữ liệu, reset Venue fields
        loadVenueDetailsToForm(null);
    }
}


// ===================================================================
// XỬ LÝ LƯU SÂN (CREATE/UPDATE) - KHÔNG XỬ LÝ SỬA VENUE RIÊNG BIỆT
// ===================================================================
async function handleSaveCourt(e) {
    e.preventDefault();

    const saveButton = document.getElementById('save-court-details-btn');
    saveButton.disabled = true;
    saveButton.textContent = currentCourtId ? 'Đang Lưu Sân...' : 'Đang Xử Lý...';

    try {
        let venueId = document.getElementById('venue-select').value;
        const isNewVenueMode = venueId === 'new_venue';

        if (!isNewVenueMode) {
            venueId = parseInt(venueId);
        }

        if (isNaN(venueId) && !isNewVenueMode) {
            alert("Vui lòng chọn một Khu vực hợp lệ.");
            return;
        }

        // ❗ ĐÃ BỎ BÌNH LUẬN VÀ LẤY GIÁ TRỊ TỪ INPUT TEXT (URL)
        const venueImagesUrlText = document.getElementById('venue-images-url-hidden').value.trim();

        // --- Lấy dữ liệu Venue từ form (Chỉ dùng khi TẠO MỚI) ---
        const venueUpdates = {
            name: document.getElementById('venue-name').value.trim(),
            address: document.getElementById('venue-address').value.trim(),
            surface: document.getElementById('venue-surface').value.trim(),
            is_indoor: document.getElementById('venue-is-indoor').value === 'true',
            country: document.getElementById('venue-country').value.trim(),
            contact_email: document.getElementById('venue-contact-email').value.trim(),
            contact_phone: document.getElementById('venue-contact-phone').value.trim(),
            updated_at: new Date().toISOString()
        };

        // --- BƯỚC 1: XỬ LÝ VENUE (CHỈ TẠO MỚI) ---
        if (isNewVenueMode) {
            if (!venueUpdates.name || !venueUpdates.address || !venueUpdates.country) {
                alert("Vui lòng nhập Tên, Địa chỉ và Tỉnh/Thành phố cho Khu vực.");
                return;
            }

            const venueDataToSave = {
                ...venueUpdates,
                images: venueImagesUrlText, // Giờ đã có giá trị từ input text (URL)
                created_at: new Date().toISOString(),
                rating: 0,
                city: "HN",
                country: "VN"
            };

            // TẠO MỚI VENUE
            const { data: newVenue, error: newVenueError } = await supabaseClient
                .from('venues')
                .insert([venueDataToSave])
                .select('id') // Đảm bảo đúng cú pháp
                .single();

            if (newVenueError) {
                alert(`❌ Lỗi tạo Khu vực mới: ${newVenueError.message}`);
                return;
            }
            venueId = newVenue.id;

        }

        // CẬP NHẬT ẢNH VENUE CŨ 
        if (venueId && !isNewVenueMode) {
            const { error: venueUpdateError } = await supabaseClient
                .from('venues')
                .update({
                    images: venueImagesUrlText, // Lấy giá trị từ input text (URL)
                    updated_at: new Date().toISOString()
                })
                .eq('id', venueId);

            if (venueUpdateError) {
                console.warn(`⚠️ Lỗi cập nhật ảnh khu vực (Venue) khi tạo/sửa Court: ${venueUpdateError.message}.`);
            }
        }

        // --- BƯỚC 2: XỬ LÝ COURT ---
        const courtUpdates = {
            name: document.getElementById('field-name').value.trim(),
            code: document.getElementById('field-code').value.trim(),
            // ĐÃ FIX LỖI: value là số
            capacity: parseInt(document.getElementById('field-capacity').value),
            default_price_per_hour: parseFloat(document.getElementById('default-price-input').value),
            is_active: document.getElementById('field-status').value === 'active',
            venue_id: venueId
        };

        let courtImageUrl = document.getElementById('court-image-url-hidden').value.trim();
        courtUpdates.image_url = courtImageUrl || null;

        if (courtUpdates.name === '' || courtUpdates.code === '' || isNaN(courtUpdates.capacity) || isNaN(courtUpdates.default_price_per_hour)) {
            alert("Vui lòng điền đầy đủ thông tin Sân (Tên, Mã, Sức chứa và Giá tiền hợp lệ).");
            return;
        }

        let result;
        if (currentCourtId) {
            // UPDATE COURT
            courtUpdates.updated_at = new Date().toISOString();
            result = await supabaseClient
                .from('courts')
                .update(courtUpdates)
                .eq('id', currentCourtId);
        } else {
            // CREATE COURT
            courtUpdates.created_at = new Date().toISOString();
            result = await supabaseClient
                .from('courts')
                .insert([courtUpdates]);
        }

        const { error: courtError } = result;

        if (courtError) {
            alert(`❌ Lỗi ${currentCourtId ? 'cập nhật' : 'tạo mới'} sân: ${courtError.message}`);
            return;
        }

        alert(`✅ ${currentCourtId ? 'Cập nhật' : 'Tạo mới'} sân ${courtUpdates.name} thành công!`);

        await fetchAndRenderVenues();
        setupCourtForm('add');
        fetchCourtsList();

    } catch (error) {
        console.error("Lỗi toàn cục khi lưu:", error);
        alert(`❌ Đã xảy ra lỗi không xác định: ${error.message}`);
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = currentCourtId ? '💾 Lưu Cập Nhật Sân' : '➕ Tạo Sân';
    }
}


// ===================================================================
// LẮNG NGHE SỰ KIỆN DOM CONTENT LOADED
// ===================================================================
document.addEventListener('DOMContentLoaded', () => {
    fetchAndRenderVenues();
    fetchCourtsList();

    // --- 1. Lấy các phần tử ---
    const courtsListTable = document.getElementById('courts-list-table');
    const saveButton = document.getElementById('save-court-details-btn');
    const addCourtButton = document.getElementById('add-court-button');
    const venueSelect = document.getElementById('venue-select');
    

    // Lấy các input URL và nút xóa
    const courtImageUrlInput = document.getElementById('court-image-url-hidden');
    const venueImageUrlInput = document.getElementById('venue-images-url-hidden');
    const clearVenueImageBtn = document.getElementById('clear-venue-image-btn');
    const venueFieldset = document.getElementById('venue-details-fieldset');

    // --- 2. HÀM TIỆN ÍCH ĐỂ BẬT/TẮT CÁC TRƯỜNG VENUE ---
    const venueFieldsToToggle = [
        'venue-name', 'venue-address', 'venue-surface', 'venue-is-indoor',
        'venue-images-url-hidden', 'clear-venue-image-btn', 'venue-country',
        'venue-contact-email', 'venue-contact-phone'
    ];

    /**
     * Bật hoặc Tắt (disabled) các trường input/select/button trong fieldset Venue
     * @param {boolean} isDisabled - true để tắt (disabled), false để bật (enabled)
     */
    const toggleVenueFields = (isDisabled) => {
        // Tắt/Bật fieldset chính
        venueFieldset.disabled = isDisabled; 

        // Xử lý các element có thể không bị ảnh hưởng bởi fieldset.disabled (như nút, hidden input)
        venueFieldsToToggle.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.disabled = isDisabled;
            }
        });
        
        // Cập nhật trạng thái hiển thị của nút xóa ảnh Venue
        if (clearVenueImageBtn) {
            const hasUrl = venueImageUrlInput && venueImageUrlInput.value;
            clearVenueImageBtn.style.display = (hasUrl && !isDisabled) ? 'inline-block' : 'none';
        }
    };
    // -----------------------------------------------------------

    // LẮNG NGHE INPUT URL SÂN (COURT) - Preview ảnh
    if (courtImageUrlInput) {
        courtImageUrlInput.addEventListener('input', (e) => {
            renderImagePreview(e.target.value, 'court-image-preview');
        });
    }

    // -----------------------------------------------------------
    // LẮNG NGHE INPUT URL VENUE (ĐỂ PREVIEW)
    if (venueImageUrlInput) {
        venueImageUrlInput.addEventListener('input', (e) => {
            const urlText = e.target.value;
            renderImagePreview(urlText, 'venue-images-preview');
            // Hiển thị nút xóa nếu có URL VÀ form đang được phép chỉnh sửa
            if (clearVenueImageBtn) {
                clearVenueImageBtn.style.display = (urlText && !venueFieldset.disabled) ? 'inline-block' : 'none';
            }
        });
    }

    // LẮNG NGHE NÚT XÓA ẢNH VENUE
    if (clearVenueImageBtn) {
        clearVenueImageBtn.addEventListener('click', () => {
            venueImageUrlInput.value = '';
            renderImagePreview(null, 'venue-images-preview');
            clearVenueImageBtn.style.display = 'none';
        });
    }

    // -----------------------------------------------------------
    // LẮNG NGHE SỰ KIỆN CHỌN KHU VỰC (ĐÃ SỬA)
    if (venueSelect) {
        venueSelect.addEventListener('change', (e) => {
            const selectedValue = e.target.value;

            if (selectedValue === 'new_venue') {
                // Chuyển sang chế độ Tạo mới Venue
                loadVenueDetailsToForm(null); // Clear form
                toggleVenueFields(false); // Bật tất cả các trường
                venueFieldset.querySelector('legend').textContent = 'Chi tiết Khu Vực MỚI (Cần nhập Tên & Địa chỉ & Tỉnh/Thành)';

            } else if (selectedValue && selectedValue !== '') {
                // Chọn Venue cũ để thêm Court
                const selectedVenueId = parseInt(selectedValue);
                const venue = allVenues.find(v => v.id === selectedVenueId);

                // Hàm này tự động đổ dữ liệu và DISABLE/ENABLE các fields
                loadVenueDetailsToForm(venue); 

            } else {
                loadVenueDetailsToForm(null); // Clear form
                toggleVenueFields(true); // Tắt tất cả các trường
            }
        });
    }

    // -----------------------------------------------------------
    // LẮNG NGHE NÚT "THÊM SÂN MỚI"
    if (addCourtButton) {
        addCourtButton.addEventListener('click', () => {
            setupCourtForm('add');
        });
    }

    // -----------------------------------------------------------
    // LẮNG NGHE SỰ KIỆN CLICK TRÊN BẢNG SÂN (Chỉ còn Sửa Sân, Xóa Sân)
    if (courtsListTable) {
        courtsListTable.addEventListener('click', (e) => {
            const target = e.target;
            const courtId = target.dataset.id;

            if (target.classList.contains('edit-court-btn')) {
                loadCourtDetails(courtId);
            } else if (target.classList.contains('delete-court-btn')) {
                handleDeleteCourt(courtId);
            }
        });
    }

    // -----------------------------------------------------------
    // LẮNG NGHE SỰ KIỆN LƯU (CẬP NHẬT/TẠO MỚI)
    if (saveButton) {
        saveButton.addEventListener('click', handleSaveCourt);
    }
});