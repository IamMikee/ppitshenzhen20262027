import {
  collection,
  addDoc,
  setDoc,
  updateDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  query,
  where,
  arrayUnion
} from "firebase/firestore";
import { db } from "../lib/firebase";


/* =========================
   CREATE FORM (ADMIN)
========================= */
export async function createForm(formData) {
  if (!formData.title || formData.questions.length === 0) {
    throw new Error("Form must have a title and at least one question");
  }

  return await addDoc(collection(db, "forms"), {
    title: formData.title,
    description: formData.description,
    questions: formData.questions,
    isActive: formData.published,
    createdBy: formData.createdBy,
    createdAt: serverTimestamp(),
  });
}


/* =========================
   GET FORM BY ID (PUBLIC)
========================= */
export async function getFormById(formId) {
  if (!formId) return null;

  const ref = doc(db, "forms", formId);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;

  const data = snap.data();

  return {
    id: snap.id,
    title: data.title,
    description: data.description,
    questions: data.questions,
    isActive: data.isActive,
    createdBy: data.createdBy,
    // CONVERT TIMESTAMP
    createdAt: data.createdAt
      ? data.createdAt.toMillis()
      : null,
  };
}


/* =========================
   SUBMIT RESPONSE (USER)
========================= */
export async function submitResponse(formId, questions, answers) {

  // REQUIRED FIELD VALIDATION
  questions.forEach((q) => {
    const answer = answers[q.id];

    if (q.required) {
      if (!answer) throw new Error(`"${q.label}" is required`);
      if (Array.isArray(answer) && answer.length === 0)
        throw new Error(`"${q.label}" is required`);
      if (typeof answer === "string" && answer.trim() === "")
        throw new Error(`"${q.label}" is required`);
    }
  });

  const userId = localStorage.getItem("user-id");
  if (!userId) throw new Error("User not logged in");

  // 🔹 GET USER DATA FROM FIRESTORE
  const userSnap = await getDoc(doc(db, "users", userId));
  if (!userSnap.exists()) throw new Error("User not found");

  const userData = userSnap.data();
  const userEmail = userData.email || "";

  // 🔹 GET FORM DATA FROM FIRESTORE
  const formSnap = await getDoc(doc(db, "forms", formId));
  if (!formSnap.exists()) throw new Error("Form not found");

  const formData = formSnap.data();
  const formTitle = formData.title || "";

  // 🔹 SAVE RESPONSE
  const docRef = await addDoc(collection(db, "responses"), {
    formId,
    answers,
    submittedBy: userId,
    submittedAt: serverTimestamp(),
  });

  // 🔹 UPDATE USER
  await updateUser(userId, {
    submittedFormId: formId,
  });

  // 🔹 UPDATE GOOGLE SHEETS
  await fetch("https://script.google.com/macros/s/AKfycbzcLclk2Se9LlFIcLiCQUutSwaNqvNc_mXx35tpG4-Hy0i0a5rDvVYVMTYrG11L6lZu/exec", {
    method: "POST",
    body: JSON.stringify({
      type: "submission",
      formId,
      responseId: docRef.id,
      userId,
      email: userEmail,
      eventName: formTitle,
      submittedAt: new Date().toISOString(),
      answers,
    }),
  });

  return docRef;
}

/* =========================
   LOAD ALL FORMS (SERVERSIDE)
========================= */
export async function getAllForms() {
    const q = query(
        collection(db, "forms"),
        // where("isActive", "==", true)
    );

    const snap = await getDocs(q);

    const formList = snap.docs.map(docSnap => {
        const data = docSnap.data();
        return {
            id: docSnap.id,
            title: data.title,
            description: data.description,
            createdBy: data.createdBy,
            createdAt: data.createdAt ? data.createdAt.toMillis() : null,
            coverImage: data.coverImage,
            headerColor: data.headerColor,
            isActive: data.isActive,
            isClosed: data.isClosed,
        };
    });

    return formList;
}


/* =========================
   LOAD ALL USERS (SERVERSIDE)
 ========================= */
export async function getAllUsers() {
    const q = query(
        collection(db, "users"),
    );

    const snap = await getDocs(q);
    try {
      const userList = snap.docs.map(docSnap => {
          const data = docSnap.data();
          return {
              uid: docSnap.id,
              email: data.email,
              admin: data.admin, //bool
          };
      });
      return userList;
    } catch (e) {
      console.error(e);
      return [];
    }
}

/* =========================
   UPDATE/ADD A USER (SERVERSIDE)
 ========================= */
export async function updateUser(
  uid,
  {
    email = "",
    submittedFormId = null,
    attendedFormId = null,
  } = {}
) {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);

  // Create user if not exists
  if (!userSnap.exists()) {
    await setDoc(userRef, {
      email,
      admin: false,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
      submittedForms: submittedFormId ? [submittedFormId] : [],
      attendedForms: attendedFormId ? [attendedFormId] : [],
    });
    return;
  }

  // Build update payload safely
  const updateData = {
    lastLogin: serverTimestamp(),
  };

  if (submittedFormId) {
    updateData.submittedForms = arrayUnion(submittedFormId);
  }

  if (attendedFormId) {
    updateData.attendedForms = arrayUnion(attendedFormId);
  }

  await updateDoc(userRef, updateData);
}

/* =========================
   MARK ATTENDANCE (USER)
========================= */
export async function markAttendance(formId) {

  const userId = localStorage.getItem("user-id");
  if (!userId) throw new Error("User not logged in");

  // 🔹 GET USER DATA
  const userSnap = await getDoc(doc(db, "users", userId));
  if (!userSnap.exists()) throw new Error("User not found");

  const userData = userSnap.data();
  const userEmail = userData.email || "";
  const userName = userData.name || "";

  // 🔹 GET FORM DATA
  const formSnap = await getDoc(doc(db, "forms", formId));
  if (!formSnap.exists()) throw new Error("Form not found");

  const formData = formSnap.data();
  const formTitle = formData.title || "";

  // 🔹 UPDATE FIRESTORE
  await updateUser(userId, {
    attendedFormId: formId,
  });

  // 🔹 UPDATE GOOGLE SHEETS
  await fetch("https://script.google.com/macros/s/AKfycbzcLclk2Se9LlFIcLiCQUutSwaNqvNc_mXx35tpG4-Hy0i0a5rDvVYVMTYrG11L6lZu/exec", {
    method: "POST",
    body: JSON.stringify({
      type: "attendance",
      formId,
      userId,
      email: userEmail,
      eventName: formTitle,
      userName,
      attendedAt: new Date().toISOString(),
    }),
  });
}
