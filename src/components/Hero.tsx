import { ArrowRight } from 'lucide-react';

const Hero = () => {
  return (
    <section className="relative w-full h-[600px] overflow-hidden">
      {/* Background Image Placeholder */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ 
          backgroundImage: 'linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url("https://images.unsplash.com/photo-1599408162165-8b753ca992aa?auto=format&fit=crop&q=80&w=2000")' 
        }}
      />
      
      <div className="relative max-w-container mx-auto h-full px-4 md:px-margin-desktop flex flex-col justify-center items-start gap-6">
        {/* Live Badge */}
        <div className="flex items-center gap-2 bg-secondary/90 backdrop-blur-sm px-3 py-1 rounded-full">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
          <span className="text-[10px] font-bold text-white uppercase tracking-widest">Live: Kentucky Derby Qualifiers</span>
        </div>

        {/* Content */}
        <h1 className="text-white max-w-2xl font-bold text-headline-xl leading-tight">
          Precision Racing for the Elite Spectator
        </h1>
        <p className="text-white/80 max-w-lg text-body-lg">
          Experience the pinnacle of equine sports with real-time analytics, high-stakes insights, and world-class coverage of every major track.
        </p>

        {/* Buttons */}
        <div className="flex items-center gap-4 mt-4">
          <button className="bg-secondary text-white px-8 py-4 rounded-md font-semibold flex items-center gap-2 hover:bg-opacity-90 transition-all">
            View Live Matches
            <ArrowRight className="w-4 h-4" />
          </button>
          <button className="bg-white/10 backdrop-blur-md text-white border border-white/20 px-8 py-4 rounded-md font-semibold hover:bg-white/20 transition-all">
            Historical Data
          </button>
        </div>
      </div>
    </section>
  );
};

export default Hero;
