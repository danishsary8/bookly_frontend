import { BookOpen, Facebook, Instagram, Linkedin, Twitter, Youtube } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="mt-16 border-t border-white/70 bg-white/75 backdrop-blur-xl">
      <div className="section-wrap py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-300/40">
                <BookOpen className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Bookly</h3>
            </div>
            <p className="mt-3 text-sm text-slate-600 max-w-xl">
              Bookly is a modern online bookstore helping readers discover great titles faster with curated collections,
              trusted recommendations, and a clean shopping experience.
            </p>
            <div className="mt-4 flex items-center gap-2">
              {[Facebook, Instagram, Twitter, Linkedin, Youtube].map((Icon, idx) => (
                <a
                  key={idx}
                  href="#"
                  className="h-9 w-9 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-orange-600 hover:border-orange-200 grid place-items-center transition-colors"
                  aria-label="Social link"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-900">Company</h4>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li><Link to="/" className="hover:text-slate-900">About</Link></li>
              <li><Link to="/browse" className="hover:text-slate-900">Catalog</Link></li>
              <li><Link to="/favorites" className="hover:text-slate-900">Favorites</Link></li>
              <li><Link to="/#help" className="hover:text-slate-900">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-900">Customer Care</h4>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>Mon - Fri: 8:00 AM - 6:00 PM</li>
              <li>support@bookly.com</li>
              <li>+855 12 345 678</li>
              <li>Phnom Penh, Cambodia</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} Bookly. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-slate-700">Privacy Policy</a>
            <a href="#" className="hover:text-slate-700">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
