import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';

interface ReceiptData {
  receiptNo: string;
  studentName: string;
  studentCourse: string;
  amount: number;
  balance?: number;
  tuitionTotal?: number;
  totalPaid?: number;
  date: Date;
  method: string;
  category?: string;
  notes?: string;
  recordedBy?: string;
}

export const generateReceiptPDF = async (data: ReceiptData) => {
  const receiptContainer = document.createElement('div');
  receiptContainer.style.position = 'fixed';
  receiptContainer.style.left = '-10000px';
  receiptContainer.style.top = '0';
  receiptContainer.style.width = '800px';
  receiptContainer.style.padding = '40px';
  receiptContainer.style.backgroundColor = '#ffffff';
  receiptContainer.style.color = '#000000';
  receiptContainer.style.fontFamily = "'Inter', sans-serif";
  
  const logoUrl = "/charthess_logo-1.png";

  const headerHtml = `
    <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #0A0F1C;">
      <img src="${logoUrl}" style="height: 120px; width: auto; object-fit: contain; margin-bottom: 15px; filter: brightness(0);" />
      <div style="font-size: 12px; color: #333; line-height: 1.4;">
        <p style="margin: 0; font-weight: bold; font-size: 14px; color: #0A0F1C;">Tel: +233 24 786 4347 / +233 50 083 0085</p>
        <p style="margin: 2px 0;">Email: charthessfashions@gmail.com</p>
        <p style="margin: 2px 0;">Location: Kasoa Nyanyano Road, Kakraba Behind KFC</p>
      </div>
    </div>
  `;

  receiptContainer.innerHTML = `
    <div style="border: 4px solid #0A0F1C; padding: 30px; position: relative; overflow: hidden;">
      <img src="${logoUrl}" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 450px; opacity: 0.08; pointer-events: none; filter: brightness(0);" />
      
      ${headerHtml}

      <div style="display: flex; justify-content: flex-end; margin-bottom: 30px;">
        <div style="text-align: right;">
          <h2 style="margin: 0; font-size: 24px; font-weight: 900; color: #1CA3B8; text-transform: uppercase;">Official Receipt</h2>
          <p style="margin: 5px 0 0 0; font-weight: bold;">No: ${data.receiptNo}</p>
          <p style="margin: 2px 0 0 0; font-size: 12px; color: #666;">Date: ${format(data.date, 'PPPP')}</p>
        </div>
      </div>

      <div style="margin-bottom: 40px;">
        <div style="display: grid; grid-template-columns: 150px 1fr; gap: 15px; margin-bottom: 10px;">
          <div style="font-weight: bold; color: #888; text-transform: uppercase; font-size: 12px;">Received From:</div>
          <div style="font-size: 18px; font-weight: bold; border-bottom: 1px dashed #eee; padding-bottom: 5px;">${data.studentName}</div>
        </div>
        <div style="display: grid; grid-template-columns: 150px 1fr; gap: 15px; margin-bottom: 10px;">
          <div style="font-weight: bold; color: #888; text-transform: uppercase; font-size: 12px;">Course:</div>
          <div style="font-size: 16px; border-bottom: 1px dashed #eee; padding-bottom: 5px;">${data.studentCourse}</div>
        </div>
        <div style="display: grid; grid-template-columns: 150px 1fr; gap: 15px; margin-bottom: 10px;">
          <div style="font-weight: bold; color: #888; text-transform: uppercase; font-size: 12px;">The Sum Of:</div>
          <div style="font-size: 24px; font-weight: 900; color: #0A0F1C; border-bottom: 1px dashed #eee; padding-bottom: 5px;">GH₵ ${data.amount.toLocaleString()}.00</div>
        </div>
        <div style="margin: 20px 0; padding: 15px; background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-weight: bold; color: #64748b; text-transform: uppercase; font-size: 10px; letter-spacing: 1px; margin-bottom: 2px;">Outstanding Debt</div>
            <div style="font-weight: 900; font-size: 11px; color: #1CA3B8; text-transform: uppercase;">Current Academic Balance</div>
          </div>
          <div style="font-size: 20px; font-weight: 900; color: ${(data.balance ?? 0) > 0 ? '#e11d48' : '#059669'};">GH₵ ${(data.balance ?? 0).toLocaleString()}.00</div>
        </div>
        <div style="display: grid; grid-template-columns: 150px 1fr; gap: 15px; margin-bottom: 10px;">
          <div style="font-weight: bold; color: #888; text-transform: uppercase; font-size: 12px;">Being Payment For:</div>
          <div style="font-size: 16px; border-bottom: 1px dashed #eee; padding-bottom: 5px; text-transform: capitalize;">${data.category || 'Tuition Fee'} ${data.notes ? `- ${data.notes}` : ''}</div>
        </div>
        <div style="display: grid; grid-template-columns: 150px 1fr; gap: 15px; margin-bottom: 10px;">
          <div style="font-weight: bold; color: #888; text-transform: uppercase; font-size: 12px;">Payment Method:</div>
          <div style="font-size: 16px; text-transform: capitalize;">${data.method}</div>
        </div>
      </div>

      <!-- Financial Summary Section -->
      <div style="margin: 30px 0; padding: 20px; border: 1px solid #eee; border-radius: 12px; background: #fafafa;">
        <h3 style="margin: 0 0 15px 0; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; color: #1CA3B8;">Ledger Statement Summary</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px;">
          <div>
            <p style="margin: 0; font-size: 9px; color: #888; font-weight: bold; text-transform: uppercase;">Total Tuition Fee</p>
            <p style="margin: 5px 0 0 0; font-size: 16px; font-weight: 900;">GH₵ ${(data.tuitionTotal || 0).toLocaleString()}.00</p>
          </div>
          <div>
            <p style="margin: 0; font-size: 9px; color: #888; font-weight: bold; text-transform: uppercase;">Total Amount Paid</p>
            <p style="margin: 5px 0 0 0; font-size: 16px; font-weight: 900; color: #059669;">GH₵ ${(data.totalPaid || data.amount).toLocaleString()}.00</p>
          </div>
          <div>
            <p style="margin: 0; font-size: 9px; color: #888; font-weight: bold; text-transform: uppercase;">Payment Arrears</p>
            <p style="margin: 5px 0 0 0; font-size: 16px; font-weight: 900; color: ${(data.balance ?? 0) > 0 ? '#e11d48' : '#059669'};">GH₵ ${(data.balance ?? 0).toLocaleString()}.00</p>
          </div>
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: end; margin-top: 60px;">
        <div style="font-size: 12px; color: #999;">
          <p style="margin: 0;">This is a computer-generated receipt.</p>
          <p style="margin: 0;">Generated by: ${data.recordedBy || 'System'}</p>
        </div>
        <div style="text-align: center;">
          <div style="width: 200px; border-bottom: 2px solid #0A0F1C; margin-bottom: 10px;"></div>
          <p style="margin: 0; font-weight: bold; text-transform: uppercase; font-size: 12px;">Authorized Signature</p>
        </div>
      </div>
      
      <div style="margin-top: 40px; text-align: center; font-size: 10px; color: #bbb; text-transform: uppercase; letter-spacing: 2px;">
        Empowering Fashion Excellence
      </div>
    </div>
  `;

  document.body.appendChild(receiptContainer);

  try {
    const canvas = await html2canvas(receiptContainer, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff'
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    
    // Auto-print behavior
    pdf.autoPrint();
    const blobUrl = pdf.output('bloburl');
    window.open(blobUrl, '_blank');
    
    pdf.save(`Receipt_${data.receiptNo}_${data.studentName.replace(/ /g, '_')}.pdf`);
  } finally {
    document.body.removeChild(receiptContainer);
  }
};

export const generateInvoicePDF = async (student: any) => {
  const receiptContainer = document.createElement('div');
  receiptContainer.style.position = 'fixed';
  receiptContainer.style.left = '-10000px';
  receiptContainer.style.top = '0';
  receiptContainer.style.width = '850px';
  receiptContainer.style.padding = '40px';
  receiptContainer.style.backgroundColor = '#ffffff';
  receiptContainer.style.color = '#000000';
  receiptContainer.style.fontFamily = "'Inter', sans-serif";
  
  const logoUrl = "/charthess_logo-1.png";

  const headerHtml = `
    <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #0A0F1C;">
      <img src="${logoUrl}" style="height: 100px; width: auto; object-fit: contain; margin-bottom: 12px; filter: brightness(0);" />
      <div style="font-size: 11px; color: #333; line-height: 1.4;">
        <p style="margin: 0; font-weight: bold; font-size: 13px; color: #0A0F1C;">Tel: +233 24 786 4347 / +233 50 083 0085</p>
        <p style="margin: 2px 0;">Email: charthessfashions@gmail.com</p>
        <p style="margin: 2px 0;">Location: Kasoa Nyanyano Road, Kakraba Behind KFC</p>
      </div>
    </div>
  `;

  receiptContainer.innerHTML = `
    <div style="padding: 20px;">
      ${headerHtml}
      
      <div style="display: flex; justify-content: flex-end; margin-bottom: 40px; margin-top: 20px;">
        <div style="text-align: right;">
          <h2 style="margin: 0; font-size: 32px; font-weight: 900; color: #0A0F1C; text-transform: uppercase; letter-spacing: -1px;">Invoice</h2>
          <p style="margin: 5px 0 0 0; color: #666; font-size: 13px;">Date: ${format(new Date(), 'PP')}</p>
          <p style="margin: 2px 0 0 0; font-weight: bold; font-size: 13px;">Inv No: INV-${student.id.substring(0, 6).toUpperCase()}</p>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 50px; margin-bottom: 40px;">
        <div>
          <p style="text-transform: uppercase; font-size: 11px; font-weight: 900; color: #888; margin-bottom: 10px;">Billing To:</p>
          <p style="margin: 0; font-size: 18px; font-weight: 900;">${student.fullName}</p>
          <p style="margin: 5px 0; color: #666; font-size: 13px;">${student.phone}</p>
          <p style="margin: 0; color: #666; font-size: 13px;">${student.email || student.address || 'Student Record'}</p>
        </div>
        <div style="text-align: right;">
          <p style="text-transform: uppercase; font-size: 11px; font-weight: 900; color: #888; margin-bottom: 10px;">Program Info:</p>
          <p style="margin: 0; font-size: 15px; font-weight: bold;">${student.course}</p>
          <p style="margin: 5px 0; color: #666; font-size: 13px;">Batch: ${student.batch || 'Not Set'}</p>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
        <thead>
          <tr style="background: #0A0F1C; color: white;">
            <th style="padding: 12px 15px; text-align: left; text-transform: uppercase; font-size: 11px; letter-spacing: 1px;">Description</th>
            <th style="padding: 12px 15px; text-align: right; text-transform: uppercase; font-size: 11px; letter-spacing: 1px;">Amount (GH₵)</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 20px 15px;">
              <p style="margin: 0; font-weight: bold;">Academic Tuition Fee</p>
              <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">Professional training and practical session fees for the selected program duration.</p>
            </td>
            <td style="padding: 20px 15px; text-align: right; font-weight: bold;">${(student.tuitionTotal || 0).toLocaleString()}.00</td>
          </tr>
        </tbody>
      </table>

      <div style="display: flex; justify-content: flex-end;">
        <div style="width: 300px;">
          <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee;">
            <span style="color: #666; font-size: 13px;">Total Fees</span>
            <span style="font-weight: bold;">GH₵ ${(student.tuitionTotal || 0).toLocaleString()}.00</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee;">
            <span style="color: #666; font-size: 13px;">Previously Paid</span>
            <span style="font-weight: bold; color: #059669;">- GH₵ ${(student.amountPaid || 0).toLocaleString()}.00</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 15px 0; background: #f9f9f9; margin-top: 5px;">
            <span style="font-weight: 900; text-transform: uppercase; padding-left: 10px;">Balance Due</span>
            <span style="font-weight: 900; font-size: 20px; color: #e11d48; padding-right: 10px;">GH₵ ${(student.balance || 0).toLocaleString()}.00</span>
          </div>
        </div>
      </div>

      <div style="margin-top: 60px; border-top: 2px solid #0A0F1C; padding-top: 20px;">
        <p style="font-weight: 900; text-transform: uppercase; font-size: 12px; margin-bottom: 10px;">Payment Terms & Instructions:</p>
        <p style="margin: 0; font-size: 11px; color: #666; line-height: 1.6;">
          1. All payments should be made via official channels (Momo/Bank).<br/>
          2. Quote Registration Number CH-${student.id.substring(0, 8).toUpperCase()} as reference.<br/>
          3. Fees paid are non-refundable after 14 days of enrollment.<br/>
          4. Contact finance office for any payment plan adjustments.
        </p>
      </div>
      
      <div style="margin-top: 30px; text-align: center; color: #1CA3B8; font-weight: bold; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">
        Sustainable • Modern • Elegant
      </div>
    </div>
  `;

  document.body.appendChild(receiptContainer);

  try {
    const canvas = await html2canvas(receiptContainer, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff'
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    
    // Auto-print behavior
    pdf.autoPrint();
    const blobUrl = pdf.output('bloburl');
    window.open(blobUrl, '_blank');

    pdf.save(`Invoice_${student.fullName.replace(/ /g, '_')}.pdf`);
  } finally {
    document.body.removeChild(receiptContainer);
  }
};

export interface EnrollmentData {
  student: any;
  schoolInfo?: {
    name: string;
    tagline: string;
    address: string;
    phone: string;
    logoUrl?: string;
  };
}

export const generateEnrollmentPDF = async (data: EnrollmentData) => {
  const receiptContainer = document.createElement('div');
  receiptContainer.style.position = 'fixed';
  receiptContainer.style.left = '-10000px';
  receiptContainer.style.top = '0';
  receiptContainer.style.width = '1000px';
  receiptContainer.style.padding = '50px';
  receiptContainer.style.backgroundColor = '#ffffff';
  receiptContainer.style.color = '#000000';
  receiptContainer.style.fontFamily = "'Inter', sans-serif";
  
  const logoUrl = "/charthess_logo-1.png";
  const student = data.student;

  const headerHtml = `
    <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #0A0F1C;">
      <img src="${logoUrl}" style="height: 100px; width: auto; object-fit: contain; margin-bottom: 12px; filter: brightness(0);" />
      <div style="font-size: 11px; color: #333; line-height: 1.4;">
        <p style="margin: 0; font-weight: bold; font-size: 13px; color: #0A0F1C;">Tel: +233 24 786 4347 / +233 50 083 0085</p>
        <p style="margin: 2px 0;">Email: charthessfashions@gmail.com</p>
        <p style="margin: 2px 0;">Location: Kasoa Nyanyano Road, Kakraba Behind KFC</p>
      </div>
    </div>
  `;

  receiptContainer.innerHTML = `
    <div style="border: 2px solid #0A0F1C; padding: 40px; position: relative; background: #fff;">
      ${headerHtml}

      <div style="display: flex; justify-content: flex-end; margin-bottom: 30px;">
        <div style="text-align: right;">
          <div style="background: #0A0F1C; color: white; padding: 10px 20px; font-weight: 900; text-transform: uppercase; font-size: 18px; margin-bottom: 10px;">Official Enrollment Document</div>
          <p style="margin: 0; font-weight: bold;">Admission No: CH-${student.id ? student.id.substring(0, 8).toUpperCase() : 'NEW'}</p>
          <p style="margin: 2px 0 0 0; font-size: 13px;">Dated: ${format(new Date(student.enrollmentDate || Date.now()), 'PPPP')}</p>
        </div>
      </div>

      <!-- Student Header -->
      <div style="display: flex; gap: 40px; margin-bottom: 40px; background: #f9f9f9; padding: 30px; border-radius: 20px; border: 1px solid #eee;">
        <div style="width: 180px; height: 180px; background: #eee; border: 4px solid #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border-radius: 15px; overflow: hidden; display: flex; align-items: center; justify-content: center;">
          ${student.photoUrl ? `<img src="${student.photoUrl}" crossOrigin="anonymous" style="width: 100%; height: 100%; object-fit: cover;" />` : '<div style="font-size: 10px; color: #999; text-transform: uppercase; text-align: center;">Official Photograph<br/>Required</div>'}
        </div>
        <div style="flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <div style="grid-column: span 2; border-bottom: 2px solid #0A0F1C; padding-bottom: 10px;">
            <p style="margin: 0; font-size: 11px; color: #1CA3B8; text-transform: uppercase; font-weight: 900; letter-spacing: 2px;">Scholar Full Identity</p>
            <h2 style="margin: 5px 0 0 0; font-size: 32px; font-weight: 900; text-transform: uppercase; color: #0A0F1C;">${student.surname}, ${student.firstName} ${student.otherNames || ''}</h2>
          </div>
          <div>
            <p style="margin: 0; font-size: 10px; color: #888; text-transform: uppercase; font-weight: 900;">Academic Program</p>
            <p style="margin: 3px 0 0 0; font-size: 16px; font-weight: bold; color: #0A0F1C;">${student.course} ${student.courseOther ? `(${student.courseOther})` : ''}</p>
            <p style="margin: 2px 0 0 0; font-size: 12px; color: #666;">Track: ${student.specialization || 'Not Specified'}</p>
          </div>
          <div>
             <p style="margin: 0; font-size: 10px; color: #888; text-transform: uppercase; font-weight: 900;">Intake Batch & Mode</p>
             <p style="margin: 3px 0 0 0; font-size: 16px; font-weight: bold; color: #0A0F1C;">${student.batch || 'Unassigned'} | ${student.mode || 'N/A'}</p>
             <p style="margin: 2px 0 0 0; font-size: 12px; color: #666;">Status: ${student.status}</p>
          </div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 50px;">
        <!-- Left Column -->
        <div>
          <div style="margin-bottom: 30px;">
            <h3 style="border-left: 5px solid #1CA3B8; padding-left: 10px; margin-bottom: 15px; font-size: 14px; text-transform: uppercase; font-weight: 900; color: #0A0F1C; background: #f0fdfa; padding-top: 5px; padding-bottom: 5px;">Personal Demographics</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 12px;">
              <p><strong>Gender:</strong> ${student.gender}</p>
              <p><strong>DOB/Age:</strong> ${student.dob} (${student.age} yrs)</p>
              <p><strong>Nationality:</strong> ${student.nationality}</p>
              <p><strong>Marital:</strong> ${student.maritalStatus}</p>
              <p style="grid-column: span 2;"><strong>Digital Address:</strong> ${student.digitalAddress || 'N/A'}</p>
              <p style="grid-column: span 2;"><strong>Address:</strong> ${student.address}</p>
              <p><strong>Primary Contact:</strong> ${student.phone}</p>
              <p><strong>Alt Contact:</strong> ${student.alternatePhone || 'N/A'}</p>
              <p style="grid-column: span 2;"><strong>Email:</strong> ${student.email || 'N/A'}</p>
            </div>
          </div>

          <div style="margin-bottom: 30px;">
            <h3 style="border-left: 5px solid #1CA3B8; padding-left: 10px; margin-bottom: 15px; font-size: 14px; text-transform: uppercase; font-weight: 900; color: #0A0F1C; background: #f0fdfa; padding-top: 5px; padding-bottom: 5px;">Academic Background</h3>
            <div style="font-size: 12px; line-height: 1.6;">
              <p><strong>Highest Education:</strong> ${student.educationLevel}</p>
              <p><strong>Last Institution:</strong> ${student.lastSchool}</p>
              <p><strong>Program Studied:</strong> ${student.programStudied || 'N/A'}</p>
              <p><strong>Qualifications:</strong> ${student.qualifications || 'N/A'}</p>
              <p><strong>Completion Year:</strong> ${student.yearCompleted}</p>
            </div>
          </div>

          <div style="margin-bottom: 30px;">
            <h3 style="border-left: 5px solid #1CA3B8; padding-left: 10px; margin-bottom: 15px; font-size: 14px; text-transform: uppercase; font-weight: 900; color: #0A0F1C; background: #f0fdfa; padding-top: 5px; padding-bottom: 5px;">Health & Safety</h3>
            <div style="font-size: 12px;">
              <p><strong>Medical Condition:</strong> ${student.hasMedicalCondition}</p>
              <p><strong>Details:</strong> ${student.medicalDetails || 'None recorded'}</p>
              <p><strong>Emergency Contact:</strong> ${student.emergencyContactName} (${student.emergencyContactPhone})</p>
            </div>
          </div>
        </div>

        <!-- Right Column -->
        <div>
          <div style="margin-bottom: 30px;">
            <h3 style="border-left: 5px solid #0A0F1C; padding-left: 10px; margin-bottom: 15px; font-size: 14px; text-transform: uppercase; font-weight: 900; color: #0A0F1C; background: #f8fafc; padding-top: 5px; padding-bottom: 5px;">Guardian Particulars</h3>
            <div style="font-size: 12px;">
              <div style="padding-bottom: 15px; border-bottom: 1px dashed #eee; margin-bottom: 15px;">
                <p><strong>Primary Guardian:</strong> ${student.guardianName}</p>
                <p><strong>Relationship:</strong> ${student.guardianRelationship}</p>
                <p><strong>Occupation:</strong> ${student.guardianOccupation}</p>
                <p><strong>Phone:</strong> ${student.guardianPhone}</p>
              </div>
              <div>
                <p><strong>Secondary Guardian:</strong> ${student.secondaryGuardianName || 'None'}</p>
                <p><strong>Contact:</strong> ${student.secondaryGuardianPhone || 'N/A'}</p>
              </div>
            </div>
          </div>

          <div style="margin-bottom: 30px;">
            <h3 style="border-left: 5px solid #0A0F1C; padding-left: 10px; margin-bottom: 15px; font-size: 14px; text-transform: uppercase; font-weight: 900; color: #0A0F1C; background: #f8fafc; padding-top: 5px; padding-bottom: 5px;">Financial Settlement</h3>
            <div style="background: #f1f5f9; padding: 20px; border-radius: 15px; border: 2px solid #e2e8f0; font-size: 13px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #64748b; font-weight: bold;">Tuition Billing:</span>
                <span style="font-weight: 900;">GH₵ ${(student.tuitionFee || 0).toLocaleString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 15px; border-top: 1px solid #cbd5e1; padding-top: 10px; margin-top: 10px;">
                <span style="font-weight: 900; text-transform: uppercase; color: #0f172a;">Total Contract:</span>
                <span style="font-weight: 900; font-size: 18px; color: #0f172a;">GH₵ ${(student.tuitionTotal || 0).toLocaleString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #64748b; font-weight: bold;">Paid to Date:</span>
                <span style="font-weight: 900; color: #059669;">GH₵ ${(student.amountPaid || 0).toLocaleString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 10px; background: #ffe4e6; border-radius: 8px; margin-top: 10px;">
                <span style="font-weight: 900; color: #e11d48; text-transform: uppercase;">Outstanding:</span>
                <span style="font-weight: 900; color: #e11d48;">GH₵ ${(student.balance || 0).toLocaleString()}</span>
              </div>
              <p style="margin: 15px 0 0 0; text-align: center; font-size: 11px; font-weight: 900; text-transform: uppercase; color: #1CA3B8; letter-spacing: 1px;">Plan: ${student.paymentPlan}</p>
            </div>
          </div>
          
          <div style="margin-bottom: 30px;">
             <h3 style="border-left: 5px solid #0A0F1C; padding-left: 10px; margin-bottom: 15px; font-size: 14px; text-transform: uppercase; font-weight: 900; color: #0A0F1C; background: #f8fafc; padding-top: 5px; padding-bottom: 5px;">Identification Record</h3>
             <p style="margin: 0; font-size: 12px;"><strong>${student.idType} No:</strong> ${student.idNumber || 'Not Referenced'}</p>
          </div>
        </div>
      </div>

      <!-- Oath -->
      <div style="margin-top: 40px; padding: 30px; background: #0A0F1C; color: white; border-radius: 20px;">
        <h4 style="margin: 0 0 10px 0; font-size: 12px; text-transform: uppercase; font-weight: 900; color: #1CA3B8; letter-spacing: 2px;">Enrollee Declaration</h4>
        <p style="margin: 0; font-size: 12px; line-height: 1.8; font-style: italic; opacity: 0.8;">
          "I hereby certify that all information submitted in this admission protocol is accurate to the best of my knowledge. I commit to honoring the institutional guidelines, academic standards, and financial obligations of Charthess School of Fashion throughout my tenure as a scholar."
        </p>
        <div style="display: flex; justify-content: space-between; margin-top: 40px;">
          <div style="text-align: center;">
            <p style="margin: 0 0 5px 0; font-family: 'Playfair Display', serif; font-size: 20px; color: #1CA3B8;">${student.studentSignature || student.fullName}</p>
            <div style="width: 250px; border-bottom: 1px solid rgba(255,255,255,0.2); margin-bottom: 5px;"></div>
            <p style="margin: 0; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Scholar Digital Signature</p>
          </div>
          <div style="text-align: center;">
            <div style="width: 250px; border-bottom: 1px solid rgba(255,255,255,0.2); margin-bottom: 5px; margin-top: 25px;"></div>
            <p style="margin: 0; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Admissions Directorate</p>
          </div>
        </div>
      </div>

      <div style="margin-top: 40px; text-align: center; border-top: 1px solid #eee; padding-top: 20px; font-size: 10px; color: #999; text-transform: uppercase; letter-spacing: 3px;">
        Excellence in Fashion Education & Industrial Training
      </div>
    </div>
  `;

  document.body.appendChild(receiptContainer);

  try {
    const canvas = await html2canvas(receiptContainer, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff'
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    
    // Auto-print behavior
    pdf.autoPrint();
    const blobUrl = pdf.output('bloburl');
    window.open(blobUrl, '_blank');

    pdf.save(`Enrollment_Form_${student.fullName.replace(/ /g, '_')}.pdf`);
  } finally {
    document.body.removeChild(receiptContainer);
  }
};

export const generateBlankAdmissionFormPDF = async () => {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-10000px';
  container.style.top = '0';
  container.style.width = '1000px';
  container.style.padding = '50px';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#000000';
  container.style.fontFamily = "'Inter', sans-serif";
  
  const logoUrl = "/charthess_logo-1.png";

  const headerHtml = `
    <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #0A0F1C;">
      <img src="${logoUrl}" style="height: 100px; width: auto; object-fit: contain; margin-bottom: 12px; filter: brightness(0);" />
      <div style="font-size: 11px; color: #333; line-height: 1.4;">
        <p style="margin: 0; font-weight: bold; font-size: 13px; color: #0A0F1C;">Tel: +233 24 786 4347 / +233 50 083 0085</p>
        <p style="margin: 2px 0;">Email: charthessfashions@gmail.com</p>
        <p style="margin: 2px 0;">Location: Kasoa Nyanyano Road, Kakraba Behind KFC</p>
      </div>
    </div>
  `;

  const fieldRow = (label: string) => `
    <div style="margin-bottom: 15px; display: flex; align-items: end; gap: 10px;">
      <span style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #666; width: 140px; flex-shrink: 0;">${label}:</span>
      <div style="flex-grow: 1; border-bottom: 1px solid #ccc; height: 20px;"></div>
    </div>
  `;

  container.innerHTML = `
    <div style="border: 2px solid #000; padding: 40px; background: #fff;">
      ${headerHtml}
      
      <div style="text-align: center; margin: 20px 0 30px 0;">
        <h2 style="margin: 0; font-size: 28px; font-weight: 900; text-transform: uppercase; text-decoration: underline;">ADMISSION FORM</h2>
        <p style="margin: 5px 0 0 0; font-weight: bold; color: #1CA3B8;">SESSION: 20______ / 20______</p>
      </div>

      <div style="display: flex; gap: 40px; margin-bottom: 40px;">
         <div style="width: 140px; height: 160px; border: 2px dashed #ccc; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #999; text-transform: uppercase; text-align: center;">
            Affix Passport<br/>Photograph Here
         </div>
         <div style="flex: 1;">
            ${fieldRow('Surname')}
            ${fieldRow('First Name')}
            ${fieldRow('Other Names')}
            ${fieldRow('Program / Course')}
         </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
         <div>
            <h3 style="font-size: 14px; font-weight: 900; border-bottom: 2px solid #000; margin-bottom: 15px; padding-bottom: 5px;">A. PERSONAL PARTICULARS</h3>
            ${fieldRow('Date of Birth')}
            ${fieldRow('Gender')}
            ${fieldRow('Nationality')}
            ${fieldRow('Marital Status')}
            ${fieldRow('Religion')}
            ${fieldRow('Residential Address')}
            ${fieldRow('Digital Address')}
            ${fieldRow('Contact Number')}
            ${fieldRow('WhatsApp Number')}
            ${fieldRow('Email Address')}
         </div>
         <div>
            <h3 style="font-size: 14px; font-weight: 900; border-bottom: 2px solid #000; margin-bottom: 15px; padding-bottom: 5px;">B. GUARDIAN / NEXT OF KIN</h3>
            ${fieldRow('Guardian Name')}
            ${fieldRow('Relationship')}
            ${fieldRow('Guardian occupation')}
            ${fieldRow('Guardian Phone 1')}
            ${fieldRow('Guardian Phone 2')}
            <h3 style="font-size: 14px; font-weight: 900; border-bottom: 2px solid #000; margin-top: 25px; margin-bottom: 15px; padding-bottom: 5px;">C. EDUCATION</h3>
            ${fieldRow('Last School Attended')}
            ${fieldRow('Highest Qualification')}
            ${fieldRow('Year Completed')}
         </div>
      </div>

      <div style="margin-top: 30px;">
         <h3 style="font-size: 14px; font-weight: 900; border-bottom: 2px solid #000; margin-bottom: 15px; padding-bottom: 5px;">D. HEALTH INFORMATION</h3>
         <p style="font-size: 11px; color: #444; margin-bottom: 10px;">Do you have any medical condition? Yes [ ] No [ ]. If yes, state briefly below:</p>
         <div style="border-bottom: 1px solid #ccc; height: 30px; margin-bottom: 10px;"></div>
         <div style="border-bottom: 1px solid #ccc; height: 30px;"></div>
      </div>

      <div style="margin-top: 40px; border: 1px solid #000; padding: 20px;">
         <h3 style="margin: 0 0 10px 0; font-size: 14px; font-weight: 900;">DECLARATION</h3>
         <p style="margin: 0; font-size: 12px; line-height: 1.6; font-style: italic;">
            I certify that the information given on this form is true and correct. I agree to abide by the rules and regulations of Charthess School of Fashion.
         </p>
         <div style="margin-top: 30px; display: flex; justify-content: space-between;">
            <div style="width: 200px; border-top: 1px solid #000; text-align: center; font-size: 10px; font-weight: bold; padding-top: 5px;">APPLICANT SIGNATURE</div>
            <div style="width: 200px; border-top: 1px solid #000; text-align: center; font-size: 10px; font-weight: bold; padding-top: 5px;">DATE</div>
         </div>
      </div>

      <div style="margin-top: 30px; text-align: center; font-size: 10px; color: #666; font-weight: bold; letter-spacing: 2px;">
         BRINGING OUT THE CREATIVE YOU
      </div>
    </div>
  `;

  document.body.appendChild(container);
  try {
    const canvas = await html2canvas(container, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.autoPrint();
    const blobUrl = pdf.output('bloburl');
    window.open(blobUrl, '_blank');
    pdf.save(`Admission_Form_Blank.pdf`);
  } finally {
    document.body.removeChild(container);
  }
};
