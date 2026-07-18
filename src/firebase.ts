import { initializeApp } from 'firebase/app';
import {
  initializeFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import { Member, MonthlyCollection, Loan, LoanRepayment, Income, Expense, Drawing } from './types';

// Load credentials from firebase-applet-config.json style config
const firebaseConfig = {
  apiKey: "AIzaSyAttFnU4yJTpPqqCt6tSxIqzo-Qr-c2Bl4",
  authDomain: "gen-lang-client-0953232537.firebaseapp.com",
  projectId: "gen-lang-client-0953232537",
  storageBucket: "gen-lang-client-0953232537.firebasestorage.app",
  messagingSenderId: "137690555750",
  appId: "1:137690555750:web:fb71229bdb7967b219d4a7"
};

const app = initializeApp(firebaseConfig);

// Initialize Firestore with the specific custom database ID
export const db = initializeFirestore(app, {}, "ai-studio-ab25ae9e-9ad6-4556-8adb-5da5050f9f46");

// Helper collection references
const membersCol = collection(db, 'members');
const collectionsCol = collection(db, 'collections');
const loansCol = collection(db, 'loans');
const repaymentsCol = collection(db, 'repayments');
const incomeCol = collection(db, 'income');
const expenseCol = collection(db, 'expense');
const settingsCol = collection(db, 'settings');
const drawingsCol = collection(db, 'drawings');

// ---------------- MEMBERS API ----------------
export async function saveMember(member: Member): Promise<void> {
  const docRef = doc(membersCol, member.memberNo);
  await setDoc(docRef, member);
}

export async function deleteMember(memberNo: string): Promise<void> {
  const docRef = doc(membersCol, memberNo);
  await deleteDoc(docRef);

  // Also clean up any collections or loans for this member, or they can be cleaned up manually.
  // To match professional accounting, we can delete the collections linked to them.
  const q = query(collectionsCol, where('memberNo', '==', memberNo));
  const snap = await getDocs(q);
  for (const d of snap.docs) {
    await deleteDoc(doc(collectionsCol, d.id));
  }
}

export function subscribeMembers(onUpdate: (members: Member[]) => void) {
  const q = query(membersCol, orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const list: Member[] = [];
    snapshot.forEach((doc) => {
      list.push(doc.data() as Member);
    });
    onUpdate(list);
  });
}

// ---------------- MONTHLY COLLECTION API ----------------
export async function saveMonthlyCollection(col: MonthlyCollection): Promise<void> {
  const id = `${col.memberNo}_${col.year}_${col.month}`;
  const docRef = doc(collectionsCol, id);
  await setDoc(docRef, { ...col, id });
}

export async function deleteMonthlyCollection(id: string): Promise<void> {
  const docRef = doc(collectionsCol, id);
  await deleteDoc(docRef);
}

export function subscribeCollections(onUpdate: (collections: MonthlyCollection[]) => void) {
  return onSnapshot(collectionsCol, (snapshot) => {
    const list: MonthlyCollection[] = [];
    snapshot.forEach((doc) => {
      list.push(doc.data() as MonthlyCollection);
    });
    onUpdate(list);
  });
}

// ---------------- LOANS API ----------------
export async function saveLoan(loan: Loan): Promise<void> {
  const docRef = doc(loansCol, loan.id);
  await setDoc(docRef, loan);
}

export async function deleteLoan(loanId: string): Promise<void> {
  const docRef = doc(loansCol, loanId);
  await deleteDoc(docRef);

  // Clean up associated repayments
  const q = query(repaymentsCol, where('loanId', '==', loanId));
  const snap = await getDocs(q);
  for (const d of snap.docs) {
    await deleteDoc(doc(repaymentsCol, d.id));
  }
}

export function subscribeLoans(onUpdate: (loans: Loan[]) => void) {
  const q = query(loansCol, orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const list: Loan[] = [];
    snapshot.forEach((doc) => {
      list.push(doc.data() as Loan);
    });
    onUpdate(list);
  });
}

// ---------------- LOAN REPAYMENTS API ----------------
export async function saveRepayment(repayment: LoanRepayment): Promise<void> {
  const docRef = doc(repaymentsCol, repayment.id);
  await setDoc(docRef, repayment);
}

export async function deleteRepayment(repaymentId: string): Promise<void> {
  const docRef = doc(repaymentsCol, repaymentId);
  await deleteDoc(docRef);
}

export function subscribeRepayments(onUpdate: (repayments: LoanRepayment[]) => void) {
  const q = query(repaymentsCol, orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const list: LoanRepayment[] = [];
    snapshot.forEach((doc) => {
      list.push(doc.data() as LoanRepayment);
    });
    onUpdate(list);
  });
}

// ---------------- INCOME API ----------------
export async function saveIncome(income: Income): Promise<void> {
  const docRef = doc(incomeCol, income.id);
  await setDoc(docRef, income);
}

export async function deleteIncome(incomeId: string): Promise<void> {
  const docRef = doc(incomeCol, incomeId);
  await deleteDoc(docRef);
}

export function subscribeIncome(onUpdate: (income: Income[]) => void) {
  const q = query(incomeCol, orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const list: Income[] = [];
    snapshot.forEach((doc) => {
      list.push(doc.data() as Income);
    });
    onUpdate(list);
  });
}

// ---------------- EXPENSE API ----------------
export async function saveExpense(expense: Expense): Promise<void> {
  const docRef = doc(expenseCol, expense.id);
  await setDoc(docRef, expense);
}

export async function deleteExpense(expenseId: string): Promise<void> {
  const docRef = doc(expenseCol, expenseId);
  await deleteDoc(docRef);
}

export function subscribeExpense(onUpdate: (expense: Expense[]) => void) {
  const q = query(expenseCol, orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const list: Expense[] = [];
    snapshot.forEach((doc) => {
      list.push(doc.data() as Expense);
    });
    onUpdate(list);
  });
}

// ---------------- SYSTEM SETTINGS API ----------------
export async function saveSettings(password: string): Promise<void> {
  const docRef = doc(settingsCol, 'admin');
  await setDoc(docRef, { password });
}

export async function getSettingsPassword(): Promise<string> {
  const docRef = doc(settingsCol, 'admin');
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return snap.data().password || '6780';
  }
  return '6780'; // default password
}

// ---------------- DRAWINGS API ----------------
export async function saveDrawing(drawing: Drawing): Promise<void> {
  const docRef = doc(drawingsCol, drawing.id);
  await setDoc(docRef, drawing);
}

export async function deleteDrawing(drawingId: string): Promise<void> {
  const docRef = doc(drawingsCol, drawingId);
  await deleteDoc(docRef);
}

export function subscribeDrawings(onUpdate: (drawings: Drawing[]) => void) {
  const q = query(drawingsCol, orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const list: Drawing[] = [];
    snapshot.forEach((doc) => {
      list.push(doc.data() as Drawing);
    });
    onUpdate(list);
  });
}

export async function clearAllMembersAndData(): Promise<void> {
  const collectionsToClear = [
    membersCol,
    collectionsCol,
    loansCol,
    repaymentsCol,
    incomeCol,
    expenseCol,
    drawingsCol
  ];

  for (const colRef of collectionsToClear) {
    const snap = await getDocs(colRef);
    for (const d of snap.docs) {
      await deleteDoc(d.ref);
    }
  }
}

