// ---------------------------------------------------------------------------
// write.html : Quill 기반 코드 입력 에디터
// ---------------------------------------------------------------------------

const params = new URLSearchParams(location.search);
const folderId = params.get("folder");
const fileId = params.get("file");

const toastEl = document.getElementById("toast");
const backLink = document.getElementById("back-link");
const filenameInput = document.getElementById("filename-input");
const languageSelect = document.getElementById("language-select");
const editorStatus = document.getElementById("editor-status");
const saveBtn = document.getElementById("save-btn");
const cancelBtn = document.getElementById("cancel-btn");

function showToast(message, isDanger) {
  toastEl.textContent = message;
  toastEl.classList.toggle("danger", !!isDanger);
  toastEl.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toastEl.classList.remove("show"), 2200);
}

if (!folderId) {
  showToast("폴더 정보가 없어요. 폴더 목록으로 돌아갑니다.", true);
  setTimeout(() => (location.href = "index.html"), 1200);
}

const backUrl = folderId ? `backup.html?folder=${folderId}` : "index.html";
backLink.href = backUrl;

function guessLanguage(filename) {
  const ext = (filename.split(".").pop() || "").toLowerCase();
  if (ext === "html" || ext === "htm") return "html";
  if (ext === "css") return "css";
  if (ext === "js" || ext === "mjs" || ext === "cjs" || ext === "jsx") return "javascript";
  if (ext === "ts" || ext === "tsx") return "typescript";
  if (ext === "json") return "json";
  return "other";
}

// ------------------------------ Quill 초기화 ------------------------------
// 문서가 visibility:hidden 상태(로그인 확인 전)일 때 Quill을 초기화하면
// 선택영역(Range) 처리가 꼬여 무한 루프에 빠질 수 있어, authReady 이후에 생성한다.
let quill;

// 에디터 전체를 하나의 code-block으로 유지해서 항상 하이라이팅 + 고정폭 글꼴을 적용
function keepAsCodeBlock() {
  const len = quill.getLength();
  quill.formatLine(0, len, "code-block", true);
}

let manualLang = false;
languageSelect.addEventListener("change", () => {
  manualLang = true;
});

filenameInput.addEventListener("input", () => {
  if (manualLang) return;
  const guessed = guessLanguage(filenameInput.value);
  languageSelect.value = guessed;
});

// ------------------------------ 기존 파일 불러오기 (수정 모드) ------------------------------
let isEditMode = false;

async function loadExistingFile() {
  if (!fileId) return;
  try {
    const doc = await filesRef.doc(fileId).get();
    if (!doc.exists) {
      showToast("파일을 찾을 수 없어요.", true);
      return;
    }
    isEditMode = true;
    const data = doc.data();
    filenameInput.value = data.filename || "";
    languageSelect.value = data.language || guessLanguage(data.filename || "");
    manualLang = true;
    quill.setText(data.code || "");
    keepAsCodeBlock();
    editorStatus.textContent = `"${data.filename}" 수정 중`;
  } catch (err) {
    console.error(err);
    showToast("파일을 불러오지 못했어요.", true);
  }
}

authReady.then(async () => {
  quill = new Quill("#editor-container", {
    theme: "snow",
    placeholder: "여기에 코드를 붙여넣거나 작성하세요...",
    modules: {
      toolbar: false,
      syntax: true,
    },
  });

  // Quill 생성자 안에서 syntax 모듈이 동기적으로 한 번 하이라이팅 사이클을 도는데,
  // 그 직후 바로 formatLine을 호출하면 그 사이클과 충돌해 무한 재귀 루프에 빠지는
  // Quill 1.3.x의 알려진 버그가 있다. 다음 tick으로 미뤄서 그 충돌을 피한다.
  setTimeout(() => {
    keepAsCodeBlock();
    // 매 입력마다 재포맷하면 한글 등 IME 조합 중 입력이 끊길 수 있어,
    // 포커스가 빠질 때만 code-block 포맷을 보정한다.
    quill.root.addEventListener("blur", keepAsCodeBlock);
  }, 0);

  await loadExistingFile();
});

// ------------------------------ 저장 ------------------------------
async function saveFile() {
  const filename = filenameInput.value.trim().replace(/^\/+/, "");
  if (!filename) {
    showToast("파일 이름을 입력해주세요.", true);
    filenameInput.focus();
    return;
  }
  const code = quill.getText().replace(/\n$/, "");
  if (!code.trim()) {
    showToast("코드 내용이 비어있어요.", true);
    return;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = "저장 중...";

  const payload = {
    folderId,
    filename,
    language: languageSelect.value,
    code,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  };

  try {
    if (isEditMode) {
      await filesRef.doc(fileId).update(payload);
    } else {
      payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await filesRef.add(payload);
      await foldersRef.doc(folderId).update({
        fileCount: firebase.firestore.FieldValue.increment(1),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    }
    location.href = backUrl;
  } catch (err) {
    console.error(err);
    showToast("저장 중 오류가 발생했어요.", true);
    saveBtn.disabled = false;
    saveBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg> 저장`;
  }
}

saveBtn.addEventListener("click", saveFile);
cancelBtn.addEventListener("click", () => (location.href = backUrl));

document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "s") {
    e.preventDefault();
    saveFile();
  }
});
