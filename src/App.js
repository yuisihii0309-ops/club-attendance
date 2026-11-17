import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  collection,
} from "firebase/firestore";

// いただいたFirebase設定
const firebaseConfig = {
  apiKey: "AIzaSyArvt50XUOsJ4MMF23YlHrHBatFqsoxmlU",
  authDomain: "zangiehu1.firebaseapp.com",
  projectId: "zangiehu1",
  storageBucket: "zangiehu1.firebasestorage.app",
  messagingSenderId: "1090492665805",
  appId: "1:1090492665805:web:b2d859ac57df1206ac3e84",
};

// Firebaseの初期化
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// 🌟 ここをご自身のメールアドレスに書き換えてください（管理者権限）
const ADMIN_EMAILS = ["volleyball.tz@chibatech.ac.jp"];

export default function App() {
  const [user, setUser] = useState(null);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [attendanceList, setAttendanceList] = useState([]);
  const [eventName, setEventName] = useState("");
  const [isEditingEvent, setIsEditingEvent] = useState(false);

  const isAdmin = user && ADMIN_EMAILS.includes(user.email);
  const MAX_ATTENDANCE = 300;

  // ログイン状態の監視
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // 選択した日付のデータ（出欠リストと予定名）をリアルタイム取得
  useEffect(() => {
    if (!selectedDate) return;

    // 出欠データの取得
    const attendanceRef = collection(db, "attendance", selectedDate, "users");
    const unsubscribeAuth = onSnapshot(attendanceRef, (snapshot) => {
      const users = [];
      snapshot.forEach((doc) => {
        users.push({ uid: doc.id, ...doc.data() });
      });
      // 登録順（タイムスタンプ順）に並び替え
      users.sort((a, b) => a.timestamp - b.timestamp);
      setAttendanceList(users);
    });

    // 予定名（イベント名）の取得
    const eventRef = doc(db, "events", selectedDate);
    const unsubscribeEvent = onSnapshot(eventRef, (docSnap) => {
      if (docSnap.exists()) {
        setEventName(docSnap.data().title);
      } else {
        setEventName("");
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeEvent();
    };
  }, [selectedDate]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("ログインエラー:", error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  // 参加する処理
  const handleAttend = async () => {
    if (!user || !selectedDate) return;
    if (attendanceList.length >= MAX_ATTENDANCE) {
      alert("参加上限（300名）に達しています。");
      return;
    }
    const userRef = doc(db, "attendance", selectedDate, "users", user.uid);
    await setDoc(userRef, {
      name: user.displayName,
      photoURL: user.photoURL,
      email: user.email,
      timestamp: Date.now(),
    });
  };

  // 参加を取り消す処理
  const handleCancel = async () => {
    if (!user || !selectedDate) return;
    const userRef = doc(db, "attendance", selectedDate, "users", user.uid);
    await deleteDoc(userRef);
  };

  // 管理者：メンバーのキック（削除）処理
  const handleKick = async (targetUid) => {
    if (!isAdmin || !window.confirm("このメンバーの参加を取り消しますか？"))
      return;
    const userRef = doc(db, "attendance", selectedDate, "users", targetUid);
    await deleteDoc(userRef);
  };

  // 管理者：予定名の保存
  const handleSaveEventName = async () => {
    if (!isAdmin) return;
    const eventRef = doc(db, "events", selectedDate);
    await setDoc(eventRef, { title: eventName });
    setIsEditingEvent(false);
  };

  const isAttending = attendanceList.some((u) => u.uid === user?.uid);
  const isFull = attendanceList.length >= MAX_ATTENDANCE;

  // 簡単なスタイル設定
  const styles = {
    container: {
      maxWidth: "600px",
      margin: "0 auto",
      padding: "20px",
      fontFamily: "sans-serif",
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "20px",
    },
    button: {
      padding: "10px 20px",
      fontSize: "16px",
      cursor: "pointer",
      borderRadius: "5px",
      border: "none",
    },
    primaryBtn: {
      backgroundColor: "#4285F4",
      color: "white",
      width: "100%",
      padding: "15px",
      fontSize: "18px",
      fontWeight: "bold",
    },
    cancelBtn: {
      backgroundColor: "#EA4335",
      color: "white",
      width: "100%",
      padding: "15px",
      fontSize: "18px",
      fontWeight: "bold",
    },
    kickBtn: {
      backgroundColor: "#dc3545",
      color: "white",
      border: "none",
      padding: "5px 10px",
      borderRadius: "3px",
      cursor: "pointer",
    },
    dateInput: {
      padding: "10px",
      fontSize: "18px",
      width: "100%",
      marginBottom: "15px",
      boxSizing: "border-box",
    },
    eventBox: {
      backgroundColor: "#f8f9fa",
      padding: "15px",
      borderRadius: "8px",
      marginBottom: "20px",
    },
    listItem: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "10px 0",
      borderBottom: "1px solid #eee",
    },
    userInfo: { display: "flex", alignItems: "center", gap: "10px" },
    avatar: { width: "40px", height: "40px", borderRadius: "50%" },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>部活 出欠管理</h2>
        {user ? (
          <button
            style={{ ...styles.button, backgroundColor: "#f1f3f4" }}
            onClick={handleLogout}
          >
            ログアウト
          </button>
        ) : (
          <button
            style={{
              ...styles.button,
              backgroundColor: "#4285F4",
              color: "white",
            }}
            onClick={handleLogin}
          >
            Googleでログイン
          </button>
        )}
      </div>

      {!user ? (
        <div style={{ textAlign: "center", marginTop: "50px" }}>
          <p>出欠を登録・確認するにはログインしてください。</p>
        </div>
      ) : (
        <>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={styles.dateInput}
          />

          {/* イベント名（予定名）セクション */}
          <div style={styles.eventBox}>
            {isAdmin && isEditingEvent ? (
              <div style={{ display: "flex", gap: "10px" }}>
                <input
                  type="text"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="予定名を入力 (例: 全体練習)"
                  style={{ flex: 1, padding: "8px" }}
                />
                <button
                  onClick={handleSaveEventName}
                  style={{
                    ...styles.button,
                    backgroundColor: "#34a853",
                    color: "white",
                    padding: "8px 15px",
                  }}
                >
                  保存
                </button>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <h3 style={{ margin: 0, color: eventName ? "#333" : "#999" }}>
                  {eventName || "予定未定"}
                </h3>
                {isAdmin && (
                  <button
                    onClick={() => setIsEditingEvent(true)}
                    style={{
                      ...styles.button,
                      backgroundColor: "#eee",
                      padding: "5px 10px",
                      fontSize: "14px",
                    }}
                  >
                    編集
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 出欠ボタン */}
          <div style={{ marginBottom: "30px" }}>
            {isAttending ? (
              <button style={styles.cancelBtn} onClick={handleCancel}>
                参加を取り消す
              </button>
            ) : isFull ? (
              <button
                style={{
                  ...styles.primaryBtn,
                  backgroundColor: "#ccc",
                  cursor: "not-allowed",
                }}
                disabled
              >
                満員 (300名到達)
              </button>
            ) : (
              <button style={styles.primaryBtn} onClick={handleAttend}>
                参加する
              </button>
            )}
          </div>

          {/* 参加者リスト */}
          <div>
            <h3
              style={{
                borderBottom: "2px solid #4285F4",
                paddingBottom: "5px",
              }}
            >
              参加予定者 ({attendanceList.length}名)
            </h3>
            {attendanceList.length === 0 ? (
              <p style={{ color: "#666" }}>まだ参加者はいません。</p>
            ) : (
              <div>
                {attendanceList.map((attendee) => (
                  <div key={attendee.uid} style={styles.listItem}>
                    <div style={styles.userInfo}>
                      <img
                        src={
                          attendee.photoURL || "https://via.placeholder.com/40"
                        }
                        alt="icon"
                        style={styles.avatar}
                      />
                      <span>{attendee.name}</span>
                    </div>
                    {/* 管理者のみ削除ボタンを表示 */}
                    {isAdmin && (
                      <button
                        style={styles.kickBtn}
                        onClick={() => handleKick(attendee.uid)}
                      >
                        削除
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
