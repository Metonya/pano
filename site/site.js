const codes = ["en", "tr", "az", "zh", "hi", "es", "de", "fr", "pt", "ja", "nl", "ko", "sv", "pl"];
const selector = document.querySelector("#language");
let english = {};
let current = {};
let prompts = {};
const starterPrompt = document.querySelector("#starter-prompt");
const englishPrompt = starterPrompt.textContent;
function match(value) {
  const code = (value || "").toLowerCase().split("-")[0];
  return codes.includes(code) ? code : null;
}
// Locale markup is text except for these two exact emphasis tokens.
function renderText(element, value) {
  const fragment = document.createDocumentFragment();
  let target = fragment;
  for (const part of value.split(/(<strong>|<\/strong>)/g)) {
    if (part === "<strong>" && target === fragment) {
      target = document.createElement("strong");
      fragment.append(target);
    } else if (part === "</strong>") {
      target = fragment;
    } else {
      target.append(document.createTextNode(part));
    }
  }
  element.replaceChildren(fragment);
}
function apply() {
  starterPrompt.textContent = prompts[document.documentElement.lang] || englishPrompt;
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const value = current[element.dataset.i18n] || english[element.dataset.i18n];
    if (value) renderText(element, value);
  });
  document.querySelectorAll("[data-i18n-label]").forEach((element) => {
    const value = current[element.dataset.i18nLabel] || english[element.dataset.i18nLabel];
    if (value) element.setAttribute("aria-label", value);
  });
  document.querySelectorAll("[data-i18n-alt]").forEach((element) => {
    const value = current[element.dataset.i18nAlt] || english[element.dataset.i18nAlt];
    if (value) element.alt = value;
  });
  const serve = document.querySelector('[data-i18n="serve"]');
  for (const term of ["pano serve", "http://localhost:7777"]) {
    for (const node of [...serve.childNodes]) {
      if (node.nodeType !== Node.TEXT_NODE || !node.textContent.includes(term)) continue;
      const [before, after] = node.textContent.split(term);
      const code = document.createElement("code");
      code.textContent = term;
      node.replaceWith(before, code, after);
    }
  }
  languageButton.setAttribute("aria-label", current.language || english.language || "Language");
  languageName.textContent = selector.selectedOptions[0].textContent;
  languageItems.forEach((item) => item.setAttribute("aria-checked", String(item.dataset.code === selector.value)));
}
async function choose(code, save = false) {
  try {
    const response = await fetch(`i18n/${code}.json`);
    if (!response.ok) throw new Error("Locale unavailable");
    current = await response.json();
    document.documentElement.lang = code;
    selector.value = code;
    apply();
    if (save) {
      try { localStorage.setItem("pano-site-language", code); } catch {}
      const url = new URL(location.href);
      url.searchParams.set("lang", code);
      history.replaceState(null, "", url);
    }
  } catch { /* English remains available in the HTML. */ }
}
(async () => {
  try {
    const [response, promptResponse] = await Promise.all([fetch("i18n/en.json"), fetch("prompts.json")]);
    if (response.ok) english = await response.json();
    if (promptResponse.ok) prompts = await promptResponse.json();
    let saved;
    try { saved = localStorage.getItem("pano-site-language"); } catch {}
    const query = new URLSearchParams(location.search).get("lang");
    const code = match(query) || match(saved) || (navigator.languages || [navigator.language]).map(match).find(Boolean) || "en";
    await choose(code);
  } catch { /* The English HTML works without translations. */ }
})();
selector.addEventListener("change", () => choose(selector.value, true));
const languageButton = document.createElement("button");
languageButton.type = "button";
languageButton.className = "language-button";
languageButton.setAttribute("aria-haspopup", "menu");
languageButton.setAttribute("aria-expanded", "false");
languageButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg><span></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
const languageName = languageButton.querySelector("span");
const menu = document.createElement("div");
menu.className = "language-menu";
menu.setAttribute("role", "menu");
menu.hidden = true;
const languageItems = [...selector.options].map((option) => {
  const item = document.createElement("button");
  item.type = "button";
  item.dataset.code = option.value;
  item.setAttribute("role", "menuitemradio");
  item.textContent = option.textContent;
  item.addEventListener("click", async () => { await choose(option.value, true); closeMenu(); });
  menu.append(item);
  return item;
});
function closeMenu() { menu.hidden = true; languageButton.setAttribute("aria-expanded", "false"); languageButton.focus(); }
function openMenu() { menu.hidden = false; languageButton.setAttribute("aria-expanded", "true"); (languageItems.find((item) => item.dataset.code === selector.value) || languageItems[0]).focus(); }
languageButton.addEventListener("click", () => menu.hidden ? openMenu() : closeMenu());
languageButton.addEventListener("keydown", (event) => { if (["ArrowDown", "ArrowUp"].includes(event.key)) { event.preventDefault(); openMenu(); } });
menu.addEventListener("keydown", (event) => {
  if (event.key === "Escape") { event.preventDefault(); closeMenu(); return; }
  if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  let index = languageItems.indexOf(document.activeElement);
  if (event.key === "Home") index = 0;
  else if (event.key === "End") index = languageItems.length - 1;
  else index = (index + (event.key === "ArrowDown" ? 1 : -1) + languageItems.length) % languageItems.length;
  languageItems[index].focus();
});
document.addEventListener("click", (event) => { if (!menu.hidden && !event.target.closest(".language-choice")) { menu.hidden = true; languageButton.setAttribute("aria-expanded", "false"); } });
selector.closest("label").hidden = true;
selector.closest(".language-choice").append(languageButton, menu);
languageButton.setAttribute("aria-label", "Language");
languageName.textContent = selector.selectedOptions[0].textContent;
languageItems[0].setAttribute("aria-checked", "true");
const tabs = [...document.querySelectorAll('[role="tab"]')];
function selectTab(tab) {
  for (const item of tabs) {
    const selected = item === tab;
    item.setAttribute("aria-selected", String(selected));
    item.tabIndex = selected ? 0 : -1;
    document.getElementById(item.getAttribute("aria-controls")).hidden = !selected;
  }
}
selectTab(tabs[0]);
for (const tab of tabs) {
  tab.addEventListener("click", () => selectTab(tab));
  tab.addEventListener("keydown", (event) => {
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    let index = tabs.indexOf(tab);
    if (event.key === "Home") index = 0;
    else if (event.key === "End") index = tabs.length - 1;
    else index = (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    selectTab(tabs[index]);
    tabs[index].focus();
  });
}
document.querySelectorAll(".copy").forEach((button) => {
  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(button.parentElement.querySelector("code").textContent);
      button.textContent = current.copied || english.copied || "Copied";
      setTimeout(() => { button.textContent = current.copy || english.copy || "Copy"; }, 2000);
    } catch { button.textContent = current.copyFailed || english.copyFailed || "Copy failed"; }
  });
});

const posterTheme = matchMedia("(prefers-color-scheme: dark)");
const video = document.querySelector("video");
const playButton = document.querySelector(".video-play");
video.controls = false;
playButton.hidden = false;
playButton.addEventListener("click", () => {
  playButton.hidden = true;
  video.controls = true;
  video.play().catch(() => { video.controls = true; });
  video.focus();
});
function updatePoster() { video.poster = posterTheme.matches ? "images/board-dark.png" : "images/board.png"; }
updatePoster();
posterTheme.addEventListener("change", updatePoster);
