const products = window.TopRatedDB.products;
const app = document.querySelector("#app");
const cartDrawer = document.querySelector("[data-cart-drawer]");
const cartCount = document.querySelector("[data-cart-count]");
const cartLines = document.querySelector("[data-cart-lines]");
const cartSubtotal = document.querySelector("[data-cart-subtotal]");
const routeLinks = [...document.querySelectorAll("[data-route-link]")];

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const store = {
  cart: JSON.parse(localStorage.getItem("tr-cart") || "[]"),
  requests: JSON.parse(localStorage.getItem("tr-requests") || "[]"),
  offers: JSON.parse(localStorage.getItem("tr-offers") || "[]"),
  ownerEdits: JSON.parse(localStorage.getItem("tr-owner-edits") || "{}"),
  filters: {
    query: "",
    type: "all",
    category: "all",
    sort: "featured",
  },
};

function product(id) {
  const base = products.find((item) => item.id === id);
  return base ? { ...base, ...(store.ownerEdits[id] || {}) } : null;
}

function allProducts() {
  return products.map((item) => product(item.id));
}

function saveCart() {
  localStorage.setItem("tr-cart", JSON.stringify(store.cart));
}

function saveFlows() {
  localStorage.setItem("tr-requests", JSON.stringify(store.requests));
  localStorage.setItem("tr-offers", JSON.stringify(store.offers));
}

function saveOwnerEdits() {
  localStorage.setItem("tr-owner-edits", JSON.stringify(store.ownerEdits));
}

function image(item) {
  return `
    <div class="product-image">
      <img src="${item.image}" alt="${item.name}" loading="lazy" />
      <span>${item.status}</span>
    </div>
  `;
}

function productCard(item) {
  return `
    <article class="product-card">
      <a href="#product/${item.id}" aria-label="View ${item.name}">
        ${image(item)}
      </a>
      <div class="product-card-body">
        <div class="product-meta">
          <span>${item.category}</span>
          <span>${item.stock > 0 ? `${item.stock} available` : "Sold out"}</span>
        </div>
        <h3><a href="#product/${item.id}">${item.name}</a></h3>
        <p>${item.description}</p>
        <div class="tag-list">${item.tags.slice(0, 4).map((tag) => `<span>${tag}</span>`).join("")}</div>
        <div class="product-actions">
          <strong>${money.format(item.price)}</strong>
          <button type="button" data-add-cart="${item.id}" ${item.stock < 1 ? "disabled" : ""}>Add to cart</button>
        </div>
      </div>
    </article>
  `;
}

function route() {
  closeCart();
  const hash = window.location.hash.replace("#", "") || "home";
  const [page, id] = hash.split("/");
  routeLinks.forEach((link) => link.classList.toggle("is-active", link.dataset.routeLink === page));

  if (page === "shop") renderShop();
  else if (page === "product") renderProduct(id);
  else if (page === "sell") renderSell();
  else if (page === "about") renderAbout();
  else if (page === "visit") renderVisit();
  else if (page === "owner") renderOwner();
  else renderHome();

  window.scrollTo({ top: 0, behavior: "instant" });
  app.focus({ preventScroll: true });
}

function renderHome() {
  const featured = allProducts().sort((a, b) => a.featured - b.featured).slice(0, 8);
  const sealed = allProducts().filter((item) => item.type === "packaged").length;
  const singles = allProducts().filter((item) => item.type === "collectible").length;

  app.innerHTML = `
    <section class="hero commerce-hero">
      <div>
        <span class="eyebrow">Online store prototype</span>
        <h1>Rip sealed. Hunt singles. Trade smarter.</h1>
        <p>
          A Clover-ready storefront for Top Rated Cards & Collectibles: live inventory structure,
          product detail pages, cart flow, want-list requests, and item offers.
        </p>
        <div class="hero-actions">
          <a class="button button-primary" href="#shop">Shop inventory</a>
          <button class="button button-ghost" type="button" data-open-request>Request a card</button>
        </div>
      </div>
      <div class="hero-commerce-panel">
        <img src="assets/4244.JPG" alt="Top Rated card wall and neon sign" />
        <div class="hero-kpis">
          <strong>${products.length}<span>products</span></strong>
          <strong>${sealed}<span>sealed</span></strong>
          <strong>${singles}<span>singles</span></strong>
        </div>
      </div>
    </section>

    <section class="shop-lanes">
      <a href="#shop?type=packaged">
        <span>Sealed, supplies, apparel</span>
        <strong>Packaged products</strong>
      </a>
      <a href="#shop?type=collectible">
        <span>Raw, graded, autos</span>
        <strong>Individual collectibles</strong>
      </a>
      <button type="button" data-open-offer>
        <span>Sell, trade, consign</span>
        <strong>Offer your collection</strong>
      </button>
    </section>

    <section class="section-block">
      <div class="section-head">
        <div>
          <span class="eyebrow">Fresh from the database</span>
          <h2>Featured inventory</h2>
        </div>
        <a class="button button-ghost" href="#shop">View all</a>
      </div>
      <div class="product-grid">${featured.map(productCard).join("")}</div>
    </section>

    <section class="flow-strip">
      <article><span>01</span><h3>Browse</h3><p>Search by product type, player, set, tag, condition, or brand.</p></article>
      <article><span>02</span><h3>Cart</h3><p>Add available products to a cart that is ready for Clover order creation.</p></article>
      <article><span>03</span><h3>Request</h3><p>Send want lists for staff follow-up when the right card is not listed yet.</p></article>
      <article><span>04</span><h3>Offer</h3><p>Start sell, trade, or consignment conversations before visiting the shop.</p></article>
    </section>
  `;
}

function parseShopParams() {
  const hash = window.location.hash;
  const queryString = hash.includes("?") ? hash.split("?")[1] : "";
  const params = new URLSearchParams(queryString);
  if (params.get("type")) store.filters.type = params.get("type");
  if (params.get("search")) store.filters.query = params.get("search");
}

function filteredProducts() {
  const query = store.filters.query.trim().toLowerCase();
  return allProducts()
    .filter((item) => store.filters.type === "all" || item.type === store.filters.type)
    .filter((item) => store.filters.category === "all" || item.category === store.filters.category)
    .filter((item) => {
      if (!query) return true;
      return [item.name, item.brand, item.category, item.description, ...item.tags, ...Object.values(item.attributes)]
        .join(" ")
        .toLowerCase()
        .includes(query);
    })
    .sort((a, b) => {
      if (store.filters.sort === "price-asc") return a.price - b.price;
      if (store.filters.sort === "price-desc") return b.price - a.price;
      if (store.filters.sort === "name") return a.name.localeCompare(b.name);
      return a.featured - b.featured;
    });
}

function renderShop() {
  parseShopParams();
  const categories = ["all", ...new Set(allProducts().map((item) => item.category))];
  const items = filteredProducts();

  app.innerHTML = `
    <section class="page-hero compact">
      <span class="eyebrow">Shop online</span>
      <h1>Searchable inventory, real cart flow.</h1>
      <p>Prototype product data is loaded from <code>db/products.js</code>. Clover can later use the product SKUs and cart lines to create live sales.</p>
    </section>

    <section class="storefront">
      <aside class="filters">
        <h2>Filters</h2>
        <label>
          Search
          <input data-filter-query type="search" value="${store.filters.query}" placeholder="Charizard, Ohtani, sleeves..." />
        </label>
        <label>
          Inventory type
          <select data-filter-type>
            <option value="all" ${store.filters.type === "all" ? "selected" : ""}>All</option>
            <option value="packaged" ${store.filters.type === "packaged" ? "selected" : ""}>Packaged products</option>
            <option value="collectible" ${store.filters.type === "collectible" ? "selected" : ""}>Individual collectibles</option>
          </select>
        </label>
        <label>
          Category
          <select data-filter-category>
            ${categories.map((category) => `<option value="${category}" ${store.filters.category === category ? "selected" : ""}>${category === "all" ? "All categories" : category}</option>`).join("")}
          </select>
        </label>
        <label>
          Sort
          <select data-filter-sort>
            <option value="featured" ${store.filters.sort === "featured" ? "selected" : ""}>Featured</option>
            <option value="price-asc" ${store.filters.sort === "price-asc" ? "selected" : ""}>Price: low to high</option>
            <option value="price-desc" ${store.filters.sort === "price-desc" ? "selected" : ""}>Price: high to low</option>
            <option value="name" ${store.filters.sort === "name" ? "selected" : ""}>Name</option>
          </select>
        </label>
        <button class="button button-primary button-wide" type="button" data-open-request>Can’t find it?</button>
      </aside>
      <div class="catalog-results">
        <div class="results-head">
          <strong>${items.length} products</strong>
          <span>${store.filters.type === "all" ? "All inventory" : store.filters.type === "packaged" ? "Packaged products" : "Individual collectibles"}</span>
        </div>
        <div class="product-grid">${items.length ? items.map(productCard).join("") : `<div class="empty-state"><h3>No matches yet.</h3><p>Try a broader search or send a want-list request.</p></div>`}</div>
      </div>
    </section>
  `;
}

function renderProduct(id) {
  const item = product(id);
  if (!item) {
    app.innerHTML = `<section class="page-hero compact"><h1>Product not found.</h1><p>That item may have sold or moved.</p><a class="button button-primary" href="#shop">Back to shop</a></section>`;
    return;
  }

  const related = allProducts()
    .filter((entry) => entry.id !== item.id && (entry.type === item.type || entry.brand === item.brand))
    .slice(0, 4);

  app.innerHTML = `
    <section class="product-detail">
      <div class="detail-media">${image(item)}</div>
      <div class="detail-info">
        <span class="eyebrow">${item.category}</span>
        <h1>${item.name}</h1>
        <p>${item.description}</p>
        <div class="detail-price">
          <strong>${money.format(item.price)}</strong>
          ${item.compareAt ? `<span>${money.format(item.compareAt)}</span>` : ""}
        </div>
        <div class="detail-actions">
          <button class="button button-primary" type="button" data-add-cart="${item.id}" ${item.stock < 1 ? "disabled" : ""}>Add to cart</button>
          <button class="button button-ghost" type="button" data-open-request>Ask about this item</button>
        </div>
        <dl class="spec-list">
          <div><dt>SKU</dt><dd>${item.sku}</dd></div>
          <div><dt>Status</dt><dd>${item.status}</dd></div>
          <div><dt>Available</dt><dd>${item.stock}</dd></div>
          ${Object.entries(item.attributes).map(([key, value]) => `<div><dt>${key}</dt><dd>${value}</dd></div>`).join("")}
        </dl>
        <a class="source-link" href="${item.sourceUrl}" target="_blank" rel="noreferrer">Prototype source reference</a>
      </div>
    </section>

    <section class="section-block">
      <div class="section-head"><div><span class="eyebrow">Keep browsing</span><h2>Related inventory</h2></div></div>
      <div class="product-grid">${related.map(productCard).join("")}</div>
    </section>
  `;
}

function renderSell() {
  app.innerHTML = `
    <section class="page-hero">
      <span class="eyebrow">Sell / trade / consign</span>
      <h1>Turn collection questions into clear next steps.</h1>
      <p>Collectors can start an offer online, then finish condition review and pricing in store.</p>
      <button class="button button-primary" type="button" data-open-offer>Start an offer</button>
    </section>
    <section class="flow-strip tall">
      <article><span>Fast intake</span><h3>Singles & slabs</h3><p>Pokemon, basketball, baseball, football, autos, rookies, and vintage.</p></article>
      <article><span>Bulk review</span><h3>Binders & boxes</h3><p>Start with photos or a short description before bringing everything in.</p></article>
      <article><span>Store options</span><h3>Cash, trade, consign</h3><p>The owner can later manage incoming offers inside the owner portal.</p></article>
    </section>
  `;
}

function renderAbout() {
  app.innerHTML = `
    <section class="page-hero about-hero">
      <span class="eyebrow">About Top Rated</span>
      <h1>A modern marketplace with local-shop trust.</h1>
      <p>Top Rated is built around clean showcases, fast product discovery, fair trade conversations, and the pleasure of seeing cards before you buy.</p>
    </section>
    <section class="about-grid">
      <article class="about-card dark"><h2>What we stock</h2><p>Packaged products for ripping and protecting, plus individual collectibles for collectors chasing exact cards, grades, players, and display pieces.</p></article>
      <article class="about-card"><h3>Packaged</h3><p>Pokemon, One Piece, sports wax, sleeves, top loaders, binders, and apparel.</p></article>
      <article class="about-card"><h3>Collectibles</h3><p>Raw singles, PSA/BGS-style slabs, autographs, patches, and framed memorabilia.</p></article>
      <article class="about-card"><h3>Services</h3><p>Requests, offers, trade review, price checks, collection intake, and consignment planning.</p></article>
    </section>
  `;
}

function renderVisit() {
  app.innerHTML = `
    <section class="visit-page">
      <div class="visit-card">
        <span class="eyebrow">Visit the shop</span>
        <h1>Find the green awning and the Top Rated sign.</h1>
        <p>Browse cases, compare condition, check sealed product availability, and talk through trades at the counter.</p>
        <dl class="spec-list">
          <div><dt>Location</dt><dd>513 storefront, Town Green Village</dd></div>
          <div><dt>Bring</dt><dd>Want lists, trade binders, sealed boxes, slabs, or photos of larger collections.</dd></div>
        </dl>
        <a class="button button-primary" href="#shop">Browse before you visit</a>
      </div>
      <img src="assets/4225.JPG" alt="Top Rated storefront exterior" />
    </section>
  `;
}

function renderOwner() {
  const rows = allProducts()
    .map(
      (item) => `
        <tr>
          <td><strong>${item.name}</strong><span>${item.sku}</span></td>
          <td>${item.category}</td>
          <td><input data-owner-price="${item.id}" type="number" step="0.01" value="${item.price}" /></td>
          <td><input data-owner-stock="${item.id}" type="number" step="1" value="${item.stock}" /></td>
          <td>${item.status}</td>
        </tr>
      `,
    )
    .join("");

  app.innerHTML = `
    <section class="page-hero compact">
      <span class="eyebrow">Future owner portal</span>
      <h1>Manage products online.</h1>
      <p>This preview edits local override data. In production it would authenticate the owner, sync inventory, upload photos, and push stock changes to Clover.</p>
    </section>
    <section class="owner-panel">
      <div class="section-head">
        <div><span class="eyebrow">Database products</span><h2>Inventory manager</h2></div>
        <button class="button button-primary" type="button" data-save-owner>Save local edits</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="flow-strip">
        <article><span>${store.requests.length}</span><h3>Requests</h3><p>Want-list requests submitted in this browser.</p></article>
        <article><span>${store.offers.length}</span><h3>Offers</h3><p>Sell, trade, and consignment submissions.</p></article>
        <article><span>Clover</span><h3>Next integration</h3><p>Create products, orders, and payments from the same SKU data.</p></article>
      </div>
    </section>
  `;
}

function addToCart(id) {
  const item = product(id);
  if (!item || item.stock < 1) return;
  const existing = store.cart.find((line) => line.id === id);
  if (existing) existing.qty = Math.min(existing.qty + 1, item.stock);
  else store.cart.push({ id, qty: 1 });
  saveCart();
  renderCart();
  openCart();
}

function renderCart() {
  cartCount.textContent = String(store.cart.reduce((sum, line) => sum + line.qty, 0));
  const lines = store.cart.map((line) => ({ ...line, product: product(line.id) })).filter((line) => line.product);
  const subtotal = lines.reduce((sum, line) => sum + line.product.price * line.qty, 0);
  cartSubtotal.textContent = money.format(subtotal);
  cartLines.innerHTML = lines.length
    ? lines
        .map(
          (line) => `
            <div class="cart-line">
              <img src="${line.product.image}" alt="" />
              <div>
                <strong>${line.product.name}</strong>
                <span>${line.qty} × ${money.format(line.product.price)}</span>
                <button type="button" data-remove-cart="${line.id}">Remove</button>
              </div>
            </div>
          `,
        )
        .join("")
    : `<div class="empty-state"><h3>Your cart is empty.</h3><p>Add sealed product, singles, slabs, or supplies to begin checkout.</p></div>`;
}

function openCart() {
  cartDrawer.classList.add("is-open");
  cartDrawer.setAttribute("aria-hidden", "false");
}

function closeCart() {
  cartDrawer.classList.remove("is-open");
  cartDrawer.setAttribute("aria-hidden", "true");
}

function openModal(selector) {
  document.querySelector(selector).showModal();
}

function closeModals() {
  document.querySelectorAll("dialog[open]").forEach((dialog) => dialog.close());
}

document.addEventListener("click", (event) => {
  const add = event.target.closest("[data-add-cart]");
  const remove = event.target.closest("[data-remove-cart]");
  if (add) addToCart(add.dataset.addCart);
  if (remove) {
    store.cart = store.cart.filter((line) => line.id !== remove.dataset.removeCart);
    saveCart();
    renderCart();
  }
  if (event.target.closest("[data-open-cart]")) openCart();
  if (event.target.closest("[data-close-cart]")) closeCart();
  if (event.target.closest("[data-open-request]")) openModal("[data-request-modal]");
  if (event.target.closest("[data-open-offer]")) openModal("[data-offer-modal]");
  if (event.target.closest("[data-close-modal]")) closeModals();
  if (event.target.closest("[data-checkout]")) {
    alert("Prototype Clover checkout handoff: create Clover order, reserve stock, then redirect to payment.");
  }
  if (event.target.closest("[data-save-owner]")) {
    document.querySelectorAll("[data-owner-price]").forEach((input) => {
      store.ownerEdits[input.dataset.ownerPrice] = {
        ...(store.ownerEdits[input.dataset.ownerPrice] || {}),
        price: Number(input.value),
      };
    });
    document.querySelectorAll("[data-owner-stock]").forEach((input) => {
      store.ownerEdits[input.dataset.ownerStock] = {
        ...(store.ownerEdits[input.dataset.ownerStock] || {}),
        stock: Number(input.value),
      };
    });
    saveOwnerEdits();
    renderOwner();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeCart();
    closeModals();
  }
});

document.addEventListener("input", (event) => {
  if (event.target.matches("[data-filter-query]")) {
    store.filters.query = event.target.value;
    renderShop();
  }
});

document.addEventListener("change", (event) => {
  if (event.target.matches("[data-filter-type]")) {
    store.filters.type = event.target.value;
    renderShop();
  }
  if (event.target.matches("[data-filter-category]")) {
    store.filters.category = event.target.value;
    renderShop();
  }
  if (event.target.matches("[data-filter-sort]")) {
    store.filters.sort = event.target.value;
    renderShop();
  }
});

document.querySelector("[data-global-search]").addEventListener("submit", (event) => {
  event.preventDefault();
  const query = new FormData(event.currentTarget).get("search").toString();
  store.filters.query = query;
  store.filters.type = "all";
  window.location.hash = `shop?search=${encodeURIComponent(query)}`;
});

document.querySelector("[data-request-form]").addEventListener("submit", (event) => {
  event.preventDefault();
  store.requests.push(Object.fromEntries(new FormData(event.currentTarget)));
  saveFlows();
  event.currentTarget.reset();
  closeModals();
  alert("Request saved. In production, this becomes an owner portal task.");
});

document.querySelector("[data-offer-form]").addEventListener("submit", (event) => {
  event.preventDefault();
  store.offers.push(Object.fromEntries(new FormData(event.currentTarget)));
  saveFlows();
  event.currentTarget.reset();
  closeModals();
  alert("Offer saved. In production, staff can review it from the owner portal.");
});

window.addEventListener("hashchange", route);
renderCart();
route();
