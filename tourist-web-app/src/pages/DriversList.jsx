import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import heroBg from '../assets/background.jpg';
import { supabase } from '../services/supabase';
import { API_BASE_URL } from '../services/apiConfig';
import {
  Search,
  Star,
  Award,
  Phone,
  Car,
  SlidersHorizontal,
  Compass,
  RefreshCw,
  Coins,
  Eye,
  Loader2
} from 'lucide-react';

function DriverAvatar({ driver }) {
  const [error, setError] = useState(false);
  const avatarUrl = driver.profile_image || `${API_BASE_URL}/uploads/avatars/${driver.id}.jpg`;
  const isActive = driver.driver_profiles ? (driver.driver_profiles.is_active !== false) : true;

  if (!error) {
    return (
      <div className="relative">
        <img
          src={avatarUrl}
          alt={driver.full_name}
          onError={() => setError(true)}
          className="w-28 h-28 rounded-full object-cover border-4 border-white shadow-lg group-hover:border-green-100 transition duration-300"
        />
        <span className={`absolute bottom-1 right-2 w-5 h-5 border-4 border-white rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}></span>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="w-28 h-28 bg-linear-to-tr from-green-700 to-emerald-400 text-white rounded-full flex items-center justify-center text-4xl font-extrabold shadow-lg border-4 border-white group-hover:border-green-100 transition duration-300">
        {driver.full_name.charAt(0)}
      </div>
      <span className={`absolute bottom-1 right-2 w-5 h-5 border-4 border-white rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}></span>
    </div>
  );
}

export default function DriversList() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [expFilter, setExpFilter] = useState('All');
  const [ratingFilter, setRatingFilter] = useState('All');
  const [sortBy, setSortBy] = useState('Rating');
  const navigate = useNavigate();
  const fetchDrivers = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const { data: driversData, error: driversError } = await supabase
        .from('users')
        .select(`
          *,
          driver_profiles:driver_profiles!id(is_active, experience_years, vehicle_id, price_per_safari, experience),
          driver_reviews:driver_reviews!driver_id(rating)
        `)
        .eq('role', 'DRIVER');

      if (driversError) throw driversError;

      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('driver_id, booking_date, status');

      if (bookingsError) throw bookingsError;

      const { data: sightingsData, error: sightingsError } = await supabase
        .from('sightings')
        .select('driver_id');

      if (sightingsError) throw sightingsError;

      const bookingsCountMap = {};
      if (bookingsData) {
        bookingsData.forEach(b => {
          if (b.status === 'CONFIRMED' || b.status === 'COMPLETED') {
            bookingsCountMap[b.driver_id] = (bookingsCountMap[b.driver_id] || 0) + 1;
          }
        });
      }

      const sightingsCountMap = {};
      if (sightingsData) {
        sightingsData.forEach(s => {
          sightingsCountMap[s.driver_id] = (sightingsCountMap[s.driver_id] || 0) + 1;
        });
      }

      const d = new Date();
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;

      const enrichedDrivers = driversData.map(d => {
        const reviews = d.driver_reviews || [];
        const avg = reviews.length > 0
          ? parseFloat((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1))
          : 4.8;

        const isBookedToday = bookingsData?.some(b =>
          b.driver_id === d.id &&
          b.booking_date === todayStr &&
          b.status === 'CONFIRMED'
        ) || false;

        return {
          ...d,
          avgRating: avg,
          tripsCount: bookingsCountMap[d.id] || 0,
          sightingsCount: sightingsCountMap[d.id] || 0,
          experience: d.driver_profiles?.experience_years || 5,
          price: d.driver_profiles?.price_per_safari || 12500,
          isBookedToday
        };
      });

      setDrivers(enrichedDrivers);
    } catch (error) {
      console.error("Error fetching drivers:", error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDrivers(false);
    }, 0);

    const statusChannel = supabase
      .channel('driver-status-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'driver_profiles' },
        () => fetchDrivers(false)
      )
      .subscribe();

    const reviewsChannel = supabase
      .channel('driver-reviews-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'driver_reviews' },
        () => fetchDrivers(false)
      )
      .subscribe();

    const bookingsChannel = supabase
      .channel('driver-bookings-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => fetchDrivers(false)
      )
      .subscribe();

    return () => {
      clearTimeout(timer);
      supabase.removeChannel(statusChannel);
      supabase.removeChannel(reviewsChannel);
      supabase.removeChannel(bookingsChannel);
    };
  }, []);

  const filteredDrivers = drivers.filter(driver => {
    const matchesSearch = driver.full_name.toLowerCase().includes(searchTerm.toLowerCase());

    const isActive = driver.driver_profiles ? (driver.driver_profiles.is_active !== false) : true;
    const matchesStatus = statusFilter === 'All' ||
      (statusFilter === 'Online' && isActive) ||
      (statusFilter === 'Offline' && !isActive);

    const matchesExp = expFilter === 'All' ||
      (expFilter === '10+' && driver.experience >= 10) ||
      (expFilter === '5+' && driver.experience >= 5);

    const matchesRating = ratingFilter === 'All' ||
      (ratingFilter === '4.8+' && driver.avgRating >= 4.8) ||
      (ratingFilter === '4.5+' && driver.avgRating >= 4.5);

    return matchesSearch && matchesStatus && matchesExp && matchesRating;
  });

  const sortedDrivers = [...filteredDrivers].sort((a, b) => {
    if (sortBy === 'Rating') return b.avgRating - a.avgRating;
    if (sortBy === 'Trips') return b.tripsCount - a.tripsCount;
    if (sortBy === 'Experience') return b.experience - a.experience;
    if (sortBy === 'Sightings') return b.sightingsCount - a.sightingsCount;
    return 0;
  });

  let topGuideId = null;
  if (drivers.length > 0) {
    const scoreMap = drivers.map(d => ({
      id: d.id,
      score: (d.avgRating * 2) + (d.tripsCount * 0.5) + (d.sightingsCount * 0.3)
    }));
    scoreMap.sort((a, b) => b.score - a.score);
    topGuideId = scoreMap[0]?.id;
  }

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('All');
    setExpFilter('All');
    setRatingFilter('All');
    setSortBy('Rating');
  };

  return (
    <div className="pt-24 pb-20 min-h-screen bg-gray-50/50 font-sans">

      <div className="relative bg-linear-to-br from-green-950 via-emerald-900 to-teal-950 py-12 sm:py-16 md:py-24 text-white overflow-hidden mb-8 sm:mb-10 shadow-lg">
        <div className="absolute inset-0 opacity-20 bg-cover bg-center mix-blend-overlay" style={{ backgroundImage: `url(${heroBg})` }}></div>
        <div className="absolute inset-0 bg-linear-to-t from-green-950/90 via-transparent to-transparent"></div>

        <div className="container mx-auto px-4 max-w-6xl relative z-10 text-center space-y-3 sm:space-y-4">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs font-black uppercase tracking-widest text-green-300 border border-white/10 shadow-inner">
            <Compass size={14} className="animate-spin-slow" />
            Yala Registered Guides
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight drop-shadow-md">
            Find Your Perfect Guide
          </h1>
          <p className="text-green-100/90 text-xs sm:text-sm md:text-base max-w-2xl mx-auto font-medium leading-relaxed px-2">
            Browse through our verified, licensed Yala National Park safari guides. Choose a driver based on real ratings, safari experience, and wildlife sightings.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-6xl space-y-6 sm:space-y-8">

        <div className="bg-white p-4 sm:p-6 md:p-8 rounded-3xl border border-gray-200/80 shadow-md flex flex-col gap-4 sm:gap-6">

          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="relative w-full lg:max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search guide by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 text-xs sm:text-sm font-semibold text-gray-700 placeholder-gray-400 rounded-2xl focus:border-green-600 focus:bg-white focus:outline-none transition-all duration-200"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 w-full lg:w-auto shrink-0 justify-end">
              <span className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <SlidersHorizontal size={14} /> Sort By:
              </span>
              <div className="flex bg-gray-100 p-1 rounded-2xl border border-gray-200 w-full sm:w-auto overflow-x-auto no-scrollbar">
                {['Rating', 'Trips', 'Experience', 'Sightings'].map(opt => (
                  <button
                    key={opt}
                    onClick={() => setSortBy(opt)}
                    className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-black transition duration-200 shrink-0 cursor-pointer ${
                      sortBy === opt
                        ? 'bg-white text-green-700 shadow-sm'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">

            <div className="flex flex-col gap-1.5 sm:gap-2">
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Availability</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 text-xs font-extrabold text-gray-600 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl focus:border-green-600 focus:outline-none transition cursor-pointer"
              >
                <option value="All">All Guides (Online & Offline)</option>
                <option value="Online">Online Only (Ready for booking)</option>
                <option value="Offline">Offline Only</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5 sm:gap-2">
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Experience</label>
              <select
                value={expFilter}
                onChange={(e) => setExpFilter(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 text-xs font-extrabold text-gray-600 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl focus:border-green-600 focus:outline-none transition cursor-pointer"
              >
                <option value="All">Any Experience</option>
                <option value="5+">5+ Years Experience</option>
                <option value="10+">10+ Years Experience</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5 sm:gap-2">
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Guide Rating</label>
              <select
                value={ratingFilter}
                onChange={(e) => setRatingFilter(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 text-xs font-extrabold text-gray-600 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl focus:border-green-600 focus:outline-none transition cursor-pointer"
              >
                <option value="All">Any Rating</option>
                <option value="4.5+">★ 4.5 Stars & Above</option>
                <option value="4.8+">★ 4.8 Stars & Above</option>
              </select>
            </div>

          </div>

        </div>

        {loading ? (
          <div className="bg-white rounded-3xl border border-gray-200/80 p-12 sm:p-16 text-center space-y-6 shadow-sm max-w-lg mx-auto flex flex-col items-center justify-center">
            <Loader2 className="w-10 h-10 text-green-700 animate-spin" />
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-gray-800">Loading Guides</h3>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Finding Yala's Best...</p>
            </div>
          </div>
        ) : sortedDrivers.length === 0 ? (
          <div className="bg-white rounded-3xl border border-gray-200/80 p-10 sm:p-16 text-center space-y-6 shadow-sm max-w-lg mx-auto">
            <div className="bg-amber-50 text-amber-500 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto shadow-inner">
              <Compass size={28} className="animate-pulse" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-gray-800">No Guides Match Your Criteria</h3>
              <p className="text-sm text-gray-500 max-w-sm mx-auto leading-relaxed">
                We couldn't find any registered safari drivers matching your search term or filter parameters.
              </p>
            </div>
            <button
              onClick={handleResetFilters}
              className="bg-green-700 hover:bg-green-800 text-white font-extrabold text-xs px-6 py-3 rounded-xl transition duration-200 active:scale-95 shadow-md shadow-green-700/10 cursor-pointer flex items-center gap-1.5 mx-auto"
            >
              <RefreshCw size={14} />
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {sortedDrivers.map(driver => {
              const isActive = driver.driver_profiles ? (driver.driver_profiles.is_active !== false) : true;
              const isTopGuide = driver.id === topGuideId;
              const vehicleId = driver.driver_profiles?.vehicle_id || 'Not Assigned';

              return (
                <div
                  key={driver.id}
                  className={`group bg-white rounded-3xl border overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 p-5 sm:p-6 flex flex-col items-center relative ${
                    isTopGuide ? 'border-yellow-400 ring-2 ring-yellow-400/20' : 'border-gray-200/70'
                  }`}
                >

                  {isTopGuide ? (
                    <div className="absolute top-0 left-0 right-0 h-2 bg-linear-to-r from-yellow-500 via-amber-400 to-yellow-500"></div>
                  ) : (
                    <div className="absolute top-0 left-0 right-0 h-2 bg-linear-to-r from-green-700 to-emerald-500"></div>
                  )}

                  {driver.isBookedToday ? (
                    <span className="absolute top-4 right-4 bg-amber-50 text-amber-700 px-2.5 sm:px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border border-amber-200 shadow-xs">
                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>
                      On Safari Trip
                    </span>
                  ) : isActive ? (
                    <span className="absolute top-4 right-4 bg-emerald-50 text-emerald-700 px-2.5 sm:px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border border-emerald-100 shadow-xs">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                      Online
                    </span>
                  ) : (
                    <span className="absolute top-4 right-4 bg-gray-50 text-gray-400 px-2.5 sm:px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border border-gray-100">
                      <span className="w-1.5 h-1.5 bg-gray-300 rounded-full"></span>
                      Offline
                    </span>
                  )}

                  {isTopGuide && (
                    <span className="absolute top-4 left-4 bg-yellow-500 text-white px-2.5 sm:px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm shadow-yellow-500/20">
                      <Award size={11} />
                      Top Guide
                    </span>
                  )}

                  <div className="mt-4 mb-4">
                    <DriverAvatar driver={driver} />
                  </div>

                  <div className="text-center w-full mb-4">
                    <h2 className="text-xl sm:text-2xl font-black text-gray-800 mb-1 group-hover:text-green-700 transition-colors tracking-tight flex items-center justify-center gap-1.5">
                      {driver.full_name}
                      {isTopGuide && <Star size={18} className="fill-yellow-400 text-yellow-500 shrink-0" />}
                    </h2>

                    <span className="inline-flex items-center gap-1 text-[11px] text-gray-400 font-bold bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100 shadow-3xs">
                      <Phone size={11} className="text-gray-400" />
                      {driver.phone_number || 'No contact provided'}
                    </span>
                  </div>

                  <div className="w-full flex flex-col gap-1.5 mb-4 sm:mb-5">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-1.5 sm:gap-2 px-1 text-xs font-bold text-gray-500">
                      <div className="w-full sm:w-auto flex items-center gap-1 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-xl flex-1 justify-center" title="Vehicle Number">
                        <Car size={13} className="text-green-700" />
                        <span className="text-gray-700 font-extrabold truncate max-w-25">{vehicleId}</span>
                      </div>
                      <div className="w-full sm:w-auto flex items-center gap-1 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-xl flex-1 justify-center" title="Jeep & Guide Rate">
                        <Coins size={13} className="text-yellow-600" />
                        <span className="text-gray-700 font-extrabold">LKR {driver.price.toLocaleString()}/Jeep</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-400 font-bold text-center uppercase tracking-wider block">
                      *Price covers Jeep & Guide. Park tickets separate.
                    </span>
                  </div>

                  <div className="w-full grid grid-cols-4 gap-0.5 sm:gap-1 py-2.5 sm:py-3 px-1 sm:px-2 bg-gray-50/80 rounded-2xl border border-gray-100 mb-5 sm:mb-6 text-center shadow-inner">
                    <div>
                      <div className="text-[9px] sm:text-[10px] text-gray-400 font-black uppercase tracking-wider">Rating</div>
                      <div className="text-xs sm:text-sm font-black text-gray-800 flex items-center justify-center gap-0.5 mt-0.5">
                        <span className="text-yellow-500">★</span> {driver.avgRating}
                      </div>
                    </div>
                    <div className="border-l border-gray-200/70">
                      <div className="text-[9px] sm:text-[10px] text-gray-400 font-black uppercase tracking-wider">Trips</div>
                      <div className="text-xs sm:text-sm font-black text-gray-800 mt-0.5">{driver.tripsCount}</div>
                    </div>
                    <div className="border-l border-gray-200/70">
                      <div className="text-[9px] sm:text-[10px] text-gray-400 font-black uppercase tracking-wider">Sightings</div>
                      <div className="text-xs sm:text-sm font-black text-green-700 mt-0.5 flex items-center justify-center gap-0.5">
                        <Eye size={11} /> {driver.sightingsCount}
                      </div>
                    </div>
                    <div className="border-l border-gray-200/70">
                      <div className="text-[9px] sm:text-[10px] text-gray-400 font-black uppercase tracking-wider">Exp</div>
                      <div className="text-xs sm:text-sm font-black text-gray-800 mt-0.5">{driver.experience}Y</div>
                    </div>
                  </div>

                  <div className="w-full flex flex-col sm:flex-row gap-2 sm:gap-3 mt-auto">
                    <button
                      onClick={() => navigate(`/driver/${driver.id}`)}
                      className="w-full sm:flex-1 border border-gray-200 hover:border-green-600 hover:bg-green-50/30 text-gray-600 hover:text-green-700 font-extrabold py-3 sm:py-3.5 rounded-2xl text-xs transition duration-200 cursor-pointer text-center"
                    >
                      View Profile
                    </button>

                    <button
                      disabled={!isActive || driver.isBookedToday}
                      onClick={() => navigate('/booking', { state: { selectedDriverId: driver.id, selectedDriverName: driver.full_name } })}
                      className={`w-full sm:flex-1 font-black py-3 sm:py-3.5 rounded-2xl text-xs transition duration-200 shadow-md ${
                        driver.isBookedToday
                          ? 'bg-amber-100 text-amber-600 cursor-not-allowed shadow-none'
                          : isActive
                            ? 'bg-linear-to-r from-green-700 to-emerald-600 hover:from-green-800 hover:to-emerald-700 text-white hover:shadow-lg transform active:scale-95 cursor-pointer'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                      }`}
                    >
                      {driver.isBookedToday ? 'Fully Booked' : isActive ? 'Book Safari Now' : 'Offline'}
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
