import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';


export default function Navbar() {
  const { language, setLanguage, t } = useLanguage();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      {/* Top bar */}
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xl font-black tracking-tight text-gray-900 uppercase">DG MARKET</span>
        </Link>


        {/* Right actions */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Language */}
          <button onClick={() => setLanguage(language === 'en' ? 'om' : 'en')}
            className="hidden sm:flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-green-800 transition-colors border border-gray-200 px-2.5 py-1.5 rounded-full">
            <span>🌐</span>
            <span>{language === 'en' ? 'OM' : 'EN'}</span>
          </button>

          {user ? (
            <div className="flex items-center gap-2">
              {user.role === 'seller' && (
                <Link to="/seller" className="hidden sm:block text-xs font-semibold text-gray-600 hover:text-green-800 transition-colors">
                  {t('nav.dashboard')}
                </Link>
              )}
              {user.role === 'buyer' && (
                <Link to="/buyer" className="hidden sm:block text-xs font-semibold text-gray-600 hover:text-green-800 transition-colors">
                  {t('nav.dashboard')}
                </Link>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login"
                className="text-xs font-semibold text-gray-700 hover:text-green-800 transition-colors">
                {t('auth.signIn')}
              </Link>
              <Link to="/register"
                className="bg-green-800 hover:bg-green-900 text-white text-xs font-bold px-4 py-2 rounded-full transition-colors">
                {t('auth.register')}
              </Link>
            </div>
          )}

          {/* Mobile menu button */}
          <button onClick={() => setMenuOpen(!menuOpen)} className="lg:hidden text-gray-600 hover:text-gray-900">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="lg:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-3">
          <div className="pt-2 border-t border-gray-100 flex gap-3">
            <button onClick={() => setLanguage(language === 'en' ? 'om' : 'en')}
              className="text-xs font-semibold text-gray-600 border border-gray-200 px-3 py-1.5 rounded-full">
              {language === 'en' ? 'Afaan Oromoo' : 'English'}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
