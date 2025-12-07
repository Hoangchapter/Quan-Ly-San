// ===================================================================
// XỬ LÝ LƯU SÂN (CREATE/UPDATE) - SỬ DỤNG UPLOAD FILE
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

        // --- Lấy dữ liệu Venue từ form ---
        const venueFieldset = document.getElementById('venue-details-fieldset');
        // Kiểm tra trạng thái: true nếu các input đang được bật (disabled=false)
        const isVenueFieldsEnabled = !document.getElementById('venue-name').disabled;

        const venueUpdates = {
            name: document.getElementById('venue-name').value.trim(),
            address: document.getElementById('venue-address').value.trim(),
            surface: document.getElementById('venue-surface').value.trim(),
            is_indoor: document.getElementById('venue-is-indoor').value === 'true',
            province: document.getElementById('venue-country').value.trim(), // Dùng province thay vì country
            contact_email: document.getElementById('venue-contact-email').value.trim(),
            contact_phone: document.getElementById('venue-contact-phone').value.trim(),
            updated_at: new Date().toISOString()
        };

        // -------------------------------------------------------------
        // BƯỚC 0: XỬ LÝ UPLOAD ẢNH VENUE (Chỉ upload nếu form Venue được bật)
        // -------------------------------------------------------------
        const venueImageInput = document.getElementById('venue-image-upload');
        let finalVenueImagesArray = null;

        if (isVenueFieldsEnabled && venueImageInput && venueImageInput.files.length > 0) {
            saveButton.textContent = 'Đang Upload Ảnh Khu vực...';
            finalVenueImagesArray = await uploadFilesToSupabase(venueImageInput.files, 'venues/');

            if (finalVenueImagesArray === null) {
                alert(" Lỗi khi upload ảnh Khu vực. Vui lòng kiểm tra console.");
                return;
            }
        }

        // -------------------------------------------------------------
        // BƯỚC 1: XỬ LÝ VENUE (TẠO MỚI HOẶC CẬP NHẬT)
        // -------------------------------------------------------------
        if (isNewVenueMode) {
            // TẠO MỚI VENUE
            if (!venueUpdates.name || !venueUpdates.address || !venueUpdates.province) {
                alert("Vui lòng nhập Tên, Địa chỉ và Tỉnh/Thành phố cho Khu vực.");
                return;
            }

            const venueDataToSave = {
                ...venueUpdates,
                images: finalVenueImagesArray,
                created_at: new Date().toISOString(),
                rating: 0, city: "HN", country: "VN"
            };

            const { data: newVenue, error: newVenueError } = await supabaseClient
                .from('venues').insert([venueDataToSave]).select('id').single();

            if (newVenueError) {
                console.error("Lỗi chi tiết khi tạo Venue:", newVenueError);
                alert(` Lỗi tạo Khu vực mới: ${newVenueError.message}`);
                return;
            }
            venueId = newVenue.id;

        } else if (isVenueFieldsEnabled) {
            // CẬP NHẬT VENUE CŨ (Chỉ chạy nếu người dùng bấm nút Sửa Venue)
            const updatePayload = { ...venueUpdates };
            if (finalVenueImagesArray) {
                updatePayload.images = finalVenueImagesArray;
            } else {
                // **KHUYẾN NGHỊ: Giữ lại ảnh cũ nếu không upload ảnh mới (cần logic fetch ảnh cũ)**
            }

            const { error: venueUpdateError } = await supabaseClient
                .from('venues').update(updatePayload).eq('id', venueId);

            if (venueUpdateError) {
                console.warn(` Lỗi cập nhật khu vực (Venue): ${venueUpdateError.message}.`);
            }
            // Khóa lại các trường Venue sau khi cập nhật thành công
            toggleVenueFields(true);
        }

        // -------------------------------------------------------------
        // BƯỚC 2A: XỬ LÝ UPLOAD ẢNH SÂN (COURT)
        // -------------------------------------------------------------
        const courtImageInput = document.getElementById('court-image-upload');
        let courtImageUrl = null;

        if (courtImageInput && courtImageInput.files.length > 0) {
            saveButton.textContent = 'Đang Upload Ảnh Sân...';
            const uploadedUrls = await uploadFilesToSupabase(courtImageInput.files, 'courts/');
            courtImageUrl = uploadedUrls ? uploadedUrls[0] : null;
        }

        // -------------------------------------------------------------
        // BƯỚC 2B: XỬ LÝ COURT
        // -------------------------------------------------------------
        const courtUpdates = {
            name: document.getElementById('field-name').value.trim(),
            code: document.getElementById('field-code').value.trim(),
            capacity: parseInt(document.getElementById('field-capacity').value),
            default_price_per_hour: parseFloat(document.getElementById('default-price-input').value),
            is_active: document.getElementById('field-status').value === 'active',
            venue_id: venueId,
            image_url: courtImageUrl
        };

        if (courtUpdates.name === '' || courtUpdates.code === '' || isNaN(courtUpdates.capacity) || isNaN(courtUpdates.default_price_per_hour)) {
            alert("Vui lòng điền đầy đủ thông tin Sân.");
            return;
        }

        let result;
        if (currentCourtId) {
            courtUpdates.updated_at = new Date().toISOString();
            result = await supabaseClient.from('courts').update(courtUpdates).eq('id', currentCourtId);
        } else {
            courtUpdates.created_at = new Date().toISOString();
            result = await supabaseClient.from('courts').insert([courtUpdates]);
        }

        const { error: courtError } = result;

        if (courtError) {
            alert(` Lỗi ${currentCourtId ? 'cập nhật' : 'tạo mới'} sân: ${courtError.message}`);
            return;
        }

        alert(` ${currentCourtId ? 'Cập nhật' : 'Tạo mới'} sân ${courtUpdates.name} thành công!`);

        await fetchAndRenderVenues();
        setupCourtForm('add');
        fetchCourtsList();

    } catch (error) {
        console.error("Lỗi toàn cục khi lưu:", error);
        alert(` Đã xảy ra lỗi không xác định: ${error.message}`);
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = currentCourtId ? ' Lưu Cập Nhật Sân' : ' Tạo Sân';
    }
}


// ===================================================================
// LẮNG NGHE SỰ KIỆN DOM CONTENT LOADED
// ===================================================================
document.addEventListener('DOMContentLoaded', () => {
    fetchAndRenderVenues();
    fetchCourtsList();

    const courtsListTable = document.getElementById('courts-list-table');
    const saveButton = document.getElementById('save-court-details-btn');
    const addCourtButton = document.getElementById('add-court-button');
    const venueSelect = document.getElementById('venue-select');
    const editVenueBtn = document.getElementById('edit-venue-details-btn');
    const venueFieldset = document.getElementById('venue-details-fieldset');

    // -----------------------------------------------------------
    // LẮNG NGHE NÚT SỬA CHI TIẾT VENUE
    if (editVenueBtn) {
        editVenueBtn.addEventListener('click', () => {
            const venueId = venueSelect.value;
            if (!venueId || venueId === 'new_venue') {
                alert("Vui lòng chọn một Khu vực đã tồn tại để chỉnh sửa.");
                return;
            }

            //  SỬA LỖI: BẬT các trường Venue
            toggleVenueFields(false);
            venueFieldset.querySelector('legend').textContent = 'Chi tiết Khu Vực (Đang chỉnh sửa)';

            // ẨN nút Sửa
            editVenueBtn.style.display = 'none';

            alert("Bạn đang ở chế độ chỉnh sửa chi tiết Khu Vực. Bấm nút 'Lưu Cập Nhật Sân' bên dưới để lưu.");
        });
    }

    // -----------------------------------------------------------
    // LẮNG NGHE SỰ KIỆN CHỌN KHU VỰC
    if (venueSelect) {
        venueSelect.addEventListener('change', (e) => {
            const selectedValue = e.target.value;

            if (selectedValue === 'new_venue') {
                loadVenueDetailsToForm(null); // Clear form
                toggleVenueFields(false); // Bật tất cả các trường
                venueFieldset.querySelector('legend').textContent = 'Chi tiết Khu Vực MỚI (Cần nhập Tên & Địa chỉ & Tỉnh/Thành)';

            } else if (selectedValue && selectedValue !== '') {
                const selectedVenueId = parseInt(selectedValue);
                const venue = allVenues.find(v => v.id === selectedVenueId);

                // Load dữ liệu và TẮT các trường (Chế độ xem)
                loadVenueDetailsToForm(venue);
                venueFieldset.querySelector('legend').textContent = 'Chi tiết Khu Vực (Chỉ xem)';

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
    // LẮNG NGHE SỰ KIỆN CLICK TRÊN BẢNG SÂN (Sửa/Xóa)
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
    document.getElementById('delete-venue-btn').addEventListener('click', async () => {
        const venueId = document.getElementById('venue-select').value;

        if (!venueId || venueId === "new_venue") {
            alert("Hãy chọn một Khu Vực hợp lệ để xóa.");
            return;
        }

        const confirmDelete = confirm(
            " Bạn có chắc chắn muốn XÓA Khu Vực này?\n" +
            " Tất cả Sân thuộc khu vực này cũng sẽ bị xóa!\n" +
            "Hành động này không thể hoàn tác."
        );

        if (!confirmDelete) return;

        await deleteVenueAndCourts(venueId);
    });

});