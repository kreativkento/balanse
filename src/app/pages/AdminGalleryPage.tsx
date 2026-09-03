import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Images, Plus, Pencil, Trash2, X, Check, Search, Tag, Upload } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { CARD_HOVER_GROW, ICON_HOVER_GROW, IMAGE_HOVER_ZOOM } from '../../lib/motion-classes';

// ── Types & Data ───────────────────────────────────────────────

type Category = 'Studio' | 'Classes' | 'Events' | 'Community';

interface GalleryPhoto {
  id: number;
  url: string;
  caption: string;
  category: Category;
  taggedStudents: string[];
  uploadedAt: string;
  uploadedBy: string;
  tall: boolean;
}

const INITIAL_PHOTOS: GalleryPhoto[] = [
  { id: 1,  url: 'https://images.unsplash.com/photo-1761971975973-cbb3e59263de?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',  caption: 'Morning light in Studio 1',                 category: 'Studio',    taggedStudents: [],                   uploadedAt: 'Apr 6, 2026',  uploadedBy: 'Studio Admin', tall: true  },
  { id: 2,  url: 'https://images.unsplash.com/photo-1767611120077-3697335ec748?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',  caption: 'Yoga Morning Session with Coach Jodi',      category: 'Classes',   taggedStudents: ['Alex Johnson', 'Sofia Reyes'],     uploadedAt: 'Apr 7, 2026',  uploadedBy: 'Studio Admin', tall: false },
  { id: 3,  url: 'https://images.unsplash.com/photo-1637157216470-d92cd2edb2e8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',  caption: 'Mat Pilates – Core Control',                category: 'Classes',   taggedStudents: ['Maria Santos'],              uploadedAt: 'Apr 6, 2026',  uploadedBy: 'Studio Admin', tall: false },
  { id: 4,  url: 'https://images.unsplash.com/photo-1699378281595-0d75e9e6a05a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',  caption: 'The serene reception lounge',               category: 'Studio',    taggedStudents: [],                   uploadedAt: 'Apr 5, 2026',  uploadedBy: 'Studio Admin', tall: true  },
  { id: 5,  url: 'https://images.unsplash.com/photo-1686133368810-24f662f65cad?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',  caption: 'Kickboxing power with Coach Wolf',          category: 'Classes',   taggedStudents: ['Ryan Bautista'],             uploadedAt: 'Apr 4, 2026',  uploadedBy: 'Studio Admin', tall: false },
  { id: 6,  url: 'https://images.unsplash.com/photo-1759352856072-985a4ddab82d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',  caption: 'Capoeira – Art in Motion',                  category: 'Events',    taggedStudents: [],                   uploadedAt: 'Apr 3, 2026',  uploadedBy: 'Studio Admin', tall: false },
  { id: 7,  url: 'https://images.unsplash.com/photo-1717500252780-036bfd89f810?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',  caption: 'Animal Flow – April Community Session',     category: 'Community', taggedStudents: ['Camille Cruz', 'Lea Mendoza', 'Jan Corpus'], uploadedAt: 'Apr 2, 2026', uploadedBy: 'Studio Admin', tall: true  },
  { id: 8,  url: 'https://images.unsplash.com/photo-1602827114685-efbb2717da9f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',  caption: 'Circuit Training – Full Energy',            category: 'Classes',   taggedStudents: [],                   uploadedAt: 'Apr 1, 2026',  uploadedBy: 'Studio Admin', tall: false },
  { id: 9,  url: 'https://images.unsplash.com/photo-1761971975724-31001b4de0bf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',  caption: 'Quiet mindfulness before class',            category: 'Studio',    taggedStudents: [],                   uploadedAt: 'Mar 30, 2026', uploadedBy: 'Studio Admin', tall: false },
  { id: 10, url: 'https://images.unsplash.com/photo-1583166614297-a97b68d5cead?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',  caption: 'Capoeira Open Workshop 2026',               category: 'Events',    taggedStudents: [],                   uploadedAt: 'Mar 28, 2026', uploadedBy: 'Studio Admin', tall: true  },
  { id: 11, url: 'https://images.unsplash.com/photo-1758875569414-120ebc62ada3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',  caption: 'Personal Coaching – One-on-One Progress',  category: 'Classes',   taggedStudents: ['Diego Tan'],                uploadedAt: 'Mar 25, 2026', uploadedBy: 'Studio Admin', tall: false },
  { id: 12, url: 'https://images.unsplash.com/photo-1701824429245-ce783f1dc026?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',  caption: 'Groundworks – Floor Movement Mastery',     category: 'Classes',   taggedStudents: ['Hannah Ong'],               uploadedAt: 'Mar 22, 2026', uploadedBy: 'Studio Admin', tall: false },
];

const STUDENTS = ['Alex Johnson', 'Maria Santos', 'Cris Dela Cruz', 'Sofia Reyes', 'Marco Lim', 'Pia Villanueva', 'Diego Tan', 'Camille Cruz', 'Ryan Bautista', 'Lea Mendoza', 'Jan Corpus', 'Hannah Ong'];
const CATEGORIES: Category[] = ['Studio', 'Classes', 'Events', 'Community'];
const FILTER_TABS = ['All', ...CATEGORIES];

const EMPTY_FORM = { url: '', caption: '', category: 'Studio' as Category, taggedStudents: [] as string[], tall: false };

// ── Photo Card ─────────────────────────────────────────────────

function PhotoCard({
  photo,
  onEdit,
  onDelete,
}: {
  photo: GalleryPhoto;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [confirmDel, setConfirmDel] = useState(false);

  const CAT_COLORS: Record<Category, string> = {
    Studio:    'bg-[#EDE8D8] text-[#5A5048]',
    Classes:   'bg-[#c49a3c]/12 text-[#a67f2e]',
    Events:    'bg-[#3A4A5A]/10 text-[#3A4A5A]',
    Community: 'bg-[#8A9E7A]/15 text-[#5A6E4A]',
  };

  return (
    <div className={`group bg-white rounded-2xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden hover:shadow-md ${CARD_HOVER_GROW}`}>
      {/* Image */}
      <div className="relative overflow-hidden">
        <img
          src={photo.url}
          alt={photo.caption}
          className={`w-full object-cover ${IMAGE_HOVER_ZOOM} ${photo.tall ? 'h-60' : 'h-44'}`}
        />
        <div className="absolute inset-0 bg-[#1E2A35]/0 group-hover:bg-[#1E2A35]/20 transition-colors" />

        {/* Category badge */}
        <div className="absolute top-2.5 left-2.5">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${CAT_COLORS[photo.category]}`}>{photo.category}</span>
        </div>

        {/* Actions */}
        <div className="absolute top-2.5 right-2.5 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="w-7 h-7 rounded-xl bg-white/90 backdrop-blur-sm flex items-center justify-center text-[#1E2A35] hover:bg-white shadow-sm transition-all"
          >
            <Pencil size={12} />
          </button>
          {confirmDel ? (
            <>
              <button onClick={() => onDelete()} className="w-7 h-7 rounded-xl bg-red-500 flex items-center justify-center text-white hover:bg-red-600 shadow-sm"><Check size={12} /></button>
              <button onClick={() => setConfirmDel(false)} className="w-7 h-7 rounded-xl bg-white/90 flex items-center justify-center text-[#8A7E6E] hover:bg-white shadow-sm"><X size={12} /></button>
            </>
          ) : (
            <button
              onClick={() => setConfirmDel(true)}
              className="w-7 h-7 rounded-xl bg-white/90 backdrop-blur-sm flex items-center justify-center text-red-500 hover:bg-red-50 shadow-sm transition-all"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="px-3 py-3">
        <p className="text-[#1E2A35] text-sm font-medium leading-snug mb-1.5 line-clamp-2">{photo.caption}</p>
        <div className="flex items-center justify-between text-xs text-[#B0A898]">
          <span>{photo.uploadedAt}</span>
          {photo.taggedStudents.length > 0 && (
            <span className="flex items-center gap-1 text-[#c49a3c]">
              <Tag size={10} /> {photo.taggedStudents.length}
            </span>
          )}
        </div>
        {photo.taggedStudents.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {photo.taggedStudents.slice(0, 2).map(s => (
              <span key={s} className="text-[10px] bg-[#EDE8D8] text-[#5A5048] px-2 py-0.5 rounded-full">{s.split(' ')[0]}</span>
            ))}
            {photo.taggedStudents.length > 2 && (
              <span className="text-[10px] bg-[#EDE8D8] text-[#5A5048] px-2 py-0.5 rounded-full">+{photo.taggedStudents.length - 2}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Upload / Edit Modal ────────────────────────────────────────

function PhotoModal({
  photo,
  onClose,
  onSave,
}: {
  photo: typeof EMPTY_FORM | null;
  onClose: () => void;
  onSave: (data: typeof EMPTY_FORM) => void;
}) {
  const [form, setForm] = useState(photo ?? EMPTY_FORM);
  const [error, setError] = useState('');
  const isEdit = photo !== null && 'url' in photo && photo.url !== '';

  const toggleStudent = (s: string) => {
    setForm(f => ({
      ...f,
      taggedStudents: f.taggedStudents.includes(s)
        ? f.taggedStudents.filter(x => x !== s)
        : [...f.taggedStudents, s],
    }));
  };

  const handleSave = () => {
    if (!form.url.trim()) { setError('Photo URL is required.'); return; }
    if (!form.caption.trim()) { setError('Caption is required.'); return; }
    onSave(form);
  };

  const INP = 'w-full px-4 py-3 rounded-2xl border border-[#D4CDB5]/70 bg-[#F8F3E8] text-[#1E2A35] text-sm outline-none focus:ring-2 focus:ring-[#c49a3c]/25 focus:border-[#c49a3c]/50 transition-all placeholder-[#C0B8A8]';
  const SEL = INP + ' appearance-none cursor-pointer';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(30,42,53,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-7 pt-7 pb-5 border-b border-[#D4CDB5]/50 flex items-center justify-between sticky top-0 bg-white z-10">
          <h3 className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.05em' }}>
            {isEdit ? 'Edit Photo' : 'Upload New Photo'}
          </h3>
          <button onClick={onClose} className="w-8 h-8 rounded-xl text-[#8A7E6E] hover:bg-[#EDE8D8] flex items-center justify-center transition-all">
            <X size={16} />
          </button>
        </div>

        <div className="px-7 py-6 flex flex-col gap-4">
          {/* URL */}
          <div>
            <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">Photo URL</label>
            <input type="text" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://…" className={INP} />
            {form.url && (
              <div className="mt-2 rounded-xl overflow-hidden border border-[#D4CDB5]/60">
                <img src={form.url} alt="preview" className="w-full h-32 object-cover" onError={e => (e.currentTarget.style.display = 'none')} />
              </div>
            )}
          </div>

          {/* Caption */}
          <div>
            <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">Caption</label>
            <textarea value={form.caption} onChange={e => setForm(f => ({ ...f, caption: e.target.value }))} placeholder="Describe this photo…" rows={2} className={INP + ' resize-none'} />
          </div>

          {/* Category + Tall */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">Category</label>
              <div className="relative">
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as Category }))} className={SEL}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">Image Size</label>
              <div className="relative">
                <select value={form.tall ? 'tall' : 'standard'} onChange={e => setForm(f => ({ ...f, tall: e.target.value === 'tall' }))} className={SEL}>
                  <option value="standard">Standard</option>
                  <option value="tall">Tall</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tag students */}
          <div>
            <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-2">Tag Students (optional)</label>
            <div className="flex flex-wrap gap-2">
              {STUDENTS.map(s => (
                <button
                  key={s}
                  onClick={() => toggleStudent(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                    form.taggedStudents.includes(s)
                      ? 'bg-[#c49a3c] text-white border-[#c49a3c]'
                      : 'bg-white text-[#8A7E6E] border-[#D4CDB5]/60 hover:border-[#c49a3c]/40 hover:text-[#1E2A35]'
                  }`}
                >
                  {s.split(' ')[0]}
                </button>
              ))}
            </div>
            {form.taggedStudents.length > 0 && (
              <p className="text-[#c49a3c] text-xs mt-1.5">{form.taggedStudents.length} student{form.taggedStudents.length !== 1 ? 's' : ''} tagged</p>
            )}
          </div>

          {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3"><p className="text-red-600 text-sm">{error}</p></div>}
        </div>

        <div className="px-7 pb-7 flex gap-3 sticky bottom-0 bg-white border-t border-[#D4CDB5]/40 pt-5">
          <button onClick={onClose} className="flex-1 py-3 rounded-full border border-[#D4CDB5]/70 text-[#8A7E6E] text-sm hover:bg-[#EDE8D8] transition-all">Cancel</button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 rounded-full bg-[#1E2A35] text-white hover:bg-[#263545] active:scale-[0.97] transition-all shadow-sm"
            style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em', fontSize: '0.95rem' }}
          >
            {isEdit ? 'Save Changes' : 'Upload Photo'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────

export default function AdminGalleryPage() {
  const navigate = useNavigate();
  const { adminUser } = useAdminAuth();

  const [photos, setPhotos]         = useState<GalleryPhoto[]>(INITIAL_PHOTOS);
  const [filter, setFilter]         = useState('All');
  const [search, setSearch]         = useState('');
  const [showModal, setShowModal]   = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<GalleryPhoto | null>(null);

  useEffect(() => {
    if (!adminUser) navigate('/admin-login');
  }, [adminUser, navigate]);
  if (!adminUser) return null;

  const filtered = photos.filter(p => {
    const matchCat = filter === 'All' || p.category === filter;
    const matchSearch = p.caption.toLowerCase().includes(search.toLowerCase()) ||
      p.taggedStudents.some(s => s.toLowerCase().includes(search.toLowerCase()));
    return matchCat && matchSearch;
  });

  const openUpload = () => { setEditingPhoto(null); setShowModal(true); };
  const openEdit   = (p: GalleryPhoto) => { setEditingPhoto(p); setShowModal(true); };

  const handleSave = (data: typeof EMPTY_FORM) => {
    if (editingPhoto) {
      setPhotos(prev => prev.map(p => p.id === editingPhoto.id ? { ...p, ...data } : p));
    } else {
      setPhotos(prev => [{
        id: Date.now(),
        ...data,
        uploadedAt: 'Apr 13, 2026',
        uploadedBy: 'Studio Admin',
      }, ...prev]);
    }
    setShowModal(false);
  };

  const handleDelete = (id: number) => setPhotos(prev => prev.filter(p => p.id !== id));

  return (
    <>
      {showModal && (
        <PhotoModal
          photo={editingPhoto ? { url: editingPhoto.url, caption: editingPhoto.caption, category: editingPhoto.category, taggedStudents: editingPhoto.taggedStudents, tall: editingPhoto.tall } : null}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      )}

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-7">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Images size={14} className="text-[#c49a3c]" />
              <span className="text-[#8A7E6E] text-xs uppercase tracking-widest">Admin › Gallery</span>
            </div>
            <h1 className="text-[#1E2A35] leading-tight" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', letterSpacing: '0.04em' }}>
              Gallery Manager
            </h1>
          </div>
          <button
            onClick={openUpload}
            className="flex items-center gap-2 bg-[#1E2A35] text-white px-5 py-2.5 rounded-full hover:bg-[#263545] active:scale-[0.97] transition-all shadow-sm"
            style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em', fontSize: '0.9rem' }}
          >
            <Upload size={15} /> Upload Photo
          </button>
        </div>

        {/* Filters + Search */}
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <div className="flex gap-1.5 bg-white border border-[#D4CDB5]/60 rounded-2xl p-1 shadow-sm">
            {FILTER_TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${filter === tab ? 'bg-[#1E2A35] text-white shadow-sm' : 'text-[#8A7E6E] hover:text-[#1E2A35]'}`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="relative max-w-xs w-full">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#B0A898]" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search caption or tagged student…"
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-[#D4CDB5]/70 bg-white text-[#1E2A35] text-sm outline-none focus:ring-2 focus:ring-[#c49a3c]/25 focus:border-[#c49a3c]/50 transition-all placeholder-[#C0B8A8]"
            />
          </div>
          <span className="text-[#8A7E6E] text-sm ml-auto">{filtered.length} photo{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-3xl bg-white border border-[#D4CDB5]/60 flex items-center justify-center mb-4 shadow-sm">
              <Images size={26} className="text-[#c49a3c]/50" />
            </div>
            <h3 className="text-[#1E2A35] mb-1" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.4rem', letterSpacing: '0.05em' }}>No Photos Found</h3>
            <p className="text-[#8A7E6E] text-sm max-w-xs">Try adjusting your filters or upload a new photo.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map(photo => (
              <PhotoCard
                key={photo.id}
                photo={photo}
                onEdit={() => openEdit(photo)}
                onDelete={() => handleDelete(photo.id)}
              />
            ))}
            {/* Upload placeholder card */}
            <button
              onClick={openUpload}
              className="flex flex-col items-center justify-center h-44 rounded-2xl border-2 border-dashed border-[#D4CDB5]/70 text-[#B0A898] hover:border-[#c49a3c]/40 hover:text-[#c49a3c] hover:bg-[#c49a3c]/04 transition-all group"
            >
              <Plus size={24} className={`mb-2 ${ICON_HOVER_GROW}`} />
              <span className="text-xs font-medium">Upload Photo</span>
            </button>
          </div>
        )}
      </div>
    </>
  );
}
