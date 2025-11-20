import Header from "./components/Header_first";
export default function Body() {
  const ImagePlaceholder = ({ className = "" }) => (
    <div className={`bg-gray-200 border-2 border-gray-400 flex items-center justify-center ${className}`}>
      <svg className="w-1/2 h-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <line x1="0" y1="0" x2="100%" y2="100%" vectorEffect="non-scaling-stroke" />
        <line x1="100%" y1="0" x2="0" y2="100%" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );

  return (
    <div className="bg-gray-50">
      {/* Hero Section */}
      <Header />
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-5xl font-bold text-black mb-6 leading-tight">Your Best Value Proposition</h1>
            <p className="text-gray-600 mb-8 leading-relaxed">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
            </p>
            <button className="px-6 py-3 bg-gray-600 text-white rounded hover:bg-gray-700 transition">
              Start free trial
            </button>
          </div>
          <ImagePlaceholder className="h-64" />
        </div>
      </section>

      {/* Divider */}
      <div className="h-2 bg-gray-800" />

      {/* Publication Section */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-4">The Publication</h2>
          <p className="text-center text-gray-600 mb-12">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
          </p>
          <div className="flex justify-center gap-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="w-32 h-16 bg-gray-400 rounded" />
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="h-2 bg-gray-800" />

      {/* Features Section */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4">Your Best Value Proposition</h2>
              <p className="text-gray-600 mb-4 leading-relaxed">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
              </p>
              <p className="text-gray-600 mb-8 leading-relaxed">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
              </p>
              <button className="px-6 py-2 border-2 border-gray-800 text-black rounded hover:bg-gray-800 hover:text-white transition">
                Learn More
              </button>
            </div>
            <ImagePlaceholder className="h-64" />
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="h-2 bg-gray-800" />

      {/* Plans Section */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-2">Your Best Value Proposition</h2>
          <p className="text-center text-gray-600 mb-12 italic">
            "If you don't buy this app, you won't become the superhero you were meant to be"
          </p>
          
          <div className="grid grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-black rounded-lg overflow-hidden">
                <div className="p-6">
                  <p className="text-xs text-gray-400 mb-1">PLAN AND LAUNCH</p>
                  <h3 className="text-xl font-bold text-white">Marketing</h3>
                </div>
                <ImagePlaceholder className="h-40 rounded-b-lg" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer Divider */}
      <div className="h-2 bg-gray-800" />
    </div>
  );
}
