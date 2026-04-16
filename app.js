const STORAGE_KEY = "ripple-state-v3";

const userDirectory = {
  jordanlake: { displayName: "Jordan Lake", username: "jordanlake", bio: "Runner, coffee fan, and chasing tiny daily improvements." },
  ninapatel: { displayName: "Nina Patel", username: "ninapatel", bio: "Distance running, design systems, and sunlight." },
  damoncodes: { displayName: "Damon R.", username: "damoncodes", bio: "Building tiny apps and shipping weekly." },
};

const seedPosts = [
  {
    id: crypto.randomUUID(),
    author: "ninapatel",
    text: "Morning run complete. 5 miles before work and now feeling unstoppable. #MorningRun",
    imageUrl: "",
    createdAt: Date.now() - 1000 * 60 * 38,
    likes: 18,
    reposts: 3,
    bookmarks: 5,
    comments: [{ id: crypto.randomUUID(), author: "@jordanlake", text: "That pace is unreal 👏" }],
  },
  {
    id: crypto.randomUUID(),
    author: "damoncodes",
    text: "Built a tiny side project this weekend and shipped it before overthinking it. Highly recommend. #WeekendBuild",
    imageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80",
    createdAt: Date.now() - 1000 * 60 * 120,
    likes: 42,
    reposts: 9,
    bookmarks: 12,
    comments: [],
  },
];

const seedMessages = [
  { id: crypto.randomUUID(), fromMe: false, author: "@ninapatel", text: "Anyone up for a 6AM run tomorrow?" },
  { id: crypto.randomUUID(), fromMe: true, author: "@jordanlake", text: "I can do 6:30, count me in." },
];

let state = loadState();
let activeProfile = state.user.username;

const screenRoot = document.getElementById("screenRoot");
const feedEl = document.getElementById("feed");
const exploreGrid = document.getElementById("exploreGrid");
const activityList = document.getElementById("activityList");
const profileFeed = document.getElementById("profileFeed");
const profileHeader = document.getElementById("profileHeader");
const viewSubtitle = document.getElementById("viewSubtitle");
const postForm = document.getElementById("postForm");
const postText = document.getElementById("postText");
const imageUrl = document.getElementById("imageUrl");
const charCount = document.getElementById("charCount");
const trendingList = document.getElementById("trendingList");
const suggestionList = document.getElementById("suggestionList");
const profileCard = document.getElementById("profileCard");
const postTemplate = document.getElementById("postTemplate");
const navList = document.getElementById("navList");
const toast = document.getElementById("toast");

const mediaDialog = document.getElementById("mediaDialog");
const mediaPreview = document.getElementById("mediaPreview");
const mediaCaption = document.getElementById("mediaCaption");
const closeMedia = document.getElementById("closeMedia");

const messagesThread = document.getElementById("messagesThread");
const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");

const authDialog = document.getElementById("authDialog");
const authToggle = document.getElementById("authToggle");
const authForm = document.getElementById("authForm");
const displayName = document.getElementById("displayName");
const username = document.getElementById("username");
const bio = document.getElementById("bio");

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { user: userDirectory.jordanlake, posts: seedPosts, interactions: {}, messages: seedMessages, follows: ["ninapatel"] };
    }
    return JSON.parse(raw);
  } catch {
    return { user: userDirectory.jordanlake, posts: seedPosts, interactions: {}, messages: seedMessages, follows: ["ninapatel"] };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function formatTime(ts) {
  const minutes = Math.floor((Date.now() - ts) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return new Date(ts).toLocaleDateString();
}

function getUser(usernameKey) {
  if (usernameKey === state.user.username) return state.user;
  return userDirectory[usernameKey] || { displayName: usernameKey, username: usernameKey, bio: "" };
}

function showToast(text) {
  toast.textContent = text;
  toast.classList.add("show");
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => toast.classList.remove("show"), 1500);
}

function extractTrends(posts) {
  const hashtagCount = {};
  posts.forEach((post) => {
    const tags = post.text.match(/#[a-zA-Z0-9_]+/g) || [];
    tags.forEach((tag) => {
      hashtagCount[tag] = (hashtagCount[tag] || 0) + 1;
    });
  });

  return Object.entries(hashtagCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
}

function renderProfileCard() {
  profileCard.innerHTML = `<strong>${state.user.displayName}</strong><p>@${state.user.username}</p><small>${state.user.bio || "No bio yet."}</small>`;
  authToggle.textContent = `@${state.user.username}`;
  displayName.value = state.user.displayName;
  username.value = state.user.username;
  bio.value = state.user.bio || "";
}

function renderTrends() {
  const trends = extractTrends(state.posts);
  trendingList.innerHTML = "";

  trends.forEach(([tag, count]) => {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${tag}</strong><br /><small>${count} posts in the last day</small>`;
    trendingList.append(li);
  });

  if (!trends.length) {
    trendingList.innerHTML = "<li><small>No trends yet.</small></li>";
  }
}

function renderSuggestions() {
  const suggested = Object.values(userDirectory).filter((user) => user.username !== state.user.username && !state.follows.includes(user.username));
  suggestionList.innerHTML = "";

  if (!suggested.length) {
    suggestionList.innerHTML = "<li><small>You're all caught up.</small></li>";
    return;
  }

  suggested.forEach((user) => {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${user.displayName}</strong><br /><small>@${user.username}</small><button class="btn ghost follow-btn" data-follow="${user.username}">Follow</button>`;
    suggestionList.append(li);
  });
}

function hydratePostNode(node, post, options = {}) {
  const author = getUser(post.author);
  node.dataset.id = post.id;
  node.dataset.author = author.username;

  node.querySelector(".post-name").textContent = author.displayName;
  node.querySelector(".post-handle").textContent = `@${author.username}`;
  node.querySelector(".post-time").textContent = formatTime(post.createdAt);
  node.querySelector(".post-text").textContent = post.text;

  const image = node.querySelector(".post-image");
  if (post.imageUrl) {
    image.src = post.imageUrl;
    image.style.display = "block";
    image.classList.add("clickable-media");
  }

  const values = { like: post.likes, repost: post.reposts, bookmark: post.bookmarks, comment: post.comments.length };

  ["like", "repost", "bookmark", "comment"].forEach((action) => {
    const button = node.querySelector(`button[data-action="${action}"]`);
    button.querySelector("span").textContent = values[action];
    if (state.interactions[post.id]?.includes(action)) button.classList.add("active");

    if (options.readOnly && action !== "comment") {
      button.classList.add("is-disabled");
      button.disabled = true;
    }
  });

  const commentList = node.querySelector(".comment-list");
  post.comments.forEach((comment) => {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${comment.author}</strong><br />${comment.text}`;
    commentList.append(li);
  });
}

function renderFeedList(container, posts, options = {}) {
  container.innerHTML = "";
  if (!posts.length) {
    container.innerHTML = `<p class="empty">${options.emptyText || "No posts yet."}</p>`;
    return;
  }

  posts.forEach((post) => {
    const node = postTemplate.content.firstElementChild.cloneNode(true);
    hydratePostNode(node, post, options);
    container.append(node);
  });
}

function renderExploreGrid() {
  const posts = state.posts.slice().sort((a, b) => b.likes + b.reposts - (a.likes + a.reposts));
  exploreGrid.innerHTML = "";

  posts.forEach((post) => {
    const tile = document.createElement("button");
    tile.className = "explore-tile";
    tile.dataset.postId = post.id;
    const author = getUser(post.author);

    if (post.imageUrl) {
      tile.innerHTML = `<img src="${post.imageUrl}" alt="${author.displayName} post" /><span>@${author.username}</span>`;
    } else {
      tile.innerHTML = `<div class="text-tile"><p>${post.text.slice(0, 80)}</p><span>@${author.username}</span></div>`;
    }
    exploreGrid.append(tile);
  });
}

function renderActivity() {
  const recent = state.posts
    .filter((post) => post.author === state.user.username || state.interactions[post.id]?.length)
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 8);

  activityList.innerHTML = "";
  if (!recent.length) {
    activityList.innerHTML = "<li class='empty'>Your activity appears here.</li>";
    return;
  }

  recent.forEach((post) => {
    const li = document.createElement("li");
    const reacted = state.interactions[post.id] || [];
    const activityText = reacted.length ? `You interacted (${reacted.join(", ")})` : "You posted";
    li.innerHTML = `<strong>${activityText}</strong><small>${formatTime(post.createdAt)}</small><p>${post.text.slice(0, 90)}</p>`;
    activityList.append(li);
  });
}

function renderProfilePanel() {
  const user = getUser(activeProfile);
  const posts = state.posts.filter((post) => post.author === user.username).sort((a, b) => b.createdAt - a.createdAt);
  const followers = state.follows.includes(user.username) ? 1 : 0;
  const isMe = user.username === state.user.username;

  profileHeader.innerHTML = `
    <div>
      <h2>${user.displayName}</h2>
      <p>@${user.username}</p>
      <small>${user.bio || "No bio yet."}</small>
    </div>
    <div class="profile-meta">
      <span><strong>${posts.length}</strong> posts</span>
      <span><strong>${followers}</strong> following</span>
      ${isMe ? "" : `<button class='btn ghost' id='profileFollowBtn'>${state.follows.includes(user.username) ? "Following" : "Follow"}</button>`}
    </div>
  `;

  renderFeedList(profileFeed, posts, { emptyText: "No posts from this profile yet." });
}

function renderMessages() {
  messagesThread.innerHTML = "";
  state.messages.forEach((message) => {
    const msg = document.createElement("article");
    msg.className = `msg ${message.fromMe ? "from-me" : "from-them"}`;
    msg.innerHTML = `<small>${message.author}</small><p>${message.text}</p>`;
    messagesThread.append(msg);
  });
  messagesThread.scrollTop = messagesThread.scrollHeight;
}

function renderHomeFeed() {
  renderFeedList(feedEl, state.posts.slice().sort((a, b) => b.createdAt - a.createdAt));
}

function renderAll() {
  renderProfileCard();
  renderHomeFeed();
  renderExploreGrid();
  renderActivity();
  renderProfilePanel();
  renderMessages();
  renderTrends();
  renderSuggestions();
}

function switchTab(tab) {
  document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.remove("active-panel"));
  document.querySelectorAll(".nav-list li").forEach((item) => item.classList.remove("active"));
  document.getElementById(`${tab}Panel`).classList.add("active-panel");
  document.querySelector(`.nav-list li[data-tab="${tab}"]`).classList.add("active");

  const labels = {
    home: "Home feed",
    explore: "Explore creators",
    activity: "Your activity",
    messages: "Direct messages",
    profile: "Profile",
  };
  viewSubtitle.textContent = labels[tab];
  screenRoot.classList.add("screen-shift");
  setTimeout(() => screenRoot.classList.remove("screen-shift"), 220);
}

function toggleInteraction(post, action, button) {
  state.interactions[post.id] = state.interactions[post.id] || [];
  const hadAction = state.interactions[post.id].includes(action);
  const delta = hadAction ? -1 : 1;

  if (action === "like") post.likes += delta;
  if (action === "repost") post.reposts += delta;
  if (action === "bookmark") post.bookmarks += delta;

  if (hadAction) {
    state.interactions[post.id] = state.interactions[post.id].filter((x) => x !== action);
  } else {
    state.interactions[post.id].push(action);
  }

  button.classList.add("spark");
  setTimeout(() => button.classList.remove("spark"), 380);
  const map = {
    like: hadAction ? "Like removed" : "Post liked",
    repost: hadAction ? "Repost removed" : "Post reposted",
    bookmark: hadAction ? "Bookmark removed" : "Post saved",
  };
  showToast(map[action]);
}

postText.addEventListener("input", () => {
  charCount.textContent = `${postText.value.length} / 280`;
});

postForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = postText.value.trim();
  if (!text) return;

  state.posts.unshift({
    id: crypto.randomUUID(),
    author: state.user.username,
    text,
    imageUrl: imageUrl.value.trim(),
    createdAt: Date.now(),
    likes: 0,
    reposts: 0,
    bookmarks: 0,
    comments: [],
  });

  postForm.reset();
  charCount.textContent = "0 / 280";
  saveState();
  renderAll();
  switchTab("home");
  showToast("Posted successfully");
});

screenRoot.addEventListener("click", (event) => {
  const actionButton = event.target.closest("button[data-action]");
  if (actionButton) {
    const postNode = actionButton.closest(".post");
    const post = state.posts.find((item) => item.id === postNode?.dataset.id);
    if (!post) return;

    const action = actionButton.dataset.action;
    if (action === "comment") {
      postNode.querySelector(".comment-form").classList.toggle("hidden");
      return;
    }

    toggleInteraction(post, action, actionButton);
    saveState();
    renderAll();
    return;
  }

  const profileBtn = event.target.closest("[data-action='open-profile']");
  if (profileBtn) {
    const post = profileBtn.closest(".post");
    activeProfile = post.dataset.author;
    renderProfilePanel();
    switchTab("profile");
    return;
  }

  const media = event.target.closest(".clickable-media");
  if (media) {
    const post = media.closest(".post");
    const data = state.posts.find((item) => item.id === post.dataset.id);
    mediaPreview.src = data.imageUrl;
    mediaCaption.textContent = data.text;
    mediaDialog.showModal();
    return;
  }

  const exploreTile = event.target.closest(".explore-tile");
  if (exploreTile) {
    const data = state.posts.find((item) => item.id === exploreTile.dataset.postId);
    if (!data) return;
    if (data.imageUrl) {
      mediaPreview.src = data.imageUrl;
      mediaCaption.textContent = data.text;
      mediaDialog.showModal();
    } else {
      showToast("No media on this post, open Home to read full text");
    }
  }
});

screenRoot.addEventListener("submit", (event) => {
  if (!event.target.matches(".comment-form")) return;
  event.preventDefault();

  const form = event.target;
  const postNode = form.closest(".post");
  const post = state.posts.find((item) => item.id === postNode?.dataset.id);
  if (!post) return;

  const input = form.querySelector("input");
  const text = input.value.trim();
  if (!text) return;

  post.comments.push({ id: crypto.randomUUID(), author: `@${state.user.username}`, text });
  saveState();
  renderAll();
  showToast("Reply posted");
});

navList.addEventListener("click", (event) => {
  const item = event.target.closest("li[data-tab]");
  if (!item) return;
  if (item.dataset.tab === "profile") activeProfile = state.user.username;
  switchTab(item.dataset.tab);
});

suggestionList.addEventListener("click", (event) => {
  const btn = event.target.closest(".follow-btn");
  if (!btn) return;
  const person = btn.dataset.follow;
  state.follows.push(person);
  saveState();
  renderSuggestions();
  showToast(`Following @${person}`);
});

messageForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = messageInput.value.trim();
  if (!text) return;

  state.messages.push({ id: crypto.randomUUID(), fromMe: true, author: `@${state.user.username}`, text });
  messageInput.value = "";
  saveState();
  renderMessages();

  setTimeout(() => {
    state.messages.push({ id: crypto.randomUUID(), fromMe: false, author: "@ripple_friend", text: "Solid. I’ll ping you with details." });
    saveState();
    renderMessages();
  }, 850);
});

authToggle.addEventListener("click", () => authDialog.showModal());

closeMedia.addEventListener("click", () => mediaDialog.close());

authForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const nextUsername = username.value.trim().replace(/^@/, "");

  state.user = {
    displayName: displayName.value.trim(),
    username: nextUsername,
    bio: bio.value.trim(),
  };

  userDirectory[nextUsername] = { ...state.user };
  activeProfile = state.user.username;
  saveState();
  renderAll();
  authDialog.close();
  showToast("Profile updated");
});

screenRoot.addEventListener("click", (event) => {
  const followBtn = event.target.closest("#profileFollowBtn");
  if (!followBtn) return;
  if (!state.follows.includes(activeProfile)) {
    state.follows.push(activeProfile);
    saveState();
    renderProfilePanel();
    renderSuggestions();
    showToast(`Following @${activeProfile}`);
  }
});

renderAll();
