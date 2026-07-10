// ---------------------------------------------------------------------------
// login.html : 이메일/비밀번호 로그인
// ---------------------------------------------------------------------------

const loginForm = document.getElementById("login-form");
const emailInput = document.getElementById("email-input");
const passwordInput = document.getElementById("password-input");
const loginBtn = document.getElementById("login-btn");
const loginError = document.getElementById("login-error");

// 이미 로그인되어 있으면 바로 목록으로, 아니면 로그인 폼을 보여준다.
auth.onAuthStateChanged((user) => {
  if (user) {
    location.href = "index.html";
  } else {
    document.documentElement.style.visibility = "";
    emailInput.focus();
  }
});

function loginErrorMessage(code) {
  if (code === "auth/invalid-email") return "이메일 형식이 올바르지 않아요.";
  if (code === "auth/user-not-found" || code === "auth/wrong-password" || code === "auth/invalid-credential") {
    return "이메일 또는 비밀번호가 올바르지 않아요.";
  }
  if (code === "auth/too-many-requests") return "시도가 너무 많아요. 잠시 후 다시 시도해주세요.";
  return "로그인에 실패했어요.";
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  if (!email || !password) return;

  loginBtn.disabled = true;
  loginError.textContent = "";
  try {
    await auth.signInWithEmailAndPassword(email, password);
    location.href = "index.html";
  } catch (err) {
    console.error(err);
    loginError.textContent = loginErrorMessage(err.code);
    loginBtn.disabled = false;
  }
});
