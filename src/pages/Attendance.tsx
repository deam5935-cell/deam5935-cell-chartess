import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp, setDoc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Calendar, Check, X, Search, Loader2, Save, Users } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

export function Attendance() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<string, { id?: string, status: 'present' | 'absent' }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    let unsubStudents: () => void;
    let unsubAttendance: () => void;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch all active students real-time
        unsubStudents = onSnapshot(query(collection(db, 'students'), where('status', '==', 'active')), (snap) => {
          const studentList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setStudents(studentList);
          
          // Only re-initialize attendance if it hasn't been loaded for this date yet
          setAttendance(prev => {
            const next = { ...prev };
            studentList.forEach(s => {
              if (!next[s.id]) next[s.id] = { status: 'absent' };
            });
            return next;
          });
        }, (error) => handleFirestoreError(error, OperationType.GET, 'students'));

        // Fetch attendance for selected date real-time
        unsubAttendance = onSnapshot(query(collection(db, 'attendance'), where('date', '==', selectedDate)), (snap) => {
          setAttendance(prev => {
            const next = { ...prev };
            snap.docs.forEach(doc => {
              const data = doc.data();
              next[data.studentId] = { id: doc.id, status: data.status };
            });
            return next;
          });
          setLoading(false);
        }, (error) => handleFirestoreError(error, OperationType.GET, 'attendance'));

      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'attendance_init');
      }
    };

    fetchData();
    return () => {
       if (unsubStudents) unsubStudents();
       if (unsubAttendance) unsubAttendance();
    };
  }, [selectedDate]);

  const toggleStatus = (studentId: string, status: 'present' | 'absent') => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], status }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const promises = Object.entries(attendance).map(async ([studentId, data]: [string, any]) => {
        const attendanceRef = data.id 
          ? doc(db, 'attendance', data.id) 
          : doc(collection(db, 'attendance'));
        
        return setDoc(attendanceRef, {
          studentId,
          date: selectedDate,
          status: data.status,
          updatedAt: serverTimestamp()
        }, { merge: true });
      });

      await Promise.all(promises);
      toast.success('Attendance synced for ' + format(new Date(selectedDate), 'PPP'));
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, 'attendance');
    } finally {
       setSaving(false);
    }
  };

  const filteredStudents = students.filter(s => s.fullName.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Attendance Tracking</h2>
          <p className="text-gray-400 mt-1">Daily check-in for active fashion students.</p>
        </div>
        <div className="flex items-center gap-4 bg-card-dark p-2 rounded-xl border border-border-dark">
           <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-2">Select Date</label>
           <input 
            type="date" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-white/5 border-none rounded-lg px-3 py-1.5 text-sm font-medium focus:ring-0 cursor-pointer"
          />
        </div>
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input
            type="text"
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <button 
          onClick={handleSave}
          disabled={saving || loading}
          className="btn-primary min-w-[160px]"
        >
          {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          <span>Save Changes</span>
        </button>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="p-4 bg-white/5 flex items-center justify-between border-b border-white/5">
           <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-gray-400">
              <span className="flex items-center gap-1"><Users size={12} className="text-primary" /> {students.length} Total</span>
              <span className="flex items-center gap-1 text-emerald-400"><Check size={12} /> {Object.values(attendance).filter((a: any) => a.status === 'present').length} Present</span>
              <span className="flex items-center gap-1 text-rose-400"><X size={12} /> {Object.values(attendance).filter((a: any) => a.status === 'absent').length} Absent</span>
           </div>
           <div className="flex gap-2">
              <button 
                onClick={() => setAttendance(prev => {
                  const updated = { ...prev };
                  students.forEach(s => updated[s.id] = { ...updated[s.id], status: 'present' });
                  return updated;
                })}
                className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 hover:bg-emerald-500/10 px-3 py-1 rounded transition-all"
              >
                Mark All Present
              </button>
           </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5 text-[10px] text-gray-500 uppercase tracking-[0.2em] font-bold">
                <th className="px-6 py-4">Student Name</th>
                <th className="px-6 py-4">Course</th>
                <th className="px-6 py-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={3} className="p-12 text-center text-gray-500 italic flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin" size={18} /> Syncing records...
                </td></tr>
              ) : filteredStudents.length === 0 ? (
                <tr><td colSpan={3} className="p-12 text-center text-gray-500 italic">No students found matching your search.</td></tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                      <p className="font-bold text-sm">{student.fullName}</p>
                      <p className="text-[10px] text-gray-500 font-mono italic">{student.email || 'No email'}</p>
                    </td>
                    <td className="px-6 py-4">
                       <span className="text-xs text-gray-400 bg-white/5 px-2 py-1 rounded border border-white/5">{student.course}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-4">
                        <button
                          onClick={() => toggleStatus(student.id, 'present')}
                          className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all border",
                            attendance[student.id]?.status === 'present' 
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 ring-2 ring-emerald-500/20" 
                              : "bg-white/5 text-gray-500 border-white/10 hover:bg-white/10"
                          )}
                        >
                          <Check size={14} />
                          Present
                        </button>
                        <button
                          onClick={() => toggleStatus(student.id, 'absent')}
                          className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all border",
                            attendance[student.id]?.status === 'absent' 
                              ? "bg-rose-500/20 text-rose-400 border-rose-500/30 ring-2 ring-rose-500/20" 
                              : "bg-white/5 text-gray-500 border-white/10 hover:bg-white/10"
                          )}
                        >
                          <X size={14} />
                          Absent
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
