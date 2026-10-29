import type { Metadata, Viewport } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import ChatbotWidget from '@/components/ChatbotWidget';
import { FavoritosProvider } from '@/context/FavoritosContext';
import AvisoDatosPersonales from '@/components/AvisoDatosPersonales';
import PiePagina from '@/components/PiePagina';
import BotonSubir from '@/components/ui/BotonSubir';

export const metadata: Metadata = {
  title: 'Cholets Turístico El Alto',
  description: 'Descubre locales y cholets de El Alto, Bolivia: La Ceja, Río Seco, Puente Vela y más.',
  applicationName: 'Cholets Turístico El Alto',
  // iPhone: al "Agregar a inicio" se abre a pantalla completa con este nombre.
  // Los iconos salen de app/icon.png y app/apple-icon.png; el manifiesto, de app/manifest.ts.
  appleWebApp: { capable: true, title: 'Cholets El Alto', statusBarStyle: 'default' },
};

// Color de la barra del celular cuando la app esta abierta.
export const viewport: Viewport = {
  themeColor: '#6117ab',
};

// Tipografia: Plus Jakarta Sans en titulos (fuerte, como el titulo del hero) e
// Inter en el texto. next/font las guarda junto a la pagina: el navegador no
// pide nada a Google.
const fuenteTexto = Inter({ subsets: ['latin'], variable: '--fuente-texto', display: 'swap' });
const fuenteTitulos = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--fuente-titulos', display: 'swap' });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${fuenteTexto.variable} ${fuenteTitulos.variable}`}>
      <body>
        <AuthProvider>
          <FavoritosProvider>
            <Navbar />
            <AvisoDatosPersonales />
            <main className="min-h-[calc(100vh-86px)]">{children}</main>
            <PiePagina />
            <BotonSubir />
            <ChatbotWidget />
          </FavoritosProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
