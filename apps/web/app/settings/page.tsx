'use client';

import { useState } from 'react';
import { Sidebar } from '@/ui/components/sidebar';
import { useAuditLogs } from '@/hooks/use-audit';
import { formatDate, apiPostMultipart } from '@/lib/api-client';
import { useSettings, useUpdateSettings } from '@/hooks/use-settings';
import { SettingsKeys } from '@/shared/constants';
import { toast } from 'sonner';
import type { AuditLog } from '@/shared/types';
import { Loader2, Settings, FileText, ChevronLeft, ChevronRight, Save } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useEffect } from 'react';

type Tab = 'GENERAL' | 'AUDIT_LOGS';

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState<Tab>('AUDIT_LOGS');

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <h1 className="page-title">
                        <Settings size={28} style={{ marginRight: 'var(--space-2)', verticalAlign: 'middle' }} />
                        Pengaturan
                    </h1>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200 mb-6">
                    <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                        <button
                            onClick={() => setActiveTab('GENERAL')}
                            className={`
                                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                                ${activeTab === 'GENERAL'
                                    ? 'border-primary-500 text-primary-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                            `}
                        >
                            Umum
                        </button>
                        <button
                            onClick={() => setActiveTab('AUDIT_LOGS')}
                            className={`
                                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                                ${activeTab === 'AUDIT_LOGS'
                                    ? 'border-primary-500 text-primary-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                            `}
                        >
                            Log Audit
                        </button>
                    </nav>
                </div>

                {/* Content */}
                {activeTab === 'GENERAL' && <GeneralSettings />}
                {activeTab === 'AUDIT_LOGS' && <AuditLogViewer />}

            </main>
        </div>
    );
}

function GeneralSettings() {
    const { data: settings, isLoading } = useSettings();
    const updateSettings = useUpdateSettings();
    const { register, handleSubmit, reset, setValue, watch } = useForm();

    // Local previews
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [letterheadPreview, setLetterheadPreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    // Watch invoice template for live preview
    const selectedTemplate = watch(SettingsKeys.INVOICE_TEMPLATE) || 'classic';
    const watchCompanyName = watch(SettingsKeys.COMPANY_NAME) || 'Nama Perusahaan';

    useEffect(() => {
        if (settings) {
            reset(settings);
            if (settings[SettingsKeys.COMPANY_LOGO]) setLogoPreview(settings[SettingsKeys.COMPANY_LOGO]);
            if (settings[SettingsKeys.COMPANY_LETTERHEAD]) setLetterheadPreview(settings[SettingsKeys.COMPANY_LETTERHEAD]);
        }
    }, [settings, reset]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, key: string, setPreview: (url: string | null) => void) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validations
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
        if (!allowedTypes.includes(file.type)) {
            toast.error('Jenis file tidak valid. Hanya PNG dan JPG yang diperbolehkan.');
            e.target.value = ''; // Reset input
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            toast.error('File terlalu besar. Ukuran maksimum adalah 2MB.');
            e.target.value = ''; // Reset input
            return;
        }

        // Create preview
        const objectUrl = URL.createObjectURL(file);
        setPreview(objectUrl);
        setValue(key + '_file', file);
    };

    const onSubmit = async (data: Record<string, unknown>) => {
        try {
            setUploading(true);

            // Upload Logo if new file selected
            const logoFile = data[SettingsKeys.COMPANY_LOGO + '_file'];
            if (logoFile) {
                const formData = new FormData();
                formData.append('file', logoFile as Blob);
                const res = await apiPostMultipart<{ url: string }>('/upload', formData);
                data[SettingsKeys.COMPANY_LOGO] = res.url;
            }

            // Upload Letterhead if new file selected
            const letterheadFile = data[SettingsKeys.COMPANY_LETTERHEAD + '_file'];
            if (letterheadFile) {
                const formData = new FormData();
                formData.append('file', letterheadFile as Blob);
                const res = await apiPostMultipart<{ url: string }>('/upload', formData);
                data[SettingsKeys.COMPANY_LETTERHEAD] = res.url;
            }

            // Clean up temporary file fields
            delete data[SettingsKeys.COMPANY_LOGO + '_file'];
            delete data[SettingsKeys.COMPANY_LETTERHEAD + '_file'];

            await updateSettings.mutateAsync(data as Record<string, string>);
            toast.success('Pengaturan berhasil diperbarui');
        } catch {
            toast.error('Gagal memperbarui pengaturan');
        } finally {
            setUploading(false);
        }
    };

    if (isLoading) return <div className="p-8"><Loader2 className="animate-spin" /></div>;

    const templateOptions = [
        {
            value: 'classic',
            label: 'Klasik',
            desc: 'Header tradisional dengan border ganda, layout terpusat',
            preview: (
                <div style={{ border: '1px solid #ccc', borderRadius: 4, padding: 8, background: '#fff', minHeight: 72 }}>
                    <div style={{ textAlign: 'center', borderBottom: '2px double #333', paddingBottom: 6, marginBottom: 4 }}>
                        <div style={{ fontWeight: 700, fontSize: 11 }}>{watchCompanyName}</div>
                        <div style={{ fontSize: 6, color: '#999' }}>Alamat • Telp • Email</div>
                        <div style={{ fontSize: 8, fontWeight: 600, marginTop: 4, letterSpacing: 1, color: '#444', textTransform: 'uppercase' as const }}>FAKTUR PENJUALAN</div>
                    </div>
                    <div style={{ fontSize: 5, color: '#aaa', display: 'flex', justifyContent: 'space-between' }}>
                        <span>No: INV/2026/001</span><span>Tgl: 10/02/2026</span>
                    </div>
                </div>
            ),
        },
        {
            value: 'modern',
            label: 'Modern',
            desc: 'Header dengan aksen warna dan gradient, terlihat profesional',
            preview: (
                <div style={{ border: '1px solid #ccc', borderRadius: 4, overflow: 'hidden', background: '#fff', minHeight: 72 }}>
                    <div style={{ background: 'linear-gradient(135deg, #1a56db, #3b82f6)', color: '#fff', padding: '6px 8px', fontSize: 7 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 10 }}>{watchCompanyName}</div>
                            </div>
                            <div style={{ textAlign: 'right', fontSize: 5, opacity: 0.9 }}>
                                <div>Alamat Perusahaan</div>
                                <div>Telp • Email</div>
                            </div>
                        </div>
                    </div>
                    <div style={{ padding: '4px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: 8, fontWeight: 700, color: '#1a56db' }}>FAKTUR PENJUALAN</div>
                        <div style={{ fontSize: 7, color: '#333' }}>#INV/2026/001</div>
                    </div>
                    <div style={{ height: 2, background: 'linear-gradient(to right, #1a56db, #93c5fd, transparent)' }}></div>
                </div>
            ),
        },
        {
            value: 'minimal',
            label: 'Minimal',
            desc: 'Tipografi bersih, layout rata kiri, elegan dan simpel',
            preview: (
                <div style={{ border: '1px solid #ccc', borderRadius: 4, padding: 8, background: '#fff', minHeight: 72 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e5e7eb', paddingBottom: 6 }}>
                        <div>
                            <div style={{ fontWeight: 600, fontSize: 10, color: '#111' }}>{watchCompanyName}</div>
                            <div style={{ fontSize: 5, color: '#888', marginTop: 2 }}>Alamat • Telp • Email</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 8, fontWeight: 700, color: '#111', textTransform: 'uppercase' as const }}>FAKTUR PENJUALAN</div>
                            <div style={{ fontSize: 7, color: '#555' }}>INV/2026/001</div>
                        </div>
                    </div>
                </div>
            ),
        },
    ];

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Company Info */}
            <div className="card_p4 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2">Informasi Perusahaan</h3>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Nama Perusahaan</label>
                        <input
                            type="text"
                            {...register(SettingsKeys.COMPANY_NAME)}
                            className="input mt-1 w-full"
                            placeholder="PT. Nama Perusahaan Anda"
                        />
                        <p className="text-xs text-gray-500 mt-1">Nama ini akan ditampilkan di header faktur dan dokumen cetak</p>
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Alamat Perusahaan</label>
                        <textarea
                            {...register(SettingsKeys.COMPANY_ADDRESS)}
                            className="input mt-1 w-full"
                            rows={2}
                            placeholder="Jl. Contoh No. 123, Kota, Provinsi, Kode Pos"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Nomor Telepon</label>
                        <input
                            type="text"
                            {...register(SettingsKeys.COMPANY_PHONE)}
                            className="input mt-1 w-full"
                            placeholder="(021) 1234567"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <input
                            type="email"
                            {...register(SettingsKeys.COMPANY_EMAIL)}
                            className="input mt-1 w-full"
                            placeholder="info@perusahaan.com"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">NPWP</label>
                        <input
                            type="text"
                            {...register(SettingsKeys.COMPANY_NPWP)}
                            className="input mt-1 w-full"
                            placeholder="00.000.000.0-000.000"
                        />
                    </div>
                </div>
            </div>

            {/* Branding */}
            <div className="card_p4 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2">Branding (Faktur & Dokumen)</h3>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Logo Perusahaan</label>
                        <div className="mt-1 flex items-center space-x-4">
                            <div className="flex-shrink-0 h-16 w-16 border rounded overflow-hidden bg-gray-50 flex items-center justify-center">
                                {logoPreview ? (
                                    <img src={logoPreview} alt="Logo" className="h-full w-full object-contain" />
                                ) : (
                                    <span className="text-xs text-gray-400">Tidak Ada Logo</span>
                                )}
                            </div>
                            <div>
                                <input
                                    type="file"
                                    accept=".png,.jpg,.jpeg"
                                    onChange={(e) => handleFileChange(e, SettingsKeys.COMPANY_LOGO, setLogoPreview)}
                                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                                />
                                <p className="text-xs text-gray-500 mt-1">PNG, JPG hingga 2MB</p>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Gambar Kop Surat</label>
                        <div className="mt-1 flex flex-col space-y-2">
                            {letterheadPreview && (
                                <div className="w-full h-24 border rounded overflow-hidden bg-gray-50 relative">
                                    <img src={letterheadPreview} alt="Letterhead" className="w-full h-full object-cover opacity-50" />
                                    <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-500 font-medium">Pratinjau</div>
                                </div>
                            )}
                            <input
                                type="file"
                                accept=".png,.jpg,.jpeg"
                                onChange={(e) => handleFileChange(e, SettingsKeys.COMPANY_LETTERHEAD, setLetterheadPreview)}
                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                            />
                            <p className="text-xs text-gray-500 mt-1">Gambar lebar penuh untuk latar belakang dokumen</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Invoice Header Settings */}
            <div className="card_p4 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-1 border-b pb-2">
                    <FileText size={18} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
                    Header Faktur
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                    Atur tampilan header pada faktur, tagihan, dan dokumen cetak lainnya.
                </p>

                {/* Template Selection */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">Pilih Template</label>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        {templateOptions.map((tpl) => (
                            <label
                                key={tpl.value}
                                className={`cursor-pointer rounded-lg border-2 p-3 transition-all hover:shadow-md ${selectedTemplate === tpl.value
                                    ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                                    : 'border-gray-200 bg-white hover:border-gray-300'
                                    }`}
                            >
                                <input
                                    type="radio"
                                    value={tpl.value}
                                    {...register(SettingsKeys.INVOICE_TEMPLATE)}
                                    className="sr-only"
                                />
                                <div className="mb-2">
                                    {tpl.preview}
                                </div>
                                <div className="text-sm font-semibold text-gray-900">{tpl.label}</div>
                                <div className="text-xs text-gray-500 mt-0.5">{tpl.desc}</div>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Signature Settings */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">Label Tanda Tangan</label>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Kolom Kiri</label>
                            <input type="text" {...register(SettingsKeys.INVOICE_SIGN_LEFT)} className="input w-full" placeholder="Dibuat Oleh" />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Kolom Kanan</label>
                            <input type="text" {...register(SettingsKeys.INVOICE_SIGN_RIGHT)} className="input w-full" placeholder="Diterima Oleh" />
                        </div>
                    </div>
                </div>

                {/* Bank Account Info */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">Informasi Rekening Bank</label>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Nama Bank</label>
                            <input type="text" {...register(SettingsKeys.COMPANY_BANK_NAME)} className="input w-full" placeholder="Bank BCA" />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">No. Rekening</label>
                            <input type="text" {...register(SettingsKeys.COMPANY_BANK_ACCOUNT)} className="input w-full" placeholder="1234567890" />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Atas Nama</label>
                            <input type="text" {...register(SettingsKeys.COMPANY_BANK_HOLDER)} className="input w-full" placeholder="PT. Nama Perusahaan" />
                        </div>
                    </div>
                </div>

                {/* Toggle Options */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">Opsi Tampilan</label>
                    <div className="space-y-3">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <select {...register(SettingsKeys.INVOICE_SHOW_LOGO)} className="input" style={{ width: 80 }}>
                                <option value="true">Ya</option>
                                <option value="false">Tidak</option>
                            </select>
                            <span className="text-sm text-gray-700">Tampilkan Logo Perusahaan di header faktur</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <select {...register(SettingsKeys.INVOICE_SHOW_BANK)} className="input" style={{ width: 80 }}>
                                <option value="true">Ya</option>
                                <option value="false">Tidak</option>
                            </select>
                            <span className="text-sm text-gray-700">Tampilkan Informasi Bank di faktur</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <select {...register(SettingsKeys.INVOICE_SHOW_SIGNATURE)} className="input" style={{ width: 80 }}>
                                <option value="true">Ya</option>
                                <option value="false">Tidak</option>
                            </select>
                            <span className="text-sm text-gray-700">Tampilkan Area Tanda Tangan di faktur</span>
                        </label>
                    </div>
                </div>

                {/* Invoice Footer */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Teks Footer Faktur</label>
                    <textarea
                        {...register(SettingsKeys.INVOICE_FOOTER)}
                        className="input mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        rows={3}
                        placeholder="Syarat Pembayaran, Detail Bank, Ucapan Terima Kasih, dll."
                    />
                </div>
            </div>

            {/* Document Numbering Formats */}
            <div className="card_p4 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2">Format Penomoran Dokumen</h3>
                <p className="text-sm text-gray-500 mb-4">
                    Gunakan placeholder: {'{YEAR}'}, {'{MONTH}'}, {'{YY}'}, {'{MM}'}, {'{SEQ}'} (nomor urut).
                    Contoh: INV/{'{YEAR}'}/{'{MONTH}'}/{'{SEQ}'}
                </p>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Faktur Penjualan</label>
                        <input type="text" {...register(SettingsKeys.FORMAT_SALES_INVOICE)} className="input mt-1 w-full" placeholder="INV/{YEAR}/{SEQ}" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Pembayaran Penjualan</label>
                        <input type="text" {...register(SettingsKeys.FORMAT_SALES_PAYMENT)} className="input mt-1 w-full" placeholder="PAY/{YEAR}/{SEQ}" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Nota Kredit</label>
                        <input type="text" {...register(SettingsKeys.FORMAT_SALES_CREDIT_NOTE)} className="input mt-1 w-full" placeholder="CN/{YEAR}/{SEQ}" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Tagihan Pembelian</label>
                        <input type="text" {...register(SettingsKeys.FORMAT_PURCHASE_BILL)} className="input mt-1 w-full" placeholder="BILL/{YEAR}/{SEQ}" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Pembayaran Pembelian</label>
                        <input type="text" {...register(SettingsKeys.FORMAT_PURCHASE_PAYMENT)} className="input mt-1 w-full" placeholder="OUT/{YEAR}/{SEQ}" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Penerimaan Pembelian</label>
                        <input type="text" {...register(SettingsKeys.FORMAT_PURCHASE_RECEIPT)} className="input mt-1 w-full" placeholder="GRN/{YEAR}/{SEQ}" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Penyesuaian Persediaan</label>
                        <input type="text" {...register(SettingsKeys.FORMAT_INVENTORY_ADJUSTMENT)} className="input mt-1 w-full" placeholder="ADJ/{YEAR}/{SEQ}" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Stok Opname</label>
                        <input type="text" {...register(SettingsKeys.FORMAT_INVENTORY_OPNAME)} className="input mt-1 w-full" placeholder="SO/{YEAR}/{SEQ}" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Entri Jurnal</label>
                        <input type="text" {...register(SettingsKeys.FORMAT_JOURNAL_ENTRY)} className="input mt-1 w-full" placeholder="JE/{YEAR}/{SEQ}" />
                    </div>
                </div>
            </div>

            <div className="flex justify-end">
                <button
                    type="submit"
                    disabled={updateSettings.isPending || uploading}
                    className="btn btn-primary flex items-center gap-2"
                >
                    {uploading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                    {uploading ? 'Mengunggah...' : (updateSettings.isPending ? 'Menyimpan...' : 'Simpan Pengaturan')}
                </button>
            </div>
        </form>
    );
}

function AuditLogViewer() {
    const [page, setPage] = useState(1);
    const limit = 20;

    const { data, isLoading } = useAuditLogs({ page, limit });

    const totalPages = data?.meta?.totalPages || 1;

    return (
        <div className="card_p0 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Log Aktivitas Sistem</h3>
                <div className="text-sm text-gray-500">
                    Lacak semua perubahan dan akses sistem
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="animate-spin text-primary-500" size={32} />
                </div>
            ) : !data?.data || data.data.length === 0 ? (
                <div className="text-center p-12 text-gray-500">
                    Tidak ada log aktivitas ditemukan.
                </div>
            ) : (
                <>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Tanggal & Waktu
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Pengguna
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Tindakan
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Entitas
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Detail
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {data.data.map((log: AuditLog) => (
                                    <tr key={log.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {formatDate(log.occurredAt)}
                                            <div className="text-xs text-gray-400 mt-1">
                                                {new Date(log.occurredAt).toLocaleTimeString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {log.actorName || `Pengguna #${log.actorUserId}`}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <span className={`
                                            px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                            ${log.action === 'CREATE' ? 'bg-green-100 text-green-800' :
                                                    log.action === 'UPDATE' ? 'bg-blue-100 text-blue-800' :
                                                        log.action === 'DELETE' ? 'bg-red-100 text-red-800' :
                                                            'bg-gray-100 text-gray-800'}
                                        `}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {log.entityType} #{log.entityId}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                                            {/* Display specific details based on entity type or json */}
                                            {log.afterJson ? (
                                                <span title={log.afterJson} className="cursor-help border-b border-dotted border-gray-400">
                                                    Lihat Perubahan
                                                </span>
                                            ) : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                        <div className="text-sm text-gray-500">
                            Halaman {page} dari {totalPages}
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-2 border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="p-2 border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

