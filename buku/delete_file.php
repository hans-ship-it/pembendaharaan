<?php
// delete_photo.php - Untuk menghapus foto
header('Content-Type: application/json');

// Cek jika ada data JSON
$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['fileName'])) {
    echo json_encode(['success' => false, 'message' => 'Nama file tidak diberikan']);
    exit;
}

$fileName = basename($data['fileName']);
$filePath = 'uploads/' . $fileName;

// Cek jika file ada
if (file_exists($filePath)) {
    if (unlink($filePath)) {
        echo json_encode(['success' => true, 'message' => 'File berhasil dihapus']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Gagal menghapus file']);
    }
} else {
    echo json_encode(['success' => false, 'message' => 'File tidak ditemukan']);
}
?>