<?php
header('Content-Type: application/json');
echo json_encode([
    'status' => 'success',
    'message' => 'API Sistem Keuangan berjalan',
    'timestamp' => date('Y-m-d H:i:s'),
    'endpoints' => [
        '/api/upload.php' => 'Upload foto',
        '/api/download.php' => 'Download ZIP',
        '/api/delete_photo.php' => 'Hapus foto'
    ]
]);
?>