// Konfigurasi Firebase
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Inisialisasi Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();

// Data untuk simulasi (fallback ke localStorage jika Firebase gagal)
let transaksiData = JSON.parse(localStorage.getItem('transaksiData')) || [];
let iuranData = JSON.parse(localStorage.getItem('iuranData')) || [];
let useFirebase = false;

// Inisialisasi halaman
document.addEventListener('DOMContentLoaded', async function() {
    initDate();
    
    try {
        // Coba koneksi ke Firebase
        await db.collection('test').doc('test').get();
        useFirebase = true;
        console.log('Firebase terhubung');
        await loadDataFromFirebase();
    } catch (error) {
        console.log('Menggunakan localStorage:', error.message);
        await loadDataFromLocalStorage();
    }
    
    updateDashboard();
    
    // Event listeners
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            switchTab(tabId);
        });
    });
    
    document.getElementById('form-pemasukan').addEventListener('submit', handleFormSubmit);
    document.getElementById('form-pengeluaran').addEventListener('submit', handleFormSubmit);
    document.getElementById('form-iuran').addEventListener('submit', handleFormIuran);
    
    document.getElementById('filter-type').addEventListener('change', filterTransaksi);
    document.getElementById('export-google-sheet').addEventListener('click', exportToGoogleSheets);
    document.getElementById('export-zip').addEventListener('click', exportToZip);
    
    document.querySelector('.close').addEventListener('click', closeModal);
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('foto-modal');
        if (event.target === modal) {
            closeModal();
        }
    });
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
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
    
    document.querySelectorAll('.form').forEach(form => {
        form.classList.remove('active');
    });
    document.getElementById(`form-${tabId}`).classList.add('active');
}

// Handle submit form dengan Firebase Storage
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
    
    // Upload foto ke Firebase Storage jika ada
    if (fotoFile && fotoFile.size > 0) {
        try {
            const uploadResult = await uploadFotoToFirebase(fotoFile, deskripsi, type);
            fotoName = uploadResult.fileName;
            fotoUrl = uploadResult.downloadURL;
            showNotification('Foto berhasil diupload ke cloud', 'success');
        } catch (error) {
            console.error('Error uploading foto:', error);
            showNotification('Gagal mengupload foto: ' + error.message, 'error');
        }
    }
    
    // Simpan data transaksi
    const transaksi = {
        id: Date.now().toString(),
        type: type,
        deskripsi: deskripsi,
        jumlah: jumlah,
        tanggal: tanggal,
        fotoName: fotoName,
        fotoUrl: fotoUrl,
        createdAt: new Date().toISOString()
    };
    
    // Simpan ke Firebase atau localStorage
    if (useFirebase) {
        await saveTransaksiToFirebase(transaksi);
    } else {
        transaksiData.push(transaksi);
        saveToLocalStorage();
    }
    
    // Reset form
    form.reset();
    initDate();
    
    // Reload data
    await loadData();
    updateDashboard();
    
    showNotification(`${type === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran'} berhasil ditambahkan!`, 'success');
}

// Handle submit form iuran
async function handleFormIuran(e) {
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
        id: Date.now().toString(),
        minggu: parseInt(minggu),
        tanggal: tanggal,
        anggota: anggota,
        jumlahAnggota: jumlahAnggota,
        totalIuran: totalIuran,
        catatan: catatan,
        createdAt: new Date().toISOString()
    };
    
    // Juga simpan sebagai transaksi pemasukan
    const transaksi = {
        id: (Date.now() + 1).toString(),
        type: 'iuran',
        deskripsi: `Iuran minggu ke-${minggu} (${jumlahAnggota} anggota)`,
        jumlah: totalIuran,
        tanggal: tanggal,
        fotoName: null,
        fotoUrl: null,
        createdAt: new Date().toISOString(),
        iuranId: iuran.id
    };
    
    // Simpan ke Firebase atau localStorage
    if (useFirebase) {
        await saveIuranToFirebase(iuran);
        await saveTransaksiToFirebase(transaksi);
    } else {
        iuranData.push(iuran);
        transaksiData.push(transaksi);
        saveToLocalStorage();
    }
    
    // Reset form
    this.reset();
    initDate();
    
    // Reset checkbox anggota
    document.querySelectorAll('input[name="anggota[]"]').forEach(checkbox => {
        checkbox.checked = true;
    });
    
    // Reload data
    await loadData();
    updateDashboard();
    
    showNotification(`Iuran minggu ke-${minggu} berhasil dicatat! Total: Rp ${totalIuran.toLocaleString('id-ID')}`, 'success');
}

// Upload foto ke Firebase Storage
async function uploadFotoToFirebase(file, deskripsi, type) {
    return new Promise((resolve, reject) => {
        // Buat nama file unik
        const timestamp = Date.now();
        const cleanDeskripsi = deskripsi.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const fileName = `${type}_${timestamp}_${cleanDeskripsi}.${file.name.split('.').pop()}`;
        
        // Upload ke Firebase Storage
        const storageRef = storage.ref();
        const fotoRef = storageRef.child('bukti_transaksi/' + fileName);
        
        fotoRef.put(file).then((snapshot) => {
            snapshot.ref.getDownloadURL().then((downloadURL) => {
                resolve({
                    fileName: fileName,
                    downloadURL: downloadURL
                });
            }).catch(reject);
        }).catch(reject);
    });
}

// Simpan transaksi ke Firestore
async function saveTransaksiToFirebase(transaksi) {
    try {
        await db.collection('transaksi').doc(transaksi.id).set(transaksi);
        return true;
    } catch (error) {
        console.error('Error saving to Firebase:', error);
        throw error;
    }
}

// Simpan iuran ke Firestore
async function saveIuranToFirebase(iuran) {
    try {
        await db.collection('iuran').doc(iuran.id).set(iuran);
        return true;
    } catch (error) {
        console.error('Error saving to Firebase:', error);
        throw error;
    }
}

// Load data dari Firebase
async function loadDataFromFirebase() {
    try {
        // Load transaksi
        const transaksiSnapshot = await db.collection('transaksi').get();
        transaksiData = [];
        transaksiSnapshot.forEach(doc => {
            transaksiData.push(doc.data());
        });
        
        // Load iuran
        const iuranSnapshot = await db.collection('iuran').get();
        iuranData = [];
        iuranSnapshot.forEach(doc => {
            iuranData.push(doc.data());
        });
        
        loadTransaksi();
        loadIuran();
    } catch (error) {
        console.error('Error loading from Firebase:', error);
        throw error;
    }
}

// Load data dari localStorage
async function loadDataFromLocalStorage() {
    transaksiData = JSON.parse(localStorage.getItem('transaksiData')) || [];
    iuranData = JSON.parse(localStorage.getItem('iuranData')) || [];
    loadTransaksi();
    loadIuran();
}

// Load data (otomatis pilih sumber)
async function loadData() {
    if (useFirebase) {
        await loadDataFromFirebase();
    } else {
        await loadDataFromLocalStorage();
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
        if (transaksi.fotoUrl) {
            fotoButton = `<button class="foto-btn" onclick="viewFoto('${transaksi.fotoName}', '${transaksi.fotoUrl}')">
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
                <button class="delete-btn" onclick="deleteTransaksi('${transaksi.id}')">
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
        
        // Hapus foto dari Firebase Storage jika ada
        if (transaksi && transaksi.fotoUrl && useFirebase) {
            try {
                await deleteFotoFromFirebase(transaksi.fotoName);
            } catch (error) {
                console.error('Error deleting photo:', error);
            }
        }
        
        // Cari apakah ini transaksi iuran
        if (transaksi && transaksi.type === 'iuran' && transaksi.iuranId) {
            // Hapus juga data iuran terkait
            if (useFirebase) {
                await db.collection('iuran').doc(transaksi.iuranId).delete();
            } else {
                iuranData = iuranData.filter(i => i.id !== transaksi.iuranId);
            }
        }
        
        // Hapus transaksi
        if (useFirebase) {
            await db.collection('transaksi').doc(id).delete();
        } else {
            transaksiData = transaksiData.filter(t => t.id !== id);
            saveToLocalStorage();
        }
        
        // Reload data
        await loadData();
        updateDashboard();
        
        showNotification('Transaksi berhasil dihapus!', 'success');
    }
}

// Hapus foto dari Firebase Storage
async function deleteFotoFromFirebase(fileName) {
    try {
        const storageRef = storage.ref();
        const fotoRef = storageRef.child('bukti_transaksi/' + fileName);
        await fotoRef.delete();
        return { success: true };
    } catch (error) {
        console.error('Error deleting photo from Firebase:', error);
        throw error;
    }
}

// Lihat foto
function viewFoto(namaFile, fotoUrl) {
    const modal = document.getElementById('foto-modal');
    const container = document.getElementById('modal-foto-container');
    
    container.innerHTML = `
        <div style="text-align: center;">
            <p><strong>Nama file:</strong> ${namaFile}</p>
            <img src="${fotoUrl}" alt="Bukti Transaksi" style="max-width: 100%; max-height: 400px; border-radius: 5px; margin: 10px 0;" 
                 onerror="this.onerror=null; this.src='https://via.placeholder.com/600x400/3498db/ffffff?text=Foto+Tidak+Dapat+Dimuat'">
            <p class="info-text" style="margin-top: 15px; color: #666;">Foto bukti transaksi dari cloud storage.</p>
            <div style="margin-top: 20px;">
                <button onclick="downloadSinglePhoto('${namaFile}', '${fotoUrl}')" class="foto-btn" style="padding: 10px 20px; font-size: 16px;">
                    <i class="fas fa-download"></i> Download Foto Ini
                </button>
            </div>
        </div>
    `;
    
    modal.style.display = 'flex';
}

// Download foto tunggal
function downloadSinglePhoto(fileName, url) {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
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
    allData.push(['Jumlah Transaksi', '', '', transaksiData.length]);
    allData.push(['Jumlah Iuran Mingguan', '', '', iuranData.length]);
    
    // Konversi ke CSV
    const csvContent = allData.map(row => 
        row.map(cell => {
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

// Ekspor ke ZIP dengan foto (menggunakan JSZip di client-side)
async function exportToZip() {
    showNotification('Menyiapkan file ZIP dengan foto...', 'info');
    
    try {
        // Load JSZip dari CDN jika belum ada
        if (typeof JSZip === 'undefined') {
            await loadJSZip();
        }
        
        const zip = new JSZip();
        const folder = zip.folder("laporan_keuangan");
        
        // Buat file CSV
        const csvData = generateCSVData();
        folder.file("laporan.csv", csvData);
        
        // Buat file summary
        const summaryData = generateSummaryData();
        folder.file("ringkasan.txt", summaryData);
        
        // Tambahkan foto-foto dari Firebase Storage
        const fotoFolder = folder.folder("foto_bukti");
        const transaksiDenganFoto = transaksiData.filter(t => t.fotoUrl);
        
        if (transaksiDenganFoto.length > 0) {
            showNotification(`Mengunduh ${transaksiDenganFoto.length} foto...`, 'info');
            
            // Download dan tambahkan setiap foto
            for (const transaksi of transaksiDenganFoto) {
                try {
                    const response = await fetch(transaksi.fotoUrl);
                    const blob = await response.blob();
                    
                    // Buat nama file yang lebih baik
                    const cleanDeskripsi = transaksi.deskripsi.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                    const fileName = `${transaksi.tanggal}_${cleanDeskripsi}.${transaksi.fotoName.split('.').pop()}`;
                    
                    fotoFolder.file(fileName, blob);
                } catch (error) {
                    console.error('Error downloading foto:', error);
                }
            }
        }
        
        // Generate ZIP
        const zipBlob = await zip.generateAsync({ type: "blob" });
        
        // Download ZIP
        const link = document.createElement('a');
        const url = URL.createObjectURL(zipBlob);
        const fileName = `laporan_keuangan_${new Date().toISOString().split('T')[0]}.zip`;
        
        link.href = url;
        link.download = fileName;
        link.click();
        
        // Bersihkan
        URL.revokeObjectURL(url);
        
        showNotification(`File ZIP berhasil dibuat dengan ${transaksiDenganFoto.length} foto!`, 'success');
        
    } catch (error) {
        console.error('Error creating ZIP:', error);
        showNotification('Gagal membuat file ZIP: ' + error.message, 'error');
        
        // Fallback ke CSV saja
        setTimeout(() => {
            showNotification('Mengunduh file CSV sebagai alternatif...', 'info');
            exportToGoogleSheets();
        }, 2000);
    }
}

// Load JSZip dari CDN
async function loadJSZip() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Generate CSV data
function generateCSVData() {
    let csv = "TANGGAL,JENIS,DESKRIPSI,JUMLAH (Rp),BUKTI FOTO\n";
    
    transaksiData.forEach(t => {
        const jenis = t.type === 'pemasukan' ? 'PEMASUKAN' : 
                     t.type === 'pengeluaran' ? 'PENGELUARAN' : 'IURAN';
        csv += `${t.tanggal},${jenis},"${t.deskripsi}",${t.jumlah},${t.fotoName || '-'}\n`;
    });
    
    return csv;
}

// Generate summary data
function generateSummaryData() {
    const totalPemasukan = transaksiData
        .filter(t => t.type === 'pemasukan' || t.type === 'iuran')
        .reduce((sum, t) => sum + t.jumlah, 0);
    
    const totalPengeluaran = transaksiData
        .filter(t => t.type === 'pengeluaran')
        .reduce((sum, t) => sum + t.jumlah, 0);
    
    const saldo = totalPemasukan - totalPengeluaran;
    
    return `LAPORAN KEUANGAN
Tanggal Ekspor: ${new Date().toLocaleDateString('id-ID')}

SALDO KAS: Rp ${saldo.toLocaleString('id-ID')}
TOTAL PEMASUKAN: Rp ${totalPemasukan.toLocaleString('id-ID')}
TOTAL PENGELUARAN: Rp ${totalPengeluaran.toLocaleString('id-ID')}

JUMLAH TRANSAKSI: ${transaksiData.length}
JUMLAH FOTO BUKTI: ${transaksiData.filter(t => t.fotoUrl).length}
JUMLAH CATATAN IURAN: ${iuranData.length}

SISTEM IURAN:
- Iuran per anggota: Rp 10.000/minggu
- Total anggota: 5 orang
- Sistem pencatatan per minggu

Catatan:
1. File ini berisi data keuangan yang diekspor dari sistem.
2. Foto bukti disimpan dalam folder 'foto_bukti'.
3. Data tersimpan di cloud storage (Firebase).`;
}

// Tampilkan notifikasi
function showNotification(message, type) {
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 
                         type === 'error' ? 'exclamation-circle' : 
                         type === 'info' ? 'info-circle' : 
                         type === 'warning' ? 'exclamation-triangle' : 'bell'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
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
