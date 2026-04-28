import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

export default function HomePage() {
  const { t } = useLanguage();

  const STEPS = [
    { n: '01', title: t('home.step1Title'), desc: t('home.step1Desc'), img: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=500' },
    { n: '02', title: t('home.step2Title'), desc: t('home.step2Desc'), img: 'https://images.unsplash.com/photo-1556742111-a301076d9d18?w=500' },
    { n: '03', title: t('home.step3Title'), desc: t('home.step3Desc'), img: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=500' },
  ];

  const TRUST = [
    { icon: '🔒', title: t('home.feature1Title'), desc: t('home.feature1Desc') },
    { icon: '📱', title: t('home.feature2Title'), desc: t('home.feature2Desc') },
    { icon: '🚚', title: t('home.feature3Title'), desc: t('home.feature3Desc') },
    { icon: '⭐', title: t('home.feature4Title'), desc: t('home.feature4Desc') },
  ];

  return (
    <div className="bg-white">

      {/* HERO */}
      <section className="relative overflow-hidden" style={{ height: '85vh', minHeight: '520px' }}>
        <img
          src="https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=1600"
          alt="DG Market Hero"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to right,rgba(0,0,0,0.75),rgba(0,0,0,0.3) 60%,transparent)' }} />
        <div className="relative h-full flex items-center">
          <div className="max-w-7xl mx-auto px-6 w-full">
            <div style={{ maxWidth: '560px' }}>
              <p className="text-yellow-400 text-xs font-bold tracking-widest uppercase mb-3">
                {t('home.ethiopiaMarketplace')}
              </p>
              <h1 className="text-white font-black uppercase leading-none mb-6" style={{ fontSize: 'clamp(3rem,8vw,5.5rem)' }}>
                {t('home.heroTitle1')}<br />
                <span className="text-yellow-400">{t('home.heroTitle2')}</span>
              </h1>
              <p className="text-gray-200 text-lg mb-8">{t('home.heroDesc')}</p>
              <div className="flex gap-4 flex-wrap">
                <Link to="/products" className="bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-black text-sm px-8 py-4 uppercase tracking-widest transition-colors">
                  {t('home.shopNow')}
                </Link>
                <Link to="/register" className="border-2 border-white text-white hover:bg-white hover:text-gray-900 font-bold text-sm px-8 py-4 uppercase tracking-widest transition-colors">
                  {t('home.startSelling')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STRIP */}
      <div className="bg-green-800 text-white py-3 overflow-x-auto">
        <div className="flex gap-8 px-6 text-xs font-bold tracking-widest uppercase whitespace-nowrap">
          <span>{t('home.marquee1')}</span><span className="opacity-40">|</span>
          <span>{t('home.marquee2')}</span><span className="opacity-40">|</span>
          <span>{t('home.marquee3')}</span><span className="opacity-40">|</span>
          <span>{t('home.marquee4')}</span><span className="opacity-40">|</span>
          <span>{t('home.marquee5')}</span><span className="opacity-40">|</span>
          <span>{t('home.marquee7')}</span>
        </div>
      </div>

      {/* SPLIT BANNER */}
      <section className="grid md:grid-cols-2">
        <div className="relative overflow-hidden group" style={{ height: '320px' }}>
          <img src="https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800" alt="Buy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
            <p className="text-yellow-400 text-xs font-bold tracking-widest uppercase mb-2">{t('home.forBuyers')}</p>
            <h3 className="text-white font-black text-3xl uppercase mb-4">{t('home.findAnything')}</h3>
            <Link to="/products" className="bg-white text-gray-900 font-black text-xs px-6 py-3 uppercase tracking-widest hover:bg-yellow-400 transition-colors">
              {t('home.browseProducts')}
            </Link>
          </div>
        </div>
        <div className="relative overflow-hidden group" style={{ height: '320px' }}>
          <img src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800" alt="Sell"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          <div className="absolute inset-0 bg-black/50" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
            <p className="text-yellow-400 text-xs font-bold tracking-widest uppercase mb-2">{t('home.forSellers')}</p>
            <h3 className="text-white font-black text-3xl uppercase mb-4">{t('home.startSell')}</h3>
            <Link to="/register" className="bg-yellow-400 text-gray-900 font-black text-xs px-6 py-3 uppercase tracking-widest hover:bg-white transition-colors">
              {t('home.createAccount')}
            </Link>
          </div>
        </div>
      </section>

      {/* TRUST */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-10">
            <p className="text-xs font-bold tracking-widest text-green-800 uppercase mb-1">{t('home.whySuuqii')}</p>
            <h2 className="text-3xl font-black text-gray-900 uppercase">{t('home.builtForTrust')}</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {TRUST.map((f) => (
              <div key={f.title} className="text-center">
                <div className="text-4xl mb-3">{f.icon}</div>
                <h3 className="font-black text-gray-900 text-sm uppercase tracking-wide mb-1">{f.title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <p className="text-xs font-bold tracking-widest text-green-800 uppercase mb-1">{t('home.simpleProcess')}</p>
          <h2 className="text-3xl font-black text-gray-900 uppercase">{t('home.howItWorks')}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {STEPS.map((step) => (
            <div key={step.n} className="group">
              <div className="relative overflow-hidden mb-4" style={{ height: '192px' }}>
                <img src={step.img} alt={step.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute top-4 left-4 bg-yellow-400 text-gray-900 font-black text-lg flex items-center justify-center" style={{ width: '40px', height: '40px' }}>
                  {step.n}
                </div>
              </div>
              <h3 className="font-black text-gray-900 uppercase tracking-wide mb-1">{step.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden" style={{ height: '256px' }}>
        <img src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600" alt="CTA"
          className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: 'rgba(20,83,45,0.82)' }} />
        <div className="relative h-full flex items-center justify-center text-center px-4">
          <div>
            <h2 className="text-white font-black text-4xl uppercase mb-4">{t('home.readyToSell')}</h2>
            <p className="text-green-100 mb-6">{t('home.joinSellers')}</p>
            <Link to="/register" className="bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-black text-sm px-10 py-4 uppercase tracking-widest transition-colors inline-block">
              {t('home.getStartedFree')}
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-900 text-gray-400 py-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
            <span className="text-white font-black text-xl uppercase tracking-tight">DG MARKET</span>
            <p className="text-xs text-center">{t('home.ethiopiaMarketplace')} — {t('home.marquee4')} — {t('home.marquee2')}</p>
            <div className="flex gap-4 text-xs">
              <Link to="/products" className="hover:text-white transition-colors">{t('home.footerBrowse')}</Link>
              <Link to="/register" className="hover:text-white transition-colors">{t('home.footerStartSelling')}</Link>
              <Link to="/login" className="hover:text-white transition-colors">{t('home.footerSignIn')}</Link>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6 text-center text-xs text-gray-600 space-y-1">
            <p>© 2025 <span className="text-gray-400 font-semibold">Dinkisa Geremew</span>. All rights reserved.</p>
            <p className="text-gray-700">DG Market — Built for Ethiopia 🇪🇹</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
