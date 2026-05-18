import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { formatKSh, type Job, type Review } from '../db/schema';
import VerifiedEmployerBadge from '../components/VerifiedEmployerBadge';
import { isFundiBadgeActive } from '../utils/verification';
import { ExternalLink, FileText, Star, MapPin } from 'lucide-react';

interface FundiProfilePageProps {
  selectedFundiId: string;
  profileViews: number;
  onProfileView: (fundiId: string) => void;
  jobs: Job[];
  reviews: Review[];
  setReviews: React.Dispatch<React.SetStateAction<Review[]>>;
  onNavigate: (page: string) => void;
  showToast: (msg: string) => void;
}

export default function FundiProfilePage({ selectedFundiId, profileViews, onProfileView, jobs, reviews, setReviews, onNavigate, showToast }: FundiProfilePageProps) {
  const { profiles, users, currentUser } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [newRating, setNewRating] = useState(5);

  const profile = profiles.find(p => p.userId === selectedFundiId);
  const user = users.find(u => u._id === selectedFundiId);
  useEffect(() => {
    if (!selectedFundiId) return;
    if (currentUser?._id === selectedFundiId) return;
    onProfileView(selectedFundiId);
  }, [currentUser?._id, onProfileView, selectedFundiId]);

  if (!profile || !user) return <div className="p-8 text-center text-slate-500">Fundi profile not found.</div>;

  const fundiReviews = reviews.filter(r => r.revieweeId === selectedFundiId);
  const badgeActive = isFundiBadgeActive(profile, user);

  const handleReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) { showToast('Please sign in to leave a review.'); return; }
    const newReview: Review = {
      _id: `rev_${Date.now()}`,
      reviewerId: currentUser._id,
      reviewerName: currentUser.name,
      revieweeId: selectedFundiId,
      jobId: jobs[0]?._id || '',
      rating: newRating,
      comment: newComment || 'Excellent work delivery and professional conduct.',
      createdAt: Date.now(),
    };
    setReviews(prev => [newReview, ...prev]);
    setNewComment('');
    showToast('⭐ Review published to the ledger!');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-slide-up">
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-[#005fec] to-blue-800 p-6 sm:p-8 text-white flex flex-col sm:flex-row items-center gap-4 justify-between">
          <div className="flex items-center flex-col sm:flex-row text-center sm:text-left gap-4">
            <img src={profile.avatarUrl} alt={user.name} className="h-20 w-20 rounded-full object-cover shrink-0 border-4 border-white/20 shadow" />
            <div>
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h1 className="text-xl sm:text-2xl font-display font-black tracking-tight">{user.name}</h1>
                {badgeActive && <span className="bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">✓ Vetted</span>}
              </div>
              <p className="text-xs text-blue-200 font-mono mt-0.5 flex items-center gap-1 justify-center sm:justify-start">
                <MapPin className="h-3 w-3" /> {profile.county} County, Kenya
              </p>
              <div className="mt-2 flex flex-wrap gap-1 justify-center sm:justify-start">
                {profile.skills.map(s => <span key={s} className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded">{s}</span>)}
              </div>
            </div>
          </div>
          <div className="text-center sm:text-right bg-white/10 p-3 rounded-xl backdrop-blur-sm shrink-0 w-full sm:w-auto">
            <p className="text-xs text-blue-100">Hourly Rate</p>
            <p className="text-xl sm:text-2xl font-display font-black text-amber-300">{formatKSh(profile.hourlyRate)}/hr</p>
            <p className="text-[10px] text-white/70">Negotiable by project</p>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left: Stats */}
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-2">
              <p className="font-bold text-slate-800 border-b border-slate-200 pb-1 text-[11px] uppercase tracking-wider">Metrics</p>
              <div className="flex justify-between"><span className="text-slate-500">Rating:</span><span className="font-bold text-amber-600 flex items-center gap-0.5"><Star className="h-3 w-3 fill-amber-500 text-amber-500" /> {profile.rating}/5.0</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Jobs Done:</span><span className="font-bold text-slate-900">{profile.completedJobs}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Profile Views:</span><span className="font-bold text-slate-900">{profileViews}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Phone:</span><span className="font-bold text-slate-900 font-mono">{user.phone}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Status:</span><span className={`font-bold text-[11px] ${profile.availability === 'available' ? 'text-emerald-600' : 'text-amber-600'}`}>{profile.availability}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Payout:</span><span className="font-bold text-emerald-600 text-[11px]">M-Pesa ✓</span></div>
            </div>

            <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-100 text-xs">
              <p className="font-bold text-blue-900 mb-1">🏗️ Hire This Fundi</p>
              <p className="text-slate-600 leading-relaxed text-[11px]">Post a job matching their county and invite them directly.</p>
              <button
                onClick={() => { if (currentUser?.role === 'employer') { onNavigate('dashboard-employer'); } else { onNavigate('auth'); showToast('Register as an Employer first.'); } }}
                className="w-full mt-2 bg-[#005fec] text-white font-bold py-1.5 rounded-lg text-[11px]"
              >
                Initiate Hiring
              </button>
            </div>
          </div>

          {/* Right: Bio, Portfolio, Reviews */}
          <div className="md:col-span-2 space-y-6">
            <div>
              <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-1">Biography</h3>
              <p className="text-slate-700 text-sm leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">{profile.bio}</p>
            </div>

            <div>
              <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-2">CV</h3>
              {profile.cvFileName ? (
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#005fec]">
                        <FileText className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-900">{profile.cvFileName}</p>
                        <p className="text-[11px] text-slate-500">Uploaded CV available for employers to review.</p>
                      </div>
                    </div>
                    {profile.cvFileUrl && (
                      <a
                        href={profile.cvFileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white transition hover:bg-[#005fec]"
                      >
                        View CV
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                  {profile.cvInsights?.length ? (
                    <div className="mt-3 space-y-2">
                      {profile.cvInsights.map(insight => (
                        <p key={insight} className="rounded-lg bg-white px-3 py-2 text-[11px] leading-5 text-slate-600">{insight}</p>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic bg-slate-50 p-4 rounded-xl border">No CV uploaded yet.</p>
              )}
            </div>

            <div>
              <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-2">Portfolio ({profile.portfolioImages.length} items)</h3>
              {profile.portfolioImages.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {profile.portfolioImages.map((img, i) => (
                    <img key={i} src={img} alt="Portfolio" className="rounded-xl object-cover h-36 w-full border border-slate-200 bg-slate-100" />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic bg-slate-50 p-4 rounded-xl border">No portfolio images uploaded yet.</p>
              )}
            </div>

            <div>
              <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-2">Reviews ({fundiReviews.length})</h3>
              <div className="space-y-3">
                {fundiReviews.map(rev => (
                  <div key={rev._id} className="bg-white border border-slate-100 p-3.5 rounded-xl space-y-1 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-1.5 font-bold text-slate-800">
                        {rev.reviewerName}
                        <VerifiedEmployerBadge user={users.find(item => item._id === rev.reviewerId)} />
                      </span>
                      <span className="text-amber-500 font-bold text-[11px]">{'★'.repeat(rev.rating)} ({rev.rating}.0)</span>
                    </div>
                    <p className="text-slate-600 italic">"{rev.comment}"</p>
                    <p className="text-[10px] text-slate-400 text-right">{new Date(rev.createdAt).toLocaleDateString('en-KE')}</p>
                  </div>
                ))}
                {fundiReviews.length === 0 && <p className="text-xs text-slate-400 italic">No reviews yet.</p>}
              </div>

              {/* Review form */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mt-4">
                <h4 className="font-bold text-xs text-slate-800 mb-2">Leave a Review</h4>
                <form onSubmit={handleReview} className="space-y-2">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Rating</label>
                      <select value={newRating} onChange={(e) => setNewRating(Number(e.target.value))} className="bg-white border text-xs p-1 rounded w-full">
                        <option value={5}>⭐⭐⭐⭐⭐ Excellent</option>
                        <option value={4}>⭐⭐⭐⭐ Good</option>
                        <option value={3}>⭐⭐⭐ Average</option>
                        <option value={2}>⭐⭐ Poor</option>
                        <option value={1}>⭐ Bad</option>
                      </select>
                    </div>
                  </div>
                  <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Write honest feedback..." className="w-full text-xs p-2 bg-white border rounded focus:outline-none" />
                  <div className="text-right">
                    <button type="submit" className="bg-slate-800 text-white text-[11px] font-bold px-3 py-1.5 rounded hover:bg-slate-700">Publish Review</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
