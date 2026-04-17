const STORAGE_KEY = "ripplegram-v1";

const directory = {
  alexm: { name: "Alex Moore", handle: "alexm", bio: "Street photos + coffee.", avatar: "A" },
  linafit: { name: "Lina Park", handle: "linafit", bio: "Training + routines.", avatar: "L" },
  devsam: { name: "Sam Reed", handle: "devsam", bio: "Building in public.", avatar: "S" },
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
    caption: "Quick core circuit between meetings 💪 #fitness",
    image: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80",
    createdAt: Date.now() - 1000 * 60 * 90,
    likes: 198,
    bookmarks: 29,
    comments: [],
  },
  {
    id: crypto.randomUUID(),
    author: "devsam",
    caption: "Late night shipping session. #buildinpublic",
    image: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1200&q=80",
    createdAt: Date.now() - 1000 * 60 * 180,
    likes: 144,
    bookmarks: 17,
    comments: [],
  },
];

const seededMessages = {
  alexm: [
    { fromMe: false, text: "New post soon 👀" },
    { fromMe: true, text: "Drop it, I’m ready." },
  ],
};

let state = loadState();
let currentView = "home";
let currentThread = "alexm";
let viewingProfile = state.user.handle;

const mainNav = document.getElementById("mainNav");
const toast = document.getElementById("toast");
const postTemplate = document.getElementById("postTemplate");

const storiesEl = document.getElementById("stories");
const feedEl = document.getElementById("feed");
const searchInput = document.getElementById("searchInput");
const searchGrid = document.getElementById("searchGrid");
const reelsList = document.getElementById("reelsList");
const profileGrid = document.getElementById("profileGrid");
const profileHeader = document.getElementById("profileHeader");

const threadList = document.getElementById("threadList");
const chatMessages = document.getElementById("chatMessages");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");

const miniProfile = document.getElementById("miniProfile");
const suggestions = document.getElementById("suggestions");

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
const editProfileBtn = document.getElementById("editProfileBtn");

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
    messages: seededMessages,
  };
}

function saveState() {
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

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(showToast.t);
  showToast.t = setTimeout(() => toast.classList.remove("show"), 1400);
}

function switchView(view) {
  currentView = view;
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active-view"));
  document.getElementById(`${view}View`).classList.add("active-view");

  document.querySelectorAll(".nav-btn[data-view]").forEach((b) => b.classList.remove("active"));
  const active = document.querySelector(`.nav-btn[data-view="${view}"]`);
  if (active) active.classList.add("active");
}

function postScore(post) {
  return post.likes + post.bookmarks + post.comments.length * 2;
}

function hydratePost(node, post) {
  const author = getUser(post.author);
  node.dataset.postId = post.id;
  node.dataset.author = post.author;

  node.querySelector(".author-name").textContent = author.name;
  node.querySelector(".author-handle").textContent = `@${author.handle}`;
  node.querySelector(".post-time").textContent = timeAgo(post.createdAt);
  node.querySelector(".post-caption").textContent = post.caption;

  const avatar = node.querySelector(".avatar");
  avatar.textContent = author.avatar;

  const image = node.querySelector(".post-image");
  image.src = post.image;
  image.addEventListener("dblclick", () => {
    toggleInteraction(post, "like", node.querySelector('button[data-action="like"]'));
    persistAndRender();
  });

  const counts = {
    like: post.likes,
    comment: post.comments.length,
    bookmark: post.bookmarks,
  };

  Object.keys(counts).forEach((type) => {
    const btn = node.querySelector(`button[data-action="${type}"]`);
    btn.querySelector("span").textContent = counts[type];
    if (state.interactions[post.id]?.includes(type)) btn.classList.add("active");
  });

  const comments = node.querySelector(".comments");
  post.comments.forEach((c) => {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${c.by}</strong> ${c.text}`;
    comments.append(li);
  });
}

function renderStories() {
  const people = [state.user.handle, ...state.follows];
  storiesEl.innerHTML = people
    .map((handle) => {
      const user = getUser(handle);
      return `<button class="story" data-profile="${user.handle}"><div class="avatar">${user.avatar}</div><small>${user.handle}</small></button>`;
    })
    .join("");
}

function renderFeed() {
  feedEl.innerHTML = "";
  state.posts
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .forEach((post) => {
      const node = postTemplate.content.firstElementChild.cloneNode(true);
      hydratePost(node, post);
      feedEl.append(node);
    });
}

function renderSearch(query = "") {
  const q = query.trim().toLowerCase();
  const filtered = state.posts
    .filter((p) => {
      const user = getUser(p.author);
      return !q || p.caption.toLowerCase().includes(q) || user.handle.includes(q);
    })
    .sort((a, b) => postScore(b) - postScore(a));

  searchGrid.innerHTML = filtered
    .map((p) => `<button class="grid-post" data-post="${p.id}"><img src="${p.image}" alt="Search result" /></button>`)
    .join("");
}

function renderReels() {
  const posts = state.posts.slice().sort((a, b) => postScore(b) - postScore(a)).slice(0, 5);
  reelsList.innerHTML = posts
    .map((p) => {
      const u = getUser(p.author);
      return `<article class="reel"><img src="${p.image}" alt="Reel" /><div class="overlay"><strong>@${u.handle}</strong><p>${p.caption}</p></div></article>`;
    })
    .join("");
}

function renderProfile() {
  const user = getUser(viewingProfile);
  const posts = state.posts.filter((p) => p.author === user.handle);
  const isMe = user.handle === state.user.handle;
  const following = state.follows.includes(user.handle);

  profileHeader.innerHTML = `
    <div class="avatar big">${user.avatar}</div>
    <div>
      <h2>${user.name}</h2>
      <p>@${user.handle}</p>
      <p>${user.bio || "No bio."}</p>
      <div class="stats"><span><strong>${posts.length}</strong> posts</span><span><strong>${state.follows.length}</strong> following</span></div>
      ${isMe ? "" : `<button class="primary" id="followProfileBtn">${following ? "Following" : "Follow"}</button>`}
    </div>
  `;

  profileGrid.innerHTML = posts.map((p) => `<img src="${p.image}" alt="Profile post" />`).join("");
}

function renderThreads() {
  const people = Object.keys(state.messages);
  threadList.innerHTML = people
    .map((handle) => {
      const user = getUser(handle);
      const active = handle === currentThread ? "thread active" : "thread";
      return `<button class="${active}" data-thread="${handle}"><div class="avatar tiny">${user.avatar}</div><span>${user.name}</span></button>`;
    })
    .join("");

  renderChat();
}

function renderChat() {
  const messages = state.messages[currentThread] || [];
  chatMessages.innerHTML = messages
    .map((m) => `<p class="msg ${m.fromMe ? "mine" : "theirs"}">${m.text}</p>`)
    .join("");
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function renderRail() {
  miniProfile.innerHTML = `<div class="avatar">${state.user.avatar}</div><div><strong>${state.user.name}</strong><small>@${state.user.handle}</small></div>`;

  const suggested = Object.values(directory).filter((u) => !state.follows.includes(u.handle) && u.handle !== state.user.handle);
  suggestions.innerHTML = suggested
    .map((u) => `<li><span>@${u.handle}</span><button class="ghost" data-follow="${u.handle}">Follow</button></li>`)
    .join("");
}

function toggleInteraction(post, type, button) {
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

  if (button) {
    button.classList.add("pulse");
    setTimeout(() => button.classList.remove("pulse"), 320);
  }
  showToast(had ? `${type} removed` : `${type} added`);
}

function persistAndRender() {
  saveState();
  renderStories();
  renderFeed();
  renderSearch(searchInput.value);
  renderReels();
  renderProfile();
  renderThreads();
  renderRail();
}

mainNav.addEventListener("click", (e) => {
  const viewBtn = e.target.closest(".nav-btn[data-view]");
  if (viewBtn) {
    if (viewBtn.dataset.view === "profile") viewingProfile = state.user.handle;
    switchView(viewBtn.dataset.view);
    return;
  }

  if (e.target.closest("#newPostBtn")) {
    createDialog.showModal();
  }
});

feedEl.addEventListener("click", (e) => {
  const actionBtn = e.target.closest("button[data-action]");
  const postEl = e.target.closest(".post");
  const post = state.posts.find((p) => p.id === postEl?.dataset.postId);

  if (actionBtn && post) {
    const action = actionBtn.dataset.action;
    if (action === "comment") {
      postEl.querySelector(".comment-form").classList.toggle("hidden");
      return;
    }
    toggleInteraction(post, action, actionBtn);
    persistAndRender();
    return;
  }

  const authorBtn = e.target.closest("[data-action='open-profile']");
  if (authorBtn && postEl) {
    viewingProfile = postEl.dataset.author;
    renderProfile();
    switchView("profile");
  }
});

feedEl.addEventListener("submit", (e) => {
  if (!e.target.matches(".comment-form")) return;
  e.preventDefault();

  const form = e.target;
  const postEl = form.closest(".post");
  const post = state.posts.find((p) => p.id === postEl?.dataset.postId);
  const input = form.querySelector("input");
  const text = input.value.trim();
  if (!post || !text) return;

  post.comments.push({ id: crypto.randomUUID(), by: `@${state.user.handle}`, text });
  input.value = "";
  form.classList.add("hidden");
  persistAndRender();
  showToast("Comment posted");
});

storiesEl.addEventListener("click", (e) => {
  const story = e.target.closest(".story");
  if (!story) return;
  viewingProfile = story.dataset.profile;
  renderProfile();
  switchView("profile");
});

searchInput.addEventListener("input", () => renderSearch(searchInput.value));

searchGrid.addEventListener("click", (e) => {
  const tile = e.target.closest(".grid-post");
  if (!tile) return;
  const post = state.posts.find((p) => p.id === tile.dataset.post);
  if (!post) return;
  viewingProfile = post.author;
  renderProfile();
  switchView("profile");
});

threadList.addEventListener("click", (e) => {
  const thread = e.target.closest("[data-thread]");
  if (!thread) return;
  currentThread = thread.dataset.thread;
  renderThreads();
});

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;

  state.messages[currentThread] = state.messages[currentThread] || [];
  state.messages[currentThread].push({ fromMe: true, text });
  chatInput.value = "";
  persistAndRender();

  setTimeout(() => {
    state.messages[currentThread].push({ fromMe: false, text: "Nice, sounds good 👌" });
    persistAndRender();
  }, 700);
});

suggestions.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-follow]");
  if (!btn) return;
  state.follows.push(btn.dataset.follow);
  persistAndRender();
  showToast(`Following @${btn.dataset.follow}`);
});

createForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const caption = createText.value.trim();
  if (!caption) return;

  state.posts.unshift({
    id: crypto.randomUUID(),
    author: state.user.handle,
    caption,
    image:
      createImage.value.trim() ||
      "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80",
    createdAt: Date.now(),
    likes: 0,
    bookmarks: 0,
    comments: [],
  });

  createForm.reset();
  createDialog.close();
  persistAndRender();
  switchView("home");
  showToast("Post shared");
});

editProfileBtn.addEventListener("click", () => {
  profileNameInput.value = state.user.name;
  profileHandleInput.value = state.user.handle;
  profileBioInput.value = state.user.bio;
  profileDialog.showModal();
});

profileForm.addEventListener("submit", (e) => {
  e.preventDefault();
  state.user = {
    ...state.user,
    name: profileNameInput.value.trim(),
    handle: profileHandleInput.value.trim().replace(/^@/, ""),
    bio: profileBioInput.value.trim(),
  };
  viewingProfile = state.user.handle;
  profileDialog.close();
  persistAndRender();
  showToast("Profile updated");
});

document.addEventListener("click", (e) => {
  const btn = e.target.closest("#followProfileBtn");
  if (!btn) return;
  if (!state.follows.includes(viewingProfile)) state.follows.push(viewingProfile);
  persistAndRender();
});

persistAndRender();
