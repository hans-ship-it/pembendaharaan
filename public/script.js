// Data contoh untuk simulasi
let transaksiData = JSON.parse(localStorage.getItem('transaksiData')) || [];
let iuranData = JSON.parse(localStorage.getItem('iuranData')) || [];
let currentDomain = window.location.origin;

// Inisialisasi halaman
document.addEventListener('DOMContentLoaded', function() {
    initDate();
    loadTransaksi();
    loadIuran();
    updateDashboard();
    
    // Event listeners untuk tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            switchTab(tabId);
        });
    });
    
    // Event listeners untuk form
    document.getElementById('form-pemasukan').addEventListener('submit', handleFormSubmit);
    document.getElementById('form-pengeluaran').addEventListener('submit', handleFormSubmit);
    document.getElementById('form-iuran').addEventListener('submit', handleFormIuran);
    
    // Event listener untuk filter
    document.getElementById('filter-type').addEventListener('change', filterTransaksi);
    
    // Event listeners untuk ekspor
    document.getElementById('export-google-sheet').addEventListener('click', exportToGoogleSheets);
    document.getElementById('export-zip').addEventListener('click', exportToZip);
    
    // Event listener untuk modal
    document.querySelector('.close').addEventListener('click', closeModal);
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('foto-modal');
        if (event.target === modal) {
            closeModal();
        }
    });
    
    // Test koneksi ke API
    testApiConnection();
});

// Inisialisasi tanggal input
function initDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('pemasukan-tanggal').value = today;
    document.getElementById('pengeluaran-tanggal').value = today;
    document.getElementById('iuran-tanggal').value = today;
}

// Fungsi untuk beralih tab
function switchTab(tabId) {
    // Update tab aktif
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
    
    // Update form aktif
    document.querySelectorAll('.form').forEach(form => {
        form.classList.remove('active');
    });
    document.getElementById(`form-${tabId}`).classList.add('active');
}

// Handle submit form pemasukan/pengeluaran dengan upload foto
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const form = this;
    const formData = new FormData(form);
    const type = formData.get('type');
    const deskripsi = formData.get('deskripsi');
    const jumlah = parseInt(formData.get('jumlah'));
    const tanggal = formData.get('tanggal');
    const fotoFile = formData.get('foto');
    
    let fotoName = null;
    let fotoUrl = null;
    
    // Upload foto jika ada
    if (fotoFile && fotoFile.size > 0) {
        try {
            const uploadResult = await uploadFoto(fotoFile, deskripsi, type);
            if (uploadResult.success) {
                fotoName = uploadResult.fileName;
                fotoUrl = uploadResult.fileUrl;
                showNotification('Foto berhasil diupload', 'success');
            } else {
                showNotification('Gagal mengupload foto: ' + uploadResult.message, 'error');
                // Lanjutkan tanpa foto
            }
        } catch (error) {
            console.error('Error uploading foto:', error);
            showNotification('Gagal mengupload foto: ' + error.message, 'error');
            // Lanjutkan tanpa foto
        }
    }
    
    // Simpan data transaksi
    const transaksi = {
        id: Date.now(),
        type: type,
        deskripsi: deskripsi,
        jumlah: jumlah,
        tanggal: tanggal,
        fotoName: fotoName,
        fotoUrl: fotoUrl,
        createdAt: new Date().toISOString()
    };
    
    transaksiData.push(transaksi);
    saveToLocalStorage();
    
    // Reset form
    form.reset();
    initDate();
    
    // Reload data
    loadTransaksi();
    updateDashboard();
    
    // Tampilkan notifikasi
    showNotification(`${type === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran'} berhasil ditambahkan!`, 'success');
}

// Handle submit form iuran
function handleFormIuran(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const minggu = formData.get('minggu');
    const tanggal = formData.get('tanggal');
    const catatan = formData.get('catatan');
    const anggota = formData.getAll('anggota[]');
    
    // Hitung total iuran
    const jumlahAnggota = anggota.length;
    const totalIuran = jumlahAnggota * 10000;
    
    // Simpan data iuran
    const iuran = {
        id: Date.now(),
        minggu: parseInt(minggu),
        tanggal: tanggal,
        anggota: anggota,
        jumlahAnggota: jumlahAnggota,
        totalIuran: totalIuran,
        catatan: catatan,
        createdAt: new Date().toISOString()
    };
    
    iuranData.push(iuran);
    saveToLocalStorage();
    
    // Juga simpan sebagai transaksi pemasukan
    const transaksi = {
        id: Date.now() + 1,
        type: 'iuran',
        deskripsi: `Iuran minggu ke-${minggu} (${jumlahAnggota} anggota)`,
        jumlah: totalIuran,
        tanggal: tanggal,
        fotoName: null,
        fotoUrl: null,
        createdAt: new Date().toISOString(),
        iuranId: iuran.id
    };
    
    transaksiData.push(transaksi);
    saveToLocalStorage();
    
    // Reset form
    this.reset();
    initDate();
    
    // Reset checkbox anggota
    document.querySelectorAll('input[name="anggota[]"]').forEach(checkbox => {
        checkbox.checked = true;
    });
    
    // Reload data
    loadTransaksi();
    loadIuran();
    updateDashboard();
    
    // Tampilkan notifikasi
    showNotification(`Iuran minggu ke-${minggu} berhasil dicatat! Total: Rp ${totalIuran.toLocaleString('id-ID')}`, 'success');
}

// Upload foto ke server Vercel
async function uploadFoto(file, deskripsi, type) {
    const formData = new FormData();
    formData.append('foto', file);
    formData.append('deskripsi', deskripsi);
    formData.append('type', type);
    
    try {
        // Gunakan path /api/upload.php untuk Vercel
        const response = await fetch('/api/upload.php', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Upload error:', error);
        return { 
            success: false, 
            message: 'Gagal terhubung ke server. Pastikan Anda telah mengupload file PHP ke folder /api/' 
        };
    }
}

// Load data transaksi ke tabel
function loadTransaksi() {
    const tbody = document.getElementById('transaksi-body');
    tbody.innerHTML = '';
    
    // Urutkan berdasarkan tanggal (terbaru dulu)
    const sortedData = [...transaksiData].sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
    
    if (sortedData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 30px;">
                    <i class="fas fa-inbox" style="font-size: 2rem; color: #ddd; margin-bottom: 10px; display: block;"></i>
                    <p>Belum ada transaksi. Tambahkan transaksi pertama Anda!</p>
                </td>
            </tr>
        `;
        return;
    }
    
    sortedData.forEach(transaksi => {
        const row = document.createElement('tr');
        
        // Format tanggal
        const dateObj = new Date(transaksi.tanggal);
        const formattedDate = dateObj.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
        
        // Tentukan badge berdasarkan jenis
        let badgeClass = '';
        let badgeText = '';
        
        if (transaksi.type === 'pemasukan') {
            badgeClass = 'pemasukan';
            badgeText = 'Pemasukan';
        } else if (transaksi.type === 'pengeluaran') {
            badgeClass = 'pengeluaran';
            badgeText = 'Pengeluaran';
        } else if (transaksi.type === 'iuran') {
            badgeClass = 'iuran';
            badgeText = 'Iuran';
        }
        
        // Format jumlah
        const formattedJumlah = new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(transaksi.jumlah);
        
        // Tombol foto
        let fotoButton = '<button class="foto-btn" disabled><i class="fas fa-image"></i> Tidak ada</button>';
        if (transaksi.fotoName) {
            fotoButton = `<button class="foto-btn" onclick="viewFoto('${transaksi.fotoName}', '${transaksi.fotoUrl || ''}')">
                <i class="fas fa-image"></i> Lihat
            </button>`;
        }
        
        row.innerHTML = `
            <td>${formattedDate}</td>
            <td><span class="badge ${badgeClass}">${badgeText}</span></td>
            <td>${transaksi.deskripsi}</td>
            <td>${formattedJumlah}</td>
            <td>${fotoButton}</td>
            <td>
                <button class="delete-btn" onclick="deleteTransaksi(${transaksi.id})">
                    <i class="fas fa-trash"></i> Hapus
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// Load data iuran ke tabel
function loadIuran() {
    const tbody = document.getElementById('iuran-body');
    tbody.innerHTML = '';
    
    // Urutkan berdasarkan minggu
    const sortedData = [...iuranData].sort((a, b) => a.minggu - b.minggu);
    
    if (sortedData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 20px;">
                    <i class="fas fa-users" style="font-size: 1.5rem; color: #ddd; margin-bottom: 10px; display: block;"></i>
                    <p>Belum ada catatan iuran.</p>
                </td>
            </tr>
        `;
        return;
    }
    
    sortedData.forEach(iuran => {
        const row = document.createElement('tr');
        
        // Format tanggal
        const dateObj = new Date(iuran.tanggal);
        const formattedDate = dateObj.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
        
        // Format jumlah
        const formattedJumlah = new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(iuran.totalIuran);
        
        // List anggota yang membayar
        const anggotaList = iuran.anggota.join(', ');
        
        row.innerHTML = `
            <td>Minggu ke-${iuran.minggu}</td>
            <td>${formattedDate}</td>
            <td>${iuran.jumlahAnggota} dari 5 anggota<br><small>${anggotaList}</small></td>
            <td>${formattedJumlah}</td>
            <td>${iuran.catatan || '-'}</td>
        `;
        
        tbody.appendChild(row);
    });
}

// Filter transaksi berdasarkan jenis
function filterTransaksi() {
    const filterValue = document.getElementById('filter-type').value;
    const rows = document.querySelectorAll('#transaksi-body tr');
    
    rows.forEach(row => {
        if (filterValue === 'semua') {
            row.style.display = '';
        } else {
            const badgeType = row.querySelector('.badge').textContent.toLowerCase();
            if (badgeType.includes(filterValue)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        }
    });
}

// Update dashboard dengan total
function updateDashboard() {
    // Hitung total pemasukan
    const totalPemasukan = transaksiData
        .filter(t => t.type === 'pemasukan' || t.type === 'iuran')
        .reduce((sum, t) => sum + t.jumlah, 0);
    
    // Hitung total pengeluaran
    const totalPengeluaran = transaksiData
        .filter(t => t.type === 'pengeluaran')
        .reduce((sum, t) => sum + t.jumlah, 0);
    
    // Hitung saldo
    const saldo = totalPemasukan - totalPengeluaran;
    
    // Update tampilan
    document.getElementById('total-pemasukan').textContent = formatRupiah(totalPemasukan);
    document.getElementById('total-pengeluaran').textContent = formatRupiah(totalPengeluaran);
    document.getElementById('saldo').textContent = formatRupiah(saldo);
}

// Format angka ke Rupiah
function formatRupiah(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
}

// Simpan data ke localStorage
function saveToLocalStorage() {
    localStorage.setItem('transaksiData', JSON.stringify(transaksiData));
    localStorage.setItem('iuranData', JSON.stringify(iuranData));
}

// Hapus transaksi
async function deleteTransaksi(id) {
    if (confirm('Apakah Anda yakin ingin menghapus transaksi ini?')) {
        // Cari transaksi
        const transaksi = transaksiData.find(t => t.id === id);
        
        // Hapus foto dari server jika ada
        if (transaksi && transaksi.fotoName) {
            try {
                await deleteFoto(transaksi.fotoName);
                showNotification('Foto berhasil dihapus dari server', 'info');
            } catch (error) {
                console.error('Error deleting photo:', error);
                showNotification('Gagal menghapus foto dari server', 'error');
            }
        }
        
        // Cari apakah ini transaksi iuran
        if (transaksi && transaksi.type === 'iuran' && transaksi.iuranId) {
            // Hapus juga data iuran terkait
            iuranData = iuranData.filter(i => i.id !== transaksi.iuranId);
        }
        
        // Hapus transaksi
        transaksiData = transaksiData.filter(t => t.id !== id);
        saveToLocalStorage();
        
        // Reload data
        loadTransaksi();
        loadIuran();
        updateDashboard();
        
        // Tampilkan notifikasi
        showNotification('Transaksi berhasil dihapus!', 'success');
    }
}

// Hapus foto dari server
async function deleteFoto(fileName) {
    try {
        const response = await fetch('/api/delete_photo.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ fileName: fileName })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Delete photo error:', error);
        throw error;
    }
}

// Lihat foto (yang sebenarnya)
function viewFoto(namaFile, fotoUrl) {
    const modal = document.getElementById('foto-modal');
    const container = document.getElementById('modal-foto-container');
    
    // Gunakan URL yang disimpan atau buat URL baru
    const photoUrl = fotoUrl || `/uploads/${encodeURIComponent(namaFile)}`;
    
    container.innerHTML = `
        <div style="text-align: center;">
            <p><strong>Nama file:</strong> ${namaFile}</p>
            <img src="${photoUrl}" alt="Bukti Transaksi" style="max-width: 100%; max-height: 400px; border-radius: 5px; margin: 10px 0;" 
                 onerror="this.onerror=null; this.src='https://via.placeholder.com/600x400/3498db/ffffff?text=Foto+Tidak+Ditemukan'">
            <p class="info-text" style="margin-top: 15px; color: #666;">Foto bukti transaksi.</p>
            <div style="margin-top: 20px;">
                <button onclick="downloadSinglePhoto('${namaFile}')" class="foto-btn" style="padding: 10px 20px; font-size: 16px;">
                    <i class="fas fa-download"></i> Download Foto Ini
                </button>
            </div>
        </div>
    `;
    
    modal.style.display = 'flex';
}

// Download foto tunggal
function downloadSinglePhoto(fileName) {
    // Coba beberapa path yang mungkin
    const possiblePaths = [
        `/uploads/${encodeURIComponent(fileName)}`,
        `${currentDomain}/uploads/${encodeURIComponent(fileName)}`,
        fileName.startsWith('http') ? fileName : `${currentDomain}/api/get_photo.php?file=${encodeURIComponent(fileName)}`
    ];
    
    const link = document.createElement('a');
    link.download = fileName;
    
    // Coba path pertama
    link.href = possiblePaths[0];
    link.click();
    
    // Fallback: buka di tab baru jika tidak berhasil
    setTimeout(() => {
        window.open(possiblePaths[1], '_blank');
    }, 100);
}

// Tutup modal
function closeModal() {
    document.getElementById('foto-modal').style.display = 'none';
}

// Ekspor ke Google Sheets (CSV)
function exportToGoogleSheets() {
    // Gabungkan data transaksi dan iuran
    const allData = [];
    
    // Header untuk transaksi
    allData.push(['TANGGAL', 'JENIS', 'DESKRIPSI', 'JUMLAH (Rp)', 'BUKTI FOTO']);
    
    // Data transaksi
    transaksiData.forEach(t => {
        const jenis = t.type === 'pemasukan' ? 'PEMASUKAN' : 
                     t.type === 'pengeluaran' ? 'PENGELUARAN' : 'IURAN';
        allData.push([t.tanggal, jenis, t.deskripsi, t.jumlah, t.fotoName || '-']);
    });
    
    // Tambahkan baris kosong
    allData.push([]);
    
    // Header untuk iuran
    allData.push(['MINGGU KE-', 'TANGGAL IURAN', 'JUMLAH ANGGOTA', 'TOTAL IURAN (Rp)', 'ANGGOTA YANG BAYAR', 'CATATAN']);
    
    // Data iuran
    iuranData.forEach(i => {
        allData.push([
            i.minggu, 
            i.tanggal, 
            i.jumlahAnggota, 
            i.totalIuran, 
            i.anggota.join(', '), 
            i.catatan || '-'
        ]);
    });
    
    // Tambahkan summary
    const totalPemasukan = transaksiData
        .filter(t => t.type === 'pemasukan' || t.type === 'iuran')
        .reduce((sum, t) => sum + t.jumlah, 0);
    
    const totalPengeluaran = transaksiData
        .filter(t => t.type === 'pengeluaran')
        .reduce((sum, t) => sum + t.jumlah, 0);
    
    const saldo = totalPemasukan - totalPengeluaran;
    
    allData.push([]);
    allData.push(['SUMMARY', '', '', '']);
    allData.push(['Saldo Kas', '', '', formatRupiah(saldo).replace('Rp', '').trim()]);
    allData.push(['Total Pemasukan', '', '', formatRupiah(totalPemasukan).replace('Rp', '').trim()]);
    allData.push(['Total Pengeluaran', '', '', formatRupiah(totalPengeluaran).replace('Rp', '').trim()]);
    
    // Konversi ke CSV
    const csvContent = allData.map(row => 
        row.map(cell => {
            // Escape quotes dan wrap dalam quotes jika mengandung koma
            const cellStr = String(cell);
            if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                return '"' + cellStr.replace(/"/g, '""') + '"';
            }
            return cellStr;
        }).join(',')
    ).join('\n');
    
    // Buat blob dan unduh
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `laporan_keuangan_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('File CSV berhasil diunduh. Impor ke Google Sheets untuk melihat data.', 'success');
}

// Ekspor ke ZIP dengan foto
async function exportToZip() {
    showNotification('Menyiapkan file ZIP dengan foto...', 'info');
    
    try {
        // Panggil API untuk membuat ZIP
        const response = await fetch('/api/download.php?action=create_zip');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            // Download file ZIP
            const link = document.createElement('a');
            link.href = result.downloadUrl;
            link.download = result.zipFile;
            
            // Tambahkan event listener untuk mengetahui kapan download selesai
            link.addEventListener('click', () => {
                setTimeout(() => {
                    showNotification('File ZIP berhasil dibuat dan diunduh!', 'success');
                }, 1000);
            });
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
        } else {
            showNotification('Gagal membuat file ZIP: ' + result.message, 'error');
            
            // Fallback: unduh CSV saja
            setTimeout(() => {
                if (confirm('Gagal membuat ZIP. Ingin mengunduh file CSV saja?')) {
                    exportToGoogleSheets();
                }
            }, 1000);
        }
    } catch (error) {
        console.error('Export ZIP error:', error);
        showNotification('Gagal membuat file ZIP. Server PHP mungkin tidak tersedia.', 'error');
        
        // Fallback otomatis ke CSV
        setTimeout(() => {
            showNotification('Mengunduh file CSV sebagai alternatif...', 'info');
            exportToGoogleSheets();
        }, 2000);
    }
}

// Test koneksi ke API
async function testApiConnection() {
    try {
        const response = await fetch('/api/');
        if (response.ok) {
            console.log('API terhubung dengan baik');
        } else {
            console.warn('API tidak merespons dengan baik');
            showNotification('Server PHP tidak aktif. Fitur upload foto dan ZIP mungkin tidak berfungsi.', 'warning');
        }
    } catch (error) {
        console.warn('Tidak dapat terhubung ke API:', error);
        // Tidak perlu menampilkan notifikasi karena mungkin dijalankan secara lokal
    }
}

// Tampilkan notifikasi
function showNotification(message, type) {
    // Hapus notifikasi sebelumnya jika ada
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Buat elemen notifikasi
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 
                         type === 'error' ? 'exclamation-circle' : 
                         type === 'info' ? 'info-circle' : 
                         type === 'warning' ? 'exclamation-triangle' : 'bell'}"></i>
        <span>${message}</span>
    `;
    
    // Tambahkan ke body
    document.body.appendChild(notification);
    
    // Tampilkan
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Sembunyikan setelah beberapa detik
    let duration = 3000;
    if (type === 'info') duration = 4000;
    if (type === 'warning') duration = 5000;
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, duration);
    
    // Tambahkan style untuk notifikasi jika belum ada
    if (!document.querySelector('#notification-style')) {
        const style = document.createElement('style');
        style.id = 'notification-style';
        style.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                border-radius: 5px;
                color: white;
                font-weight: 600;
                box-shadow: 0 5px 15px rgba(0,0,0,0.1);
                z-index: 10000;
                transform: translateX(100%);
                opacity: 0;
                transition: transform 0.3s, opacity 0.3s;
                display: flex;
                align-items: center;
                max-width: 400px;
            }
            .notification.show {
                transform: translateX(0);
                opacity: 1;
            }
            .notification.success {
                background: #2ecc71;
            }
            .notification.error {
                background: #e74c3c;
            }
            .notification.info {
                background: #3498db;
            }
            .notification.warning {
                background: #f39c12;
            }
            .notification i {
                margin-right: 10px;
                font-size: 1.2rem;
            }
        `;
        document.head.appendChild(style);
    }
}

// Fungsi tambahan untuk debugging
function debugInfo() {
    console.log('Transaksi Data:', transaksiData);
    console.log('Iuran Data:', iuranData);
    console.log('Current Domain:', currentDomain);
    console.log('LocalStorage transaksiData:', localStorage.getItem('transaksiData'));
    console.log('LocalStorage iuranData:', localStorage.getItem('iuranData'));
}

// Fungsi untuk reset data (hanya untuk development)
function resetAllData() {
    if (confirm('Yakin ingin menghapus semua data? Ini tidak dapat dibatalkan!')) {
        localStorage.removeItem('transaksiData');
        localStorage.removeItem('iuranData');
        transaksiData = [];
        iuranData = [];
        loadTransaksi();
        loadIuran();
        updateDashboard();
        showNotification('Semua data telah direset', 'info');
    }
}

// Tambahkan tombol debug untuk development (opsional)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    document.addEventListener('DOMContentLoaded', function() {
        const debugBtn = document.createElement('button');
        debugBtn.textContent = 'Debug Info';
        debugBtn.style.position = 'fixed';
        debugBtn.style.bottom = '10px';
        debugBtn.style.right = '10px';
        debugBtn.style.zIndex = '9999';
        debugBtn.style.padding = '5px 10px';
        debugBtn.style.backgroundColor = '#333';
        debugBtn.style.color = 'white';
        debugBtn.style.border = 'none';
        debugBtn.style.borderRadius = '3px';
        debugBtn.style.cursor = 'pointer';
        debugBtn.onclick = debugInfo;
        
        const resetBtn = document.createElement('button');
        resetBtn.textContent = 'Reset Data';
        resetBtn.style.position = 'fixed';
        resetBtn.style.bottom = '40px';
        resetBtn.style.right = '10px';
        resetBtn.style.zIndex = '9999';
        resetBtn.style.padding = '5px 10px';
        resetBtn.style.backgroundColor = '#e74c3c';
        resetBtn.style.color = 'white';
        resetBtn.style.border = 'none';
        resetBtn.style.borderRadius = '3px';
        resetBtn.style.cursor = 'pointer';
        resetBtn.onclick = resetAllData;
        
        document.body.appendChild(debugBtn);
        document.body.appendChild(resetBtn);
    });
}
