// ---------------------------------------------------------------------------
// index.html : 폴더 목록 / 검색 / 생성 / 삭제
// ---------------------------------------------------------------------------

const FOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h24v24H0z" fill="none"/><path fill="currentColor" d="M4 20q-.825 0-1.412-.587T2 18V6q0-.825.588-1.412T4 4h6l2 2h8q.825 0 1.413.588T22 8v10q0 .825-.587 1.413T20 20z"/></svg>`;

const folderGrid = document.getElementById("folder-grid");
const emptyState = document.getElementById("empty-state");
const emptyText = document.getElementById("empty-text");
const searchInput = document.getElementById("search-input");
const toastEl = document.getElementById("toast");

let allFolders = [];
let currentQuery = "";

// ------------------------------ 로그아웃 ------------------------------
document.getElementById("logout-btn").addEventListener("click", async () => {
  await auth.signOut();
  location.href = "login.html";
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

function renderFolders() {
  const query = currentQuery.trim().toLowerCase();
  const filtered = query
    ? allFolders.filter((f) => f.name.toLowerCase().includes(query))
    : allFolders;

  folderGrid.innerHTML = "";

  const newCard = document.createElement("button");
  newCard.className = "folder-card folder-card-new";
  newCard.id = "new-folder-card";
  newCard.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 5v14M5 12h14"/></svg>
    <span>새 폴더</span>
  `;
  newCard.addEventListener("click", openFolderModal);
  folderGrid.appendChild(newCard);

  filtered.forEach((folder) => {
    // 버튼(삭제)을 링크 안에 중첩시키지 않기 위해 div + role="link"로 구성
    const card = document.createElement("div");
    card.className = "folder-card";
    card.setAttribute("role", "link");
    card.setAttribute("tabindex", "0");
    const targetUrl = `backup.html?folder=${folder.id}`;
    const count = typeof folder.fileCount === "number" ? folder.fileCount : 0;
    card.innerHTML = `
      <button class="folder-delete" title="폴더 삭제" data-id="${folder.id}" data-name="${escapeHtml(folder.name)}">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
      ${FOLDER_SVG.replace("<svg ", '<svg class="folder-icon" ')}
      <div class="folder-name">${escapeHtml(folder.name)}</div>
      <div class="folder-meta">파일 ${count}개${folder.createdAt ? " · " + formatDate(folder.createdAt) : ""}</div>
    `;
    card.addEventListener("click", () => (location.href = targetUrl));
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        location.href = targetUrl;
      }
    });
    card.querySelector(".folder-delete").addEventListener("click", (e) => {
      e.stopPropagation();
      deleteFolder(folder.id, folder.name);
    });
    folderGrid.appendChild(card);
  });

  if (allFolders.length === 0) {
    emptyState.style.display = "none";
  } else if (filtered.length === 0) {
    emptyText.textContent = `"${query}"에 대한 검색 결과가 없어요.`;
    emptyState.style.display = "";
  } else {
    emptyState.style.display = "none";
  }
}

function loadFolders() {
  foldersRef.orderBy("createdAt", "desc").onSnapshot(
    (snap) => {
      allFolders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      renderFolders();
    },
    (err) => {
      console.error(err);
      showToast("폴더를 불러오지 못했어요. firebase.js 설정을 확인해주세요.", true);
    }
  );
}

async function deleteFolder(id, name) {
  if (!confirm(`"${name}" 폴더를 삭제할까요?\n안에 있는 모든 파일이 함께 삭제됩니다.`)) return;
  try {
    const filesSnap = await filesRef.where("folderId", "==", id).get();
    const batch = db.batch();
    filesSnap.forEach((doc) => batch.delete(doc.ref));
    batch.delete(foldersRef.doc(id));
    await batch.commit();
    showToast("폴더를 삭제했어요.");
  } catch (err) {
    console.error(err);
    showToast("삭제 중 오류가 발생했어요.", true);
  }
}

// ------------------------------ 검색 ------------------------------
searchInput.addEventListener("input", (e) => {
  currentQuery = e.target.value;
  renderFolders();
});

// ------------------------------ 새 폴더 모달 ------------------------------
const folderModalOverlay = document.getElementById("folder-modal-overlay");
const folderNameInput = document.getElementById("folder-name-input");
const folderModalCancel = document.getElementById("folder-modal-cancel");
const folderModalConfirm = document.getElementById("folder-modal-confirm");
const newFolderBtn = document.getElementById("new-folder-btn");

function openFolderModal() {
  folderModalOverlay.classList.add("open");
  folderNameInput.value = "";
  setTimeout(() => folderNameInput.focus(), 50);
}

function closeFolderModal() {
  folderModalOverlay.classList.remove("open");
}

async function createFolder() {
  const name = folderNameInput.value.trim();
  if (!name) {
    folderNameInput.focus();
    return;
  }
  folderModalConfirm.disabled = true;
  try {
    await foldersRef.add({
      name,
      fileCount: 0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    closeFolderModal();
    showToast("폴더를 만들었어요.");
  } catch (err) {
    console.error(err);
    showToast("폴더 생성 중 오류가 발생했어요.", true);
  } finally {
    folderModalConfirm.disabled = false;
  }
}

newFolderBtn.addEventListener("click", openFolderModal);
folderModalCancel.addEventListener("click", closeFolderModal);
folderModalOverlay.addEventListener("click", (e) => {
  if (e.target === folderModalOverlay) closeFolderModal();
});
folderNameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") createFolder();
  if (e.key === "Escape") closeFolderModal();
});
folderModalConfirm.addEventListener("click", createFolder);

authReady.then(loadFolders);
