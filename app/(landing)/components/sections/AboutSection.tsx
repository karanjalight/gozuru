import Image from "next/image";
import Link from "next/link";

export function KochiApp() {
  const appFeatures = [
    {
      title: "Verified Local Experts",
      icon: (
        <svg
          className="w-7 h-7 text-current"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect x="3" y="3" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.8" />
          <rect x="14" y="3" width="7" height="5" rx="2" stroke="currentColor" strokeWidth="1.8" />
          <rect x="14" y="11" width="7" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
          <rect x="3" y="13" width="7" height="8" rx="2" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      ),
    },
    {
      title: "Book by Availability",
      icon: (
        <svg
          className="w-7 h-7 text-current"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect x="6" y="3" width="12" height="18" rx="2" stroke="currentColor" strokeWidth="1.8" />
          <path d="M9 8h6M9 12h4M9 16h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      title: "Mini Itinerary Included",
      icon: (
        <svg
          className="w-7 h-7 text-current"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 8v4l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      title: "Messaging & Meet-up Details",
      icon: (
        <svg
          className="w-7 h-7 text-current"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M5 5h14a2 2 0 0 1 2 2v6.5a2 2 0 0 1-2 2H9.5L6 19.5V15H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      title: "Secure Payments & Deposits",
      icon: (
        <svg
          className="w-7 h-7 text-current"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect x="3" y="8" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M8 8V7a4 4 0 0 1 8 0v1"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      title: "Reviews & Quality Ranking",
      icon: (
        <svg
          className="w-7 h-7 text-current"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M18 15V11a6 6 0 1 0-12 0v4l-1.5 3h15L18 15Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M10 19a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      ),
    },
  ];

  return (
    <section 
      className="py-8 bg-muted/30"
      aria-labelledby="kochi-app-heading"
    >
      <div className="w-full max-w-[1300px] mx-auto px-6 sm:px-6 lg:px-8">
        

        {/* First Content Block - Feature Grid + Your Customized Dashboard */}
        <div className="mb-20 lg:mb-42">
          {/* Feature Grid */}
          <div className="mb-12">
            <ul className="grid gap-6 lg:gap-8 grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 list-none m-0 p-0">
              {appFeatures.map((feature) => (
                <li
                  key={feature.title}
                  className="rounded-3xl border border-border bg-card px-6 py-8 lg:px-10 lg:py-8 flex flex-col items-center justify-center text-center min-h-[160px] shadow-sm"
                  role="article"
                  aria-labelledby={`feature-${feature.title.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <div 
                    className="min-w-[44px] min-h-[44px] w-16 h-16 lg:w-18 lg:h-18 rounded-full bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900 flex items-center justify-center mb-4"
                    aria-hidden="true"
                  >
                    {feature.icon}
                  </div>
                  <h3
                    id={`feature-${feature.title.toLowerCase().replace(/\s+/g, '-')}`}
                    className="text-foreground text-base sm:text-lg lg:text-base font-semibold"
                    style={{ fontFamily: "'Outfit', sans-serif" }}
                  >
                    {feature.title}
                  </h3>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid lg:grid-cols-2 lg:mt-10 gap-12 lg:gap-16 items-center">
            {/* Left Side - Text */}
            <div className="order-2 lg:order-1">
              <h3
                className="font-bold text-3xl lg:text-4xl text-foreground mb-4"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                Why Travel?
              </h3>
              <h4
                className="text-lg lg:text-xl text-muted-foreground mb-6"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                Curiosity is the most progressive expression of being human.
              </h4>
              <p 
                className="text-muted-foreground mb-8 leading-relaxed" 
                style={{ 
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: "18px",
                  lineHeight: "28px"
                }}
              >
                In a world of meaningful travel, curiosity builds up: How do people
                live here? What’s exciting about tech in this city? Can I meet the
                person who makes the pots, curates the art scene, or knows the
                nightlife like a craft?
              </p>

              <p
                className="text-muted-foreground mb-8 leading-relaxed"
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: "18px",
                  lineHeight: "28px",
                }}
              >
                GOZURU connects curious travelers with knowledgeable, hard-to-find
                local experts, masters, and curators—people who practice their
                craft and can guide you through it. See their availability, rates,
                and book a session that fits your trip.
              </p>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/sign-up"
                  className="inline-flex items-center justify-center rounded-full bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                >
                  Sign up
                </Link>
                <Link
                  href="/about"
                  className="inline-flex items-center justify-center rounded-full border border-border bg-background/60 px-5 py-2.5 text-sm font-semibold text-foreground shadow-sm transition hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Learn more
                </Link>
              </div>
            
            </div>

            {/* Right Side - Illustration */}
            <div className="order-1 lg:order-2 flex items-center justify-center lg:justify-end h-full">
              <div className="relative w-full h-60 lg:h-[380px] rounded-3xl overflow-hidden bg-muted">
                <Image 
                  src="https://images.pexels.com/photos/1471843/pexels-photo-1471843.jpeg" 
                  alt="Travelers connecting with local experts on GOZURU"
                  width={600}
                  height={500}
                  className="absolute inset-0 w-full h-full object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Second Content Block - A Platform For Assessment Professionals */}
        <div>
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Side - Illustration */}
            <div className="  flex items-center justify-center lg:justify-end h-full">
              <div className="relative w-full h-60 lg:h-[380px] rounded-3xl overflow-hidden bg-muted">
                <Image 
                  src="https://images.pexels.com/photos/13033067/pexels-photo-13033067.jpeg" 
                  alt="Expert guide profile and booking tools on GOZURU"
                  width={600}
                  height={500}
                  className="absolute inset-0 w-full h-full object-cover "
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
                  loading="lazy"
                />
              </div>
            </div>

            {/* Right Side - Text */}
            <div>
              <h3 className="font-bold text-3xl lg:text-4xl text-foreground mb-4" style={{ fontFamily: "'Outfit', sans-serif" }}>
                Built for Experts & Guides
              </h3>
              <h4 className="text-lg lg:text-xl text-muted-foreground mb-6" style={{ fontFamily: "'Outfit', sans-serif" }}>
                Meet amazing people. Earn money. Showcase your skill.
              </h4>
              <p 
                className="text-muted-foreground mb-8 leading-relaxed" 
                style={{ 
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: "18px",
                  lineHeight: "28px"
                }}
              >
                List your expertise with clear offerings and time slots (1–2 hours,
                2–4 hours, half-day, or full-day). Set your own rates, share a
                mini-itinerary, and get bookings with structured meet-up and payment
                procedures. After a successful tour, payouts are released after a
                short holding period to help resolve any issues fairly.
              </p>
            </div>
          </div>
        </div>

        {/* Thirs Content Block - Your Customized Dashboard */}
        <div className="mt-20 lg:mt-32">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Side - Text */}
            <div className="order-2 lg:order-1">
              <h3 className="font-bold text-3xl lg:text-4xl text-foreground mb-4" style={{ fontFamily: "'Outfit', sans-serif" }}>
                Today you’re the local expert, tomorrow the curious traveler.
              </h3>
              <h4 className="text-lg lg:text-xl text-muted-foreground mb-6" style={{ fontFamily: "'Outfit', sans-serif" }}>
                Reward your curiosity with meaningful connections.
              </h4>
              <p 
                className="text-muted-foreground mb-8 leading-relaxed" 
                style={{ 
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: "18px",
                  lineHeight: "28px"
                }}
              >
                Explore your field of interest with a verified local expert guide—
                art, architecture, nightlife, music, medical, manufacturing,
                research, tech, and more. Book a slot, get a clear meet-up plan,
                and enjoy a guided discovery that’s social, professional, and
                genuinely local.
              </p> 
            </div>

            {/* Right Side - Illustration */}
            <div className="order-1 lg:order-2 flex items-center justify-center lg:justify-end h-full">
              <div className="relative w-full h-60 lg:h-[380px] rounded-3xl overflow-hidden bg-muted">
                <Image 
                  src="https://images.pexels.com/photos/3752835/pexels-photo-3752835.jpeg" 
                  alt="A meaningful local experience booked on GOZURU"
                  width={600}
                  height={500}
                  className="absolute inset-0 w-full h-full object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>

        
      </div>
    </section>
  );
}

