<?php
// export.php - Untuk menangani ekspor data (simulasi)
header('Content-Type: application/json');

// Simulasi data untuk ekspor
$action = $_GET['action'] ?? '';

if ($action === 'csv') {
    // Ekspor ke CSV
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename=laporan_keuangan.csv');
    
    // Header CSV
    echo "Tanggal,Jenis,Deskripsi,Jumlah,Foto\n";
    
    // Data contoh
    echo "2023-10-01,Pemasukan,Donasi acara,500000,donasi.jpg\n";
    echo "2023-10-02,Pengeluaran,Pembelian alat tulis,75000,resi.jpg\n";
    echo "2023-10-03,Iuran,Iuran minggu ke-1,50000,\n";
    
    exit;
} elseif ($action === 'summary') {
    // Ringkasan data
    $data = [
        'saldo' => 475000,
        'total_pemasukan' => 550000,
        'total_pengeluaran' => 75000,
        'jumlah_transaksi' => 3
    ];
    
    echo json_encode($data);
} else {
    echo json_encode(['error' => 'Aksi tidak valid']);
}
?>