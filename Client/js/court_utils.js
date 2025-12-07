// Biến toàn cục để lưu trữ tất cả Venue, cần thiết cho logic Court
let allVenues = []; 
// Biến toàn cục để lưu ID sân đang được chỉnh sửa
let currentCourtId = null; 

// ===================================================================
// HÀM UPLOAD FILE LÊN SUPABASE STORAGE (ĐÃ FIX LỖI BUCKET VÀ THÊM LOG)
// ===================================================================
/**
 * Tải file lên Supabase Storage và trả về MẢNG public URL.
 * @param {FileList} files - Đối tượng FileList từ input type="file".
 * @param {string} folderPath - Đường dẫn thư mục con (ví dụ: 'venues/').
 * @returns {Promise<string[]|null>} - Mảng các public URL thành công hoặc null.
 */
async function uploadFilesToSupabase(files, folderPath) {
    const uploadedUrls = [];
    if (!files || files.length === 0) return null;

    // KHAI BÁO CỨNG TÊN BUCKET 'Data'
    const bucketName = 'Data'; 

    for (const file of files) {
        const fileExtension = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExtension}`;
        const filePath = `${folderPath}${fileName}`;

        // Bắt đầu upload
        const { error } = await supabaseClient.storage
            .from(bucketName)
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            console.error(`❌ Lỗi khi upload file ${file.name} lên Supabase:`, error.message);
            // Bạn có thể chọn hiển thị alert ở đây nếu muốn dừng toàn bộ quá trình lưu
            continue; 
        }

        // Lấy public URL
        const { data: publicUrlData } = supabaseClient.storage
            .from(bucketName)
            .getPublicUrl(filePath);

        if (publicUrlData && publicUrlData.publicUrl) {
            uploadedUrls.push(publicUrlData.publicUrl);
        }
    }
    return uploadedUrls.length > 0 ? uploadedUrls : null;
}

// ===================================================================
// HÀM HIỂN THỊ ẢNH PREVIEW (SỬ DỤNG URL)
// ===================================================================
function renderImagePreview(urlText, previewElementId) {
    const previewDiv = document.getElementById(previewElementId);
    if (!previewDiv) return;
    
    previewDiv.innerHTML = ''; // Xóa ảnh cũ

    if (!urlText || typeof urlText !== 'string') {
        return;
    }

    // Tách URL (Giả định URL cách nhau bằng dấu phẩy)
    const urls = urlText.split(',').map(url => url.trim()).filter(url => url.length > 0);

    urls.forEach(url => {
        if (url.startsWith('http')) {
            const img = document.createElement('img');
            img.src = url;
            img.alt = "Ảnh Khu Vực/Sân";
            img.loading = "lazy";
            previewDiv.appendChild(img);
        }
    });
}