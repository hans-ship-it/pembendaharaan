<?php
// process.php - Untuk menangani pengiriman form (simulasi)
header('Content-Type: application/json');

// Simulasi penerimaan data dari form
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $type = $_POST['type'] ?? '';
    $deskripsi = $_POST['deskripsi'] ?? '';
    $jumlah = $_POST['jumlah'] ?? 0;
    $tanggal = $_POST['tanggal'] ?? '';
    
    // Simulasi upload file
    $fotoName = '';
    if (isset($_FILES['foto']) && $_FILES['foto']['error'] === UPLOAD_ERR_OK) {
        // Dalam aplikasi nyata, file akan disimpan di folder uploads/
        $fotoName = basename($_FILES['foto']['name']);
        // Simpan file ke folder uploads (pastikan folder uploads ada dan writable)
        // move_uploaded_file($_FILES['foto']['tmp_name'], 'uploads/' . $fotoName);
    }
    
    // Simpan data ke file JSON atau database
    // Untuk saat ini, kita hanya mengembalikan respons sukses
    $response = [
        'success' => true,
        'message' => 'Data berhasil disimpan',
        'data' => [
            'type' => $type,
            'deskripsi' => $deskripsi,
            'jumlah' => $jumlah,
            'tanggal' => $tanggal,
            'fotoName' => $fotoName
        ]
    ];
    
    echo json_encode($response);
} else {
    echo json_encode(['success' => false, 'message' => 'Metode request tidak valid']);
}
?>