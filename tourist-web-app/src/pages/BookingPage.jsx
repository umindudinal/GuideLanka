import BookingForm from '../components/booking/BookingForm';

export default function BookingPage() {
  return (
    <div className="pt-24 sm:pt-28 pb-12 sm:pb-16 min-h-screen bg-gray-50">

      <div className="absolute top-0 left-0 w-full h-80 sm:h-96 bg-green-800 z-0 overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1549366021-9f761d450615?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center mix-blend-overlay"></div>
      </div>

      <div className="container relative z-10 mx-auto px-4 sm:px-6">
        <div className="text-center mb-6 sm:mb-10">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-2 sm:mb-3 drop-shadow-md">
            Plan Your Adventure
          </h1>
          <p className="text-green-100 text-sm sm:text-base md:text-lg max-w-xl mx-auto px-2">
            Secure your spot in seconds. Our smart system ensures you get the best out of your wildlife experience.
          </p>
        </div>

        <BookingForm />
      </div>

    </div>
  );
}
