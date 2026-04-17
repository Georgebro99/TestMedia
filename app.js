const STORAGE_KEY = "ripplegram-v3";

const directory = {
  alexm: { name: "Alex Moore", handle: "alexm", bio: "Street photos + coffee.", avatar: "A" },
  linafit: { name: "Lina Park", handle: "linafit", bio: "Training + routines.", avatar: "L" },
  devsam: { name: "Sam Reed", handle: "devsam", bio: "Building in public.", avatar: "S" },
  mayaart: { name: "Maya Ortiz", handle: "mayaart", bio: "Color studies and city sketches.", avatar: "M" },
};

const seededPosts = [
  {
    id: crypto.randomUUID(),
    author: "alexm",
    caption: "Sunset in the city. #streetphoto",
    image: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80",
    createdAt: Date.now() - 1000 * 60 * 26,
    likes: 321,
    bookmarks: 48,
    comments: [{ id: crypto.randomUUID(), by: "@linafit", text: "That sky is unreal." }],
  },
  {
    id: crypto.randomUUID(),
    author: "linafit",
    caption: "Quick core circuit between meetings #fitness",
    image: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80",
    createdAt: Date.now() - 1000 * 60 * 90,
    likes: 198,
    bookmarks: 29,
    comments: [],
  },
  {
    id: crypto.randomUUID(),
    author: "devsam",
    caption: "Late night shipping session #buildinpublic",
    image: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1200&q=80",
    createdAt: Date.now() - 1000 * 60 * 180,
    likes: 144,
    bookmarks: 17,
    comments: [],
  },
];

let state = loadState();
let currentThread = Object.keys(state.messages)[0] || "alexm";
let viewingProfile = state.user.handle;
let activeConnectionsMode = "followers";

const postTemplate = document.getElementById("postTemplate");
const mainNav = document.getElementById("mainNav");
const feedEl = document.getElementById("feed");
const storiesEl = document.getElementById("stories");
const searchInput = document.getElementById("searchInput");
const searchGrid = document.getElementById("searchGrid");
const reelsList = document.getElementById("reelsList");
const profileHeader = document.getElementById("profileHeader");
const profileGrid = document.getElementById("profileGrid");
const threadList = document.getElementById("threadList");
const chatMessages = document.getElementById("chatMessages");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const miniProfile = document.getElementById("miniProfile");
const suggestions = document.getElementById("suggestions");
const activeHandle = document.getElementById("activeHandle");

const createDialog = document.getElementById("createDialog");
const createForm = document.getElementById("createForm");
const createText = document.getElementById("createText");
const createImage = document.getElementById("createImage");
const newPostBtn = document.getElementById("newPostBtn");
const profileDialog = document.getElementById("profileDialog");
const profileForm = document.getElementById("profileForm");
const profileNameInput = document.getElementById("profileNameInput");
const profileHandleInput = document.getElementById("profileHandleInput");
const profileBioInput = document.getElementById("profileBioInput");

const settingsBtn = document.getElementById("settingsBtn");
const settingsDialog = document.getElementById("settingsDialog");
const settingsForm = document.getElementById("settingsForm");
const setDarkMode = document.getElementById("setDarkMode");
const setCompact = document.getElementById("setCompact");
const setStatus = document.getElementById("setStatus");
const setAutoplay = document.getElementById("setAutoplay");
const setPrivate = document.getElementById("setPrivate");
const setAccent = document.getElementById("setAccent");

const connectionsDialog = document.getElementById("connectionsDialog");
const connectionsTitle = document.getElementById("connectionsTitle");
const connectionsList = document.getElementById("connectionsList");
const connectionsClose = document.getElementById("connectionsClose");

const toast = document.getElementById("toast");

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}

  return {
    user: { name: "Jordan Lake", handle: "jordanlake", bio: "Daily life and small wins.", avatar: "J" },
    posts: seededPosts,
    interactions: {},
    follows: ["alexm", "linafit"],
    followers: ["mayaart", "devsam"],
    messages: {
      alexm: [
        { fromMe: false, text: "New post soon." },
        { fromMe: true, text: "Ready when you are." },
      ],
    },
    settings: {
      darkMode: false,
      compactFeed: false,
      showStatus: true,
      autoplayReels: true,
      privateAccount: false,
      accent: "blue",
    },
  };
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getUser(handle) {
  if (handle === state.user.handle) return state.user;
  return directory[handle] || { name: handle, handle, bio: "", avatar: handle[0].toUpperCase() };
}

function timeAgo(ts) {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function showToast(text) {
  toast.textContent = text;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 1200);
}

function applySettings() {
  document.body.classList.toggle("theme-dark", state.settings.darkMode);
  document.body.classList.toggle("compact", state.settings.compactFeed);
  document.body.classList.toggle("accent-pink", state.settings.accent === "pink");
  document.body.classList.toggle("accent-green", state.settings.accent === "green");
  document.body.classList.toggle("accent-blue", state.settings.accent === "blue");

  setDarkMode.checked = state.settings.darkMode;
  setCompact.checked = state.settings.compactFeed;
  setStatus.checked = state.settings.showStatus;
  setAutoplay.checked = state.settings.autoplayReels;
  setPrivate.checked = state.settings.privateAccount;
  setAccent.value = state.settings.accent;
}

function switchView(view) {
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active-view"));
  document.getElementById(`${view}View`).classList.add("active-view");
  document.querySelectorAll(".nav-btn[data-view]").forEach((btn) => btn.classList.remove("active"));
  document.querySelector(`.nav-btn[data-view='${view}']`)?.classList.add("active");
}

function renderStories() {
  const people = [state.user.handle, ...state.follows];
  storiesEl.innerHTML = people
    .map((handle) => {
      const u = getUser(handle);
      return `<button class='story' data-profile='${u.handle}'><div class='avatar'>${u.avatar}</div><small>${u.handle}</small></button>`;
    })
    .join("");
}

function fillPostNode(node, post) {
  const u = getUser(post.author);
  node.dataset.postId = post.id;
  node.dataset.author = post.author;
  node.querySelector(".author-name").textContent = u.name;
  node.querySelector(".author-handle").textContent = `@${u.handle}`;
  node.querySelector(".post-time").textContent = timeAgo(post.createdAt);
  node.querySelector(".post-caption").textContent = post.caption;
  node.querySelector(".avatar").textContent = u.avatar;

  const img = node.querySelector(".post-image");
  img.src = post.image;
  img.addEventListener("dblclick", () => {
    togglePostAction(post, "like", node.querySelector('[data-action="like"]'));
    refreshCore();
  });

  const counts = { like: post.likes, comment: post.comments.length, bookmark: post.bookmarks };
  Object.entries(counts).forEach(([name, count]) => {
    const btn = node.querySelector(`[data-action='${name}']`);
    btn.querySelector("span").textContent = count;
    if (state.interactions[post.id]?.includes(name)) btn.classList.add("active");
  });

  const comments = node.querySelector(".comments");
  comments.innerHTML = "";
  post.comments.forEach((c) => {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${c.by}</strong> ${c.text}`;
    comments.append(li);
  });
}

function renderFeed() {
  feedEl.innerHTML = "";
  state.posts
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .forEach((post) => {
      const node = postTemplate.content.firstElementChild.cloneNode(true);
      fillPostNode(node, post);
      feedEl.append(node);
    });
}

function score(post) {
  return post.likes + post.bookmarks + post.comments.length * 2;
}

function renderSearch(query = "") {
  const q = query.trim().toLowerCase();
  searchGrid.innerHTML = state.posts
    .filter((p) => !q || p.caption.toLowerCase().includes(q) || p.author.includes(q))
    .sort((a, b) => score(b) - score(a))
    .map((p) => `<button class='grid-post' data-post='${p.id}'><img src='${p.image}' alt='Search post' /></button>`)
    .join("");
}

function renderReels() {
  reelsList.innerHTML = state.posts
    .slice()
    .sort((a, b) => score(b) - score(a))
    .slice(0, 6)
    .map((p) => `<article class='reel'><img src='${p.image}' alt='Reel' loading='lazy' /><div class='overlay'><strong>@${p.author}</strong><p>${p.caption}</p></div></article>`)
    .join("");
}

function renderProfile() {
  const u = getUser(viewingProfile);
  const posts = state.posts.filter((p) => p.author === u.handle);
  const isMe = u.handle === state.user.handle;
  const following = state.follows.includes(u.handle);

  profileHeader.innerHTML = `
    <div class='avatar big'>${u.avatar}</div>
    <div>
      <h2>${u.name}</h2>
      <p>@${u.handle}${state.settings.showStatus ? " · active now" : ""}</p>
      <p>${u.bio || "No bio."}</p>
      <div class='stats'>
        <span><strong>${posts.length}</strong> posts</span>
        <button class='link-stat' data-open-connections='followers'><strong>${state.followers.length}</strong> followers</button>
        <button class='link-stat' data-open-connections='following'><strong>${state.follows.length}</strong> following</button>
      </div>
      ${isMe ? `<button class='ghost' id='openProfileEdit'>Edit profile</button>` : `<button class='primary' id='followProfileBtn'>${following ? "Following" : "Follow"}</button>`}
    </div>
  `;

  profileGrid.innerHTML = posts.map((p) => `<img src='${p.image}' alt='Profile post' />`).join("");
}

function renderMessages() {
  const handles = Object.keys(state.messages);
  if (!handles.includes(currentThread)) currentThread = handles[0] || "alexm";

  threadList.innerHTML = handles
    .map((handle) => {
      const u = getUser(handle);
      const cls = handle === currentThread ? "thread active" : "thread";
      return `<button class='${cls}' data-thread='${handle}'><div class='avatar tiny'>${u.avatar}</div><span>${u.name}</span></button>`;
    })
    .join("");

  chatMessages.innerHTML = (state.messages[currentThread] || [])
    .map((m) => `<p class='msg ${m.fromMe ? "mine" : "theirs"}'>${m.text}</p>`)
    .join("");
}

function renderRail() {
  activeHandle.textContent = state.user.handle;
  miniProfile.innerHTML = `<div class='avatar'>${state.user.avatar}</div><div><strong>${state.user.name}</strong><small>@${state.user.handle}</small></div>`;
  suggestions.innerHTML = Object.values(directory)
    .filter((u) => u.handle !== state.user.handle && !state.follows.includes(u.handle))
    .map((u) => `<li><span>@${u.handle}</span><button class='ghost' data-follow='${u.handle}'>Follow</button></li>`)
    .join("");
}

function renderConnectionsDialog() {
  const list = activeConnectionsMode === "followers" ? state.followers : state.follows;
  connectionsTitle.textContent = activeConnectionsMode === "followers" ? "Followers" : "Following";
  connectionsList.innerHTML = list
    .map((handle) => {
      const u = getUser(handle);
      return `<li><div class='avatar tiny'>${u.avatar}</div><div><strong>${u.name}</strong><small>@${u.handle}</small></div></li>`;
    })
    .join("");

  if (!list.length) {
    connectionsList.innerHTML = "<li><small>No accounts yet.</small></li>";
  }
}

function refreshCore() {
  persist();
  applySettings();
  renderStories();
  renderFeed();
  renderSearch(searchInput.value);
  renderReels();
  renderProfile();
  renderMessages();
  renderRail();
}

function togglePostAction(post, type, button) {
  state.interactions[post.id] = state.interactions[post.id] || [];
  const had = state.interactions[post.id].includes(type);
  const delta = had ? -1 : 1;

  if (type === "like") post.likes += delta;
  if (type === "bookmark") post.bookmarks += delta;

  if (had) {
    state.interactions[post.id] = state.interactions[post.id].filter((x) => x !== type);
  } else {
    state.interactions[post.id].push(type);
  }

  button?.classList.add("pulse");
  setTimeout(() => button?.classList.remove("pulse"), 280);
}

mainNav.addEventListener("click", (event) => {
  const nav = event.target.closest("[data-view]");
  if (!nav) return;
  if (nav.dataset.view === "profile") viewingProfile = state.user.handle;
  switchView(nav.dataset.view);
});

newPostBtn.addEventListener("click", () => createDialog.showModal());
settingsBtn.addEventListener("click", () => settingsDialog.showModal());
connectionsClose.addEventListener("click", () => connectionsDialog.close());

feedEl.addEventListener("click", (event) => {
  const postEl = event.target.closest(".post");
  const post = state.posts.find((p) => p.id === postEl?.dataset.postId);
  const action = event.target.closest("[data-action]")?.dataset.action;

  if (post && action) {
    if (action === "comment") {
      postEl.querySelector(".comment-form").classList.toggle("hidden");
      return;
    }

    togglePostAction(post, action, event.target.closest("[data-action]"));
    refreshCore();
    showToast(`${action} updated`);
    return;
  }

  if (event.target.closest("[data-action='open-profile']") && postEl) {
    viewingProfile = postEl.dataset.author;
    renderProfile();
    switchView("profile");
  }
});

feedEl.addEventListener("submit", (event) => {
  if (!event.target.matches(".comment-form")) return;
  event.preventDefault();

  const form = event.target;
  const post = state.posts.find((p) => p.id === form.closest(".post")?.dataset.postId);
  const input = form.querySelector("input");
  const text = input.value.trim();
  if (!post || !text) return;

  post.comments.push({ id: crypto.randomUUID(), by: `@${state.user.handle}`, text });
  input.value = "";
  form.classList.add("hidden");
  refreshCore();
  showToast("Comment posted");
});

storiesEl.addEventListener("click", (event) => {
  const story = event.target.closest(".story");
  if (!story) return;
  viewingProfile = story.dataset.profile;
  renderProfile();
  switchView("profile");
});

searchInput.addEventListener("input", () => renderSearch(searchInput.value));

searchGrid.addEventListener("click", (event) => {
  const item = event.target.closest(".grid-post");
  if (!item) return;
  const post = state.posts.find((p) => p.id === item.dataset.post);
  if (!post) return;
  viewingProfile = post.author;
  renderProfile();
  switchView("profile");
});

threadList.addEventListener("click", (event) => {
  const thread = event.target.closest("[data-thread]");
  if (!thread) return;
  currentThread = thread.dataset.thread;
  renderMessages();
});

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;

  state.messages[currentThread] = state.messages[currentThread] || [];
  state.messages[currentThread].push({ fromMe: true, text });
  chatInput.value = "";
  persist();
  renderMessages();

  setTimeout(() => {
    state.messages[currentThread].push({ fromMe: false, text: "Love this. Keep me posted." });
    persist();
    renderMessages();
  }, 700);
});

suggestions.addEventListener("click", (event) => {
  const btn = event.target.closest("[data-follow]");
  if (!btn) return;
  const handle = btn.dataset.follow;
  if (!state.follows.includes(handle)) state.follows.push(handle);
  if (!state.messages[handle]) state.messages[handle] = [{ fromMe: false, text: "Hey, thanks for the follow!" }];
  refreshCore();
  showToast(`Following @${handle}`);
});

createForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const caption = createText.value.trim();
  if (!caption) return;

  state.posts.unshift({
    id: crypto.randomUUID(),
    author: state.user.handle,
    caption,
    image: createImage.value.trim() || "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80",
    createdAt: Date.now(),
    likes: 0,
    bookmarks: 0,
    comments: [],
  });

  createForm.reset();
  createDialog.close();
  refreshCore();
  switchView("home");
  showToast("Post shared");
});

profileForm.addEventListener("submit", (event) => {
  event.preventDefault();
  state.user = {
    ...state.user,
    name: profileNameInput.value.trim(),
    handle: profileHandleInput.value.trim().replace(/^@/, ""),
    bio: profileBioInput.value.trim(),
  };
  viewingProfile = state.user.handle;
  profileDialog.close();
  refreshCore();
  showToast("Profile saved");
});

settingsForm.addEventListener("submit", (event) => {
  event.preventDefault();
  state.settings = {
    darkMode: setDarkMode.checked,
    compactFeed: setCompact.checked,
    showStatus: setStatus.checked,
    autoplayReels: setAutoplay.checked,
    privateAccount: setPrivate.checked,
    accent: setAccent.value,
  };

  settingsDialog.close();
  refreshCore();
  showToast("Settings updated");
});

document.addEventListener("click", (event) => {
  if (event.target.closest("#openProfileEdit")) {
    profileNameInput.value = state.user.name;
    profileHandleInput.value = state.user.handle;
    profileBioInput.value = state.user.bio;
    profileDialog.showModal();
    return;
  }

  const followBtn = event.target.closest("#followProfileBtn");
  if (followBtn && !state.follows.includes(viewingProfile)) {
    state.follows.push(viewingProfile);
    refreshCore();
    return;
  }

  const statBtn = event.target.closest("[data-open-connections]");
  if (statBtn) {
    activeConnectionsMode = statBtn.dataset.openConnections;
    renderConnectionsDialog();
    connectionsDialog.showModal();
  }
});

refreshCore();
