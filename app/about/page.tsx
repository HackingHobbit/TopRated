import Image from 'next/image';
import styles from './page.module.css';

// Owner cards on the About page. The first two reference the stylized
// "trading card" portraits Joseph attached — drop the image files into
// public/assets/ with the filenames below and they'll render automatically.
//
//   public/assets/chula-badass.png   ← Chula Badass card
//   public/assets/johnny-bravo.png   ← Johnny Bravo card
//
// The third image is one of the original placeholder JPGs from public/assets;
// swap it out the same way (any path under /assets/* works).
const OWNERS = [
  {
    id: 1,
    name: 'Chula Badass',
    role: 'Co-Founder · Sealed & Sports Card Specialist',
    description:
      "Sealed-product savant with an eye for value and an attitude rated 99 across the board. Curates the box wall, runs the team store, and knows every Donruss rookie chase by heart.",
    image: '/assets/chula-badass.png',
  },
  {
    id: 2,
    name: 'Johnny Bravo',
    role: 'Co-Founder · TCG & Hobby Operations',
    description:
      "Pulls heaters, sells heat, repeat. Heads up Top Rated's TCG side — Pokémon, Magic, and One Piece — and personally vets every grading submission before it leaves the counter.",
    image: '/assets/johnny-bravo.png',
  },
  {
    id: 3,
    name: 'The Operations Crew',
    role: 'Logistics, Authentication, and Customer Care',
    description:
      'The behind-the-scenes team that authenticates every signed item, packs every order with care, and answers every question about your collection.',
    image: '/assets/4226.JPG',
  },
];

export default function About() {
  return (
    <div className={`container ${styles.container}`}>
      <section className={styles.header}>
        <h1 className="text-gradient">About Top Rated</h1>
        <p className={styles.lead}>
          We are more than just a store; we are collectors serving collectors.
          Our goal is to provide a premium, transparent, and exciting
          experience for everyone in the hobby.
        </p>
      </section>

      <section className={styles.teamSection}>
        <h2>Meet the Owners</h2>
        <div className={styles.teamGrid}>
          {OWNERS.map((owner) => (
            <div key={owner.id} className="glass-panel">
              <div className={styles.imageWrapper}>
                <Image
                  src={owner.image}
                  alt={owner.name}
                  className={styles.image}
                  width={400}
                  height={400}
                  sizes="(max-width: 600px) 80vw, 320px"
                />
              </div>
              <div className={styles.info}>
                <h3>{owner.name}</h3>
                <span className={styles.role}>{owner.role}</span>
                <p className={styles.description}>{owner.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
