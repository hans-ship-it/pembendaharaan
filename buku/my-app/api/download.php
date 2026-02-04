<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$uploadDir = __DIR__ . '/../public/uploads/';
$tempDir = __DIR__ . '/../temp/';

if (!is_dir($tempDir)) {
    mkdir($tempDir, 0755, true);
}

$action = $_GET['action'] ?? '';

if ($action === 'create_zip') {
    $zipFileName = 'laporan_keuangan_' . date('Y-m-d_H-i-s') . '.zip';
    $zipPath = $tempDir . $zipFileName;
    
    if (!class_exists('ZipArchive')) {
        echo json_encode(['success' => false, 'message' => 'Ekstensi ZIP tidak tersedia di server']);
        exit;
    }
    
    // Buat file CSV contoh
    $csvData = "TANGGAL,JENIS,DESKRIPSI,JUMLAH (Rp),BUKTI FOTO\n";
    $csvData .= date('Y-m-d') . ",PEMASUKAN,Contoh transaksi,100000,contoh.jpg\n";
    
    $csvFileName = 'laporan_keuangan_' . date('Y-m-d') . '.csv';
    $csvPath = $tempDir . $csvFileName;
    file_put_contents($csvPath, $csvData);
    
    $zip = new ZipArchive();
    if ($zip->open($zipPath, ZipArchive::CREATE) === TRUE) {
        $zip->addFile($csvPath, $csvFileName);
        
        if (is_dir($uploadDir)) {
            $fotoFiles = array_diff(scandir($uploadDir), ['.', '..']);
            foreach ($fotoFiles as $file) {
                $filePath = $uploadDir . $file;
                if (is_file($filePath)) {
                    $newName = renameFotoUntukZip($file);
                    $zip->addFile($filePath, 'foto_bukti/' . $newName);
                }
            }
        }
        
        $zip->close();
        unlink($csvPath);
        
        $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
        $host = $_SERVER['HTTP_HOST'];
        $downloadUrl = $protocol . '://' . $host . '/api/download.php?action=download_zip&file=' . urlencode($zipFileName);
        
        echo json_encode([
            'success' => true,
            'message' => 'File ZIP berhasil dibuat',
            'zipFile' => $zipFileName,
            'downloadUrl' => $downloadUrl
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Gagal membuat file ZIP']);
    }
    
} elseif ($action === 'download_zip') {
    $file = $_GET['file'] ?? '';
    $filePath = $tempDir . $file;
    
    if (file_exists($filePath)) {
        header('Content-Type: application/zip');
        header('Content-Disposition: attachment; filename="' . $file . '"');
        header('Content-Length: ' . filesize($filePath));
        readfile($filePath);
        unlink($filePath);
        exit;
    } else {
        echo 'File tidak ditemukan';
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Aksi tidak valid']);
}

function renameFotoUntukZip($originalName) {
    $parts = explode('_', $originalName);
    if (count($parts) >= 4) {
        $tanggal = $parts[1];
        $deskripsi = $parts[2];
        $lastPart = $parts[count($parts) - 1];
        $extension = pathinfo($lastPart, PATHINFO_EXTENSION);
        return $tanggal . '_' . $deskripsi . '.' . $extension;
    }
    return $originalName;
}
?>