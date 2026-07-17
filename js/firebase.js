// ---------------------------------------------------------------------------
// Firebase 초기화
// Firebase 콘솔 > 프로젝트 설정 > 일반 > "내 앱"에서 발급받은 설정 값을
// 아래 firebaseConfig 객체에 채워 넣으세요.
// ---------------------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyB0lnSBBJytE9CSDt_zBJ903Ghby1j9waw",
  authDomain: "sonnet-5034a.firebaseapp.com",
  projectId: "sonnet-5034a",
  storageBucket: "sonnet-5034a.firebasestorage.app",
  messagingSenderId: "825142402643",
  appId: "1:825142402643:web:6dba8cfefe157df821f0a6",
};

firebase.initializeApp(firebaseConfig);

// 다른 스크립트에서 공용으로 사용할 Firestore / Auth 인스턴스
const db = firebase.firestore();
const auth = firebase.auth();

// 컬렉션 참조 (folders: 폴더 목록, files: 폴더 안에 들어가는 코드 파일들)
const foldersRef = db.collection("folders");
const filesRef = db.collection("files");

// ---------------------------------------------------------------------------
// 로그인 가드 : 로그인하지 않은 사용자는 login.html로 이동시킨다.
// (각 페이지 <head>의 인라인 스크립트가 body를 미리 숨겨두고,
//  여기서 로그인 상태가 확인되면 다시 보여준다.)
//
// authReady는 로그인된 사용자 정보로 resolve되는 프라미스다.
// 화면이 숨겨진 상태에서 Quill 같은 에디터를 초기화하면 선택영역(Range) 관련
// 오류가 나기 때문에, 각 페이지의 실제 초기화 로직은 authReady 이후에 실행한다.
// login.html은 자체적으로 로그인 상태를 처리하므로, 여기서 다시 login.html로
// 리다이렉트하면 자기 자신을 향해 새로고침이 반복될 수 있어 그 경우는 건너뛴다.
const authReady = new Promise((resolve) => {
  auth.onAuthStateChanged((user) => {
    if (!user) {
      if (!location.pathname.endsWith("login.html")) {
        location.href = "login.html";
      }
      return;
    }
    document.documentElement.style.visibility = "";
    resolve(user);
  });
});
