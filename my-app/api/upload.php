<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Path untuk uploads di Vercel
$uploadDir = __DIR__ . '/../public/uploads/';

if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

if (!isset($_FILES['foto']) || $_FILES['foto']['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(['success' => false, 'message' => 'Tidak ada file yang diupload']);
    exit;
}

$allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
$fileType = mime_content_type($_FILES['foto']['tmp_name']);

if (!in_array($fileType, $allowedTypes)) {
    echo json_encode(['success' => false, 'message' => 'Hanya file gambar yang diperbolehkan']);
    exit;
}

$maxSize = 5 * 1024 * 1024;
if ($_FILES['foto']['size'] > $maxSize) {
    echo json_encode(['success' => false, 'message' => 'Ukuran file maksimal 5MB']);
    exit;
}

$deskripsi = $_POST['deskripsi'] ?? '';
$type = $_POST['type'] ?? '';

$originalName = basename($_FILES['foto']['name']);
$fileExtension = pathinfo($originalName, PATHINFO_EXTENSION);

$cleanDeskripsi = preg_replace('/[^a-zA-Z0-9_-]/', '_', $deskripsi);
$cleanDeskripsi = substr($cleanDeskripsi, 0, 50);
$date = date('Y-m-d');
$time = time();
$newFileName = $type . '_' . $date . '_' . $cleanDeskripsi . '_' . $time . '.' . strtolower($fileExtension);

$uploadPath = $uploadDir . $newFileName;

if (move_uploaded_file($_FILES['foto']['tmp_name'], $uploadPath)) {
    $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'];
    $fileUrl = $protocol . '://' . $host . '/uploads/' . $newFileName;
    
    echo json_encode([
        'success' => true,
        'message' => 'File berhasil diupload',
        'fileName' => $newFileName,
        'fileUrl' => $fileUrl,
        'originalName' => $originalName
    ]);
} else {
    echo json_encode(['success' => false, 'message' => 'Gagal menyimpan file']);
}
?>