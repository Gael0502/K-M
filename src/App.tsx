import { lazy, Suspense, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, BadgeCheck, Bell, Bike,
  Boxes, ChartNoAxesCombined, Check, ChevronDown,
  ChevronRight, CircleHelp, ClipboardList, CreditCard, Egg, Filter, Heart,
  Home, LayoutDashboard, Leaf, MapPin, Menu, MessageCircle, Minus, Package,
  Plus, Search, Settings, ShieldCheck, ShoppingBag, ShoppingCart, SlidersHorizontal,
  Sparkles, Sprout, Star, Truck, Users, Wallet, X, Zap,
} from "lucide-react";
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { categories, farmCover, farmStats, orders, products, type Product } from "./data";

const RevenueChart = lazy(() => import("./RevenueChart"));
const ChartFallback = () => <div className="dash-panel chart-panel chart-loading">Loading your chart…</div>;
type CartLine = { product: Product; quantity: number };
type ToastMessage = { id: number; text: string };
type UserRole = "farmer" | "buyer" | "delivery" | "admin";
type AuthUser = { id: string; name: string; email: string; role: UserRole; verified: boolean; createdAt: string };
const fmt = (value: number) => `RWF ${value.toLocaleString("en-RW")}`;
const image = (url: string, alt: string, className = "") => <img className={className} src={url} alt={alt} loading="lazy" />;
const workspaceFor = (role: UserRole) => ({ farmer: "/farmer", buyer: "/buyer", delivery: "/delivery", admin: "/admin" })[role];

async function authRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    credentials: "same-origin",
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });
  if (response.status === 204) return undefined as T;
  const result = await response.json().catch(() => null) as { error?: string } | null;
  if (!response.ok) throw new Error(result?.error || "The request could not be completed.");
  return result as T;
}

function App() {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [wishlist, setWishlist] = useState<string[]>(["eggs-02"]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [mobileNav, setMobileNav] = useState(false);
  const [profileMenu, setProfileMenu] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authFailure, setAuthFailure] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0);

  useEffect(() => {
    let active = true;
    authRequest<{ user: AuthUser }>("/api/auth/me")
      .then(({ user: currentUser }) => { if (active) setUser(currentUser); })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof Error && !error.message.includes("Please sign in")) {
          setAuthFailure(error.message);
        }
      })
      .finally(() => { if (active) setAuthLoading(false); });
    return () => { active = false; };
  }, []);

  const notify = (text: string) => {
    const id = Date.now() + Math.random();
    setToasts((items) => [...items, { id, text }]);
    window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 3000);
  };
  const addToCart = (product: Product, quantity = 1) => {
    setCart((items) => {
      const current = items.find((line) => line.product.id === product.id);
      return current
        ? items.map((line) => line.product.id === product.id ? { ...line, quantity: line.quantity + quantity } : line)
        : [...items, { product, quantity }];
    });
    notify(`${product.name} added to your cart`);
  };
  const toggleWishlist = (id: string) => {
    const saved = wishlist.includes(id);
    setWishlist((items) => saved ? items.filter((item) => item !== id) : [...items, id]);
    notify(saved ? "Removed from your wishlist" : "Saved to your wishlist");
  };
  const updateQuantity = (id: string, delta: number) => setCart((items) => items
    .map((line) => line.product.id === id ? { ...line, quantity: line.quantity + delta } : line)
    .filter((line) => line.quantity > 0));
  const signOut = async () => {
    try {
      await authRequest<void>("/api/auth/logout", { method: "POST" });
      setUser(null);
      setProfileMenu(false);
      navigate("/");
      notify("You have signed out.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not sign out. Please try again.");
    }
  };
  const signIn = async (email: string, password: string) => {
    const result = await authRequest<{ user: AuthUser }>("/api/auth/login", {
      method: "POST", body: JSON.stringify({ email, password }),
    });
    setUser(result.user);
    navigate(workspaceFor(result.user.role), { replace: true });
    notify(`Welcome back, ${result.user.name.split(" ")[0]}.`);
  };
  const register = async (payload: { name: string; email: string; password: string; role: UserRole }) => {
    const result = await authRequest<{ user: AuthUser }>("/api/auth/register", {
      method: "POST", body: JSON.stringify(payload),
    });
    setUser(result.user);
    navigate(workspaceFor(result.user.role), { replace: true });
    notify(`Your ${result.user.role} account is ready.`);
  };
  const shared = { cart, cartCount, wishlist, addToCart, toggleWishlist, updateQuantity, notify, setShowProductModal, user };
  const path = location.pathname;
  const dashboardPath = ["/farmer", "/buyer", "/delivery", "/admin", "/users"].includes(path);
  const showDashboard = dashboardPath && Boolean(user);

  return (
    <div className="app min-h-screen">
      {showDashboard
        ? <DashboardShell user={user!} mobileNav={mobileNav} setMobileNav={setMobileNav} profileMenu={profileMenu} setProfileMenu={setProfileMenu} cartCount={cartCount} notify={notify} signOut={signOut} />
        : <PublicHeader user={user} signOut={signOut} cartCount={cartCount} setMobileNav={setMobileNav} mobileNav={mobileNav} />}
      {mobileNav && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
      <main className={showDashboard ? "dashboard-main" : ""} onClick={() => profileMenu && setProfileMenu(false)}>
        {authFailure && <div className="auth-server-error" role="alert">Account service unavailable: {authFailure}. Start the K&amp;M server and try again.</div>}
        <Routes>
          <Route path="/" element={<HomePage {...shared} />} />
          <Route path="/marketplace" element={<Marketplace {...shared} />} />
          <Route path="/product/:id" element={<ProductDetails {...shared} />} />
          <Route path="/signin" element={<AuthPage mode="signin" onSignIn={signIn} notify={notify} />} />
          <Route path="/signup" element={<AuthPage mode="signup" onRegister={register} notify={notify} />} />
          <Route path="/farmer" element={<ProtectedRoute user={user} loading={authLoading} role="farmer"><FarmerDashboard {...shared} /></ProtectedRoute>} />
          <Route path="/buyer" element={<ProtectedRoute user={user} loading={authLoading} role="buyer"><BuyerDashboard {...shared} /></ProtectedRoute>} />
          <Route path="/delivery" element={<ProtectedRoute user={user} loading={authLoading} role="delivery"><DeliveryPage {...shared} /></ProtectedRoute>} />
          <Route path="/checkout" element={<ProtectedRoute user={user} loading={authLoading} role="buyer"><Checkout {...shared} /></ProtectedRoute>} />
          <Route path="/farms/:id" element={<FarmProfile {...shared} />} />
          <Route path="/admin" element={<ProtectedRoute user={user} loading={authLoading} role="admin"><AdminDashboard {...shared} /></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute user={user} loading={authLoading} role="admin"><AdminUsersPage notify={notify} /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {!showDashboard && <Footer />}
      {showProductModal && <AddProductModal close={() => setShowProductModal(false)} notify={notify} />}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((toast) => <div className="toast" key={toast.id}><Check size={16} />{toast.text}</div>)}
      </div>
      <MobileBottomNav />
      <button className="help-fab" aria-label="Help" onClick={() => notify("Our support team is here to help")}><CircleHelp size={20} /></button>
      <button className="route-helper" onClick={() => navigate("/marketplace")}>Explore marketplace <ArrowRight size={14} /></button>
    </div>
  );
}

function ProtectedRoute({ user, loading, role, children }: { user: AuthUser | null; loading: boolean; role: UserRole; children: ReactNode }) {
  const location = useLocation();
  if (loading) return <div className="auth-loading" role="status">Checking your account…</div>;
  if (!user) return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
  if (user.role !== role) return <Navigate to={workspaceFor(user.role)} replace />;
  return <>{children}</>;
}

function AuthPage({ mode, onSignIn, onRegister, notify }: {
  mode: "signin" | "signup";
  onSignIn?: (email: string, password: string) => Promise<void>;
  onRegister?: (payload: { name: string; email: string; password: string; role: UserRole }) => Promise<void>;
  notify: (text: string) => void;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const requestedRole = new URLSearchParams(location.search).get("role");
  const [role, setRole] = useState<UserRole>(requestedRole === "buyer" || requestedRole === "delivery" ? requestedRole : "farmer");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const signingUp = mode === "signup";

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (signingUp) await onRegister?.({ name, email, password, role });
      else await onSignIn?.(email, password);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not complete the request.");
    } finally {
      setBusy(false);
    }
  };
  const demoAccounts: { label: string; email: string; role: UserRole }[] = [
    { label: "Farmer", email: "farmer@kandm.rw", role: "farmer" },
    { label: "Buyer", email: "buyer@kandm.rw", role: "buyer" },
    { label: "Delivery agent", email: "delivery@kandm.rw", role: "delivery" },
    { label: "Administrator", email: "admin@kandm.rw", role: "admin" },
  ];

  return <div className="auth-page">
    <div className="auth-visual"><div className="auth-visual-photo">{image(farmCover, "Rwandan farm at sunrise")}</div><div className="auth-visual-shade" /><Link to="/" className="brand auth-brand"><span className="brand-mark"><Sprout size={22} /></span><span>K<span>&amp;M</span><small>FARM · MARKET · GROW</small></span></Link><div className="auth-visual-copy"><span className="eyebrow eyebrow-light">RWANDA'S FARM-TO-MARKET COMMUNITY</span><h1>{signingUp ? <>Good things grow<br />when we <em>connect.</em></> : <>Welcome to a<br /><em>better market.</em></>}</h1><p>Meet the people behind your food. Sell, shop, and manage your poultry business with K&amp;M.</p><div className="auth-community"><div className="avatar-stack"><span>AU</span><span>JM</span><span>EN</span><span>+2k</span></div><div><div className="trust-stars">★★★★★</div><small>Growing with Rwanda's farm community</small></div></div></div><span className="auth-visual-foot"><MapPin size={14} /> Kigali, Rwanda · Growing together</span></div>
    <div className="auth-content"><div className="auth-form-wrap"><Link className="auth-back" to="/"><ArrowLeft size={15} /> Back to K&amp;M</Link><span className="auth-mobile-logo"><span className="brand-mark"><Sprout size={21} /></span>K&amp;M</span><span className="eyebrow">{signingUp ? "JOIN OUR COMMUNITY" : "YOUR FARM-TO-MARKET COMMUNITY"}</span><h2>{signingUp ? "Create your account" : "Welcome back"}</h2><p className="auth-lead">{signingUp ? "One account opens the door to better connections." : "Sign in to your K&M workspace to pick up where you left off."}</p>
      {error && <div className="auth-error" role="alert">{error}</div>}
      <form className="auth-form" onSubmit={submit}>
        {signingUp && <label>Full name<input autoComplete="name" required minLength={2} maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Aline Uwase" /></label>}
        <label>Email address<input autoComplete="email" type="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>
        <label>Password<input autoComplete={signingUp ? "new-password" : "current-password"} type="password" required minLength={signingUp ? 10 : 1} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={signingUp ? "At least 10 characters, with a number" : "Enter your password"} />{signingUp && <small className="password-hint">Use at least 10 characters, including a letter and a number.</small>}</label>
        {signingUp && <label>Account type<select value={role} onChange={(event) => setRole(event.target.value as UserRole)}><option value="farmer">Poultry farmer or seller</option><option value="buyer">Buyer or customer</option><option value="delivery">Delivery agent</option></select></label>}
        {!signingUp && <button className="forgot-link" type="button" onClick={() => notify("For account recovery, contact the K&M administrator.")}>Forgot password?</button>}
        <button className="button button-primary auth-submit" disabled={busy}>{busy ? "Please wait…" : signingUp ? "Create account" : "Sign in"} {!busy && <ArrowRight size={16} />}</button>
      </form>
      {!signingUp && import.meta.env.DEV && <div className="demo-signin"><div className="auth-divider"><span>OR TRY A SAMPLE ACCOUNT</span></div><div className="demo-account-list">{demoAccounts.map((account) => <button key={account.role} onClick={() => { setEmail(account.email); setPassword("demo123"); setError(""); }}><span className={`demo-role-icon ${account.role}`}>{account.label[0]}</span><span><strong>{account.label}</strong><small>{account.email}</small></span><ArrowRight size={14} /></button>)}</div><p className="demo-hint">Development demos only · password: <strong>demo123</strong></p></div>}
      <p className="auth-switch">{signingUp ? "Already have an account?" : "New to K&M?"} <button onClick={() => navigate(signingUp ? "/signin" : "/signup")}>{signingUp ? "Sign in" : "Create an account"}</button></p>
      <p className="auth-security"><ShieldCheck size={14} /> Your sign-in is protected by a secure server session.</p>
    </div></div>
  </div>;
}

function PublicHeader({ user, signOut, cartCount, mobileNav, setMobileNav }: { user: AuthUser | null; signOut: () => void; cartCount: number; mobileNav: boolean; setMobileNav: (open: boolean) => void }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const navigate = useNavigate();
  return (
    <header className="public-header">
      <div className="header-inner">
        <Link to="/" className="brand"><span className="brand-mark"><Sprout size={22} /></span><span>K<span>&amp;M</span><small>FARM · MARKET · GROW</small></span></Link>
        <nav className={`public-nav ${mobileNav ? "open" : ""}`}>
          <NavLink to="/" onClick={() => setMobileNav(false)}>Home</NavLink><NavLink to="/marketplace" onClick={() => setMobileNav(false)}>Marketplace</NavLink><a href="/#categories" onClick={() => setMobileNav(false)}>Categories</a><Link to="/farms/green-valley" onClick={() => setMobileNav(false)}>Farms</Link>
          <span className="mobile-nav-extra"><Link to="/buyer#orders" onClick={() => setMobileNav(false)}>My Orders</Link><Link to="/delivery" onClick={() => setMobileNav(false)}>Deliveries</Link></span>
        </nav>
        <div className="header-actions">
          <button className="icon-btn search-toggle" aria-label="Search" onClick={() => setSearchOpen(!searchOpen)}><Search size={19} /></button>
          <Link className="header-icon" to={user?.role === "buyer" ? "/buyer#wishlist" : "/signin"} aria-label="Wishlist"><Heart size={19} /></Link>
          <Link className="header-icon cart-link" to="/checkout" aria-label={`Cart, ${cartCount} items`}><ShoppingBag size={19} /><span className="count-badge">{cartCount}</span></Link>
          {user ? <><Link className="button button-outline header-login" to={workspaceFor(user.role)}>{user.name.split(" ")[0]}'s workspace</Link><button className="button button-primary header-join" onClick={signOut}>Sign out</button></> : <><Link className="button button-outline header-login" to="/signin">Sign in</Link><Link className="button button-primary header-join" to="/signup?role=farmer">Join as farmer <ArrowRight size={15} /></Link></>}
          <button className="icon-btn mobile-menu-toggle" onClick={() => setMobileNav(!mobileNav)} aria-label="Toggle menu">{mobileNav ? <X size={21} /> : <Menu size={21} />}</button>
        </div>
      </div>
      {searchOpen && <form className="header-search" onSubmit={(event) => { event.preventDefault(); const value = new FormData(event.currentTarget).get("q"); navigate(`/marketplace?q=${encodeURIComponent(String(value || ""))}`); setSearchOpen(false); }}><Search size={17} /><input autoFocus name="q" placeholder="Search fresh eggs, chicks, farms…" /><button className="button button-primary">Search</button></form>}
    </header>
  );
}

function DashboardShell({ user, mobileNav, setMobileNav, profileMenu, setProfileMenu, cartCount, notify, signOut }: {
  user: AuthUser;
  mobileNav: boolean; setMobileNav: (open: boolean) => void; profileMenu: boolean;
  setProfileMenu: (open: boolean) => void; cartCount: number; notify: (text: string) => void; signOut: () => void;
}) {
  const location = useLocation();
  const role = user.role;
  const identity = [user.name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase(), user.name, role === "farmer" ? "Farm owner" : role === "admin" ? "Platform admin" : role === "delivery" ? "Delivery partner" : "Buyer account"];
  const nav: [string, string, typeof LayoutDashboard][] = role === "farmer"
    ? [["Overview", "/farmer", LayoutDashboard], ["Marketplace", "/marketplace", ShoppingBag], ["My products", "/marketplace", Package], ["Orders", "/farmer#orders", ClipboardList], ["Customers", "/farmer#orders", Users], ["Farm profile", "/farms/green-valley", Sprout]]
    : role === "buyer"
      ? [["Overview", "/buyer", LayoutDashboard], ["Explore marketplace", "/marketplace", ShoppingBag], ["My orders", "/buyer#orders", ClipboardList], ["Wishlist", "/buyer#wishlist", Heart], ["Deliveries", "/buyer#orders", Truck], ["Messages", "/buyer#messages", MessageCircle]]
      : role === "delivery"
        ? [["Overview", "/delivery", LayoutDashboard], ["My deliveries", "/delivery#assignments", Truck], ["Delivery history", "/delivery#history", ClipboardList], ["Earnings", "/delivery#earnings", Wallet], ["Messages", "/delivery#messages", MessageCircle]]
        : [["Overview", "/admin", LayoutDashboard], ["Users", "/users", Users], ["Farmers", "/users", Sprout], ["Products", "/marketplace", Package], ["Orders", "/admin#orders", ClipboardList], ["Analytics", "/admin#analytics", ChartNoAxesCombined]];
  return (
    <>
    <aside className={`dashboard-sidebar ${mobileNav ? "open" : ""}`}>
      <Link to="/" className="brand sidebar-brand"><span className="brand-mark"><Sprout size={22} /></span><span>K<span>&amp;M</span><small>FARM · MARKET · GROW</small></span></Link>
      {role === "farmer" && <button className="farm-switch"><span className="mini-farm-icon"><Leaf size={15} /></span><span>Green Valley Farm<small>Rulindo, Northern Province</small></span><ChevronDown size={15} /></button>}
      <div className="sidebar-section-label">{role === "admin" ? "PLATFORM" : "WORKSPACE"}</div>
      <nav className="dashboard-nav">{nav.map(([label, href, Icon]) => {
        const IconComponent = Icon as typeof LayoutDashboard;
        const current = location.pathname === href.split("#")[0] && (href === `/${role}` || (href === "/users" && location.pathname === "/users") || !href.includes("#"));
        return <Link key={label as string} to={href as string} className={current ? "active" : ""} onClick={() => setMobileNav(false)}><IconComponent size={18} /><span>{label as string}</span>{label === "My deliveries" && <span className="nav-pill">4</span>}</Link>;
      })}</nav>
      <div className="sidebar-section-label business-label">BUSINESS TOOLS</div>
      <nav className="dashboard-nav">
        {(role === "farmer" ? [["Farm analytics", "/farmer#analytics", ChartNoAxesCombined], ["Messages", "/farmer#messages", MessageCircle], ["Settings", "/farmer#settings", Settings]]
          : role === "admin" ? [["Reports", "/admin#analytics", ChartNoAxesCombined], ["Support inbox", "/admin#messages", MessageCircle], ["Settings", "/admin#settings", Settings]]
            : [["Payments", role === "delivery" ? "/delivery#earnings" : "/buyer#payments", CreditCard], ["Messages", role === "delivery" ? "/delivery#messages" : "/buyer#messages", MessageCircle], ["Settings", `/${role}#settings`, Settings]])
          .map(([label, href, Icon]) => { const IconComponent = Icon as typeof Settings; return <Link key={label as string} to={href as string}><IconComponent size={18} /><span>{label as string}</span></Link>; })}
      </nav>
      <div className="sidebar-spacer" />
      {role === "farmer" && <div className="sidebar-promo"><div className="promo-icon"><Sparkles size={16} /></div><strong>Grow with confidence</strong><p>See your farm's story, from flock to final sale.</p><Link to="/farmer#analytics">Explore insights <ArrowRight size={13} /></Link></div>}
      <div className="sidebar-bottom">
        <button className="sidebar-help" onClick={() => notify("Support is available every day, 8 AM – 6 PM")}><CircleHelp size={17} />Help & support</button>
        <div className="profile-wrap">
          <button className="sidebar-user" onClick={() => setProfileMenu(!profileMenu)}><span className="avatar">{identity[0]}</span><span>{identity[1]}<small>{identity[2]}</small></span><ChevronDown size={15} /></button>
          {profileMenu && <div className="profile-dropdown"><Link to={`/${role}#profile`}>My profile</Link>{role === "admin" && <Link to="/users">Manage users</Link>}<button onClick={signOut}>Sign out</button></div>}
        </div>
      </div>
      <button className="sidebar-close" aria-label="Close menu" onClick={() => setMobileNav(false)}><X size={20} /></button>
    </aside>
    <DashboardTopbar cartCount={cartCount} notify={notify} setMobileNav={setMobileNav} identity={identity} />
    </>
  );
}

function DashboardTopbar({ cartCount, notify, setMobileNav, identity }: { cartCount: number; notify: (text: string) => void; setMobileNav: (open: boolean) => void; identity: string[] }) {
  const navigate = useNavigate();
  return <div className="dashboard-topbar"><button className="icon-btn mobile-menu-toggle top-menu" onClick={() => setMobileNav(true)} aria-label="Open menu"><Menu size={20} /></button><div className="breadcrumb"><span>Workspace</span><ChevronRight size={15} /><strong>Overview</strong></div><div className="topbar-search"><Search size={17} /><input placeholder="Search anything..." onKeyDown={(event) => { if (event.key === "Enter") navigate(`/marketplace?q=${encodeURIComponent(event.currentTarget.value)}`); }} /><kbd>⌘ K</kbd></div><div className="topbar-tools"><button className="icon-btn" onClick={() => notify("You're all caught up on notifications")} aria-label="Notifications"><Bell size={19} /><i /></button><Link className="header-icon dashboard-cart" to="/checkout" aria-label={`Shopping cart, ${cartCount} items`}><ShoppingCart size={18} /><span className="count-badge">{cartCount}</span></Link><span className="topbar-divider" /><button className="dashboard-avatar" aria-label={`Profile ${identity[1]}`}>{identity[0]}</button></div></div>;
}

function HomePage(props: SharedProps) {
  return <>
    <section className="hero-section">
      <div className="hero-bg">{image(farmCover, "Sunrise over a green Rwandan farm")}</div><div className="hero-overlay" />
      <div className="hero-content">
        <div className="hero-copy"><span className="eyebrow eyebrow-light"><span className="live-dot" /> RWANDA'S FARM-TO-MARKET COMMUNITY</span><h1>Connecting poultry farmers<br />to <em>better markets.</em></h1><p>Fresh from the farm. Fair for everyone. Meet trusted local farmers and find the poultry products your business needs.</p>
          <div className="hero-actions"><Link className="button button-primary button-large" to="/marketplace">Explore marketplace <ArrowRight size={17} /></Link><Link className="button button-glass button-large" to="/farmer"><Sprout size={17} /> Join as a farmer</Link></div>
          <div className="hero-trust"><div className="avatar-stack"><span>AU</span><span>JM</span><span>EN</span><span>+2k</span></div><div><div className="trust-stars">★★★★★</div><small>Loved by Rwanda's farming community</small></div></div>
        </div>
        <div className="hero-float-card"><span className="float-icon"><Egg size={19} /></span><span>Fresh eggs, just in<small>Green Valley Farm · 2 min ago</small></span><span className="float-amount">+ 24 trays</span></div>
      </div>
      <div className="hero-bottom-note"><MapPin size={14} /> Rooted in Rwanda <span /> Growing across East Africa</div>
    </section>
    <section className="trust-strip"><div className="trust-strip-inner"><span>TRUSTED BY GROWING BUSINESSES</span><b><ShieldCheck size={16} /> Verified farms</b><b><Truck size={17} /> Reliable delivery</b><b><CreditCard size={16} /> Secure checkout</b><b><Heart size={16} /> Community first</b></div></section>
    <section className="section container" id="categories"><SectionHeading eyebrow="EXPLORE THE MARKET" title="Everything poultry, all in one place" subtitle="From the first chick to the freshest eggs, find quality products from farms you can trust." link="/marketplace" linkText="View all categories" />
      <div className="category-grid">{categories.slice(1).map((category) => <Link className="category-card" to={`/marketplace?category=${encodeURIComponent(category.name)}`} key={category.name}><span className={`category-icon ${category.color}`}>{category.icon}</span><strong>{category.name}</strong><small>{category.count} listings <ArrowRight size={13} /></small></Link>)}</div>
    </section>
    <section className="section section-tint"><div className="container"><SectionHeading eyebrow="FRESH FROM THE FARM" title="Popular this week" subtitle="Thoughtfully grown. Carefully delivered. Loved by your community." link="/marketplace" linkText="Shop all products" /><ProductGrid items={products.slice(0, 4)} {...props} /></div></section>
    <section className="section container"><SectionHeading eyebrow="MEET YOUR GROWERS" title="Good things grow here" subtitle="Get to know the passionate farmers behind every order." link="/farms/green-valley" linkText="Discover local farms" />
      <div className="farms-grid"><FarmCard name="Green Valley Farm" location="Rulindo, Northern Province" rating="4.9" products="12 products" cover={farmCover} initials="GV" verified /><FarmCard name="Umurage Hatchery" location="Kigali, Rwanda" rating="4.8" products="8 products" cover={products[2].image} initials="UH" verified /><FarmCard name="Sunrise Layers" location="Nyagatare, Eastern Province" rating="4.7" products="16 products" cover={products[0].image} initials="SL" /></div>
    </section>
    <HowItWorks />
    <section className="stats-band"><div className="container stats-band-inner"><div><span className="eyebrow eyebrow-light">GROWING TOGETHER</span><h2>A stronger market.<br /><em>A brighter future.</em></h2></div><div className="stat-band-item"><strong>1,200<span>+</span></strong><small>Verified farmers</small></div><div className="stat-band-item"><strong>8,500<span>+</span></strong><small>Orders delivered</small></div><div className="stat-band-item"><strong>30<span>%</span></strong><small>Average farmer growth</small></div></div></section>
    <section className="section container"><SectionHeading eyebrow="HEARD FROM THE COMMUNITY" title="Good things happen when we grow together" /><div className="testimonial-grid">{[["“I used to sell my eggs at the roadside. Now I reach customers all across Kigali and plan my flock with confidence.”","Aline Uwase","Layer farmer · Rulindo"],["“Finding healthy chicks used to be a gamble. K&M made it easy to compare farms and order with peace of mind.”","Jean Claude","Poultry retailer · Kigali"],["“The best part is knowing where my food comes from. I can talk directly to the farmer and the quality shows.”","Chantal M.","Home cook · Huye"]].map(([quote, name, role]) => <article className="testimonial-card" key={name}><div className="stars">★★★★★</div><p>{quote}</p><div className="testimonial-person"><span className="avatar">{name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><span><strong>{name}</strong><small>{role}</small></span><BadgeCheck size={17} /></div></article>)}</div></section>
    <section className="join-banner container"><div><span className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</span><h2>Bring your farm closer<br />to the people who need it.</h2><p>Join a community building a more connected poultry industry.</p></div><Link className="button button-primary button-large" to="/farmer">Start growing with us <ArrowRight size={17} /></Link><span className="join-decoration"><Sprout size={116} /></span></section>
  </>;
}

function SectionHeading({ eyebrow, title, subtitle, link, linkText }: { eyebrow: string; title: string; subtitle?: string; link?: string; linkText?: string }) {
  return <div className="section-heading"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{link && <Link className="text-link" to={link}>{linkText} <ArrowRight size={15} /></Link>}</div>;
}

type SharedProps = {
  cart: CartLine[]; cartCount: number; wishlist: string[];
  user: AuthUser | null;
  addToCart: (product: Product, quantity?: number) => void;
  toggleWishlist: (id: string) => void; updateQuantity: (id: string, delta: number) => void;
  notify: (text: string) => void; setShowProductModal: (open: boolean) => void;
};

function ProductGrid({ items, ...props }: { items: Product[] } & Pick<SharedProps, "wishlist" | "toggleWishlist" | "addToCart">) {
  return <div className="product-grid">{items.map((product) => <ProductCard key={product.id} product={product} {...props} />)}</div>;
}

function ProductCard({ product, wishlist, toggleWishlist, addToCart }: { product: Product } & Pick<SharedProps, "wishlist" | "toggleWishlist" | "addToCart">) {
  return <article className="product-card">
    <Link to={`/product/${product.id}`} className="product-photo">{image(product.image, product.name)}{product.tag && <span className={`product-tag ${product.tag === "Bestseller" ? "tag-gold" : ""}`}>{product.tag === "Verified" && <BadgeCheck size={12} />}{product.tag}</span>}</Link>
    <button className={`wishlist-btn ${wishlist.includes(product.id) ? "saved" : ""}`} onClick={() => toggleWishlist(product.id)} aria-label={wishlist.includes(product.id) ? "Remove from wishlist" : "Save to wishlist"}><Heart size={17} fill={wishlist.includes(product.id) ? "currentColor" : "none"} /></button>
    <div className="product-info"><div className="product-meta"><span>{product.category}</span><span><Star size={13} fill="currentColor" /> {product.rating} <small>({product.reviews})</small></span></div><Link to={`/product/${product.id}`} className="product-name">{product.name}</Link>
      <div className="product-seller"><span className="mini-avatar">{product.seller.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><span>{product.seller}<small><MapPin size={11} /> {product.location}</small></span><BadgeCheck size={14} className="verified-icon" /></div>
      <div className="product-bottom"><span className="product-price">{fmt(product.price)}<small> / {product.unit}</small></span><button className="add-cart-btn" onClick={() => addToCart(product)} aria-label={`Add ${product.name} to cart`}><Plus size={18} /></button></div>
    </div>
  </article>;
}

function Marketplace(props: SharedProps) {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const [category, setCategory] = useState(params.get("category") || "All products");
  const [search, setSearch] = useState(params.get("q") || "");
  const [sort, setSort] = useState("Recommended");
  const [maxPrice, setMaxPrice] = useState(100000);
  const [locationFilter, setLocationFilter] = useState("Any location");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtered = useMemo(() => products.filter((item) => {
    const matchesCategory = category === "All products" || item.category === category;
    const matchesText = `${item.name} ${item.seller} ${item.location} ${item.category}`.toLowerCase().includes(search.toLowerCase());
    const province = item.location === "Rulindo" || item.location === "Musanze" ? "Northern Province"
      : item.location === "Nyagatare" ? "Eastern Province"
        : item.location === "Huye" ? "Southern Province"
          : item.location;
    const matchesLocation = locationFilter === "Any location" || item.location === locationFilter || province === locationFilter;
    return matchesCategory && matchesText && matchesLocation && item.price <= maxPrice;
  }).sort((a, b) => sort === "Price: low to high" ? a.price - b.price : sort === "Top rated" ? b.rating - a.rating : 0), [category, search, sort, maxPrice]);
  return <div className="market-page container"><div className="market-hero"><div><div className="breadcrumbs"><Link to="/">Home</Link><ChevronRight size={14} /> Marketplace</div><span className="eyebrow">GOOD THINGS, GROWN LOCALLY</span><h1>Meet your next <em>farm favorite.</em></h1><p>Shop fresh, shop local. Find quality poultry products from people who care about how they're raised.</p></div><div className="market-hero-image">{image(products[1].image, "Healthy free-range chickens")}<span><ShieldCheck size={17} /> Every seller, farm-verified</span></div></div>
    <div className="market-toolbar"><div className="market-search"><Search size={19} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search eggs, chicks, feed, farms…" /><kbd>⌘ K</kbd></div><button className={`button button-outline filters-toggle ${filtersOpen ? "selected" : ""}`} onClick={() => setFiltersOpen(!filtersOpen)}><SlidersHorizontal size={17} /> Filters <span className="filter-count">2</span></button><label className="sort-select">Sort by <select value={sort} onChange={(event) => setSort(event.target.value)}><option>Recommended</option><option>Price: low to high</option><option>Top rated</option></select><ChevronDown size={14} /></label></div>
    <div className="market-layout"><aside className={`market-filters ${filtersOpen ? "visible" : ""}`}><div className="filter-heading"><strong>Categories</strong><button onClick={() => { setCategory("All products"); setMaxPrice(100000); setLocationFilter("Any location"); }}>Reset</button></div>{categories.map((item) => <button className={`filter-category ${category === item.name ? "active" : ""}`} key={item.name} onClick={() => setCategory(item.name)}><span className={`filter-icon ${item.color}`}>{item.icon}</span>{item.name}<small>{item.count}</small></button>)}<div className="filter-divider" /><div className="filter-heading"><strong>Price range</strong></div><div className="price-range-label"><span>RWF 0</span><span>{fmt(maxPrice)}</span></div><input className="range-input" aria-label="Maximum price" type="range" min="5000" max="100000" step="5000" value={maxPrice} onChange={(event) => setMaxPrice(Number(event.target.value))} /><div className="filter-divider" /><div className="filter-heading"><strong>Farm location</strong><ChevronDown size={16} /></div>{["Any location", "Kigali", "Northern Province", "Eastern Province", "Southern Province"].map((item) => <label className="checkbox-row" key={item}><input type="checkbox" checked={locationFilter === item} onChange={() => setLocationFilter(item)} />{item}</label>)}</aside>
      <div className="market-results"><div className="market-result-count"><span><strong>{filtered.length} products</strong> available from verified sellers</span><button className="mobile-filter" onClick={() => setFiltersOpen(!filtersOpen)}><Filter size={15} /> Filter & sort</button></div>{filtered.length ? <ProductGrid items={filtered} {...props} /> : <div className="empty-state"><Search size={30} /><h3>No products match those filters</h3><p>Try a different search or reset your category selection.</p><button className="button button-primary" onClick={() => { setSearch(""); setCategory("All products"); setMaxPrice(100000); }}>Clear filters</button></div>}</div>
    </div>
  </div>;
}

function FarmCard({ name, location, rating, products: count, cover, initials, verified }: { name: string; location: string; rating: string; products: string; cover: string; initials: string; verified?: boolean }) {
  return <Link to="/farms/green-valley" className="farm-card">{image(cover, name)}<div className="farm-card-content"><span className="farm-logo">{initials}</span><div className="farm-card-name"><strong>{name}{verified && <BadgeCheck size={15} />}</strong><small><MapPin size={12} /> {location}</small></div><div className="farm-card-stats"><span><Star size={13} fill="currentColor" /> {rating}</span><span>{count}</span></div></div></Link>;
}

function HowItWorks() {
  return <section className="section how-section"><div className="container"><SectionHeading eyebrow="SIMPLE BY DESIGN" title="A better way to do business" subtitle="A few simple steps from your farm to someone's table." /><div className="steps-grid">{[[Search, "01", "Discover", "Browse quality products from verified farmers near you."], [ShoppingBag, "02", "Connect & order", "Find what you need, place your order and choose delivery."], [Truck, "03", "Grow together", "Your order arrives fresh. Your farmer grows their business."]].map(([Icon, number, title, text]) => { const IconComponent = Icon as typeof Search; return <article className="step-card" key={title as string}><div className="step-icon"><IconComponent size={22} /></div><span className="step-number">{number as string}</span><h3>{title as string}</h3><p>{text as string}</p></article>; })}</div></div></section>;
}

function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-main">
          <div className="footer-brand">
            <Link to="/" className="brand"><span className="brand-mark"><Sprout size={22} /></span><span>K<span>&amp;M</span><small>FARM · MARKET · GROW</small></span></Link>
            <p>Bringing Rwanda's poultry community closer, one connection at a time.</p>
            <div className="social-dots"><a href="#social" aria-label="Instagram">ig</a><a href="#social" aria-label="Facebook">f</a><a href="#social" aria-label="LinkedIn">in</a></div>
          </div>
          {[["Explore", ["Marketplace", "Categories", "Featured farms", "How it works"]], ["For your business", ["Sell on K&M", "Farm management", "Delivery partners", "Buyer protection"]], ["We're here", ["Help center", "Contact us", "Our story", "Privacy & terms"]]].map(([heading, items]) => (
            <div className="footer-links" key={heading as string}>
              <strong>{heading as string}</strong>
              {(items as string[]).map((item) => <Link key={item} to={item === "Sell on K&M" ? "/farmer" : item === "Our story" ? "/#our-story" : "/marketplace"}>{item}</Link>)}
            </div>
          ))}
        </div>
        <section className="footer-story" id="our-story" aria-labelledby="footer-story-title">
          <div className="footer-story-copy">
            <span className="footer-story-kicker">WHY K&amp;M</span>
            <h2 id="footer-story-title">Good things grow when we grow together.</h2>
            <p>K&amp;M was created around a simple idea: poultry farmers deserve a clearer path to customers, and buyers deserve an easier way to find the people behind their food. By bringing them together, we can help local businesses build trust, reach new markets, and grow with confidence.</p>
          </div>
          <div className="footer-founders">
            <span className="footer-story-kicker">THE FOUNDERS</span>
            <p>Kelly and Moses share a belief in the potential of Rwanda's poultry community. They started K&amp;M to make meaningful connections between farms and the people and businesses they serve—one relationship, one order, and one growing opportunity at a time.</p>
            <div className="founder-names">
              <span><img src="/founders/kelly.jpg" alt="Kelly, K&M Business Director" /><strong>Kelly<small>Business Director</small></strong></span>
              <span><img src="/founders/moses.png" alt="Moses, K&M CEO" /><strong>Moses<small>CEO</small></strong></span>
            </div>
          </div>
        </section>
        <div className="footer-bottom">
          <span>© 2026 K&amp;M. Growing together in Rwanda.</span>
          <span><MapPin size={13} /> Kigali, Rwanda</span>
          <span>Made with care <Heart size={13} fill="currentColor" /></span>
        </div>
        <p className="footer-image-credit">Day-old chick photo by <a href="https://commons.wikimedia.org/wiki/File:1_day_old_chick_hatchling.jpg" target="_blank" rel="noreferrer">Uberprutser / Wikimedia Commons</a>, licensed under <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noreferrer">CC BY-SA 3.0</a>.</p>
      </div>
    </footer>
  );
}

function DashboardHeading({ eyebrow, title, subtitle, children }: { eyebrow: string; title: string; subtitle: string; children?: ReactNode }) {
  return <div className="dashboard-heading"><div><div className="breadcrumbs"><Link to="/">Home</Link><ChevronRight size={14} /><span>{eyebrow}</span></div><h1>{title}</h1><p>{subtitle}</p></div>{children && <div className="dashboard-heading-actions">{children}</div>}</div>;
}

function StatCard({ icon: Icon, label, value, delta, color, note }: { icon: typeof Sprout; label: string; value: string; delta: string; color: string; note: string }) {
  return <article className="dash-stat-card"><div className={`dash-stat-icon ${color}`}><Icon size={19} /></div><div className="stat-change"><ArrowUpRight size={14} /> {delta}</div><span className="dash-stat-label">{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

function OrdersTable({ compact = false, notify, viewAllTo = "/buyer", buyerView = false }: { compact?: boolean; notify?: (text: string) => void; viewAllTo?: string; buyerView?: boolean }) {
  return <section className="dash-panel orders-panel" id="orders"><div className="dash-panel-heading"><div><h2>{compact ? "Recent orders" : "Your latest orders"}</h2><p>Stay up to date with your business</p></div><Link className="text-link" to={viewAllTo}>View all <ArrowRight size={14} /></Link></div><div className="responsive-table"><table><thead><tr><th>{buyerView ? "PRODUCT" : "ORDER"}</th>{!buyerView && <th>CUSTOMER</th>}<th>{buyerView ? "ORDER DATE" : "DATE"}</th><th>{buyerView ? "DELIVERY" : "STATUS"}</th><th>TOTAL</th>{!compact && <th />}</tr></thead><tbody>{orders.slice(0, compact ? 3 : 4).map((order) => <tr key={order.id}><td><div className="order-product">{image(order.image, order.product)}<span><strong>{order.product}</strong><small>{order.id} · {order.quantity}</small></span></div></td>{!buyerView && <td>{order.buyer}</td>}<td>{order.date}</td><td><span className={`status-pill ${order.status.toLowerCase().replace(" ", "-")}`}><i />{order.status}</span></td><td className="table-total">{fmt(order.total)}</td>{!compact && <td><button className="more-button" onClick={() => notify?.(`Order ${order.id}: ${order.status}`)}>···</button></td>}</tr>)}</tbody></table></div></section>;
}

function FarmerDashboard({ setShowProductModal, notify, user }: SharedProps) {
  const firstName = user?.name.split(" ")[0] || "Farmer";
  return <div className="dashboard-page"><DashboardHeading eyebrow="FARMER WORKSPACE" title={`Good morning, ${firstName} 👋`} subtitle="Here's what's happening across your farm today."><button className="button button-outline" onClick={() => notify("Your farm performance report is ready to preview")}><ChartNoAxesCombined size={16} /> Farm report</button><button className="button button-primary" onClick={() => setShowProductModal(true)}><Plus size={17} /> Add a product</button></DashboardHeading>
    <div className="dashboard-stats"><StatCard icon={Wallet} label="Total revenue" value="RWF 3.24M" delta="12.8%" color="mint" note="vs RWF 2.87M last month" /><StatCard icon={Package} label="Active products" value="12" delta="2 new" color="gold" note="Across 4 categories" /><StatCard icon={ClipboardList} label="Active orders" value="18" delta="6 new" color="blue" note="5 awaiting confirmation" /><StatCard icon={Users} label="Total customers" value="284" delta="16.4%" color="lilac" note="42 returning customers" /></div>
    <div className="dashboard-content-grid"><Suspense fallback={<ChartFallback />}><RevenueChart /></Suspense><section className="dash-panel quick-actions"><div className="dash-panel-heading"><div><h2>Quick actions</h2><p>Keep your farm moving forward</p></div><span className="quick-spark"><Zap size={16} /></span></div><button onClick={() => setShowProductModal(true)}><span className="quick-icon mint"><Plus size={17} /></span><span><strong>List a new product</strong><small>Reach more local buyers</small></span><ChevronRight size={16} /></button><button onClick={() => notify("Inventory overview opened")}><span className="quick-icon gold"><Boxes size={17} /></span><span><strong>Check your inventory</strong><small>Egg stock running low · 2 days</small></span><ChevronRight size={16} /></button><Link to="/farms/green-valley"><span className="quick-icon blue"><Sprout size={17} /></span><span><strong>View your farm profile</strong><small>Manage your farm details</small></span><ChevronRight size={16} /></Link><div className="tip-card"><Sparkles size={16} /><span><strong>Farm insight</strong><small>Your egg sales are up 18% this month. Great work!</small></span></div></section></div>
    <div className="dashboard-bottom-grid"><OrdersTable compact notify={notify} viewAllTo="/farmer#orders" /><section className="dash-panel inventory-panel"><div className="dash-panel-heading"><div><h2>Top products</h2><p>Performance this month</p></div><Link className="text-link" to="/marketplace">All products <ArrowRight size={14} /></Link></div>{products.slice(0, 3).map((product, index) => <div className="top-product-row" key={product.id}>{image(product.image, product.name)}<span><strong>{product.name}</strong><small>{[42, 34, 28][index]} sold this month</small></span><strong>{fmt(product.price)}</strong></div>)}</section></div>
  </div>;
}

function BuyerDashboard({ wishlist, toggleWishlist, addToCart, notify, user }: SharedProps) {
  const location = useLocation();
  const firstName = user?.name.split(" ")[0] || "Buyer";
  const [activeTab, setActiveTab] = useState(location.hash === "#wishlist" ? "Wishlist" : location.hash === "#recommended" ? "Recommended" : "Recent orders");
  return <div className="dashboard-page"><DashboardHeading eyebrow="BUYER WORKSPACE" title={`Welcome back, ${firstName} 👋`} subtitle="Here's a little look at your K&M activity."><Link to="/marketplace" className="button button-primary"><ShoppingBag size={16} /> Browse marketplace</Link></DashboardHeading>
    <div className="buyer-welcome-card"><div><span className="eyebrow eyebrow-light">YOUR POULTRYCONNECT</span><h2>Good food starts with<br /><em>good connections.</em></h2><p>You've supported 4 local farms this month. Keep growing your community.</p><Link to="/marketplace" className="button button-light">Find something fresh <ArrowRight size={15} /></Link></div><div className="buyer-welcome-art">{image(products[0].image, "Fresh eggs from local farms")}<div className="buyer-art-label"><span className="float-icon"><Heart size={17} /></span><span>Locally loved<small>Supporting 4 local farms</small></span></div></div></div>
    <div className="dashboard-stats buyer-stats"><StatCard icon={ShoppingBag} label="Total purchases" value="24" delta="4 this month" color="mint" note="From 8 local sellers" /><StatCard icon={Truck} label="In transit" value="2" delta="On the way" color="gold" note="Your orders are moving" /><StatCard icon={Heart} label="Saved items" value={String(wishlist.length)} delta="Wishlist" color="blue" note="Things you love" /><StatCard icon={Wallet} label="Total spent" value="RWF 482k" delta="This year" color="lilac" note="Supporting local farms" /></div>
    <div className="buyer-tabs">{["Recent orders", "Wishlist", "Recommended"].map((tab) => <button key={tab} className={activeTab === tab ? "active" : ""} onClick={() => { setActiveTab(tab); window.history.replaceState(null, "", tab === "Wishlist" ? "#wishlist" : tab === "Recommended" ? "#recommended" : "#orders"); }}>{tab}{tab === "Wishlist" && <span>{wishlist.length}</span>}</button>)}</div>
    {activeTab === "Recent orders" ? <div className="dashboard-content-grid"><OrdersTable buyerView /><section className="dash-panel order-tracker"><div className="dash-panel-heading"><div><h2>On its way</h2><p>Order PC-2047 · Umurage Hatchery</p></div><span className="tracker-icon"><Truck size={17} /></span></div><div className="tracker-map"><div className="map-path" /><span className="map-pin from"><Sprout size={15} /></span><span className="map-pin to"><MapPin size={15} /></span><span className="map-bike"><Bike size={21} /></span><span className="map-label label-from">Musanze</span><span className="map-label label-to">Kigali</span></div><div className="tracking-progress"><span className="complete" /><span className="complete" /><span /><span /></div><div className="tracking-labels"><span>Confirmed</span><span>In transit</span><span>Nearby</span><span>Delivered</span></div><div className="delivery-estimate"><span><strong>Arriving today</strong><small>Estimated delivery · 2:30 – 3:00 PM</small></span><button onClick={() => notify("Your driver is about 18 km away")}>Track order <ArrowRight size={14} /></button></div></section></div>
      : activeTab === "Wishlist" ? (wishlist.length ? <ProductGrid items={products.filter((item) => wishlist.includes(item.id))} wishlist={wishlist} toggleWishlist={toggleWishlist} addToCart={addToCart} /> : <div className="empty-state"><Heart size={30} /><h3>Your wishlist is ready for inspiration</h3><p>Tap the heart on anything you love while browsing.</p><Link className="button button-primary" to="/marketplace">Explore products</Link></div>)
        : <ProductGrid items={products.slice(2, 6)} wishlist={wishlist} toggleWishlist={toggleWishlist} addToCart={addToCart} />}
  </div>;
}

function DeliveryPage({ notify, user }: SharedProps) {
  const [tab, setTab] = useState("Active deliveries");
  const [deliveryStatus, setDeliveryStatus] = useState("On the way");
  return <div className="dashboard-page"><DashboardHeading eyebrow="DELIVERY WORKSPACE" title="Every delivery brings us closer." subtitle={`Good morning, ${user?.name.split(" ")[0] || "Eric"}. You're making a difference, one doorstep at a time.`}><button className="button button-outline" onClick={() => notify("Map view toggled") }><MapPin size={16} /> Open route map</button></DashboardHeading>
    <div className="dashboard-stats"><StatCard icon={Truck} label="Today's deliveries" value="8" delta="4 completed" color="mint" note="4 stops remaining" /><StatCard icon={Wallet} label="Today's earnings" value="RWF 32,500" delta="On track" color="gold" note="RWF 145k this week" /><StatCard icon={ChartNoAxesCombined} label="Completion rate" value="98.4%" delta="Top 5%" color="blue" note="Across 142 deliveries" /><StatCard icon={Star} label="Customer rating" value="4.9" delta="Excellent" color="lilac" note="From 87 customer reviews" /></div>
    <div className="delivery-map-card"><div className="delivery-map-art"><span className="map-road road-one" /><span className="map-road road-two" /><span className="map-road road-three" /><span className="map-town town-one">KACYIRU</span><span className="map-town town-two">KIMIHURURA</span><span className="map-town town-three">NYARUTARAMA</span><span className="delivery-map-pin pin-one"><Package size={16} /></span><span className="delivery-map-pin pin-two"><Bike size={18} /></span><span className="delivery-map-pin pin-three"><MapPin size={17} /></span><div className="map-status-float"><span className="live-dot" /> Live route preview<small>Kigali, Rwanda · 4 stops</small></div></div><div className="delivery-route-info"><span className="eyebrow">YOUR NEXT STOP</span><h2>Fresh farm eggs</h2><p>Jean Claude · Kacyiru, Kigali</p><div className="route-distance"><span><MapPin size={16} /><strong>2.4 km</strong><small>from your location</small></span><span><Truck size={16} /><strong>12 min</strong><small>estimated travel</small></span></div><div className="delivery-customer"><span className="avatar">JC</span><span><strong>Jean Claude</strong><small>+250 788 123 456</small></span><button onClick={() => notify("Calling customer is a visual demo only")}><MessageCircle size={16} /></button></div><button className="button button-primary delivery-update" onClick={() => { const next = deliveryStatus === "On the way" ? "Delivered" : "On the way"; setDeliveryStatus(next); notify(`Delivery marked ${next.toLowerCase()}`); }}>{deliveryStatus === "On the way" ? "Confirm delivery" : "Delivery completed"} <ArrowRight size={15} /></button></div></div>
    <div className="delivery-tabs">{["Active deliveries", "Completed today", "Delivery history"].map((label) => <button key={label} onClick={() => setTab(label)} className={tab === label ? "active" : ""}>{label}</button>)}</div>
    <div className="delivery-stops">{(tab === "Active deliveries" ? orders.slice(0, 3) : tab === "Completed today" ? orders.slice(2, 4) : orders).map((order, index) => <article className="delivery-stop" key={order.id}><span className="stop-index">{index + 1}</span><div className="stop-product">{image(order.image, order.product)}<span><strong>{order.product}</strong><small>{order.buyer} · {["Kacyiru", "Remera", "Kimihurura"][index % 3]}, Kigali</small></span></div><span className={`status-pill ${order.status.toLowerCase().replace(" ", "-")}`}><i />{order.status}</span><span className="stop-time">{index === 0 ? "2:30 PM" : index === 1 ? "3:15 PM" : "4:00 PM"}</span><button className="more-button" onClick={() => notify(`Delivery ${order.id} details opened`)}>···</button></article>)}</div>
  </div>;
}

function Checkout({ cart, cartCount, updateQuantity, notify }: SharedProps) {
  const [paymentMethod, setPaymentMethod] = useState("momo");
  const [confirmed, setConfirmed] = useState(false);
  const subtotal = cart.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
  const delivery = cart.length ? 2500 : 0;
  const submit = (event: FormEvent) => { event.preventDefault(); if (!cart.length) { notify("Add some farm favorites to your cart first"); return; } setConfirmed(true); };
  return <div className="checkout-page container"><div className="breadcrumbs"><Link to="/">Home</Link><ChevronRight size={14} /><Link to="/marketplace">Marketplace</Link><ChevronRight size={14} /><span>Checkout</span></div><div className="checkout-title"><div><span className="eyebrow">A LITTLE CLOSER TO FRESH</span><h1>Let's make it <em>yours.</em></h1><p>Review your order and choose how you'd like to pay.</p></div><div className="checkout-steps"><span className="step-done"><Check size={13} /> Cart</span><i /><span className="step-active">2. Checkout</span><i /><span>3. Confirmation</span></div></div>
    {confirmed ? <div className="order-confirmed"><span className="confirmed-icon"><Check size={28} /></span><span className="eyebrow">ORDER PLACED · DEMO ONLY</span><h2>Wonderful choice.</h2><p>Your demo order <strong>PC-2051</strong> is ready. This frontend preview doesn't process payment or send your order to a seller.</p><Link className="button button-primary" to="/buyer">View your orders <ArrowRight size={15} /></Link></div> : <form className="checkout-layout" onSubmit={submit}><div className="checkout-form-col"><section className="checkout-card"><div className="checkout-section-heading"><span className="checkout-number">01</span><div><h2>Where should it go?</h2><p>Your delivery details</p></div><button type="button" className="text-link">Use saved address</button></div><div className="checkout-fields"><label>Full name<input required defaultValue="Jean Claude" /></label><label>Phone number<input required defaultValue="+250 788 123 456" /></label><label className="field-wide">Delivery address<input required defaultValue="KG 9 Ave, Kacyiru, Kigali" /></label><label>District<select defaultValue="Gasabo"><option>Gasabo</option><option>Nyarugenge</option><option>Kicukiro</option><option>Rulindo</option></select></label><label>Preferred date<input type="date" defaultValue="2026-11-12" /></label><label className="field-wide">Delivery notes <textarea placeholder="Gate code, landmarks or other helpful notes..." rows={2} /></label></div></section>
      <section className="checkout-card"><div className="checkout-section-heading"><span className="checkout-number">02</span><div><h2>How would you like to pay?</h2><p>Secure, convenient options for you</p></div></div><div className="payment-methods">{[["momo", "MTN Mobile Money", "mtn", "M"], ["airtel", "Airtel Money", "airtel", "A"], ["visa", "Visa / Mastercard", "card", "V"]].map(([id, label, type, mark]) => <button type="button" key={id} onClick={() => setPaymentMethod(id)} className={`payment-option ${paymentMethod === id ? "selected" : ""}`}><span className={`payment-brand ${type}`}>{mark}</span><span><strong>{label}</strong><small>{id === "visa" ? "Credit or debit card" : "Pay securely with your phone"}</small></span><i>{paymentMethod === id && <Check size={12} />}</i></button>)}</div><div className="demo-notice"><ShieldCheck size={16} /><span>Demo checkout only. No real payment details are collected and no money will be charged.</span></div></section>
      <section className="checkout-card"><div className="checkout-section-heading"><span className="checkout-number">03</span><div><h2>Delivery, thoughtfully done</h2><p>Freshness is part of the promise</p></div></div><div className="delivery-options"><label className="delivery-option selected"><input type="radio" name="delivery" defaultChecked /><span><Truck size={19} /></span><span><strong>Standard delivery</strong><small>Tomorrow · 9 AM – 12 PM</small></span><strong>RWF 2,500</strong></label><label className="delivery-option"><input type="radio" name="delivery" /><span><Zap size={19} /></span><span><strong>Express delivery</strong><small>Today · within 3 hours</small></span><strong>RWF 5,000</strong></label></div></section></div>
      <aside className="checkout-summary"><div className="checkout-summary-heading"><span className="eyebrow">YOUR ORDER</span><span>{cartCount} items</span></div>{cart.length ? <div className="checkout-lines">{cart.map(({ product, quantity }) => <div className="checkout-line" key={product.id}>{image(product.image, product.name)}<div><strong>{product.name}</strong><small>{quantity} × {fmt(product.price)}</small><div className="quantity-control"><button type="button" aria-label="Decrease quantity" onClick={() => updateQuantity(product.id, -1)}><Minus size={12} /></button><span>{quantity}</span><button type="button" aria-label="Increase quantity" onClick={() => updateQuantity(product.id, 1)}><Plus size={12} /></button></div></div><strong>{fmt(product.price * quantity)}</strong></div>)}</div> : <div className="checkout-empty"><ShoppingBag size={25} /><p>Your basket is waiting for something fresh.</p><Link to="/marketplace">Browse marketplace <ArrowRight size={14} /></Link></div>}<div className="promo-code"><input placeholder="Promo code" /><button type="button" onClick={() => notify("No demo promo codes are active right now")}>Apply</button></div><div className="summary-row"><span>Subtotal</span><strong>{fmt(subtotal)}</strong></div><div className="summary-row"><span>Delivery</span><strong>{delivery ? fmt(delivery) : "—"}</strong></div><div className="summary-row"><span>Platform fee</span><strong>RWF 0</strong></div><div className="summary-total"><span>Total</span><strong>{fmt(subtotal + delivery)}</strong></div><button className="button button-primary checkout-submit" type="submit">Confirm order <ArrowRight size={16} /></button><div className="checkout-safe"><ShieldCheck size={15} /> Your order is protected by K&M</div></aside></form>}
  </div>;
}

function ProductDetails(props: SharedProps) {
  const { id = "eggs-01" } = useParams();
  const navigate = useNavigate();
  const product = products.find((item) => item.id === id) || products[0];
  const [quantity, setQuantity] = useState(1);
  const [tab, setTab] = useState("Description");
  const gallery = [product.image, products[1].image, farmCover, products[2].image];
  const [selectedImage, setSelectedImage] = useState(product.image);
  useEffect(() => { setSelectedImage(product.image); setQuantity(1); }, [product.image]);
  return <div className="product-detail-page container"><div className="breadcrumbs"><Link to="/">Home</Link><ChevronRight size={14} /><Link to="/marketplace">Marketplace</Link><ChevronRight size={14} /><span>{product.category}</span></div><div className="product-detail-grid"><div className="detail-gallery"><div className="detail-main-image">{image(selectedImage, product.name)}{product.tag && <span className="product-tag">{product.tag}</span>}</div><div className="detail-thumbs">{gallery.map((photo, index) => <button key={`${photo}-${index}`} className={selectedImage === photo ? "selected" : ""} onClick={() => setSelectedImage(photo)} aria-label={`View product photo ${index + 1}`}>{image(photo, `${product.name} photo ${index + 1}`)}</button>)}<button className="thumb-more" onClick={() => setSelectedImage(product.image)}>+3</button></div></div><div className="detail-info"><span className="eyebrow">{product.category.toUpperCase()} · RWANDA</span><h1>{product.name}</h1><div className="detail-rating"><span>★★★★★</span><strong>{product.rating}</strong><a href="#reviews">({product.reviews} reviews)</a><i /><span>{product.stock}</span></div><div className="detail-price">{fmt(product.price)}<small> / {product.unit}</small></div><p className="detail-description">Thoughtfully raised and carefully prepared for quality you can taste. From a farm that cares about animal wellbeing, freshness, and the community it serves.</p><div className="detail-quality"><span><Check size={14} /> Farm verified</span><span><Check size={14} /> Quality checked</span><span><Check size={14} /> Fresh & local</span></div><div className="detail-availability"><span className="live-dot" /> <strong>{product.stock}</strong><span>·</span><span>Ready for delivery</span></div><div className="detail-buy-row"><div className="quantity-selector"><button onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="Decrease"><Minus size={15} /></button><span>{quantity}</span><button onClick={() => setQuantity(quantity + 1)} aria-label="Increase"><Plus size={15} /></button></div><button className="button button-primary detail-add" onClick={() => props.addToCart(product, quantity)}><ShoppingBag size={17} /> Add to cart</button><button className="detail-save" onClick={() => props.toggleWishlist(product.id)} aria-label="Save to wishlist"><Heart size={19} fill={props.wishlist.includes(product.id) ? "currentColor" : "none"} /></button></div><button className="button button-outline buy-now" onClick={() => { props.addToCart(product, quantity); navigate("/checkout"); }}>Buy now <ArrowRight size={15} /></button><div className="detail-farm"><FarmCardMini /><button className="contact-farmer" onClick={() => props.notify("Farmer messaging is a visual demo only")}>Contact farmer <MessageCircle size={15} /></button></div></div></div>
    <div className="detail-tabs">{["Description", "Farm & delivery", "Reviews (48)"].map((label) => <button className={tab === label ? "active" : ""} onClick={() => setTab(label)} key={label}>{label}</button>)}</div><div className="detail-tab-content" id="reviews">{tab === "Description" ? <><h2>Good food, grown with care.</h2><p>Each product is sourced directly from a verified local farm. Our farmers take pride in healthy flocks, responsible animal care and getting fresh produce to your table. Orders are carefully packed and prepared for a safe journey from farm to doorstep.</p><div className="detail-feature-grid"><span><Leaf size={17} /> Responsibly raised</span><span><BadgeCheck size={17} /> Quality assured</span><span><Truck size={17} /> Local delivery</span></div></> : tab === "Farm & delivery" ? <><h2>From a farm you can trust.</h2><p>Green Valley Farm is a family-run poultry operation in Rulindo, Northern Province. Delivery is available across Kigali and surrounding districts.</p></> : <><h2>Customers love this farm.</h2><p><strong>★★★★★ “Fresh, clean eggs and the farmer was so helpful. I will definitely order again.”</strong> — Chantal M.</p><p><strong>★★★★★ “Excellent quality, arrived right on time.”</strong> — Jean Claude</p></>}</div>
  </div>;
}

function FarmCardMini() {
  return <Link to="/farms/green-valley" className="farm-mini-card"><span className="farm-logo">GV</span><span><strong>Green Valley Farm <BadgeCheck size={14} /></strong><small><MapPin size={12} /> Rulindo, Northern Province · <Star size={12} fill="currentColor" /> 4.9</small></span><ChevronRight size={17} /></Link>;
}

function FarmProfile(props: SharedProps) {
  return <div className="farm-profile-page container"><div className="farm-cover">{image(farmCover, "Green Valley Farm landscape")}<div className="cover-gradient" /><button className="button button-glass cover-location"><MapPin size={15} /> Rulindo, Rwanda</button></div><div className="farm-profile-header"><div className="farm-profile-avatar">GV</div><div className="farm-profile-title"><div className="verified-line">VERIFIED FARM <BadgeCheck size={15} /></div><h1>Green Valley Farm</h1><p>Family-grown poultry, with care in every detail.</p><div className="farm-rating-line"><span>★★★★★</span> 4.9 <i /> <MapPin size={13} /> Rulindo, Northern Province <i /> <span>Member since 2021</span></div></div><button className="button button-primary" onClick={() => props.notify("Farmer messaging is a visual demo only")}><MessageCircle size={16} /> Contact farmer</button></div><div className="farm-profile-content"><div><div className="farm-about-card"><span className="eyebrow">A NOTE FROM THE FARM</span><h2>Growing good food, the thoughtful way.</h2><p>Welcome to Green Valley. We’re a family-run farm nestled in the hills of Rulindo, where we believe happy, healthy birds make a happier, healthier community. Everything we raise is nurtured with care and grown to be shared.</p><div className="farm-certifications"><span><ShieldCheck size={16} /> K&M verified</span><span><Leaf size={16} /> Family owned</span><span><MapPin size={16} /> Rulindo District</span></div></div><div className="farm-reviews"><SectionHeading eyebrow="KIND WORDS" title="What customers say" link="/farms/green-valley#reviews" linkText="Read all 48 reviews" />{[["“The eggs are so fresh, and I love knowing they come from a family farm.”","Jean Claude","★★★★★"],["“Great communication and wonderful quality every time.”","Chantal M.","★★★★★"]].map(([quote, name, stars]) => <article className="review-row" key={name}><div className="stars">{stars}</div><p>{quote}</p><small>{name} · Verified customer</small></article>)}</div></div><aside className="farm-side-card"><h3>Farm at a glance</h3><div><span><MapPin size={16} /> Location</span><strong>Rulindo, Northern Province</strong></div><div><span><Package size={16} /> Products</span><strong>12 active listings</strong></div><div><span><Star size={16} /> Rating</span><strong>4.9 / 5 · 48 reviews</strong></div><div><span><Truck size={16} /> Delivery</span><strong>Kigali & nearby districts</strong></div><button className="button button-outline" onClick={() => props.notify("Map preview is illustrative in this UI demo")}><MapPin size={15} /> View on map</button></aside></div><section className="farm-products"><SectionHeading eyebrow="FROM OUR FARM TO YOU" title="A little something from Green Valley" subtitle="Fresh picks, selected with care." /><ProductGrid items={[products[0], products[6], products[1], products[7]]} {...props} /></section></div>;
}

type ManagedUser = Pick<AuthUser, "id" | "name" | "email" | "role" | "verified" | "createdAt">;

function AdminUsersPage({ notify }: { notify: (text: string) => void }) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [query, setQuery] = useState("");
  const [pendingOnly, setPendingOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = async () => {
    try {
      const result = await authRequest<{ users: ManagedUser[] }>("/api/users");
      setUsers(result.users);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load user accounts.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void reload(); }, []);

  const toggleVerification = async (account: ManagedUser) => {
    try {
      const result = await authRequest<{ user: ManagedUser }>(`/api/users/${encodeURIComponent(account.id)}/verification`, {
        method: "PATCH",
        body: JSON.stringify({ verified: !account.verified }),
      });
      setUsers((current) => current.map((item) => item.id === account.id ? result.user : item));
      notify(`${account.name}'s account is ${result.user.verified ? "verified" : "pending review"}.`);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Could not update verification.";
      setError(message);
      notify(message);
    }
  };
  const visible = users.filter((account) => {
    const text = `${account.name} ${account.email} ${account.role}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (!pendingOnly || (["farmer", "delivery"].includes(account.role) && !account.verified));
  });
  const roleLabel = (role: UserRole) => ({ farmer: "Farmer", buyer: "Buyer", delivery: "Delivery agent", admin: "Administrator" })[role];

  return <div className="dashboard-page"><DashboardHeading eyebrow="ACCOUNT MANAGEMENT" title="People make this marketplace." subtitle="Review registered accounts and manage farmer and delivery verification."><button className="button button-outline" onClick={() => void reload()}><ArrowUpRight size={15} /> Refresh accounts</button></DashboardHeading>
    <section className="dash-panel admin-table-panel users-management"><div className="dash-panel-heading"><div><h2>Registered accounts <span className="user-total">{users.length}</span></h2><p>Account records stored securely by the K&amp;M server.</p></div><div className="admin-table-actions"><div className="small-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email or role…" /></div><button className={`button button-outline button-compact ${pendingOnly ? "selected" : ""}`} onClick={() => setPendingOnly(!pendingOnly)} aria-pressed={pendingOnly}><Filter size={14} /> {pendingOnly ? "Pending only" : "Filter"}</button></div></div>
      {error && <div className="auth-error" role="alert">{error}</div>}
      {loading ? <div className="users-loading">Loading accounts…</div> : <div className="responsive-table"><table><thead><tr><th>ACCOUNT</th><th>ROLE</th><th>CREATED</th><th>VERIFICATION</th><th>ACTION</th></tr></thead><tbody>{visible.map((account) => <tr key={account.id}><td><div className="admin-user"><span className="avatar">{account.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span><strong>{account.name}<small>{account.email}</small></strong></div></td><td>{roleLabel(account.role)}</td><td>{new Date(account.createdAt).toLocaleDateString()}</td><td><span className={`admin-status ${account.verified ? "" : "pending"}`}><i />{account.verified ? "Verified" : "Pending review"}</span></td><td>{["farmer", "delivery"].includes(account.role) ? <button className="button button-outline button-compact" onClick={() => void toggleVerification(account)}>{account.verified ? "Remove verification" : "Verify account"}</button> : <span className="account-no-action">—</span>}</td></tr>)}</tbody></table>{!visible.length && <div className="users-empty">No accounts match your search.</div>}</div>}
    </section>
  </div>;
}

function AdminDashboard({ notify, user }: SharedProps) {
  const [tab, setTab] = useState("Users");
  const [query, setQuery] = useState("");
  const visibleProducts = products.filter((product) => `${product.name} ${product.seller} ${product.category}`.toLowerCase().includes(query.toLowerCase()));
  const firstName = user?.name.split(" ")[0] || "Administrator";
  return <div className="dashboard-page"><DashboardHeading eyebrow="PLATFORM ADMIN" title="A clearer view of our community." subtitle={`Good morning, ${firstName}. Here's how K&M is growing.`}><button className="button button-outline" onClick={() => notify("Platform report downloaded in demo mode")}><ArrowDownRight size={16} /> Export report</button></DashboardHeading><div className="dashboard-stats admin-stats">{farmStats.map((item, index) => <StatCard key={item.label} icon={[Sprout, ShoppingBag, Users, Wallet][index]} label={item.label} value={item.value} delta={item.change} color={item.color} note="compared to last month" />)}</div>
    <div className="dashboard-content-grid"><Suspense fallback={<ChartFallback />}><RevenueChart title="Platform performance" subtitle="Gross marketplace value over the past six months" /></Suspense><section className="dash-panel admin-insights"><div className="dash-panel-heading"><div><h2>Platform health</h2><p>Your marketplace at a glance</p></div><span className="healthy-pill"><i /> Healthy</span></div><div className="health-stat"><span>Farmer verification</span><strong>94% <small>+2.4%</small></strong><div><i style={{ width: "94%" }} /></div></div><div className="health-stat"><span>Order completion</span><strong>97.8% <small>+1.6%</small></strong><div><i style={{ width: "97.8%" }} /></div></div><div className="health-stat"><span>Customer satisfaction</span><strong>4.8 / 5 <small>+0.2</small></strong><div><i style={{ width: "96%" }} /></div></div><div className="admin-note"><Sparkles size={16} /><span><strong>Growing steadily</strong><small>Marketplace activity is up 14% this month.</small></span></div></section></div>
    <div className="admin-tabs">{["Users", "Products", "Orders"].map((label) => <button className={tab === label ? "active" : ""} key={label} onClick={() => { setTab(label); setQuery(""); }}>{label}</button>)}</div>
    {tab === "Users" ? <section className="dash-panel admin-users-link"><span className="quick-icon mint"><Users size={20} /></span><div><h2>Manage real user accounts</h2><p>Review registered users, filter accounts, and update farmer or delivery verification.</p></div><Link className="button button-primary" to="/users">Open user management <ArrowRight size={15} /></Link></section>
      : <section className="dash-panel admin-table-panel"><div className="dash-panel-heading"><div><h2>{tab} management</h2><p>Monitor the K&amp;M marketplace sample listings.</p></div><div className="admin-table-actions"><div className="small-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${tab.toLowerCase()}...`} /></div>{tab === "Users" && <Link className="button button-outline button-compact" to="/users">Manage users</Link>}</div></div>{tab === "Products" ? <div className="responsive-table"><table><thead><tr><th>PRODUCT</th><th>SELLER</th><th>CATEGORY</th><th>PRICE</th><th>STATUS</th></tr></thead><tbody>{visibleProducts.slice(0, 5).map((product) => <tr key={product.id}><td><div className="order-product">{image(product.image, product.name)}<strong>{product.name}</strong></div></td><td>{product.seller}</td><td>{product.category}</td><td>{fmt(product.price)}</td><td><span className="admin-status"><i />Active sample</span></td></tr>)}</tbody></table></div> : <OrdersTable compact notify={notify} viewAllTo="/admin#orders" />}</section>}
  </div>;
}

function AddProductModal({ close, notify }: { close: () => void; notify: (text: string) => void }) {
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); close(); notify("Your product is ready to preview in the marketplace"); };
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && close()}><form className="add-product-modal" onSubmit={submit}><button type="button" className="modal-close" onClick={close} aria-label="Close"><X size={19} /></button><span className="eyebrow">SHARE YOUR HARVEST</span><h2>List a new product</h2><p>Show buyers what's growing at your farm.</p><label>Product name<input required placeholder="e.g. Fresh brown eggs" /></label><div className="modal-row"><label>Category<select><option>Table eggs</option><option>Live chickens</option><option>Day-old chicks</option><option>Chicken meat</option><option>Poultry feed</option><option>Farm equipment</option></select></label><label>Price (RWF)<input type="number" min="1" required placeholder="5,200" /></label></div><label>Short description<textarea rows={3} placeholder="What makes your product special?" /></label><div className="upload-area"><Plus size={20} /><strong>Add product photos</strong><small>JPG or PNG · Up to 5 images</small><input type="file" accept="image/*" multiple /></div><div className="modal-actions"><button type="button" className="button button-outline" onClick={close}>Cancel</button><button className="button button-primary" type="submit">Save product <ArrowRight size={15} /></button></div></form></div>;
}

function MobileBottomNav() {
  const location = useLocation();
  if (!["/farmer", "/buyer", "/delivery", "/admin", "/users"].includes(location.pathname)) return null;
  const role = location.pathname === "/users" ? "admin" : location.pathname.slice(1);
  const links = role === "farmer" ? [["Overview", "/farmer", Home], ["Orders", "/farmer#orders", ClipboardList], ["Products", "/marketplace", Package], ["Farm", "/farms/green-valley", Sprout]]
    : role === "delivery" ? [["Overview", "/delivery", Home], ["Routes", "/delivery#assignments", MapPin], ["History", "/delivery#history", ClipboardList], ["Earnings", "/delivery#earnings", Wallet]]
      : role === "admin" ? [["Overview", "/admin", Home], ["Users", "/admin#users", Users], ["Orders", "/admin#orders", ClipboardList], ["Reports", "/admin#analytics", ChartNoAxesCombined]]
        : [["Home", "/buyer", Home], ["Shop", "/marketplace", ShoppingBag], ["Orders", "/buyer#orders", ClipboardList], ["Saved", "/buyer#wishlist", Heart]];
  return <nav className="mobile-bottom-nav">{links.map(([label, href, Icon]) => { const IconComponent = Icon as typeof Home; return <Link to={href as string} key={label as string} className={location.pathname === href ? "active" : ""}><IconComponent size={18} /><span>{label as string}</span></Link>; })}</nav>;
}

function NotFound() {
  return <div className="not-found"><span>404</span><h1>This path hasn't been built yet.</h1><p>Take a look around the marketplace instead.</p><Link className="button button-primary" to="/">Back to K&amp;M <ArrowLeft size={15} /></Link></div>;
}

export default App;
