<?php
// download.php - Untuk membuat dan mendownload ZIP
header('Content-Type: application/json');

// Pastikan folder uploads ada
$uploadDir = 'uploads/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

// Aksi yang diminta
$action = $_GET['action'] ?? '';

if ($action === 'create_zip') {
    // Buat file ZIP
    $zipFileName = 'laporan_keuangan_' . date('Y-m-d_H-i-s') . '.zip';
    $zipPath = 'temp/' . $zipFileName;
    
    // Buat folder temp jika belum ada
    if (!is_dir('temp')) {
        mkdir('temp', 0755, true);
    }
    
    // Buat file CSV terlebih dahulu
    $csvData = buatFileCSV();
    $csvFileName = 'laporan_keuangan_' . date('Y-m-d') . '.csv';
    $csvPath = 'temp/' . $csvFileName;
    file_put_contents($csvPath, $csvData);
    
    // Buat file ringkasan
    $summaryData = buatFileRingkasan();
    $summaryFileName = 'ringkasan_keuangan_' . date('Y-m-d') . '.txt';
    $summaryPath = 'temp/' . $summaryFileName;
    file_put_contents($summaryPath, $summaryData);
    
    // Buat ZIP
    $zip = new ZipArchive();
    if ($zip->open($zipPath, ZipArchive::CREATE) === TRUE) {
        // Tambahkan file CSV
        $zip->addFile($csvPath, $csvFileName);
        
        // Tambahkan file ringkasan
        $zip->addFile($summaryPath, $summaryFileName);
        
        // Tambahkan foto-foto dari folder uploads
        $fotoFiles = scandir($uploadDir);
        foreach ($fotoFiles as $file) {
            if ($file !== '.' && $file !== '..' && is_file($uploadDir . $file)) {
                // Beri nama yang lebih baik di dalam ZIP
                $newFotoName = renameFotoUntukZip($file);
                $zip->addFile($uploadDir . $file, 'foto_bukti/' . $newFotoName);
            }
        }
        
        $zip->close();
        
        echo json_encode([
            'success' => true,
            'message' => 'File ZIP berhasil dibuat',
            'zipFile' => $zipFileName,
            'fileCount' => count($fotoFiles) - 2 + 2 // foto + csv + summary
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Gagal membuat file ZIP']);
    }
    
    // Hapus file CSV dan ringkasan sementara
    unlink($csvPath);
    unlink($summaryPath);
    
} elseif ($action === 'download_zip') {
    // Download file ZIP
    $file = $_GET['file'] ?? '';
    $filePath = 'temp/' . $file;
    
    if (file_exists($filePath)) {
        header('Content-Type: application/zip');
        header('Content-Disposition: attachment; filename="' . $file . '"');
        header('Content-Length: ' . filesize($filePath));
        readfile($filePath);
        
        // Hapus file ZIP setelah didownload
        unlink($filePath);
        exit;
    } else {
        echo json_encode(['success' => false, 'message' => 'File ZIP tidak ditemukan']);
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Aksi tidak valid']);
}

// Fungsi untuk membuat file CSV
function buatFileCSV() {
    // Header CSV
    $csv = "TANGGAL,JENIS,DESKRIPSI,JUMLAH (Rp),BUKTI FOTO\n";
    
    // Untuk aplikasi nyata, ambil data dari database
    // Di sini kita buat contoh data
    $csv .= "2023-10-01,PEMASUKAN,Donasi acara,500000,donasi_acara.jpg\n";
    $csv .= "2023-10-02,PENGELUARAN,Pembelian alat tulis,75000,resi_alat_tulis.jpg\n";
    $csv .= "2023-10-03,IURAN,Iuran minggu ke-1,50000,\n";
    
    return $csv;
}

// Fungsi untuk membuat file ringkasan
function buatFileRingkasan() {
    $summary = "LAPORAN KEUANGAN\n";
    $summary .= "Tanggal Ekspor: " . date('d-m-Y H:i:s') . "\n";
    $summary .= "========================================\n\n";
    
    $summary .= "SALDO KAS: Rp 475.000\n";
    $summary .= "TOTAL PEMASUKAN: Rp 550.000\n";
    $summary .= "TOTAL PENGELUARAN: Rp 75.000\n\n";
    
    $summary .= "JUMLAH TRANSAKSI: 3\n";
    $summary .= "JUMLAH FOTO BUKTI: 2\n\n";
    
    $summary .= "CATATAN IURAN:\n";
    $summary .= "- Iuran per anggota: Rp 10.000/minggu\n";
    $summary .= "- Total anggota: 5 orang\n";
    $summary .= "- Sistem pencatatan per minggu\n\n";
    
    $summary .= "========================================\n";
    $summary .= "Catatan:\n";
    $summary .= "1. File ini berisi data keuangan yang diekspor dari sistem.\n";
    $summary .= "2. Foto bukti disimpan dalam folder 'foto_bukti' di dalam ZIP.\n";
    $summary .= "3. Nama file foto telah diubah agar lebih mudah dipahami.\n";
    
    return $summary;
}

// Fungsi untuk mengganti nama foto untuk ZIP
function renameFotoUntukZip($originalName) {
    // Contoh: pengeluaran_2023-10-02_Pembelian_alat_tulis_1696287600.jpg
    // Menjadi: 2023-10-02_Pembelian_alat_tulis.jpg
    
    $parts = explode('_', $originalName);
    
    if (count($parts) >= 4) {
        $jenis = $parts[0];
        $tanggal = $parts[1];
        $deskripsi = $parts[2];
        
        // Hapus timestamp di akhir
        $lastPart = $parts[count($parts) - 1];
        $extension = pathinfo($lastPart, PATHINFO_EXTENSION);
        
        // Gabungkan kembali
        $newName = $tanggal . '_' . $deskripsi . '.' . $extension;
        
        return $newName;
    }
    
    return $originalName;
}
?>