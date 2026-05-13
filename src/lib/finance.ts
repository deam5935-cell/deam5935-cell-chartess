import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Recalculates and synchronizes a student's total paid and current balance
 * based on the source of truth (the payments collection).
 */
export async function syncStudentBalance(studentId: string) {
  try {
    // 1. Fetch all 'paid' payments for this student
    // We only count 'tuition', 'enrollment', 'other' and legacy (null category) towards the balance.
    // 'hostel' and 'maintenance' are auxiliary recurring fees and don't reduce the core tuition debt.
    const q = query(
      collection(db, 'payments'), 
      where('studentId', '==', studentId), 
      where('status', '==', 'paid')
    );
    const snapshot = await getDocs(q);
    const validPayments = snapshot.docs.filter(doc => {
      const cat = doc.data().category;
      // We only count 'tuition', 'enrollment', 'other' and legacy (null category) towards the core balance.
      // Standalone fees like Registration, Admission Form, Hostel, Maintenance, and Graduation are managed separately.
      return !cat || cat === 'tuition' || cat === 'enrollment' || cat === 'other';
    });
    
    const totalPaid = validPayments.reduce((acc, doc) => acc + (doc.data().amount || 0), 0);
    
    // 2. Fetch the student's latest fee structure
    const studentSnapshot = await getDocs(query(collection(db, 'students'), where('__name__', '==', studentId)));
    if (studentSnapshot.empty) return null;
    
    const studentData = studentSnapshot.docs[0].data();
    const studentRef = doc(db, 'students', studentId);
    
    // Respect the stored tuitionTotal (which is now editable/manual)
    // If for some reason it's missing, fallback to the calculated sum
    const storedTuitionTotal = Number(studentData.tuitionTotal);
    const calculatedTuitionTotal = (Number(studentData.tuitionFee) || 0) +
                                   (Number(studentData.uniformFee) || 0) +
                                   (Number(studentData.sewingKitsFee) || 0);
    
    const tuitionTotal = isNaN(storedTuitionTotal) ? calculatedTuitionTotal : storedTuitionTotal;

    const newBalance = Math.max(0, tuitionTotal - totalPaid);
    
    await updateDoc(studentRef, {
      amountPaid: totalPaid,
      balance: newBalance,
      updatedAt: serverTimestamp()
    });
    
    return { totalPaid, balance: newBalance, tuitionTotal };
  } catch (error) {
    console.error('Error syncing student balance:', error);
    throw error;
  }
}
