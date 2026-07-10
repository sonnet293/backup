// ---------------------------------------------------------------------------
// viewer.html : 폴더 안의 HTML 파일을 CSS/JS와 함께 합쳐서 실제 웹페이지처럼 미리보기
// ---------------------------------------------------------------------------

const params = new URLSearchParams(location.search);
const folderId = params.get("folder");
const fileId = params.get("file");

const pathTextEl = document.getElementById("path-text");
const backToFolderEl = document.getElementById("back-to-folder");
const reloadBtn = document.getElementById("reload-btn");
const frameEl = document.getElementById("preview-frame");
const emptyEl = document.getElementById("viewer-empty");
const emptyTextEl = document.getElementById("viewer-empty-text");

if (folderId) {
  backToFolderEl.href = `backup.html?folder=${folderId}`;
}

function showEmpty(message) {
  frameEl.style.display = "none";
  emptyEl.style.display = "";
  emptyTextEl.textContent = message;
}

function resolveRef(href, fileMap) {
  if (!href) return null;
  if (/^([a-z]+:)?\/\//i.test(href) || href.startsWith("data:")) return null; // 외부/데이터 URL은 그대로 둠
  const normalized = href.replace(/^\.\//, "").replace(/^\//, "");
  if (fileMap.has(normalized)) return fileMap.get(normalized);
  const base = normalized.split("/").pop();
  for (const [name, f] of fileMap) {
    if (name.split("/").pop() === base) return f;
  }
  return null;
}

function buildPreviewHtml(entryCode, fileMap) {
  const doc = new DOMParser().parseFromString(entryCode, "text/html");

  doc.querySelectorAll('link[rel="stylesheet"][href]').forEach((link) => {
    const match = resolveRef(link.getAttribute("href"), fileMap);
    if (match) {
      const style = doc.createElement("style");
      style.textContent = match.code || "";
      link.replaceWith(style);
    }
  });

  doc.querySelectorAll("script[src]").forEach((script) => {
    const match = resolveRef(script.getAttribute("src"), fileMap);
    if (match) {
      const inline = doc.createElement("script");
      inline.textContent = match.code || "";
      script.replaceWith(inline);
    }
  });

  return "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
}

async function loadPreview() {
  if (!folderId || !fileId) {
    showEmpty("잘못된 미리보기 주소예요.");
    return;
  }
  try {
    const [fileDoc, folderDoc, folderFilesSnap] = await Promise.all([
      filesRef.doc(fileId).get(),
      foldersRef.doc(folderId).get(),
      filesRef.where("folderId", "==", folderId).get(),
    ]);

    if (!fileDoc.exists) {
      showEmpty("파일을 찾을 수 없어요.");
      return;
    }
    const fileData = fileDoc.data();
    if (fileData.language !== "html") {
      showEmpty("HTML 파일만 전체 미리보기를 지원해요.");
      return;
    }

    const folderName = folderDoc.exists ? folderDoc.data().name : "";
    pathTextEl.textContent = `${folderName} / ${fileData.filename}`;
    document.title = `${fileData.filename} 미리보기`;

    const fileMap = new Map();
    folderFilesSnap.forEach((d) => fileMap.set(d.data().filename, d.data()));

    const combined = buildPreviewHtml(fileData.code || "", fileMap);
    frameEl.srcdoc = combined;
    frameEl.style.display = "";
    emptyEl.style.display = "none";
  } catch (err) {
    console.error(err);
    showEmpty("미리보기를 불러오는 중 오류가 발생했어요.");
  }
}

reloadBtn.addEventListener("click", loadPreview);

authReady.then(loadPreview);
