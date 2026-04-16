const STORAGE_KEY = "ripple-state-v2";

const defaultUser = {
  displayName: "Jordan Lake",
  username: "jordanlake",
  bio: "Runner, coffee fan, and chasing tiny daily improvements.",
};

const seedPosts = [
  {
    id: crypto.randomUUID(),
    author: { displayName: "Nina Patel", username: "ninapatel" },
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
    author: { displayName: "Damon R.", username: "damoncodes" },
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

const feedEl = document.getElementById("feed");
const exploreFeed = document.getElementById("exploreFeed");
const bookmarksFeed = document.getElementById("bookmarksFeed");
const profileFeed = document.getElementById("profileFeed");
const profileSummary = document.getElementById("profileSummary");
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
    if (!raw) return { user: defaultUser, posts: seedPosts, interactions: {}, messages: seedMessages };
    return JSON.parse(raw);
  } catch {
    return { user: defaultUser, posts: seedPosts, interactions: {}, messages: seedMessages };
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

  const defaults = [
    ["#MorningRun", 21],
    ["#WeekendBuild", 13],
    ["#CityPhotos", 11],
    ["#BookClub", 9],
  ];

  return [...Object.entries(hashtagCount), ...defaults]
    .reduce((acc, [tag, count]) => {
      acc[tag] = (acc[tag] || 0) + count;
      return acc;
    }, {});
}

function renderProfile() {
  profileCard.innerHTML = `
    <strong>${state.user.displayName}</strong>
    <p>@${state.user.username}</p>
    <small>${state.user.bio || "No bio yet."}</small>
  `;

  authToggle.textContent = `@${state.user.username}`;
  displayName.value = state.user.displayName;
  username.value = state.user.username;
  bio.value = state.user.bio || "";
}

function renderProfilePanel() {
  const userPosts = state.posts.filter((post) => post.author.username === state.user.username);
  const totalLikes = userPosts.reduce((sum, post) => sum + post.likes, 0);

  profileSummary.innerHTML = `
    <div><strong>${state.user.displayName}</strong><p>@${state.user.username}</p></div>
    <div><strong>${userPosts.length}</strong><small>Posts</small></div>
    <div><strong>${totalLikes}</strong><small>Likes earned</small></div>
  `;

  renderPostList(profileFeed, userPosts, { readOnly: true, emptyText: "You haven't posted yet." });
}

function renderTrends() {
  const trends = Object.entries(extractTrends(state.posts))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  trendingList.innerHTML = "";
  trends.forEach(([tag, count]) => {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${tag}</strong><br /><small>${count} posts in the last day</small>`;
    trendingList.append(li);
  });
}

function renderSuggestions() {
  const suggestions = [
    ["Sofia Kim", "travel + photography"],
    ["Marcus Lee", "startup journals"],
    ["Hannah O.", "food + city reviews"],
  ];

  suggestionList.innerHTML = "";
  suggestions.forEach(([name, topic]) => {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${name}</strong><br /><small>${topic}</small>`;
    suggestionList.append(li);
  });
}

function hydratePostNode(node, post, readOnly = false) {
  node.dataset.id = post.id;
  node.querySelector(".post-name").textContent = post.author.displayName;
  node.querySelector(".post-handle").textContent = `@${post.author.username}`;
  node.querySelector(".post-time").textContent = formatTime(post.createdAt);
  node.querySelector(".post-text").textContent = post.text;

  const image = node.querySelector(".post-image");
  if (post.imageUrl) {
    image.src = post.imageUrl;
    image.style.display = "block";
  }

  const actions = ["like", "repost", "bookmark", "comment"];
  const values = { like: post.likes, repost: post.reposts, bookmark: post.bookmarks, comment: post.comments.length };

  actions.forEach((action) => {
    const button = node.querySelector(`button[data-action="${action}"]`);
    button.querySelector("span").textContent = values[action];

    if (state.interactions[post.id]?.includes(action)) {
      button.classList.add("active");
    }

    if (readOnly) {
      button.disabled = true;
      button.classList.add("is-disabled");
    }
  });

  const commentList = node.querySelector(".comment-list");
  post.comments.forEach((comment) => {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${comment.author}</strong><br />${comment.text}`;
    commentList.append(li);
  });

  if (readOnly) node.querySelector(".comment-form").remove();
}

function renderPostList(container, posts, options = {}) {
  container.innerHTML = "";
  if (!posts.length) {
    container.innerHTML = `<p class="empty">${options.emptyText || "No posts yet."}</p>`;
    return;
  }

  posts.forEach((post) => {
    const node = postTemplate.content.firstElementChild.cloneNode(true);
    hydratePostNode(node, post, options.readOnly);
    container.append(node);
  });
}

function renderAllFeeds() {
  const byRecency = state.posts.slice().sort((a, b) => b.createdAt - a.createdAt);
  const byHot = state.posts.slice().sort((a, b) => b.likes + b.reposts - (a.likes + a.reposts));
  const bookmarked = byRecency.filter((post) => state.interactions[post.id]?.includes("bookmark"));

  renderPostList(feedEl, byRecency);
  renderPostList(exploreFeed, byHot, { readOnly: true });
  renderPostList(bookmarksFeed, bookmarked, { emptyText: "No bookmarks yet. Save posts to read later." });
  renderProfilePanel();
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

function switchTab(tab) {
  document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.remove("active-panel"));
  document.querySelectorAll(".nav-list li").forEach((item) => item.classList.remove("active"));

  document.getElementById(`${tab}Panel`).classList.add("active-panel");
  document.querySelector(`.nav-list li[data-tab="${tab}"]`).classList.add("active");
}

function toggleInteraction(post, action) {
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

  const verbs = {
    like: hadAction ? "Like removed" : "Post liked",
    repost: hadAction ? "Repost removed" : "Post reposted",
    bookmark: hadAction ? "Removed from bookmarks" : "Saved to bookmarks",
  };
  showToast(verbs[action]);
}

postText.addEventListener("input", () => {
  charCount.textContent = `${postText.value.length} / 280`;
});

postForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const newPost = {
    id: crypto.randomUUID(),
    author: { displayName: state.user.displayName, username: state.user.username },
    text: postText.value.trim(),
    imageUrl: imageUrl.value.trim(),
    createdAt: Date.now(),
    likes: 0,
    reposts: 0,
    bookmarks: 0,
    comments: [],
  };

  if (!newPost.text) return;
  state.posts.unshift(newPost);
  postForm.reset();
  charCount.textContent = "0 / 280";
  saveState();
  renderAllFeeds();
  renderTrends();
  switchTab("home");
  showToast("Posted successfully");
});

feedEl.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const postNode = event.target.closest(".post");
  const post = state.posts.find((item) => item.id === postNode.dataset.id);
  if (!post) return;

  const action = button.dataset.action;
  if (action === "comment") {
    postNode.querySelector(".comment-form").classList.toggle("hidden");
    postNode.classList.add("bump");
    setTimeout(() => postNode.classList.remove("bump"), 260);
    return;
  }

  toggleInteraction(post, action);
  postNode.classList.add("bump");
  setTimeout(() => postNode.classList.remove("bump"), 260);
  saveState();
  renderAllFeeds();
});

feedEl.addEventListener("submit", (event) => {
  if (!event.target.matches(".comment-form")) return;
  event.preventDefault();

  const form = event.target;
  const input = form.querySelector("input");
  const text = input.value.trim();
  if (!text) return;

  const postNode = form.closest(".post");
  const post = state.posts.find((item) => item.id === postNode.dataset.id);
  if (!post) return;

  post.comments.push({ id: crypto.randomUUID(), author: `@${state.user.username}`, text });

  input.value = "";
  form.classList.add("hidden");
  saveState();
  renderAllFeeds();
  showToast("Reply posted");
});

navList.addEventListener("click", (event) => {
  const item = event.target.closest("li[data-tab]");
  if (!item) return;
  switchTab(item.dataset.tab);
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
    state.messages.push({
      id: crypto.randomUUID(),
      fromMe: false,
      author: "@ripple_friend",
      text: "Nice — got it. Let's catch up later today.",
    });
    saveState();
    renderMessages();
  }, 800);
});

authToggle.addEventListener("click", () => authDialog.showModal());

authForm.addEventListener("submit", (event) => {
  event.preventDefault();

  state.user = {
    displayName: displayName.value.trim(),
    username: username.value.trim().replace(/^@/, ""),
    bio: bio.value.trim(),
  };

  saveState();
  renderProfile();
  renderAllFeeds();
  renderMessages();
  authDialog.close();
  showToast("Profile updated");
});

renderProfile();
renderAllFeeds();
renderTrends();
renderSuggestions();
renderMessages();
