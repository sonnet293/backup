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
