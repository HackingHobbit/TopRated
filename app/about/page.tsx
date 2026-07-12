import Image from 'next/image';
import styles from './page.module.css';

// Owner cards on the About page — the three stylized "trading card" portraits
// Joseph supplied. The image files live in public/assets/ (committed to the
// repo so they render on the live Netlify build, not just locally):
//
//   public/assets/chula-badass.png   ← Chula Badass card
//   public/assets/johnny-bravo.png   ← Johnny Bravo card
//   public/assets/tony-totes.png     ← Tony "Totes" card
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
    name: 'Tony "Totes"',
    role: 'Founder · OG of the Trading Card Game',
    description:
      "The one who started it all — Founders Edition 01/01. Tony's been hauling totes of cardboard since before it was cool, and every box on the wall traces back to his collection. If it's graded, sorted, or shipped, Tony's had a hand in it.",
    image: '/assets/tony-totes.png',
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
