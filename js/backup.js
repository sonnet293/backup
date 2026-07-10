// ---------------------------------------------------------------------------
// backup.html : 폴더 안 파일(코드 백업) 목록 표시 / 검색 / 코드 미리보기 / 삭제
// ---------------------------------------------------------------------------

const params = new URLSearchParams(location.search);
const folderId = params.get("folder");

const toastEl = document.getElementById("toast");
const folderTitleEl = document.getElementById("folder-title");
const folderSubEl = document.getElementById("folder-sub");
const fileTreeEl = document.getElementById("file-tree");
const emptyStateEl = document.getElementById("empty-state");
const emptyTextEl = document.getElementById("empty-text");
const searchInput = document.getElementById("search-input");
const newFileBtn = document.getElementById("new-file-btn");
const renameBtn = document.getElementById("rename-btn");
const deleteFolderBtn = document.getElementById("delete-folder-btn");

if (!folderId) {
  location.href = "index.html";
}

newFileBtn.addEventListener("click", () => {
  location.href = `write.html?folder=${folderId}`;
});

function showToast(message, isDanger) {
  toastEl.textContent = message;
  toastEl.classList.toggle("danger", !!isDanger);
  toastEl.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toastEl.classList.remove("show"), 2200);
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function formatDate(ts) {
  if (!ts || !ts.toDate) return "";
  const d = ts.toDate();
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

const LANG_LABELS = {
  html: "HTML", css: "CSS", javascript: "JS", typescript: "TS", json: "JSON", other: "TXT",
};

function langLabel(lang) {
  return LANG_LABELS[lang] || "TXT";
}

const FILE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" class="file-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>`;
const DIR_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h24v24H0z" fill="none"/><path fill="currentColor" d="M4 20q-.825 0-1.412-.587T2 18V6q0-.825.588-1.412T4 4h6l2 2h8q.825 0 1.413.588T22 8v10q0 .825-.587 1.413T20 20z"/></svg>`;

let allFiles = [];
let currentQuery = "";
let openPanelId = null;

authReady.then(() => {
  // ------------------------------ 폴더 헤더 ------------------------------
  db.collection("folders").doc(folderId).onSnapshot(
    (doc) => {
      if (!doc.exists) {
        showToast("존재하지 않는 폴더예요.", true);
        setTimeout(() => (location.href = "index.html"), 1200);
        return;
      }
      const data = doc.data();
      folderTitleEl.textContent = data.name;
      document.title = `${data.name} · 코드 백업소`;
      const count = typeof data.fileCount === "number" ? data.fileCount : allFiles.length;
      folderSubEl.textContent = `파일 ${count}개${data.createdAt ? " · 생성일 " + formatDate(data.createdAt) : ""}`;
    },
    (err) => {
      console.error(err);
      showToast("폴더 정보를 불러오지 못했어요.", true);
    }
  );

  // ------------------------------ 파일 목록 ------------------------------
  filesRef.where("folderId", "==", folderId).onSnapshot(
    (snap) => {
      allFiles = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      renderFiles();
    },
    (err) => {
      console.error(err);
      showToast("파일 목록을 불러오지 못했어요.", true);
    }
  );
});

function buildGroups(files) {
  const groups = {};
  files.forEach((f) => {
    const idx = f.filename.lastIndexOf("/");
    const dir = idx === -1 ? "" : f.filename.slice(0, idx);
    const base = idx === -1 ? f.filename : f.filename.slice(idx + 1);
    (groups[dir] = groups[dir] || []).push({ ...f, _base: base });
  });
  Object.values(groups).forEach((list) => list.sort((a, b) => a._base.localeCompare(b._base)));
  return groups;
}

function renderFiles() {
  const query = currentQuery.trim().toLowerCase();
  const filtered = query
    ? allFiles.filter((f) => f.filename.toLowerCase().includes(query))
    : allFiles;

  fileTreeEl.innerHTML = "";

  if (allFiles.length === 0) {
    fileTreeEl.style.display = "none";
    emptyStateEl.style.display = "";
    emptyTextEl.textContent = "아직 이 폴더에 백업한 파일이 없어요.";
    return;
  }
  if (filtered.length === 0) {
    fileTreeEl.style.display = "none";
    emptyStateEl.style.display = "";
    emptyTextEl.textContent = `"${query}"에 대한 검색 결과가 없어요.`;
    return;
  }
  fileTreeEl.style.display = "";
  emptyStateEl.style.display = "none";

  const groups = buildGroups(filtered);
  const dirNames = Object.keys(groups).sort((a, b) => {
    if (a === "") return -1;
    if (b === "") return 1;
    return a.localeCompare(b);
  });

  dirNames.forEach((dir) => {
    const group = document.createElement("div");
    group.className = "tree-group";
    if (dir !== "") {
      group.innerHTML = `<div class="tree-dir-label">${DIR_ICON}${escapeHtml(dir)}/</div>`;
    }
    groups[dir].forEach((f) => group.appendChild(renderFileRow(f)));
    fileTreeEl.appendChild(group);
  });
}

function renderFileRow(f) {
  const wrap = document.createElement("div");

  const row = document.createElement("div");
  row.className = "file-row";
  const isHtml = f.language === "html";
  row.innerHTML = `
    ${FILE_ICON}
    <span class="file-name" title="${escapeHtml(f.filename)}">${escapeHtml(f._base)}</span>
    <span class="lang-badge lang-${f.language || "other"}">${langLabel(f.language)}</span>
    <span class="file-meta">${formatDate(f.updatedAt || f.createdAt)}</span>
    <div class="file-actions">
      ${isHtml ? `<button class="icon-btn preview" title="전체 HTML 미리보기">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>
      </button>` : ""}
      <button class="icon-btn view" title="코드 보기">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m18 16 4-4-4-4M6 8l-4 4 4 4M14.5 4l-5 16"/></svg>
      </button>
      <button class="icon-btn edit" title="수정">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
      </button>
      <button class="icon-btn danger delete" title="삭제">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14Z"/></svg>
      </button>
    </div>
  `;

  const panel = document.createElement("div");
  panel.className = "code-panel";
  panel.id = `panel-${f.id}`;
  panel.innerHTML = `<div class="code-panel-inner"><pre><code class="hljs language-${f.language === "other" ? "plaintext" : f.language}"></code></pre></div>`;

  row.querySelector(".file-name").addEventListener("click", () => toggleCodePanel(f, panel));
  row.querySelector(".view").addEventListener("click", () => toggleCodePanel(f, panel));
  row.querySelector(".edit").addEventListener("click", () => {
    location.href = `write.html?folder=${folderId}&file=${f.id}`;
  });
  row.querySelector(".delete").addEventListener("click", () => deleteFile(f));
  if (isHtml) {
    row.querySelector(".preview").addEventListener("click", () => {
      window.open(`viewer.html?folder=${folderId}&file=${f.id}`, "_blank");
    });
  }

  wrap.appendChild(row);
  wrap.appendChild(panel);
  return wrap;
}

function toggleCodePanel(f, panel) {
  const isOpen = panel.classList.contains("open");
  document.querySelectorAll(".code-panel.open").forEach((p) => p.classList.remove("open"));
  if (isOpen) {
    openPanelId = null;
    return;
  }
  const codeEl = panel.querySelector("code");
  if (!codeEl.dataset.rendered) {
    codeEl.textContent = f.code || "";
    hljs.highlightElement(codeEl);
    codeEl.dataset.rendered = "1";
  }
  panel.classList.add("open");
  openPanelId = f.id;
}

async function deleteFile(f) {
  if (!confirm(`"${f.filename}" 파일을 삭제할까요?`)) return;
  try {
    await filesRef.doc(f.id).delete();
    await foldersRef.doc(folderId).update({
      fileCount: firebase.firestore.FieldValue.increment(-1),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    showToast("파일을 삭제했어요.");
  } catch (err) {
    console.error(err);
    showToast("삭제 중 오류가 발생했어요.", true);
  }
}

// ------------------------------ 검색 ------------------------------
searchInput.addEventListener("input", (e) => {
  currentQuery = e.target.value;
  renderFiles();
});

// ------------------------------ 폴더 이름변경 / 삭제 ------------------------------
renameBtn.addEventListener("click", async () => {
  const newName = prompt("새 폴더 이름을 입력하세요.", folderTitleEl.textContent);
  if (!newName || !newName.trim()) return;
  try {
    await foldersRef.doc(folderId).update({
      name: newName.trim(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    showToast("폴더 이름을 변경했어요.");
  } catch (err) {
    console.error(err);
    showToast("이름 변경 중 오류가 발생했어요.", true);
  }
});

deleteFolderBtn.addEventListener("click", async () => {
  if (!confirm(`"${folderTitleEl.textContent}" 폴더를 삭제할까요?\n안에 있는 모든 파일이 함께 삭제됩니다.`)) return;
  try {
    const filesSnap = await filesRef.where("folderId", "==", folderId).get();
    const batch = db.batch();
    filesSnap.forEach((doc) => batch.delete(doc.ref));
    batch.delete(foldersRef.doc(folderId));
    await batch.commit();
    location.href = "index.html";
  } catch (err) {
    console.error(err);
    showToast("삭제 중 오류가 발생했어요.", true);
  }
});
