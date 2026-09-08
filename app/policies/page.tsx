import Link from 'next/link';
import styles from './page.module.css';

export const metadata = {
  title: 'Policies | Top Rated',
  description:
    'Privacy, shipping, returns, and terms of service for Top Rated Cards & Collectibles.',
};

export default function PoliciesPage() {
  return (
    <div className={`container ${styles.page}`}>
      <header className={styles.header}>
        <p className={styles.kicker}>Customer Care</p>
        <h1 className="text-gradient">Privacy, Shipping, Returns & Terms</h1>
        <p className={styles.lead}>
          These policies describe how Top Rated Cards &amp; Collectibles protects your
          information, ships your orders, handles returns, and governs purchases made
          through our store.
        </p>
      </header>

      <nav className={styles.quickLinks} aria-label="Policy sections">
        <Link href="#privacy-policy">Privacy Policy</Link>
        <Link href="#shipping-policy">Shipping Policy</Link>
        <Link href="#returns-policy">Returns &amp; Refunds</Link>
        <Link href="#terms-of-service">Terms of Service</Link>
      </nav>

      <div className={styles.content}>
        <section id="privacy-policy" className={`glass-panel ${styles.card}`}>
          <h2>Privacy Policy</h2>
          <p>
            Top Rated Cards &amp; Collectibles values your privacy. We collect only the
            information needed to provide a secure, efficient, and personalized shopping
            experience.
          </p>

          <h3>Information We Collect</h3>
          <ul>
            <li>Contact information, including name, email address, phone number, and mailing address.</li>
            <li>Order details such as payment information, product selections, shipping preferences, and transaction history.</li>
            <li>Account information, including login credentials, saved addresses, wish lists, and purchase activity.</li>
            <li>Website usage information, such as browsing activity, device information, and cookies to improve store functionality and service.</li>
          </ul>

          <h3>How We Use Your Information</h3>
          <ul>
            <li>To process and fulfill orders, including shipping and order updates.</li>
            <li>To communicate with you about your order, product availability, support requests, and account activity.</li>
            <li>To improve customer experience, store security, inventory accuracy, and product recommendations.</li>
            <li>To protect against fraud, abuse, or unauthorized transactions.</li>
          </ul>

          <h3>Information Sharing</h3>
          <p>
            We do not sell your personal information. We may share limited information with
            trusted service providers who help operate our store, process payments, ship orders,
            and support customer service. These providers are contractually required to use your
            information only for the services we request and to protect it appropriately.
          </p>

          <h3>Cookies &amp; Tracking</h3>
          <p>
            We may use cookies, analytics tools, and similar technologies to remember your session,
            track store performance, and improve browsing experience. You may disable cookies in
            your browser settings, though some website features may not function properly as a result.
          </p>

          <h3>Your Rights</h3>
          <p>
            You may request access to, correction of, or deletion of your personal information at any
            time by contacting us through the contact page or by phone. We will respond as required by
            applicable law and business policy.
          </p>

          <p>
            We retain personal information only as long as necessary to provide service, comply with legal
            obligations, resolve disputes, and enforce our policies.
          </p>
        </section>

        <section id="shipping-policy" className={`glass-panel ${styles.card}`}>
          <h2>Shipping Policy</h2>
          <p>
            We process and ship orders as quickly as possible. Orders are typically fulfilled within 1–3
            business days, depending on product availability, packaging needs, and order volume.
          </p>

          <h3>Shipping Areas</h3>
          <p>
            We currently ship within the United States and to select destinations where permitted by law and
            carrier availability. Some items, such as high-value cards or sealed products, may require
            signature confirmation or additional handling.
          </p>

          <h3>Shipping Rates &amp; Timing</h3>
          <ul>
            <li>Shipping costs are calculated during checkout based on package size, weight, and destination.</li>
            <li>Estimated delivery times are provided at checkout and may vary by shipping method and carrier delays.</li>
            <li>Orders are not shipped on weekends or federal holidays unless otherwise noted.</li>
          </ul>

          <h3>Address Accuracy</h3>
          <p>
            Please verify your shipping address before placing an order. Top Rated is not responsible for
            delays, losses, or misdeliveries caused by incorrect or incomplete addresses provided by the
            customer.
          </p>

          <h3>Damaged or Lost Packages</h3>
          <p>
            If a package arrives damaged, contact us within 48 hours of delivery with photos and order
            information so we can work with the carrier and resolve the issue promptly. If a shipment is
            marked lost or delayed by the carrier, we will assist with a claim or replacement when eligible.
          </p>
        </section>

        <section id="returns-policy" className={`glass-panel ${styles.card}`}>
          <h2>Returns &amp; Refunds</h2>
          <p>
            We want every purchase to meet your expectations. If you are unhappy with your order, please
            contact us promptly so we can help resolve the issue.
          </p>

          <h3>Return Window</h3>
          <p>
            Most unopened and undamaged items may be returned within 14 days of delivery. Some items,
            including opened products, graded cards, personalized products, or items sold as final sale,
            may not be eligible for returns.
          </p>

          <h3>Condition Requirements</h3>
          <ul>
            <li>Items must be returned in their original condition and packaging.</li>
            <li>Proof of purchase and order information are required for all return requests.</li>
            <li>We reserve the right to refuse returns that appear used, damaged, altered, or not in saleable condition.</li>
          </ul>

          <h3>Refunds</h3>
          <p>
            Approved refunds will be issued to the original payment method once the returned item is received
            and inspected. Shipping charges are generally non-refundable unless the item arrived damaged or
            incorrect.
          </p>

          <h3>Incorrect or Damaged Orders</h3>
          <p>
            If you receive the wrong item, a damaged item, or a product that does not match the listing,
            contact us within 48 hours of delivery. We will provide a replacement, store credit, or refund
            as appropriate.
          </p>
        </section>

        <section id="terms-of-service" className={`glass-panel ${styles.card}`}>
          <h2>Terms of Service</h2>
          <p>
            By placing an order with Top Rated Cards &amp; Collectibles, you agree to the following terms.
          </p>

          <h3>Product Information</h3>
          <p>
            We make every effort to provide accurate product descriptions, pricing, photos, and inventory
            details. However, listing errors, stock changes, and market conditions may occasionally affect
            availability or item condition. We reserve the right to correct errors and cancel orders when
            necessary.
          </p>

          <h3>Payments &amp; Orders</h3>
          <ul>
            <li>Payment must be received in full before an order is processed and shipped.</li>
            <li>We reserve the right to refuse or cancel any order for fraud, pricing errors, or suspicious activity.</li>
            <li>Orders may be adjusted if inventory changes after checkout.</li>
          </ul>

          <h3>Ownership &amp; Risk of Loss</h3>
          <p>
            Ownership and risk of loss transfer to you upon delivery to the carrier for shipment. Once the
            carrier accepts the package, responsibility for delivery and any associated issues rests with the
            shipping carrier unless otherwise stated by law.
          </p>

          <h3>Limitation of Liability</h3>
          <p>
            Top Rated is not liable for incidental, consequential, or indirect damages arising from the use
            of our store, products, or services, except where expressly required by law. Our total liability
            for any claim is limited to the value of the affected order, unless otherwise prohibited by law.
          </p>

          <h3>Contact</h3>
          <p>
            Questions about these policies may be directed to us through the contact page, by phone at
            (707) 620-0783, or by mail at 513 David Clayton Ln., Windsor, CA 95492.
          </p>
        </section>
      </div>

      <p className={styles.updated}>Last updated: September 7, 2026</p>
    </div>
  );
}
