import styles from './page.module.css';

const OWNERS = [
  {
    id: 1,
    name: 'Owner One',
    role: 'Co-Founder & Pack Specialist',
    description: 'A lifelong collector with an eye for sealed product investments. Dedicated to curating the best selection of modern and vintage boxes.',
    image: '/assets/4223.JPG', // Placeholder for actual photo
  },
  {
    id: 2,
    name: 'Owner Two',
    role: 'Co-Founder & Singles Expert',
    description: 'Specializes in high-grade singles and grading submissions. Always hunting for the next perfect gem mint 10.',
    image: '/assets/4225.JPG', // Placeholder
  },
  {
    id: 3,
    name: 'Owner Three',
    role: 'Co-Founder & Operations',
    description: 'Ensures that every order is packed securely and ships fast. Passionate about delivering the ultimate customer experience.',
    image: '/assets/4226.JPG', // Placeholder
  }
];

export default function About() {
  return (
    <div className={`container ${styles.container}`}>
      <section className={styles.header}>
        <h1 className="text-gradient">About Top Rated</h1>
        <p className={styles.lead}>
          We are more than just a store; we are collectors serving collectors. Our goal is to provide a premium, transparent, and exciting experience for everyone in the hobby.
        </p>
      </section>

      <section className={styles.teamSection}>
        <h2>Meet the Owners</h2>
        <div className={styles.teamGrid}>
          {OWNERS.map((owner) => (
            <div key={owner.id} className="glass-panel">
              <div className={styles.imageWrapper}>
                <img src={owner.image} alt={owner.name} className={styles.image} />
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
