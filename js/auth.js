// ---------------------------------------------------------------------------
// 로그인 가드 : 로그인하지 않은 사용자는 login.html로 이동시킨다.
// (각 페이지 <head>의 인라인 스크립트가 body를 미리 숨겨두고,
//  여기서 로그인 상태가 확인되면 다시 보여준다.)
//
// authReady는 로그인된 사용자 정보로 resolve되는 프라미스다.
// 화면이 숨겨진 상태에서 Quill 같은 에디터를 초기화하면 선택영역(Range) 관련
// 오류가 나기 때문에, 각 페이지의 실제 초기화 로직은 authReady 이후에 실행한다.
// ---------------------------------------------------------------------------
const authReady = new Promise((resolve) => {
  auth.onAuthStateChanged((user) => {
    if (!user) {
      location.href = "login.html";
      return;
    }
    document.documentElement.style.visibility = "";
    resolve(user);
  });
});
