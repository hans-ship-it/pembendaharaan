<?php
// upload.php - Untuk mengupload foto
header('Content-Type: application/json');

// Cek jika ada file yang diupload
if (!isset($_FILES['foto']) || $_FILES['foto']['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(['success' => false, 'message' => 'Tidak ada file yang diupload atau terjadi error']);
    exit;
}

// Validasi tipe file
$allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
$fileType = mime_content_type($_FILES['foto']['tmp_name']);

if (!in_array($fileType, $allowedTypes)) {
    echo json_encode(['success' => false, 'message' => 'Hanya file gambar yang diperbolehkan (JPEG, PNG, GIF, WebP)']);
    exit;
}

// Validasi ukuran file (maksimal 5MB)
$maxSize = 5 * 1024 * 1024; // 5MB
if ($_FILES['foto']['size'] > $maxSize) {
    echo json_encode(['success' => false, 'message' => 'Ukuran file terlalu besar. Maksimal 5MB']);
    exit;
}

// Buat folder uploads jika belum ada
$uploadDir = 'uploads/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

// Dapatkan data dari form
$deskripsi = $_POST['deskripsi'] ?? '';
$type = $_POST['type'] ?? '';

// Bersihkan nama file
$originalName = basename($_FILES['foto']['name']);
$fileExtension = pathinfo($originalName, PATHINFO_EXTENSION);

// Buat nama file baru yang lebih baik
$cleanDeskripsi = preg_replace('/[^a-zA-Z0-9_-]/', '_', $deskripsi);
$cleanDeskripsi = substr($cleanDeskripsi, 0, 50); // Batasi panjang

// Format: jenis_tanggal_deskripsi.ext
$date = date('Y-m-d');
$time = time();
$newFileName = $type . '_' . $date . '_' . $cleanDeskripsi . '_' . $time . '.' . strtolower($fileExtension);

// Path lengkap untuk file
$uploadPath = $uploadDir . $newFileName;

// Coba upload file
if (move_uploaded_file($_FILES['foto']['tmp_name'], $uploadPath)) {
    // Berikan URL untuk akses file
    $fileUrl = $uploadPath;
    
    echo json_encode([
        'success' => true,
        'message' => 'File berhasil diupload',
        'fileName' => $newFileName,
        'fileUrl' => $fileUrl,
        'originalName' => $originalName,
        'fileSize' => $_FILES['foto']['size'],
        'uploadDate' => date('Y-m-d H:i:s')
    ]);
} else {
    echo json_encode(['success' => false, 'message' => 'Gagal menyimpan file']);
}
?>