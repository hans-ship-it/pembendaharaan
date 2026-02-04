<?php
// api/get_photos.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$uploadDir = __DIR__ . '/../public/uploads/';
$photos = [];

if (is_dir($uploadDir)) {
    $files = array_diff(scandir($uploadDir), ['.', '..']);
    
    foreach ($files as $file) {
        $filePath = $uploadDir . $file;
        if (is_file($filePath)) {
            $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
            $host = $_SERVER['HTTP_HOST'];
            $fileUrl = $protocol . '://' . $host . '/uploads/' . $file;
            
            $photos[] = [
                'name' => $file,
                'size' => filesize($filePath),
                'url' => $fileUrl
            ];
        }
    }
}

echo json_encode($photos);
?>