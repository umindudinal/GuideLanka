import { useState, useContext, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon, Clock, Users, ShieldCheck, CheckCircle, Loader2, Globe, Info, Coins } from 'lucide-react';
import LoginModal from '../auth/LoginModal';
import AlertModal from '../common/AlertModal';
import { AuthContext } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';

export default function BookingForm() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning'
  });

  const showAlert = (message, type = 'warning', title = '') => {
    setAlertConfig({
      isOpen: true,
      message,
      type,
      title
    });
  };

  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const location = useLocation();
  const selectedDriverName = location.state?.selectedDriverName;
  const selectedDriverId = location.state?.selectedDriverId;

  const [date, setDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('');
  const [touristsCount, setTouristsCount] = useState('');
  const [visitorType, setVisitorType] = useState('foreign');
  const [driverRate, setDriverRate] = useState(12500);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeBooking, setActiveBooking] = useState(null);
  const [checkingActive, setCheckingActive] = useState(false);

  useEffect(() => {
    if (selectedDriverId) {
      const fetchDriverRate = async () => {
        try {
          const { data, error } = await supabase
            .from('driver_profiles')
            .select('price_per_safari')
            .eq('id', selectedDriverId)
            .maybeSingle();
          if (error) throw error;
          if (data && data.price_per_safari) {
            setDriverRate(data.price_per_safari);
          }
        } catch (err) {
          console.error("Error fetching driver price:", err);
        }
      };
      fetchDriverRate();
    }
  }, [selectedDriverId]);

  useEffect(() => {
    if (user && isModalOpen) {
      const timer = setTimeout(() => setIsModalOpen(false), 0);
      return () => clearTimeout(timer);
    }
  }, [user, isModalOpen]);

  useEffect(() => {
    let isMounted = true;

    const checkActiveBooking = async () => {
      if (!user) {
        setActiveBooking(null);
        return;
      }

      setCheckingActive(true);
      try {
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', user.email)
          .maybeSingle();

        if (existingUser && isMounted) {
          const { data: activeBookings, error } = await supabase
            .from('bookings')
            .select('id, status, driver_id')
            .eq('tourist_id', existingUser.id)
            .in('status', ['PENDING', 'CONFIRMED', 'APPROVED']);

          if (error) throw error;
          if (activeBookings && activeBookings.length > 0 && isMounted) {
            setActiveBooking(activeBookings[0]);
          } else if (isMounted) {
            setActiveBooking(null);
          }
        }
      } catch (err) {
        console.error("Error checking active booking:", err);
      } finally {
        if (isMounted) setCheckingActive(false);
      }
    };

    const timer = setTimeout(() => {
      if (isMounted) {
        checkActiveBooking();
      }
    }, 0);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [user]);

  const handleCheckout = async () => {
    if (!user) {
      setIsModalOpen(true);
      return;
    }

    if (!selectedDriverId) {
      showAlert("Please select a Safari Guide from the Drivers page first.", "warning", "Guide Selection Required");
      return;
    }

    if (!date || !timeSlot) {
      showAlert("Please fill the Date and Time Slot.", "warning", "Form Incomplete");
      return;
    }

    setIsSubmitting(true);

    try {
      let touristId;
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', user.email)
        .maybeSingle();

      if (existingUser) {
        touristId = existingUser.id;
      } else {
        console.log("අලුත් Tourist කෙනෙක්! Database එකට ඇතුළත් කරමින්...");
        const { data: newUser, error: insertUserError } = await supabase
          .from('users')
          .insert([
            {
              full_name: user.displayName || 'Google User',
              email: user.email,
              role: 'TOURIST',
              password: 'GOOGLE_AUTH_LOGIN'
            }
          ])
          .select('id')
          .single();

        if (insertUserError) throw insertUserError;
        touristId = newUser.id;
      }

      const { data: activeBookings, error: activeError } = await supabase
        .from('bookings')
        .select('id, status')
        .eq('tourist_id', touristId)
        .in('status', ['PENDING', 'CONFIRMED', 'APPROVED']);

      if (activeError) throw activeError;

      if (activeBookings && activeBookings.length > 0) {
        showAlert("You already have an active safari booking. You cannot book another driver until your current trip is finished.", "warning", "Active Booking Found");
        setActiveBooking(activeBookings[0]);
        setIsSubmitting(false);
        return;
      }

      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .insert([
          {
            tourist_id: touristId,
            driver_id: selectedDriverId,
            booking_date: date,
            time_slot: timeSlot + '|' + visitorType,
            tourist_count: Number(touristsCount) || 1,
            status: 'PENDING'
          }
        ])
        .select();

      if (bookingError) throw bookingError;

      const newBookingId = bookingData[0].id;
      navigate(`/chat/${newBookingId}`, {
        state: {
          driverName: selectedDriverName,
          driverId: selectedDriverId,
          touristId: touristId
        }
      });

    } catch (error) {
      console.error("System Error:", error.message);
      showAlert("Something went wrong! Error: " + error.message, "error", "Booking Failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const count = Number(touristsCount) || 0;
  let ticketRateLkr;
  let ticketRateUsd = 0;

  if (visitorType === 'foreign') {
    ticketRateUsd = 45;
    ticketRateLkr = 14000;
  } else if (visitorType === 'saarc') {
    ticketRateUsd = 30;
    ticketRateLkr = 9300;
  } else {
    ticketRateLkr = 250;
  }

  const totalTicketsLkr = count * ticketRateLkr;
  const totalTicketsUsd = count * ticketRateUsd;
  const totalCostLkr = driverRate + totalTicketsLkr;

  return (
    <div className="bg-white p-4 sm:p-6 md:p-8 rounded-2xl shadow-xl border border-gray-100 max-w-2xl mx-auto relative z-10 mt-4 sm:mt-8 md:mt-12">

      {activeBooking && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Info className="text-amber-700 shrink-0 mt-1" size={24} />
            <div>
              <h3 className="text-base sm:text-lg font-black text-amber-950 mb-1">Active Booking In Progress</h3>
              <p className="text-xs sm:text-sm text-amber-800 mb-4 leading-relaxed">
                You already have an active safari booking (Status: <span className="font-extrabold">{activeBooking.status}</span>).
                To ensure quality service, GuideLanka policy allows tourists to book only one safari guide at a time.
                You can book a new driver once your current trip is finished.
              </p>
              <button
                type="button"
                onClick={() => navigate(`/chat/${activeBooking.id}`)}
                className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition shadow-sm active:scale-95 flex items-center justify-center gap-2"
              >
                Go to Current Chat & Coordinator
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedDriverName && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3.5 sm:p-4 mb-6 flex items-center">
          <CheckCircle className="text-green-600 mr-3 shrink-0" size={22} />
          <div className="min-w-0">
            <p className="text-xs sm:text-sm text-green-800 font-medium">Selected Safari Guide</p>
            <p className="text-base sm:text-lg font-bold text-green-900 truncate">{selectedDriverName}</p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-100">
        <h2 className="text-xl sm:text-2xl font-black text-gray-800">Safari Reservation Details</h2>
      </div>

      <form className="space-y-5 sm:space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Select Date</label>
            <div className="relative">
              <CalendarIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="date"
                value={date}
                disabled={!!activeBooking}
                onChange={(e) => setDate(e.target.value)}
                className="w-full pl-11 pr-4 py-3 sm:py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600 focus:bg-white text-sm font-medium text-gray-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Time Slot</label>
            <div className="relative">
              <Clock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <select
                value={timeSlot}
                disabled={!!activeBooking}
                onChange={(e) => setTimeSlot(e.target.value)}
                className="w-full pl-11 pr-4 py-3 sm:py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600 focus:bg-white text-sm font-medium text-gray-700 transition appearance-none disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="">Choose time...</option>
                <option value="morning">Morning (06:00 AM - 10:00 AM)</option>
                <option value="evening">Evening (02:00 PM - 06:00 PM)</option>
                <option value="full">Full Day</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Visitor Category</label>
            <div className="relative">
              <Globe className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <select
                value={visitorType}
                disabled={!!activeBooking}
                onChange={(e) => setVisitorType(e.target.value)}
                className="w-full pl-11 pr-4 py-3 sm:py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600 focus:bg-white text-sm font-medium text-gray-700 transition appearance-none disabled:opacity-60 disabled:cursor-not-allowed text-ellipsis overflow-hidden"
              >
                <option value="foreign">Foreign National (USD ~45)</option>
                <option value="saarc">SAARC National (USD ~30)</option>
                <option value="local">Sri Lankan Resident (LKR 250)</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Number of Tourists</label>
            <div className="relative">
              <Users className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="number" min="1" max="10" placeholder="e.g., 4"
                value={touristsCount}
                disabled={!!activeBooking}
                onChange={(e) => setTouristsCount(e.target.value)}
                className="w-full pl-11 pr-4 py-3 sm:py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600 focus:bg-white text-sm font-medium text-gray-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {count > 0 && (
          <div className="bg-gray-50 rounded-2xl p-4 sm:p-6 border border-gray-200/60 mt-4 space-y-3 sm:space-y-4">
            <h3 className="text-xs sm:text-sm font-black text-gray-800 uppercase tracking-wider border-b pb-2 border-gray-200 flex items-center gap-1.5">
              <Coins size={16} className="text-green-700 shrink-0" />
              Estimated Pricing Breakdown
            </h3>

            <div className="space-y-2.5">
              <div className="flex flex-col xs:flex-row justify-between text-xs sm:text-sm gap-1">
                <span className="text-gray-500 font-medium">Jeep & Safari Guide Rate:</span>
                <span className="font-bold text-gray-800">LKR {driverRate.toLocaleString()}</span>
              </div>

              <div className="flex flex-col xs:flex-row justify-between text-xs sm:text-sm gap-1">
                <span className="text-gray-500 font-medium">
                  Park Tickets ({count} x {visitorType === 'local' ? `LKR ${ticketRateLkr}` : `USD ${ticketRateUsd}`}):
                </span>
                <span className="font-bold text-gray-800">
                  {visitorType === 'local' ? `LKR ${totalTicketsLkr.toLocaleString()}` : `LKR ~${totalTicketsLkr.toLocaleString()} (USD ${totalTicketsUsd})`}
                </span>
              </div>

              <div className="border-t border-dashed border-gray-200 pt-3 flex flex-col xs:flex-row justify-between sm:items-center gap-1">
                <span className="text-xs sm:text-sm font-extrabold text-gray-900">Total Estimated Cost:</span>
                <span className="text-base sm:text-lg font-black text-green-700">
                  LKR ~{totalCostLkr.toLocaleString()}
                </span>
              </div>
            </div>

            <p className="text-[10px] sm:text-xs text-gray-500 leading-normal font-medium bg-white p-2.5 rounded-lg border border-gray-100 flex gap-2">
              <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
              <span>
                <strong>Note:</strong> Entrance tickets must be purchased separately at the national park gate. The conversion rate of USD to LKR is subject to current exchange rates.
              </span>
            </p>
          </div>
        )}

        <div className="pt-2 sm:pt-4">

          <div className="flex items-center text-xs sm:text-sm text-blue-700 mb-4 sm:mb-6 bg-blue-50/65 border border-blue-100 p-3 sm:p-4 rounded-2xl">
            <ShieldCheck className="text-blue-600 mr-2.5 shrink-0" size={20} />
            <span>Once booked, you will be redirected to chat with {selectedDriverName ? selectedDriverName.split(' ')[0] : 'your driver'} to coordinate pickup.</span>
          </div>

          {activeBooking ? (
            <button
              type="button"
              onClick={() => navigate(`/chat/${activeBooking.id}`)}
              className="w-full bg-linear-to-r from-amber-600 to-orange-500 hover:from-amber-700 hover:to-orange-600 text-white font-bold py-3.5 sm:py-4 rounded-2xl text-base sm:text-lg transition shadow-md hover:shadow-lg transform active:scale-95 flex justify-center items-center cursor-pointer"
            >
              Go to Current Chat & Coordinator
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCheckout}
              disabled={isSubmitting || checkingActive}
              className="w-full bg-linear-to-r from-green-700 to-emerald-600 hover:from-green-800 hover:to-emerald-700 text-white font-bold py-3.5 sm:py-4 rounded-2xl text-base sm:text-lg transition shadow-md hover:shadow-lg transform active:scale-95 flex justify-center items-center disabled:bg-gray-400 cursor-pointer"
            >
              {isSubmitting ? (
                <><Loader2 className="animate-spin mr-2" size={20} /> Processing...</>
              ) : (
                "Confirm Booking & Start Chat"
              )}
            </button>
          )}
        </div>
      </form>

      <LoginModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      <AlertModal
        isOpen={alertConfig.isOpen}
        onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
      />
    </div>
  );
}
