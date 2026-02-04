<?php
// get_photos.php - Untuk mendapatkan daftar foto
header('Content-Type: application/json');

$uploadDir = 'uploads/';
$photos = [];

// Cek jika folder uploads ada
if (is_dir($uploadDir)) {
    $files = scandir($uploadDir);
    
    foreach ($files as $file) {
        if ($file !== '.' && $file !== '..' && is_file($uploadDir . $file)) {
            $filePath = $uploadDir . $file;
            $fileInfo = [
                'name' => $file,
                'size' => filesize($filePath),
                'modified' => date('Y-m-d H:i:s', filemtime($filePath)),
                'url' => $filePath
            ];
            
            $photos[] = $fileInfo;
        }
    }
}

echo json_encode($photos);
?>