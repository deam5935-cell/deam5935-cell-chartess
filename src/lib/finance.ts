import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Recalculates and synchronizes a student's total paid and current balance
 * based on the source of truth (the payments collection).
 */
export async function syncStudentBalance(studentId: string) {
  try {
    // 1. Fetch all 'paid' payments for this student
    const q = query(
      collection(db, 'payments'), 
      where('studentId', '==', studentId), 
      where('status', '==', 'paid')
    );
    const snapshot = await getDocs(q);
    const totalPaid = snapshot.docs.reduce((acc, doc) => acc + (doc.data().amount || 0), 0);
    
    // 2. Fetch the student's latest fee structure
    const studentSnapshot = await getDocs(query(collection(db, 'students'), where('__name__', '==', studentId)));
    if (studentSnapshot.empty) return null;
    
    const studentData = studentSnapshot.docs[0].data();
    const studentRef = doc(db, 'students', studentId);
    
    // Calculate total expected (sum of all fee components)
    // We explicitly sum them here to ensure robustness if individual components changed
    const tuitionTotal = (Number(studentData.registrationFee) || 0) +
                         (Number(studentData.tuitionFee) || 0) +
                         (Number(studentData.uniformFee) || 0) +
                         (Number(studentData.sewingKitsFee) || 0) +
                         (Number(studentData.machineMaintenanceFee) || 0) +
                         (Number(studentData.admissionFormFee) || 0);

    const newBalance = Math.max(0, tuitionTotal - totalPaid);
    
    await updateDoc(studentRef, {
      tuitionTotal,
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
