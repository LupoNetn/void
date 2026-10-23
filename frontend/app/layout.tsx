import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Relay — Notification infrastructure',
  description: 'Deliver and observe every product notification from one workspace.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
