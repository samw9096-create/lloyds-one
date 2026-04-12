const DEMO_USER_ID = "demo_user_1";
const REMOTE_KEY = "demo_remote_state";

function isoDaysAgo(days, hour = 12) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

function seedState() {
  const users = [
    { id: DEMO_USER_ID, name: "Maya Johnson", created_at: isoDaysAgo(120) },
    { id: "demo_friend_1", name: "Taylor Brooks", created_at: isoDaysAgo(210) },
    { id: "demo_friend_2", name: "Jordan Bell", created_at: isoDaysAgo(240) },
    { id: "demo_friend_3", name: "Avery Hayes", created_at: isoDaysAgo(180) },
    { id: "demo_friend_4", name: "Harper Lane", created_at: isoDaysAgo(300) },
    { id: "demo_friend_5", name: "Morgan Shaw", created_at: isoDaysAgo(280) },
    { id: "demo_friend_6", name: "Casey Morgan", created_at: isoDaysAgo(260) },
    { id: "demo_friend_7", name: "Riley Turner", created_at: isoDaysAgo(200) },
    { id: "demo_friend_8", name: "Cameron Price", created_at: isoDaysAgo(230) },
    { id: "demo_friend_9", name: "Jamie Cole", created_at: isoDaysAgo(190) },
    { id: "demo_friend_10", name: "Quinn Bailey", created_at: isoDaysAgo(170) }
  ];

  const accounts = {
    [DEMO_USER_ID]: 1240,
    demo_friend_1: 560,
    demo_friend_2: 730,
    demo_friend_3: 410,
    demo_friend_4: 820,
    demo_friend_5: 350,
    demo_friend_6: 915,
    demo_friend_7: 640,
    demo_friend_8: 540,
    demo_friend_9: 480,
    demo_friend_10: 700
  };

  const transactions = [
    { id: "tx_demo_1", from_user: DEMO_USER_ID, to_user: "merchant_tesco", amount: 32.4, reference: "Tesco weekly shop", created_at: isoDaysAgo(2, 18) },
    { id: "tx_demo_2", from_user: DEMO_USER_ID, to_user: "demo_friend_1", amount: 18, reference: "Dinner split", counterpartyName: "Taylor Brooks", created_at: isoDaysAgo(3, 20) },
    { id: "tx_demo_3", from_user: DEMO_USER_ID, to_user: "merchant_trainline", amount: 24.9, reference: "Trainline off-peak", created_at: isoDaysAgo(4, 8) },
    { id: "tx_demo_4", from_user: "employer_demo", to_user: DEMO_USER_ID, amount: 950, reference: "Part-time wages", created_at: isoDaysAgo(5, 9) },
    { id: "tx_demo_5", from_user: DEMO_USER_ID, to_user: "merchant_apple", amount: 12.99, reference: "Apple storage", created_at: isoDaysAgo(6, 11) },
    { id: "tx_demo_6", from_user: DEMO_USER_ID, to_user: "merchant_costa", amount: 4.8, reference: "Costa coffee", created_at: isoDaysAgo(7, 9) },
    { id: "tx_demo_7", from_user: DEMO_USER_ID, to_user: "merchant_steam", amount: 19.99, reference: "Steam wallet", created_at: isoDaysAgo(9, 19) },
    { id: "tx_demo_8", from_user: DEMO_USER_ID, to_user: "merchant_asos", amount: 41.5, reference: "ASOS order", created_at: isoDaysAgo(11, 16) },
    { id: "tx_demo_9", from_user: DEMO_USER_ID, to_user: "merchant_tesco", amount: 14.3, reference: "Tesco top-up", created_at: isoDaysAgo(13, 18) },
    { id: "tx_demo_10", from_user: DEMO_USER_ID, to_user: "demo_friend_2", amount: 26, reference: "Gig tickets", counterpartyName: "Jordan Bell", created_at: isoDaysAgo(14, 21) },
    { id: "tx_demo_11", from_user: DEMO_USER_ID, to_user: "merchant_gusto", amount: 22.4, reference: "Gusto dinner", created_at: isoDaysAgo(16, 20) },
    { id: "tx_demo_12", from_user: "parent_demo", to_user: DEMO_USER_ID, amount: 120, reference: "Family transfer", created_at: isoDaysAgo(17, 10) },
    { id: "tx_demo_13", from_user: DEMO_USER_ID, to_user: "merchant_uber", amount: 13.6, reference: "Uber home", created_at: isoDaysAgo(19, 23) },
    { id: "tx_demo_14", from_user: DEMO_USER_ID, to_user: "merchant_tesco", amount: 27.8, reference: "Tesco weekly shop", created_at: isoDaysAgo(22, 17) },
    { id: "tx_demo_15", from_user: DEMO_USER_ID, to_user: "demo_friend_3", amount: 12, reference: "Lunch split", counterpartyName: "Avery Hayes", created_at: isoDaysAgo(24, 14) },
    { id: "tx_demo_16", from_user: DEMO_USER_ID, to_user: "merchant_vue", amount: 9.99, reference: "Vue cinema", created_at: isoDaysAgo(26, 19) }
  ];

  const profiles = {
    [DEMO_USER_ID]: {
      user_id: DEMO_USER_ID,
      name: "Maya Johnson",
      finance_competency: "comfortable",
      interests: ["food", "tech", "concerts", "travel"],
      avatar_url: "",
      helper: "louie",
      updated_at: new Date().toISOString()
    }
  };

  return { users, accounts, transactions, profiles };
}

function getState() {
  try {
    const raw = localStorage.getItem(REMOTE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const seeded = seedState();
  localStorage.setItem(REMOTE_KEY, JSON.stringify(seeded));
  return seeded;
}

function setState(state) {
  localStorage.setItem(REMOTE_KEY, JSON.stringify(state));
  return state;
}

export async function getSupabaseUser() {
  return { id: DEMO_USER_ID, email: "demo@one.app" };
}

export async function ensureRemoteUserProfile(profile) {
  const state = getState();
  const user = state.users.find((entry) => entry.id === DEMO_USER_ID) || { id: DEMO_USER_ID, name: profile?.name || "Maya Johnson" };
  if (!state.users.some((entry) => entry.id === DEMO_USER_ID)) state.users.unshift(user);
  if (profile?.name) user.name = profile.name;
  if (typeof state.accounts[DEMO_USER_ID] !== "number") state.accounts[DEMO_USER_ID] = 1240;
  setState(state);
  return { id: DEMO_USER_ID, email: "demo@one.app" };
}

export async function updateRemoteName(name) {
  const state = getState();
  const user = state.users.find((entry) => entry.id === DEMO_USER_ID);
  if (user && name) user.name = name;
  setState(state);
}

export async function fetchBalance(userId) {
  const state = getState();
  return Number(state.accounts[userId] || 0);
}

export async function updateAccountBalance(userId, balance) {
  const state = getState();
  state.accounts[userId] = Number(balance) || 0;
  setState(state);
}

export async function fetchTransactions(userId, limit = 10) {
  const state = getState();
  return state.transactions
    .filter((tx) => tx.from_user === userId || tx.to_user === userId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, limit);
}

export async function fetchTransactionById(id) {
  const state = getState();
  return state.transactions.find((tx) => tx.id === id) || null;
}

export async function fetchUsers() {
  const state = getState();
  return state.users;
}

export async function fetchUserById(userId) {
  const state = getState();
  return state.users.find((entry) => entry.id === userId) || null;
}

export async function transferFunds({ senderId, receiverId, amount, reference }) {
  const state = getState();
  const value = Number(amount) || 0;
  if (!senderId || !receiverId || value <= 0) throw new Error("Invalid transfer.");
  const senderBalance = Number(state.accounts[senderId] || 0);
  if (senderBalance < value) throw new Error("Insufficient funds.");
  state.accounts[senderId] = senderBalance - value;
  state.accounts[receiverId] = Number(state.accounts[receiverId] || 0) + value;
  const receiver = state.users.find((entry) => entry.id === receiverId);
  state.transactions.unshift({
    id: `tx_demo_${Date.now()}`,
    from_user: senderId,
    to_user: receiverId,
    amount: value,
    reference: reference || `Transfer to ${receiver?.name || "friend"}`,
    counterpartyName: receiver?.name || "friend",
    created_at: new Date().toISOString()
  });
  setState(state);
}

export async function fetchProfile(userId) {
  const state = getState();
  return state.profiles[userId] || null;
}

export async function upsertProfile({ userId, name, financeCompetency, interests, avatarUrl, helper }) {
  const state = getState();
  state.profiles[userId] = {
    user_id: userId,
    name: name || "User",
    finance_competency: financeCompetency || null,
    interests: interests || [],
    avatar_url: avatarUrl || "",
    helper: helper || null,
    updated_at: new Date().toISOString()
  };
  const user = state.users.find((entry) => entry.id === userId);
  if (user && name) user.name = name;
  setState(state);
}

export async function callAccountAdmin(action) {
  if (action === "reset") {
    localStorage.removeItem(REMOTE_KEY);
    setState(seedState());
    return { ok: true };
  }
  return { ok: true, demo: true };
}

export async function fetchDatasetOverview() {
  return {
    product_count: 8,
    customer_count: 20,
    account_count: 79,
    transaction_count: 8227,
    interaction_count: 2003,
    total_incoming: 453652.88,
    total_outgoing: 760702.94
  };
}

export async function fetchDatasetProducts(limit = 12) {
  const items = [
    { product_id: "101", product_name: "Classic", product_type: "Personal Current Account", product_benefits: "interest-rate: 0 | monthly-fee: 0 | min-monthly-deposit: 10" },
    { product_id: "102", product_name: "Club Lloyds", product_type: "Personal Current Account", product_benefits: "1 yearly benefit plus fee/deposit rules from the source dataset." },
    { product_id: "103", product_name: "Easy Saver", product_type: "Savings", product_benefits: "interest-rate: 1.4% AER | max withdrawal limit: 250" },
    { product_id: "104", product_name: "Club Lloyds Advantage Saver", product_type: "Savings", product_benefits: "interest-rate: 4.00% AER | max yearly withdrawals: 4" },
    { product_id: "105", product_name: "Everyday Credit Card", product_type: "Credit Card", product_benefits: "Balance to be paid first day of month." },
    { product_id: "106", product_name: "Lloyds Credit Card", product_type: "Credit Card", product_benefits: "1% cashback and monthly repayment rules in the source data." },
    { product_id: "107", product_name: "Arranged Overdraft", product_type: "Overdraft", product_benefits: "27.5% EAR (variable) with £500 interest-free overdraft limit." },
    { product_id: "108", product_name: "Unarranged Overdraft", product_type: "Overdraft", product_benefits: "39.95% EAR (variable) with £25 interest-free buffer." }
  ];
  return items.slice(0, limit);
}

export async function fetchDatasetCustomerProfiles(limit = 12) {
  const items = [
    { customer_id: "70986212122", display_name: "Ms Jessica G.", city: "Teresastad", nationality: "British", monthly_income: 800, income_band: "£750-£999", marital_status: "Single", account_count: 5, product_count: 5, linked_products: "Arranged Overdraft, Classic, Club Lloyds Advantage Saver, Easy Saver, Lloyds Credit Card", latest_visit_date: "2025-12-28" },
    { customer_id: "70986212129", display_name: "Ms Georgia P.", city: "North Lindseyton", nationality: "British", monthly_income: 800, income_band: "£750-£999", marital_status: "Single", account_count: 4, product_count: 4, linked_products: "Arranged Overdraft, Club Lloyds, Club Lloyds Advantage Saver, Lloyds Credit Card", latest_visit_date: "2025-12-30" },
    { customer_id: "70986212130", display_name: "Ms Aimee J.", city: "Nixonchester", nationality: "British", monthly_income: 800, income_band: "£750-£999", marital_status: "Single", account_count: 4, product_count: 4, linked_products: "Classic, Easy Saver, Everyday Credit Card, Unarranged Overdraft", latest_visit_date: "2025-12-29" }
  ];
  return items.slice(0, limit);
}

export async function fetchDatasetRecentActivity(limit = 10) {
  const items = [
    { transaction_id: "demo_dataset_tx_1", account_id: "2033000", customer_name: "Ms Ruth G.", city: "New Maryton", product_name: "Classic", transaction_date: "2025-12-31", transaction_time: "16:14:47", transaction_amount: 587.92, payment_type: "FP", payment_type_description: "Faster Payment - Bank Transfer", transaction_category: "Monthly income", transaction_reference: "CAMPUS JOB PAYMENT" },
    { transaction_id: "demo_dataset_tx_2", account_id: "2033101", customer_name: "Ms Aimee T.", city: "Port Lauren", product_name: "Easy Saver", transaction_date: "2025-12-31", transaction_time: "14:02:11", transaction_amount: -42.5, payment_type: "DD", payment_type_description: "Direct Debit", transaction_category: "Food shopping", transaction_reference: "TESCO STORES" },
    { transaction_id: "demo_dataset_tx_3", account_id: "2033037", customer_name: "Mr Oliver P.", city: "New Heatherburgh", product_name: "Club Lloyds Advantage Saver", transaction_date: "2025-12-30", transaction_time: "09:42:18", transaction_amount: -9.99, payment_type: "CPA", payment_type_description: "Continuous Payment Authority", transaction_category: "Entertainment", transaction_reference: "SPOTIFY" }
  ];
  return items.slice(0, limit);
}

export async function fetchDatasetInteractionHotspots(limit = 8) {
  const items = [
    { area_description: "Credit Cards", visit_count: 309, app_visits: 155, web_visits: 154, latest_visit_date: "2025-12-30" },
    { area_description: "Payments", visit_count: 303, app_visits: 145, web_visits: 158, latest_visit_date: "2025-12-30" },
    { area_description: "Account Overview", visit_count: 294, app_visits: 170, web_visits: 124, latest_visit_date: "2025-12-29" }
  ];
  return items.slice(0, limit);
}


export async function fetchDemoAdminSnapshot() {
  const state = getState();
  const transactions = state.transactions
    .filter((tx) => tx.from_user === DEMO_USER_ID || tx.to_user === DEMO_USER_ID)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return {
    balance: Number(state.accounts[DEMO_USER_ID] || 0),
    transactionCount: transactions.length,
    recentTransactions: transactions.slice(0, 8)
  };
}

export async function adminSetDemoBalance(amount) {
  const state = getState();
  state.accounts[DEMO_USER_ID] = Number(amount) || 0;
  setState(state);
  return Number(state.accounts[DEMO_USER_ID] || 0);
}

export async function adminCreateDemoTransaction({ direction = "incoming", amount = 0, counterparty = "Manual entry", reference = "Manual adjustment" } = {}) {
  const state = getState();
  const value = Math.max(0, Number(amount) || 0);
  if (!value) throw new Error("Enter a valid amount.");

  const createdAt = new Date().toISOString();
  const txId = `tx_demo_admin_${Date.now()}`;
  const cleanCounterparty = String(counterparty || "Manual entry").trim() || "Manual entry";
  const cleanReference = String(reference || "Manual adjustment").trim() || "Manual adjustment";

  let tx;
  if (direction === "outgoing") {
    const merchantId = `merchant_${cleanCounterparty.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "manual"}`;
    state.accounts[DEMO_USER_ID] = Number(state.accounts[DEMO_USER_ID] || 0) - value;
    tx = {
      id: txId,
      from_user: DEMO_USER_ID,
      to_user: merchantId,
      amount: value,
      reference: cleanReference,
      counterpartyName: cleanCounterparty,
      created_at: createdAt
    };
  } else {
    const sourceId = `source_${cleanCounterparty.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "manual"}`;
    state.accounts[DEMO_USER_ID] = Number(state.accounts[DEMO_USER_ID] || 0) + value;
    tx = {
      id: txId,
      from_user: sourceId,
      to_user: DEMO_USER_ID,
      amount: value,
      reference: cleanReference,
      counterpartyName: cleanCounterparty,
      created_at: createdAt
    };
  }

  state.transactions.unshift(tx);
  setState(state);
  return tx;
}
