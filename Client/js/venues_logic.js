// HÀM TIỆN ÍCH ĐỂ BẬT/TẮT CÁC TRƯỜNG VENUE
const venueFieldsToToggle = [
    'venue-name', 'venue-address', 'venue-surface', 'venue-is-indoor',
    'venue-country', 'venue-contact-email', 'venue-contact-phone',
    'venue-image-upload'
];

/**
 * Bật hoặc Tắt (disabled) các trường input/select/button trong fieldset Venue
 * @param {boolean} isDisabled - true để tắt (disabled), false để bật (enabled)
 */
function toggleVenueFields(isDisabled) {
    const clearVenueImageBtn = document.getElementById('clear-venue-image-btn');

    //  SỬA LỖI: ĐẢM BẢO LỆNH ENABLE/DISABLE NÀY CHẠY
    venueFieldsToToggle.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            // Lệnh này buộc phải mở khóa khi isDisabled = false
            element.disabled = isDisabled;
        } else {

        }
    });

    // Cập nhật trạng thái hiển thị của nút xóa ảnh Venue
    if (clearVenueImageBtn) {
        clearVenueImageBtn.style.display = isDisabled ? 'none' : 'inline-block';
    }
}

async function deleteVenueAndCourts(venueId) {
    try {
        // 1. XÓA COURTS trước (tránh lỗi ràng buộc FK)
        const { error: courtDeleteError } = await supabaseClient
            .from('courts')
            .delete()
            .eq('venue_id', venueId);

        if (courtDeleteError) {
            alert("Lỗi khi xóa Sân thuộc Khu Vực: " + courtDeleteError.message);
            return;
        }

        // 2. XÓA VENUE
        const { error: venueDeleteError } = await supabaseClient
            .from('venues')
            .delete()
            .eq('id', venueId);

        if (venueDeleteError) {
            alert("Lỗi khi xóa Khu Vực: " + venueDeleteError.message);
            return;
        }

        alert("Đã xóa Khu Vực và toàn bộ Sân thuộc khu vực!");

        await fetchAndRenderVenues();  // Cập nhật select lại
        fetchCourtsList();             // Cập nhật bảng sân
        setupCourtForm('add');         // Reset form

    } catch (err) {
        alert("Lỗi không xác định khi xóa: " + err.message);
    }
}



// ===================================================================
// TẢI VÀ RENDER DANH SÁCH VENUES
// ... (GIỮ NGUYÊN HÀM fetchAndRenderVenues)
// ===================================================================
async function fetchAndRenderVenues() {
    const { data: venues, error } = await supabaseClient
        .from('venues')
        .select('id, name, address, surface, is_indoor, images, contact_email, contact_phone, country, rating, province');

    if (error) {
        console.error("Lỗi khi tải danh sách Khu vực (Venues):", error.message);
        return;
    }

    allVenues = venues;
    const select = document.getElementById('venue-select');
    // Xóa tất cả option trừ option trống đầu tiên (nếu có)
    select.innerHTML = '<option value="">--- Chọn Khu Vực ---</option>';

    venues.forEach(venue => {
        const option = document.createElement('option');
        option.value = venue.id;
        option.textContent = venue.name;
        select.appendChild(option);
    });

    const newOption = document.createElement('option');
    newOption.value = 'new_venue';
    newOption.textContent = ' Tạo Khu Vực Mới';
    select.appendChild(newOption);
}

// ===================================================================
// ĐỔ DỮ LIỆU CHI TIẾT VENUE VÀO FORM
// ===================================================================
function loadVenueDetailsToForm(venue) {
    const editVenueBtn = document.getElementById('edit-venue-details-btn');
    const deleteVenueBtn = document.getElementById('delete-venue-btn');




    // Reset chi tiết Venue
    document.getElementById('venue-name').value = '';
    document.getElementById('venue-address').value = '';
    document.getElementById('venue-country').value = '';
    document.getElementById('venue-surface').value = '';
    document.getElementById('venue-is-indoor').value = 'false';
    document.getElementById('venue-contact-email').value = '';
    document.getElementById('venue-contact-phone').value = '';

    // Reset preview
    document.getElementById('venue-images-preview').innerHTML = '';

    if (venue) {
        // Đổ dữ liệu Venue cũ
        document.getElementById('venue-name').value = venue.name || '';
        document.getElementById('venue-address').value = venue.address || '';
        document.getElementById('venue-country').value = venue.province || ''; // Dùng province cho hiển thị
        document.getElementById('venue-surface').value = venue.surface || '';
        document.getElementById('venue-is-indoor').value = venue.is_indoor ? 'true' : 'false';
        document.getElementById('venue-contact-email').value = venue.contact_email || '';
        document.getElementById('venue-contact-phone').value = venue.contact_phone || '';

        // Hiển thị ảnh (nếu có)
        renderImagePreview(venue.images, 'venue-images-preview');

        // Chế độ xem: Tắt các input Venue 
        toggleVenueFields(true); // Khóa các input
        if (editVenueBtn) {
            editVenueBtn.style.display = 'inline-block';
        }

    } else {
        // Chế độ tạo mới Venue (sau khi chọn 'new_venue')
        if (editVenueBtn) {
            editVenueBtn.style.display = 'none';
        }
        // Mặc định tắt (chỉ bật khi chọn 'new_venue')
        toggleVenueFields(false);
    }
    if (venue) {
        deleteVenueBtn.style.display = 'inline-block';
    } else {
        deleteVenueBtn.style.display = 'none';
    }
}