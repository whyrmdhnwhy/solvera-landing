import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from '../../styles/Dashboard.module.css';

export default function DashboardLayout({ children }) {
  const router = useRouter();

  const navItems = [
    { name: 'Overview', path: '/dashboard' },
  ];

  return (
    <div className={styles.container}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.logo}>SOLVERA</div>
        <nav>
          {navItems.map((item) => (
            <Link href={item.path} key={item.path}>
              <div
                className={`${styles.navItem} ${
                  router.pathname === item.path ? styles.active : ''
                }`}
              >
                {item.name}
              </div>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
}
