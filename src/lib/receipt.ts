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

const getProcessedLogoDataUrl = async (url: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(url);
        return;
      }
      ctx.drawImage(img, 0, 0);
      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          // If the pixel is not transparent, force it to be black
          if (data[i + 3] > 10) {
            data[i] = 0;     // Red
            data[i + 1] = 0; // Green
            data[i + 2] = 0; // Blue
          }
        }
        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch (e) {
        console.error("Error processing logo:", e);
        resolve(url);
      }
    };
    img.onerror = () => resolve(url);
  });
};

const getHeaderHtml = (logoUrl: string) => `
  <div style="text-align: center; margin-bottom: 35px; padding-bottom: 25px; border-bottom: 2.5px solid #0A0F1C;">
    <img src="${logoUrl}" style="height: 220px; width: auto; max-width: 95%; object-fit: contain; margin: 0 auto 20px auto; display: block;" />
    <div style="font-size: 13px; color: #1a1a1a; line-height: 1.6; letter-spacing: 0.3px;">
      <p style="margin: 0; font-weight: 800; font-size: 15px; color: #000; text-transform: uppercase;">Tel: +233 24 786 4347 / +233 50 083 0085</p>
      <p style="margin: 4px 0; font-weight: 600;">Email: charthessfashions@gmail.com</p>
      <p style="margin: 4px 0; font-weight: 600;">Location: Kasoa Nyanyano Road, Kakraba Behind KFC</p>
    </div>
  </div>
`;

export const generateReceiptPDF = async (data: ReceiptData) => {
  const receiptContainer = document.createElement('div');
  receiptContainer.style.position = 'fixed';
  receiptContainer.style.left = '-10000px';
  receiptContainer.style.top = '0';
  receiptContainer.style.width = '850px';
  receiptContainer.style.padding = '30px';
  receiptContainer.style.backgroundColor = '#ffffff';
  receiptContainer.style.color = '#000000';
  receiptContainer.style.fontFamily = "'Inter', sans-serif";
  
  const logoUrl = await getProcessedLogoDataUrl("/charthess_logo-1.png");

  const headerHtml = `
  <div style="text-align: center; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 2px solid #0A0F1C;">
    <img src="${logoUrl}" style="height: 140px; width: auto; max-width: 90%; object-fit: contain; margin: 0 auto 10px auto; display: block;" />
    <div style="font-size: 12px; color: #1a1a1a; line-height: 1.4; letter-spacing: 0.2px;">
      <p style="margin: 0; font-weight: 800; font-size: 14px; color: #000; text-transform: uppercase;">Tel: +233 24 786 4347 / +233 50 083 0085</p>
      <p style="margin: 2px 0; font-weight: 600;">Email: charthessfashions@gmail.com</p>
      <p style="margin: 2px 0; font-weight: 600;">Location: Kasoa Nyanyano Road, Kakraba Behind KFC</p>
    </div>
  </div>
`;

  receiptContainer.innerHTML = `
    <div style="border: 3px solid #0A0F1C; padding: 25px; position: relative; overflow: hidden;">
      <img src="${logoUrl}" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 350px; opacity: 0.05; pointer-events: none;" />
      
      ${headerHtml}

      <div style="display: flex; justify-content: flex-end; margin-bottom: 20px;">
        <div style="text-align: right;">
          <h2 style="margin: 0; font-size: 22px; font-weight: 900; color: #1CA3B8; text-transform: uppercase; letter-spacing: 1px;">Official Receipt</h2>
          <p style="margin: 5px 0 0 0; font-weight: 900; font-size: 13px;">No: ${data.receiptNo}</p>
          <p style="margin: 3px 0 0 0; font-size: 12px; color: #333; font-weight: 600;">Date: ${format(data.date, 'PPPP')}</p>
        </div>
      </div>

      <div style="margin-bottom: 25px; line-height: 1.6;">
        <div style="display: grid; grid-template-columns: 140px 1fr; gap: 15px; margin-bottom: 12px; align-items: end;">
          <div style="font-weight: 900; color: #444; text-transform: uppercase; font-size: 12px; letter-spacing: 0.5px;">Received From:</div>
          <div style="font-size: 18px; font-weight: 900; border-bottom: 2px solid #eee; padding-bottom: 4px; color: #0A0F1C;">${data.studentName}</div>
        </div>
        <div style="display: grid; grid-template-columns: 140px 1fr; gap: 15px; margin-bottom: 12px; align-items: end;">
          <div style="font-weight: 900; color: #444; text-transform: uppercase; font-size: 12px; letter-spacing: 0.5px;">Course:</div>
          <div style="font-size: 15px; border-bottom: 1px solid #eee; padding-bottom: 4px; font-weight: 700;">${data.studentCourse}</div>
        </div>
        <div style="display: grid; grid-template-columns: 140px 1fr; gap: 15px; margin-bottom: 12px; align-items: end;">
          <div style="font-weight: 900; color: #444; text-transform: uppercase; font-size: 12px; letter-spacing: 0.5px;">The Sum Of:</div>
          <div style="font-size: 24px; font-weight: 900; color: #0A0F1C; border-bottom: 2px solid #0A0F1C; padding-bottom: 4px;">GH₵ ${data.amount.toLocaleString()}.00</div>
        </div>
        <div style="margin: 20px 0; padding: 15px; background: #f8fafc; border: 2px solid #0A0F1C; border-radius: 10px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-weight: 900; color: #0A0F1C; text-transform: uppercase; font-size: 10px; letter-spacing: 1.5px; margin-bottom: 3px;">Outstanding Debt</div>
            <div style="font-weight: 900; font-size: 11px; color: #1CA3B8; text-transform: uppercase; letter-spacing: 0.5px;">Current Academic Balance</div>
          </div>
          <div style="font-size: 20px; font-weight: 900; color: ${(data.balance ?? 0) > 0 ? '#e11d48' : '#059669'};">GH₵ ${(data.balance ?? 0).toLocaleString()}.00</div>
        </div>
        <div style="display: grid; grid-template-columns: 140px 1fr; gap: 15px; margin-bottom: 12px; align-items: end;">
          <div style="font-weight: 900; color: #444; text-transform: uppercase; font-size: 12px; letter-spacing: 0.5px;">Being Payment For:</div>
          <div style="font-size: 15px; border-bottom: 1px solid #eee; padding-bottom: 4px; text-transform: capitalize; font-weight: 700;">${data.category || 'Tuition Fee'} ${data.notes ? `- ${data.notes}` : ''}</div>
        </div>
        <div style="display: grid; grid-template-columns: 140px 1fr; gap: 15px; margin-bottom: 12px; align-items: end;">
          <div style="font-weight: 900; color: #444; text-transform: uppercase; font-size: 12px; letter-spacing: 0.5px;">Payment Method:</div>
          <div style="font-size: 15px; text-transform: capitalize; font-weight: 700;">${data.method}</div>
        </div>
      </div>

      <!-- Financial Summary Section -->
      <div style="margin: 25px 0; padding: 15px; border: 1.5px solid #eee; border-radius: 12px; background: #fafafa;">
        <h3 style="margin: 0 0 12px 0; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; color: #1CA3B8; text-align: center;">Ledger Statement Summary</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; text-align: center;">
          <div>
            <p style="margin: 0; font-size: 9px; color: #666; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">Total Tuition Fee</p>
            <p style="margin: 5px 0 0 0; font-size: 15px; font-weight: 900;">GH₵ ${(data.tuitionTotal || 0).toLocaleString()}.00</p>
          </div>
          <div>
            <p style="margin: 0; font-size: 9px; color: #666; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">Total Amount Paid</p>
            <p style="margin: 5px 0 0 0; font-size: 15px; font-weight: 900; color: #059669;">GH₵ ${(data.totalPaid || data.amount).toLocaleString()}.00</p>
          </div>
          <div>
            <p style="margin: 0; font-size: 9px; color: #666; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">Payment Arrears</p>
            <p style="margin: 5px 0 0 0; font-size: 15px; font-weight: 900; color: ${(data.balance ?? 0) > 0 ? '#e11d48' : '#059669'};">GH₵ ${(data.balance ?? 0).toLocaleString()}.00</p>
          </div>
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: end; margin-top: 40px;">
        <div style="font-size: 11px; color: #666; font-weight: 600;">
          <p style="margin: 0;">This is a computer-generated receipt.</p>
          <p style="margin: 4px 0 0 0; color: #0A0F1C; font-weight: 800;">Generated by: ${data.recordedBy || 'Administrator'}</p>
        </div>
        <div style="text-align: center;">
          <div style="width: 180px; border-bottom: 2.5px solid #0A0F1C; margin-bottom: 8px;"></div>
          <p style="margin: 0; font-weight: 900; text-transform: uppercase; font-size: 11px; letter-spacing: 1px;">Authorized Signature</p>
        </div>
      </div>
      
      <div style="margin-top: 30px; text-align: center; font-size: 11px; color: #000; text-transform: uppercase; letter-spacing: 3px; font-weight: 900; border-top: 1px solid #eee; padding-top: 15px;">
        Excellence In Research and Training
      </div>
    </div>
  `;

  document.body.appendChild(receiptContainer);

  // Wait for all images in the container to load before capturing
  const imagesForReceipt = Array.from(receiptContainer.getElementsByTagName('img'));
  await Promise.all(
    imagesForReceipt.map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise(resolve => {
        img.onload = resolve;
        img.onerror = resolve;
      });
    })
  );

  try {
    const canvas = await html2canvas(receiptContainer, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff'
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    let heightLeft = pdfHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
    }
    
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
  receiptContainer.style.width = '900px';
  receiptContainer.style.padding = '40px';
  receiptContainer.style.backgroundColor = '#ffffff';
  receiptContainer.style.color = '#000000';
  receiptContainer.style.fontFamily = "'Inter', sans-serif";
  
  const logoUrl = await getProcessedLogoDataUrl("/charthess_logo-1.png");

  const headerHtml = getHeaderHtml(logoUrl);

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
        <p style="font-weight: 900; text-transform: uppercase; font-size: 12px; margin-bottom: 15px;">Payment Terms & Instructions:</p>
        <p style="margin: 0; font-size: 12px; color: #444; line-height: 1.8;">
          1. All payments should be made via official channels (Momo/Bank).<br/>
          2. Quote Registration Number CH-${student.id.substring(0, 8).toUpperCase()} as reference.<br/>
          3. Fees paid are non-refundable after 14 days of enrollment.<br/>
          4. Contact finance office for any payment plan adjustments.
        </p>
      </div>
      
      <div style="margin-top: 30px; text-align: center; color: #1CA3B8; font-weight: bold; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">
        Excellence In Research and Training
      </div>
    </div>
  `;

  document.body.appendChild(receiptContainer);

  // Wait for all images in the container to load before capturing
  const imagesForInvoice = Array.from(receiptContainer.getElementsByTagName('img'));
  await Promise.all(
    imagesForInvoice.map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise(resolve => {
        img.onload = resolve;
        img.onerror = resolve;
      });
    })
  );

  try {
    const canvas = await html2canvas(receiptContainer, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff'
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    let heightLeft = pdfHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
    }
    
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
  receiptContainer.style.width = '900px';
  receiptContainer.style.padding = '50px';
  receiptContainer.style.backgroundColor = '#ffffff';
  receiptContainer.style.color = '#000000';
  receiptContainer.style.fontFamily = "'Inter', sans-serif";
  
  const logoUrl = await getProcessedLogoDataUrl("/charthess_logo-1.png");
  const student = data.student;

  const headerHtml = getHeaderHtml(logoUrl);

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

      <div style="display: flex; gap: 40px; margin-bottom: 25px; background: #f9f9f9; padding: 25px; border-radius: 20px; border: 1px solid #eee;">
        <div style="width: 160px; height: 160px; background: #eee; border: 4px solid #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border-radius: 15px; overflow: hidden; display: flex; align-items: center; justify-content: center;">
          ${student.photoUrl ? `<img src="${student.photoUrl}" crossOrigin="anonymous" style="width: 100%; height: 100%; object-fit: cover;" />` : '<div style="font-size: 10px; color: #999; text-transform: uppercase; text-align: center;">Official Photograph<br/>Required</div>'}
        </div>
        <div style="flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
          <div style="grid-column: span 2; border-bottom: 3px solid #0A0F1C; padding-bottom: 8px; margin-bottom: 5px;">
            <p style="margin: 0; font-size: 13px; color: #1CA3B8; text-transform: uppercase; font-weight: 900; letter-spacing: 2px;">Scholar Full Identity</p>
            <h2 style="margin: 5px 0 0 0; font-size: 32px; font-weight: 900; text-transform: uppercase; color: #0A0F1C; line-height: 1.1;">${student.surname}, ${student.firstName} ${student.otherNames || ''}</h2>
          </div>
          <div style="padding-top: 5px;">
            <p style="margin: 0; font-size: 11px; color: #666; text-transform: uppercase; font-weight: 900; letter-spacing: 1px;">Academic Program</p>
            <p style="margin: 3px 0 0 0; font-size: 17px; font-weight: 900; color: #0A0F1C;">${student.course} ${student.courseOther ? `(${student.courseOther})` : ''}</p>
            <p style="margin: 2px 0 0 0; font-size: 12px; color: #444; font-weight: 600;">Track: ${student.specialization || 'Not Specified'}</p>
          </div>
          <div style="padding-top: 5px;">
             <p style="margin: 0; font-size: 11px; color: #666; text-transform: uppercase; font-weight: 900; letter-spacing: 1px;">Intake Batch & Mode</p>
             <p style="margin: 3px 0 0 0; font-size: 17px; font-weight: 900; color: #0A0F1C;">${student.batch || 'Unassigned'} | ${student.mode || 'N/A'}</p>
             <p style="margin: 2px 0 0 0; font-size: 12px; color: #444; font-weight: 600;">Status: <span style="color: #1CA3B8;">${student.status}</span></p>
          </div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px;">
        <!-- Left Column -->
        <div>
          <div style="margin-bottom: 25px;">
            <h3 style="border-left: 6px solid #1CA3B8; padding: 6px 12px; margin-bottom: 15px; font-size: 15px; text-transform: uppercase; font-weight: 900; color: #0A0F1C; background: #f0fdfa; letter-spacing: 1px;">Personal Demographics</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px; line-height: 1.6;">
              <p><strong>Gender:</strong> ${student.gender}</p>
              <p><strong>DOB/Age:</strong> ${student.dob} (${student.age} yrs)</p>
              <p><strong>Nationality:</strong> ${student.nationality}</p>
              <p><strong>Marital:</strong> ${student.maritalStatus}</p>
              <p style="grid-column: span 2;"><strong>Digital Address:</strong> ${student.digitalAddress || 'N/A'}</p>
              <p style="grid-column: span 2;"><strong>Residential Address:</strong> ${student.address}</p>
              <p><strong>Primary Contact:</strong> ${student.phone}</p>
              <p><strong>Alt Contact:</strong> ${student.alternatePhone || 'N/A'}</p>
              <p style="grid-column: span 2;"><strong>Email:</strong> ${student.email || 'N/A'}</p>
            </div>
          </div>

          <div style="margin-bottom: 25px;">
            <h3 style="border-left: 6px solid #1CA3B8; padding: 6px 12px; margin-bottom: 15px; font-size: 15px; text-transform: uppercase; font-weight: 900; color: #0A0F1C; background: #f0fdfa; letter-spacing: 1px;">Academic Background</h3>
            <div style="font-size: 13px; line-height: 1.6;">
              <p><strong>Highest Education:</strong> ${student.educationLevel}</p>
              <p><strong>Last Institution:</strong> ${student.lastSchool}</p>
              <p><strong>Program Studied:</strong> ${student.programStudied || 'N/A'}</p>
              <p><strong>Qualifications:</strong> ${student.qualifications || 'N/A'}</p>
              <p><strong>Completion Year:</strong> ${student.yearCompleted}</p>
            </div>
          </div>

          <div style="margin-bottom: 25px;">
            <h3 style="border-left: 6px solid #1CA3B8; padding: 6px 12px; margin-bottom: 15px; font-size: 15px; text-transform: uppercase; font-weight: 900; color: #0A0F1C; background: #f0fdfa; letter-spacing: 1px;">Health & Safety</h3>
            <div style="font-size: 13px; line-height: 1.6;">
              <p><strong>Medical Condition:</strong> ${student.hasMedicalCondition}</p>
              <p><strong>Details:</strong> ${student.medicalDetails || 'None recorded'}</p>
              <p><strong>Emergency Contact:</strong> <span style="font-weight: 800;">${student.emergencyContactName}</span> (${student.emergencyContactPhone})</p>
            </div>
          </div>
        </div>

        <!-- Right Column -->
        <div>
          <div style="margin-bottom: 25px;">
            <h3 style="border-left: 6px solid #0A0F1C; padding: 6px 12px; margin-bottom: 15px; font-size: 15px; text-transform: uppercase; font-weight: 900; color: #0A0F1C; background: #f8fafc; letter-spacing: 1px;">Guardian Particulars</h3>
            <div style="font-size: 13px; line-height: 1.6;">
              <div style="padding-bottom: 15px; border-bottom: 1px dashed #ddd; margin-bottom: 15px;">
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

          <div style="margin-bottom: 25px;">
            <h3 style="border-left: 6px solid #0A0F1C; padding: 6px 12px; margin-bottom: 15px; font-size: 15px; text-transform: uppercase; font-weight: 900; color: #0A0F1C; background: #f8fafc; letter-spacing: 1px;">Financial Settlement</h3>
            <div style="background: #f1f5f9; padding: 18px; border-radius: 12px; border: 2.5px solid #0A0F1C; font-size: 14px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #475569; font-weight: bold;">Tuition Billing:</span>
                <span style="font-weight: 900;">GH₵ ${(student.tuitionFee || 0).toLocaleString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 12px; border-top: 1.5px solid #0A0F1C; padding-top: 8px; margin-top: 8px;">
                <span style="font-weight: 900; text-transform: uppercase; color: #0f172a;">Total Contract:</span>
                <span style="font-weight: 900; font-size: 18px; color: #0f172a;">GH₵ ${(student.tuitionTotal || 0).toLocaleString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #475569; font-weight: bold;">Paid to Date:</span>
                <span style="font-weight: 900; color: #059669;">GH₵ ${(student.amountPaid || 0).toLocaleString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 10px; background: #ffe4e6; border-radius: 8px; margin-top: 10px; border: 1px solid #fda4af;">
                <span style="font-weight: 900; color: #e11d48; text-transform: uppercase;">Outstanding:</span>
                <span style="font-weight: 900; color: #e11d48; font-size: 16px;">GH₵ ${(student.balance || 0).toLocaleString()}</span>
              </div>
              <p style="margin: 15px 0 0 0; text-align: center; font-size: 11px; font-weight: 900; text-transform: uppercase; color: #1CA3B8; letter-spacing: 2px;">Plan: ${student.paymentPlan}</p>
            </div>
          </div>
          
          <div style="margin-bottom: 25px;">
             <h3 style="border-left: 6px solid #0A0F1C; padding: 6px 12px; margin-bottom: 15px; font-size: 15px; text-transform: uppercase; font-weight: 900; color: #0A0F1C; background: #f8fafc; letter-spacing: 1px;">Identification Record</h3>
             <p style="margin: 0; font-size: 14px; font-weight: 700;"><strong>${student.idType} No:</strong> <span style="font-family: monospace;">${student.idNumber || 'Not Referenced'}</span></p>
          </div>
        </div>
      </div>

      <!-- Oath -->
      <div style="margin-top: 30px; padding: 30px; background: #0A0F1C; color: white; border-radius: 20px;">
        <h4 style="margin: 0 0 10px 0; font-size: 12px; text-transform: uppercase; font-weight: 900; color: #1CA3B8; letter-spacing: 3px;">Enrollee Declaration & Oath</h4>
        <p style="margin: 0; font-size: 14px; line-height: 1.8; font-style: italic; opacity: 0.9; text-align: justify;">
          "I hereby certify that all information submitted in this admission protocol is accurate to the best of my knowledge. I commit to honoring the institutional guidelines, academic standards, and financial obligations of Charthess School of Fashion throughout my tenure as a scholar."
        </p>
        <div style="display: flex; justify-content: space-between; margin-top: 35px;">
          <div style="text-align: center;">
            <p style="margin: 0 0 5px 0; font-family: serif; font-size: 22px; color: #1CA3B8;">${student.studentSignature || (student.firstName + ' ' + student.surname)}</p>
            <div style="width: 240px; border-bottom: 1.5px solid rgba(255,255,255,0.4); margin-bottom: 6px;"></div>
            <p style="margin: 0; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px;">Scholar Digital Signature</p>
          </div>
          <div style="text-align: center;">
            <div style="width: 240px; border-bottom: 1.5px solid rgba(255,255,255,0.4); margin-bottom: 6px; margin-top: 25px;"></div>
            <p style="margin: 0; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px;">Admissions Directorate</p>
          </div>
        </div>
      </div>

      <div style="margin-top: 30px; text-align: center; border-top: 2px solid #eee; padding-top: 20px; font-size: 13px; color: #000; text-transform: uppercase; letter-spacing: 5px; font-weight: 900;">
        Excellence In Research and Training
      </div>
    </div>
  `;

  document.body.appendChild(receiptContainer);

  // Wait for all images in the container to load before capturing
  const imagesForEnrollment = Array.from(receiptContainer.getElementsByTagName('img'));
  await Promise.all(
    imagesForEnrollment.map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise(resolve => {
        img.onload = resolve;
        img.onerror = resolve;
      });
    })
  );

  try {
    const canvas = await html2canvas(receiptContainer, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff'
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    let heightLeft = pdfHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
    }
    
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
  container.style.width = '900px';
  container.style.padding = '50px';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#000000';
  container.style.fontFamily = "'Inter', sans-serif";
  
  const logoUrl = await getProcessedLogoDataUrl("/charthess_logo-1.png");

  const headerHtml = getHeaderHtml(logoUrl);

  const fieldRow = (label: string) => `
    <div style="margin-bottom: 22px; display: flex; align-items: end; gap: 15px;">
      <span style="font-size: 13px; font-weight: 800; text-transform: uppercase; color: #000; width: 170px; flex-shrink: 0; letter-spacing: 0.5px;">${label}:</span>
      <div style="flex-grow: 1; border-bottom: 2.5px solid #333; height: 26px;"></div>
    </div>
  `;

  container.innerHTML = `
    <div style="border: 4px solid #000; padding: 40px; background: #fff;">
      ${headerHtml}
      
      <div style="text-align: center; margin: 15px 0 30px 0;">
        <h2 style="margin: 0; font-size: 28px; font-weight: 900; text-transform: uppercase; text-decoration: underline; letter-spacing: 2px;">ADMISSION FORM</h2>
        <p style="margin: 8px 0 0 0; font-weight: 900; color: #1CA3B8; font-size: 14px; letter-spacing: 1px;">SESSION: 20______ / 20______</p>
      </div>

      <div style="display: flex; gap: 40px; margin-bottom: 30px;">
         <div style="width: 160px; height: 200px; border: 3px dashed #999; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #555; text-transform: uppercase; text-align: center; background: #fafafa; font-weight: 800; line-height: 1.5; padding: 10px;">
            Affix Passport<br/>Photograph Here
         </div>
         <div style="flex: 1;">
            ${fieldRow('Surname')}
            ${fieldRow('First Name')}
            ${fieldRow('Other Names')}
            ${fieldRow('Program / Course')}
         </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px;">
         <div>
            <h3 style="font-size: 16px; font-weight: 900; border-bottom: 3px solid #000; margin-bottom: 20px; padding-bottom: 8px; color: #0A0F1C; text-transform: uppercase; letter-spacing: 1px;">A. PERSONAL PARTICULARS</h3>
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
            <h3 style="font-size: 16px; font-weight: 900; border-bottom: 3px solid #000; margin-top: 30px; margin-bottom: 20px; padding-bottom: 8px; color: #0A0F1C; text-transform: uppercase; letter-spacing: 1px;">C. EDUCATION</h3>
            ${fieldRow('Last School Attended')}
            ${fieldRow('Highest Qualification')}
            ${fieldRow('Year Completed')}
         </div>
         <div>
            <h3 style="font-size: 16px; font-weight: 900; border-bottom: 3px solid #000; margin-bottom: 20px; padding-bottom: 8px; color: #0A0F1C; text-transform: uppercase; letter-spacing: 1px;">B. GUARDIAN / NEXT OF KIN</h3>
            ${fieldRow('Guardian Name')}
            ${fieldRow('Relationship')}
            ${fieldRow('Guardian occupation')}
            ${fieldRow('Guardian Phone 1')}
            ${fieldRow('Guardian Phone 2')}
            ${fieldRow('Guardian Email')}
            ${fieldRow('Guardian Address')}
            <h3 style="font-size: 16px; font-weight: 900; border-bottom: 3px solid #000; margin-top: 30px; margin-bottom: 20px; padding-bottom: 10px; color: #0A0F1C; text-transform: uppercase; letter-spacing: 1px;">D. HEALTH INFORMATION</h3>
            <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 20px; padding: 5px 0;">
              <p style="font-size: 14px; color: #000; margin: 0; font-weight: 700;">Are there any medical conditions?</p>
              <div style="display: flex; gap: 30px; font-weight: 700;">
                 <span style="font-size: 14px;">Yes [ &nbsp;&nbsp;&nbsp;&nbsp; ]</span>
                 <span style="font-size: 14px;">No [ &nbsp;&nbsp;&nbsp;&nbsp; ]</span>
              </div>
            </div>
            <p style="font-size: 13px; color: #333; margin-bottom: 15px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">If yes, please state briefly below:</p>
            <div style="border-bottom: 1.5px solid #ccc; height: 35px; margin-bottom: 15px;"></div>
         </div>
      </div>

      <div style="margin-top: 35px; border: 3px solid #000; padding: 30px; border-radius: 8px; background: #fff;">
         <h3 style="margin: 0 0 15px 0; font-size: 18px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; border-bottom: 2px solid #eee; padding-bottom: 8px;">DECLARATION & OATH</h3>
         <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.8; font-style: italic; color: #000; font-weight: 500; text-align: justify;">
            I, the undersigned applicant, hereby certify that the information provided on this application protocol is true, accurate, and comprehensive to the best of my knowledge. 
            I fully understand that any misleading, false, or incomplete information may result in the immediate revocation of my admission offer or termination of student status. 
            I solemnly agree to abide by all the rules, academic standards, codes of conduct, and financial policies of Charthess School of Fashion throughout my enrollment period.
         </p>
         <div style="margin-top: 40px; display: flex; justify-content: space-between; gap: 40px;">
            <div style="flex: 1; border-top: 2.5px solid #000; text-align: center; font-size: 13px; font-weight: 800; padding-top: 10px; text-transform: uppercase; letter-spacing: 2px;">APPLICANT SIGNATURE</div>
            <div style="width: 250px; border-top: 2.5px solid #000; text-align: center; font-size: 13px; font-weight: 800; padding-top: 10px; text-transform: uppercase; letter-spacing: 2px;">DATE</div>
         </div>
      </div>

      <div style="margin-top: 40px; text-align: center; font-size: 13px; color: #000; font-weight: 900; letter-spacing: 5px; text-transform: uppercase; border-top: 1px solid #ddd; padding-top: 20px;">
         EXCELLENCE IN RESEARCH AND TRAINING
      </div>
    </div>
  `;

  document.body.appendChild(container);

  // Wait for all images in the container to load before capturing
  const imagesForBlank = Array.from(container.getElementsByTagName('img'));
  await Promise.all(
    imagesForBlank.map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise(resolve => {
        img.onload = resolve;
        img.onerror = resolve;
      });
    })
  );

  try {
    const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    let heightLeft = pdfHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
    }

    pdf.autoPrint();
    const blobUrl = pdf.output('bloburl');
    window.open(blobUrl, '_blank');
    pdf.save(`Admission_Form_Blank.pdf`);
  } finally {
    document.body.removeChild(container);
  }
};
