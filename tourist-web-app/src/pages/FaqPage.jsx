import { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, BookOpen, ShieldCheck, Compass, Info } from 'lucide-react';

export default function FaqPage() {
  const [openIndex, setOpenIndex] = useState(null);
  const [activeTab, setActiveTab] = useState('all');

  const categories = [
    { id: 'all', label: 'All Questions' },
    { id: 'booking', label: 'Bookings & Safaris' },
    { id: 'tracking', label: 'Live Tracking' },
    { id: 'rules', label: 'Park Guidelines' }
  ];

  const faqs = [
    {
      category: 'booking',
      question: 'How do I book a safari vehicle on GuideLanka?',
      answer: 'You can search for verified safari drivers in the "Find a Driver" page, choose a driver based on their reviews and profile, and request a booking through the booking portal by specifying your date, block selection, and passenger count.'
    },
    {
      category: 'tracking',
      question: 'How does live safari tracking work?',
      answer: 'Once you book a verified safari vehicle and log into your tourist account, you will be able to view the real-time GPS location of your safari jeep on the "Live Safari Map" during your safari hours.'
    },
    {
      category: 'tracking',
      question: 'Are animal sightings updated in real-time?',
      answer: 'Yes! Safari drivers inside Yala National Park use the GuideLanka mobile app to report wildlife sightings (such as leopards, elephants, or bears) immediately. These sightings are verified and displayed on the tourist live map for up to 1 hour depending on the animal type.'
    },
    {
      category: 'rules',
      question: 'Can I step out of the safari vehicle during the tour?',
      answer: 'No, stepping out of the vehicle is strictly prohibited for your own safety and the protection of the animals. Visitors must stay inside the safari jeep at all times unless at designated, ranger-approved resting zones.'
    },
    {
      category: 'rules',
      question: 'Is flash photography allowed inside the national park?',
      answer: 'Flash photography is strictly prohibited inside Yala National Park. Bright flashes blind, startle, and cause severe distress to wild animals. Please disable your camera flash before entering the park.'
    },
    {
      category: 'booking',
      question: 'What is included in the safari vehicle booking price?',
      answer: 'The safari booking price covers the vehicle rental, fuel, and the services of the registered driver-guide. National Park entrance tickets and government service charges are paid separately at the park entrance gate.'
    }
  ];

  const toggleFaq = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const filteredFaqs = activeTab === 'all'
    ? faqs
    : faqs.filter(faq => faq.category === activeTab);

  return (
    <div className="pt-20 sm:pt-24 pb-12 sm:pb-16 min-h-screen bg-gray-50/50">

      <div className="relative bg-linear-to-r from-green-900 to-emerald-950 py-12 sm:py-16 md:py-20 text-white overflow-hidden mb-8 sm:mb-12 shadow-sm">
        <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1549366021-9f761d450615?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-linear-to-t from-green-950 via-green-900/60 to-transparent"></div>

        <div className="container mx-auto px-4 max-w-6xl relative z-10 text-center space-y-3 sm:space-y-4">
          <div className="inline-flex items-center gap-1.5 sm:gap-2 bg-white/10 backdrop-blur-md px-3.5 sm:px-4 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest text-green-300 border border-white/10 shadow-inner">
            <HelpCircle size={13} className="sm:w-3.5 sm:h-3.5" />
            Support Center
          </div>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight drop-shadow-md">
            FAQ & Help Center
          </h1>
          <p className="text-green-100/90 text-xs sm:text-sm md:text-base max-w-xl mx-auto font-medium px-2">
            Find quick answers to common questions about safari bookings, real-time tracking, wildlife sightings, and park regulations.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-3xl space-y-6 sm:space-y-8">

        <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 mb-4 sm:mb-6">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => {
                setActiveTab(category.id);
                setOpenIndex(null);
              }}
              className={`px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-2xl font-bold text-[11px] sm:text-xs uppercase tracking-wider transition-all duration-200 border cursor-pointer ${
                activeTab === category.id
                  ? 'bg-green-700 text-white border-green-700 shadow-md shadow-green-700/10'
                  : 'bg-white text-gray-600 border-gray-150 hover:bg-gray-50'
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>

        <div className="space-y-3 sm:space-y-4">
          {filteredFaqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-xs hover:shadow-md transition duration-200"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full px-4 sm:px-6 py-3.5 sm:py-5 text-left flex items-center justify-between gap-3 sm:gap-4 font-bold text-gray-800 hover:text-green-700 transition cursor-pointer"
                >
                  <span className="text-sm sm:text-base md:text-lg leading-snug">{faq.question}</span>
                  {isOpen ? (
                    <ChevronUp className="text-green-600 shrink-0" size={18} />
                  ) : (
                    <ChevronDown className="text-gray-400 shrink-0" size={18} />
                  )}
                </button>

                {isOpen && (
                  <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-1 border-t border-gray-50 text-xs sm:text-sm md:text-base text-gray-600 leading-relaxed bg-gray-50/30">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-gray-100 shadow-xs text-center space-y-3 sm:space-y-4 mt-8 sm:mt-12">
          <div className="w-11 sm:w-12 h-11 sm:h-12 bg-green-50 text-green-700 rounded-2xl flex items-center justify-center mx-auto border border-green-100">
            <Info size={22} className="sm:w-6 sm:h-6" />
          </div>
          <h3 className="text-lg sm:text-xl font-extrabold text-gray-800">Still have questions?</h3>
          <p className="text-xs sm:text-sm text-gray-500 max-w-sm mx-auto leading-relaxed">
            If you need further assistance with your booking or have specific inquiries, please contact our support team. We are here to help!
          </p>
          <div className="pt-2">
            <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">SUPPORT HOTLINE</span>
            <span className="text-base sm:text-lg font-black text-green-700">+94 77 123 4567</span>
          </div>
        </div>

      </div>

    </div>
  );
}
